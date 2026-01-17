import cv2
import numpy as np
import mediapipe as mp
import math
import asyncio
import websockets
import sys
import argparse

# --- Logic from facing_screen.py ---
class RemoteVideoCamera:
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
        while a > 180: a -= 360
        while a < -180: a += 360
        return a

    def process_frame(self, frame):
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.face_mesh.process(rgb)

        self.status = "NO_FACE"
        yaw = pitch = 0

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
                nose_2d = tuple(image_points[0].astype(int))
                nose_3d = np.array((0, 0, 100.0))
                nose_end_2d, _ = cv2.projectPoints(nose_3d.reshape(1, 3), rvec, tvec, camera_matrix, dist_coeffs)
                p2 = tuple(nose_end_2d[0][0].astype(int))
                cv2.line(frame, nose_2d, p2, (255, 0, 0), 2)
                
                # Text
                color = (0, 255, 0) if self.status == "LOOKING" else (0, 0, 255)
                cv2.putText(frame, f"Y:{int(yaw)} P:{int(pitch)}", (20, 80),cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        cv2.putText(frame, f"Status: {self.status}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        return frame, self.status

async def sender(uri):
    processor = RemoteVideoCamera()
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Cannot open webcam")
        return

    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as websocket:
        print("Connected! Streaming...")
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame")
                await asyncio.sleep(1)
                continue

            frame = cv2.flip(frame, 1)
            processed_frame, status = processor.process_frame(frame)
            
            # Encode JPEG
            ret, jpeg = cv2.imencode('.jpg', processed_frame)
            if ret:
                jpeg_bytes = jpeg.tobytes()
                # Send Status
                await websocket.send(f"STATUS:{status}")
                # Send Frame
                await websocket.send(jpeg_bytes)
            
            # Limit FPS
            await asyncio.sleep(0.03)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remote Camera Sender")
    parser.add_argument("--ip", type=str, default="localhost", help="IP address of the backend")
    parser.add_argument("--port", type=str, default="8000", help="Port of the backend")
    args = parser.parse_args()
    
    uri = f"ws://{args.ip}:{args.port}/ws/camera"
    
    try:
        asyncio.run(sender(uri))
    except KeyboardInterrupt:
        print("Stopped by user")
    except Exception as e:
        print(f"Error: {e}")
