import sys
import os
import time

# Add parent directory to path to locate ai_backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from ai_backend.facing_screen import VideoCamera
    print("Successfully imported VideoCamera")
except ImportError as e:
    print(f"Failed to import VideoCamera: {e}")
    sys.exit(1)

def test_camera():
    print("Initializing VideoCamera...")
    try:
        cam = VideoCamera()
        print("Camera initialized.")
    except Exception as e:
        print(f"Failed to init camera: {e}")
        return

    # Warmup
    time.sleep(1)

    print("Testing get_frame()...")
    frame = cam.get_frame()
    if frame:
        print(f"Frame received, size: {len(frame)} bytes")
        if frame.startswith(b'\xff\xd8'):
            print("Frame is valid JPEG")
        else:
            print("Frame is NOT JPEG")
    else:
        print("No frame received (camera might be busy or unavailable)")

    print("Testing get_status()...")
    status = cam.get_status()
    print(f"Status: {status}")

    if status in ["LOOKING", "NOT_LOOKING", "NO_FACE"]:
        print("Status is valid")
    else:
        print(f"Status '{status}' is unexpected")
        
    print("Test Complete.")

if __name__ == "__main__":
    test_camera()
