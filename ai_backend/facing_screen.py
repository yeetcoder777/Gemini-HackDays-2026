import cv2
import numpy as np
import mediapipe as mp
import math
import threading
import time

class VideoCamera:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.smoothed_angles = None
        self.alpha = 0.2
        self.status = "NO_FACE"
        self.current_frame_jpeg = self.get_empty_frame("Initializing...")
        self.stopped = False
        self.cap = None
        
        # 3D model points
        self.model_points = np.array([
            (0.0, 0.0, 0.0),         # Nose tip
            (0.0, -63.6, -12.5),     # Chin
            (-43.3, 32.7, -26.0),    # Left eye outer corner
            (43.3, 32.7, -26.0),     # Right eye outer corner
            (-28.9, -28.9, -24.1),   # Mouth left corner
            (28.9, -28.9, -24.1),    # Mouth right corner
        ], dtype=np.float64)

        self.LANDMARK_IDS = {
            "nose_tip": 1,
            "chin": 152,
            "left_eye_outer": 33,
            "right_eye_outer": 263,
            "mouth_left": 61,
            "mouth_right": 291,
        }

        # Start background thread
        self.thread = threading.Thread(target=self.update, args=())
        self.thread.daemon = True
        self.thread.start()

    def __del__(self):
        self.stop()
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()

    def stop(self):
        self.stopped = True
        if hasattr(self, 'thread'):
            self.thread.join(timeout=1.0)

    @staticmethod
    def get_empty_frame(text="No Camera"):
        # Create a blank black image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Put text
        cv2.putText(img, text, (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        ret, jpeg = cv2.imencode('.jpg', img)
        return jpeg.tobytes()

    def rotationMatrixToEulerAngles(self, R):
        sy = math.sqrt(R[0, 0] * R[0, 0] + R[1, 0] * R[1, 0])
        singular = sy < 1e-6

        if not singular:
            pitch = math.atan2(R[2, 1], R[2, 2])
            yaw   = math.atan2(-R[2, 0], sy)
            roll  = math.atan2(R[1, 0], R[0, 0])
        else:
            pitch = math.atan2(-R[1, 2], R[1, 1])
            yaw   = math.atan2(-R[2, 0], sy)
            roll  = 0

        return np.degrees([pitch, yaw, roll])

    def classify_looking(self, yaw, pitch, yaw_thresh=25, pitch_thresh=20):
        if abs(yaw) <= yaw_thresh and abs(pitch) <= pitch_thresh:
            return "LOOKING"
        return "NOT_LOOKING"

    def wrap_angle(self, a):
        while a > 180:
            a -= 360
        while a < -180:
            a += 360
        return a

    def get_status(self):
        return self.status

    def get_frame(self):
        return self.current_frame_jpeg

    def update(self):
        print("Camera thread started")
        while not self.stopped:
            # If camera is not active, try to find one
            if self.cap is None or not self.cap.isOpened():
                # print("Scanning for cameras...")
                found = False
                for idx in [0, 1]:
                    # print(f"Checking camera {idx}...")
                    temp = cv2.VideoCapture(idx)
                    if temp.isOpened():
                         r, _ = temp.read()
                         if r:
                             print(f"Connected to camera {idx}")
                             self.cap = temp
                             found = True
                             break
                         else:
                             temp.release()
                
                if not found:
                    self.current_frame_jpeg = self.get_empty_frame("No Camera Found")
                    time.sleep(2.0) # Wait before retry
                    continue
                
            ret, frame = self.cap.read()
            if not ret:
                print("Failed to read frame from camera")
                self.current_frame_jpeg = self.get_empty_frame("Camera Read Fail")
                if self.cap:
                    self.cap.release()
                self.cap = None # Force re-scan
                time.sleep(0.5)
                continue

            try:
                # Flip horizontally for selfie view
                frame = cv2.flip(frame, 1)

                h, w = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = self.face_mesh.process(rgb)

                self.status = "NO_FACE" # Reset status default
                pitch = yaw = roll = 0.0

                if result.multi_face_landmarks:
                    face_landmarks = result.multi_face_landmarks[0]
                    image_points = []
                    for k in self.LANDMARK_IDS:
                        idx = self.LANDMARK_IDS[k]
                        lm = face_landmarks.landmark[idx]
                        x, y = int(lm.x * w), int(lm.y * h)
                        image_points.append((x, y))

                    image_points = np.array(image_points, dtype=np.float64)

                    focal_length = w
                    center = (w / 2, h / 2)
                    camera_matrix = np.array([
                        [focal_length, 0, center[0]],
                        [0, focal_length, center[1]],
                        [0, 0, 1]
                    ], dtype=np.float64)

                    dist_coeffs = np.zeros((4, 1))

                    success, rvec, tvec = cv2.solvePnP(
                        self.model_points,
                        image_points,
                        camera_matrix,
                        dist_coeffs,
                        flags=cv2.SOLVEPNP_ITERATIVE
                    )

                    if success:
                        rot_matrix, _ = cv2.Rodrigues(rvec)
                        pitch, yaw, roll = self.rotationMatrixToEulerAngles(rot_matrix)
                        pitch = self.wrap_angle(pitch)
                        yaw = self.wrap_angle(yaw)
                        roll = self.wrap_angle(roll)

                        if pitch < -90: pitch += 180
                        elif pitch > 90: pitch -= 180

                        angles = np.array([pitch, yaw, roll], dtype=np.float64)
                        if self.smoothed_angles is None:
                            self.smoothed_angles = angles
                        else:
                            self.smoothed_angles = self.alpha * angles + (1 - self.alpha) * self.smoothed_angles

                        pitch, yaw, roll = self.smoothed_angles.tolist()
                        self.status = self.classify_looking(yaw, pitch)

                        # Visualization
                        # Draw nose vector
                        nose_2d = tuple(image_points[0].astype(int))
                        nose_3d = np.array((0, 0, 100.0))
                        nose_end_2d, _ = cv2.projectPoints(
                            nose_3d.reshape(1, 3), rvec, tvec, camera_matrix, dist_coeffs
                        )
                        p2 = tuple(nose_end_2d[0][0].astype(int))
                        cv2.line(frame, nose_2d, p2, (255, 0, 0), 2)
                        
                        # Draw text
                        color = (0, 255, 0) if self.status == "LOOKING" else (0, 0, 255)
                        cv2.putText(frame, f"Y:{int(yaw)} P:{int(pitch)}", (20, 80),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

                # Draw status text
                cv2.putText(frame, f"Status: {self.status}", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                
                # Encode to JPEG
                ret, jpeg = cv2.imencode('.jpg', frame)
                if ret:
                    self.current_frame_jpeg = jpeg.tobytes()
            except Exception as e:
                print(f"Error in camera thread: {e}")
                # import traceback
                # traceback.print_exc()
                time.sleep(1)
            
            # Limit frame rate roughly
            time.sleep(0.01)

    # --- Remote Injection Checks ---
    def set_remote_data(self, jpeg_bytes, status):
        """Allows a remote client to inject frame and status."""
        self.current_frame_jpeg = jpeg_bytes
        self.status = status
        # If we are receiving remote data, we might want to pause local processing 
        # or just let it be overwritten. For now, we just overwrite.
        # To avoid fighting, one could add a mode flag.
