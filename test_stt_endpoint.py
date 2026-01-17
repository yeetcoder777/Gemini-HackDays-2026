import sys
import os
from fastapi.testclient import TestClient

# Ensure backend can be imported
# stt.py is in backend/ and main.py does 'from stt import ...'
# So we need 'backend' directory in sys.path for internal imports in main.py to work if they rely on it being the cwd or similar.
# But 'main.py' adds '..' to sys.path.

# Let's try to mimic the environment.
project_root = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from backend.main import app
except ImportError:
    # Fallback if imports are tricky
    import main
    app = main.app

client = TestClient(app)

def test_transcribe():
    # Use one of the scipy test files
    wav_path = os.path.join(project_root, r"venv\Lib\site-packages\scipy\io\tests\data\test-44100Hz-le-1ch-4bytes.wav")
    
    if not os.path.exists(wav_path):
        print(f"WARN: Sample file not found at {wav_path}")
        # Try finding it relative to current drive or check standard locations? 
        # Or just skip with a warning.
        # But I know it exists from previous tool output.
        print("Checking alternative paths...")
        # Recalculate based on absolute path seen in tool output
        # Output was: venv\Lib\site-packages...
        # If running from hacksync2026, it should be there.
        return

    print(f"Testing with file: {wav_path}")
    
    with open(wav_path, "rb") as f:
        # UploadFile expects a filename, content_type etc. TestClient handles it.
        # files param: {'key': ('filename', file_obj, 'content_type')}
        response = client.post("/transcribe", files={"file": ("test.wav", f, "audio/wav")})
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    test_transcribe()
