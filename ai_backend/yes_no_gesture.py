import cv2
import numpy as np
import mediapipe as mp
import time
import math
from collections import deque

# -----------------------------
# Helpers
# -----------------------------
def wrap_angle(a: float) -> float:
    """Wrap angle to [-180, 180]."""
    while a > 180:
        a -= 360
    while a < -180:
        a += 360
    return a

def get_euler_angles(rvec, tvec):
    """
    More stable Euler extraction using OpenCV decomposition.
    Returns: pitch, yaw, roll in degrees
    """
    rot_matrix, _ = cv2.Rodrigues(rvec)
    proj_matrix = np.hstack((rot_matrix, tvec))
    _, _, _, _, _, _, eulerAngles = cv2.decomposeProjectionMatrix(proj_matrix)

    pitch, yaw, roll = [float(a) for a in eulerAngles]

    pitch = wrap_angle(pitch)
    yaw   = wrap_angle(yaw)
    roll  = wrap_angle(roll)

    # Fix pitch flip issues (common with solvePnP conventions)
    if pitch < -90:
        pitch += 180
    elif pitch > 90:
        pitch -= 180

    return pitch, yaw, roll

def count_side_swings(values, thresh):
    """
    Detect oscillation by counting sign changes when passing +/- thresh.
    Returns number of direction changes.
    """
    states = []
    for v in values:
        if v > thresh:
            states.append(1)
        elif v < -thresh:
            states.append(-1)
        else:
            states.append(0)

    # remove duplicates
    filtered = []
    for s in states:
        if not filtered or s != filtered[-1]:
            filtered.append(s)

    # remove zeros
    filtered = [x for x in filtered if x != 0]

    changes = 0
    for i in range(1, len(filtered)):
        if filtered[i] != filtered[i - 1]:
            changes += 1
    return changes

# -----------------------------
# Config (tune these)
# -----------------------------
YES_THRESHOLD = 15      # pitch degrees
NO_THRESHOLD  = 15      # yaw degrees
MIN_SWINGS    = 2       # 2 changes = left->right->left etc.
COOLDOWN_SEC  = 1.0     # avoid repeated detections
HISTORY_LEN   = 25      # frames (~1 sec at 25fps)

# -----------------------------
# MediaPipe setup
# -----------------------------
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Landmark indices (stable points)
LANDMARK_IDS = {
    "nose_tip": 1,
    "chin": 152,
    "left_eye_outer": 33,
    "right_eye_outer": 263,
    "mouth_left": 61,
    "mouth_right": 291,
}

# Generic 3D face model points (approx)
MODEL_POINTS = np.array([
    (0.0, 0.0, 0.0),         # nose tip
    (0.0, -63.6, -12.5),     # chin
    (-43.3, 32.7, -26.0),    # left eye outer
    (43.3, 32.7, -26.0),     # right eye outer
    (-28.9, -28.9, -24.1),   # mouth left
    (28.9, -28.9, -24.1),    # mouth right
], dtype=np.float64)

# -----------------------------
# Main loop
# -----------------------------
cap = cv2.VideoCapture(0)

pitch_hist = deque(maxlen=HISTORY_LEN)
yaw_hist   = deque(maxlen=HISTORY_LEN)

gesture = "—"
last_gesture_time = 0

# Optional calibration baseline
calibrated = False
base_pitch, base_yaw = 0.0, 0.0

print("Controls:")
print("  C = calibrate neutral head pose")
print("  Q / ESC = quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    pitch = yaw = roll = 0.0
    status = "NO_FACE"

    if results.multi_face_landmarks:
        status = "FACE_OK"
        lm = results.multi_face_landmarks[0].landmark

        image_points = []
        for k, idx in LANDMARK_IDS.items():
            x, y = int(lm[idx].x * w), int(lm[idx].y * h)
            image_points.append((x, y))

        image_points = np.array(image_points, dtype=np.float64)

        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1))  # assume no lens distortion

        ok, rvec, tvec = cv2.solvePnP(
            MODEL_POINTS,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if ok:
            pitch, yaw, roll = get_euler_angles(rvec, tvec)

            # subtract baseline if calibrated
            if calibrated:
                pitch -= base_pitch
                yaw -= base_yaw

            # keep history
            pitch_hist.append(pitch)
            yaw_hist.append(yaw)

            # draw used points
            for (x, y) in image_points.astype(int):
                cv2.circle(frame, (x, y), 3, (0, 255, 0), -1)

            # head direction line
            nose = tuple(image_points[0].astype(int))
            nose_3d = np.array([[0.0, 0.0, 120.0]])
            nose_end_2d, _ = cv2.projectPoints(
                nose_3d,
                rvec,
                tvec,
                camera_matrix,
                dist_coeffs
            )
            p2 = tuple(nose_end_2d[0][0].astype(int))
            cv2.line(frame, nose, p2, (255, 0, 0), 3)

            # detect gesture with cooldown
            now = time.time()
            if now - last_gesture_time > COOLDOWN_SEC and len(pitch_hist) > 10:
                pitch_changes = count_side_swings(pitch_hist, YES_THRESHOLD)
                yaw_changes   = count_side_swings(yaw_hist, NO_THRESHOLD)

                # YES = pitch oscillation
                if pitch_changes >= MIN_SWINGS and yaw_changes < MIN_SWINGS:
                    gesture = "YES ✅"
                    last_gesture_time = now
                    pitch_hist.clear()
                    yaw_hist.clear()

                # NO = yaw oscillation
                elif yaw_changes >= MIN_SWINGS and pitch_changes < MIN_SWINGS:
                    gesture = "NO ❌"
                    last_gesture_time = now
                    pitch_hist.clear()
                    yaw_hist.clear()

    # UI text
    cv2.putText(frame, f"Status: {status}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

    cv2.putText(frame, f"Pitch: {pitch:.1f}  Yaw: {yaw:.1f}  Roll: {roll:.1f}",
                (20, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

    cv2.putText(frame, f"Gesture: {gesture}", (20, 135),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)

    cv2.putText(frame, "Press C to calibrate neutral", (20, h - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)

    cv2.imshow("YES/NO Head Gesture Detection", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('c') and status == "FACE_OK":
        base_pitch, base_yaw = pitch, yaw
        calibrated = True
        gesture = "CALIBRATED ✅"
        pitch_hist.clear()
        yaw_hist.clear()
        last_gesture_time = time.time()
        print(f"Calibrated: base_pitch={base_pitch:.2f}, base_yaw={base_yaw:.2f}")

    if key == 27 or key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
