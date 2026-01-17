import cv2
import time

print("Attempting to open camera 0...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Failed to open camera 0!")
else:
    print("Camera 0 opened successfully.")
    
    # Try reading 10 frames
    for i in range(10):
        ret, frame = cap.read()
        if ret:
            print(f"Frame {i}: Read success, shape={frame.shape}")
        else:
            print(f"Frame {i}: Read failed")
        time.sleep(0.1)

    cap.release()
print("Test complete.")
