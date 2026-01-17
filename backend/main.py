import sys
import os
from dotenv import load_dotenv

# Load/Verify env vars
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

# Add the parent directory to sys.path to allow imports from ai_backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, Body
from fastapi.middleware.cors import CORSMiddleware
from stt import router as stt_router
from tts import router as tts_router
from ai_backend.speech_chat import router as speech_chat_router
from ai_backend.rag import router as rag_router
from auth.router import router as auth_router


app = FastAPI(title="MIRAGE Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for hackathon; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stt_router)
app.include_router(tts_router)
app.include_router(speech_chat_router)
app.include_router(rag_router)
app.include_router(auth_router)
  

from fastapi.responses import StreamingResponse
from ai_backend.facing_screen import VideoCamera

# Global camera instance
try:
    camera = VideoCamera()
except Exception as e:
    print(f"Warning: Could not initialize camera: {e}")
    camera = None

def gen(camera):
    import time
    while True:
        if camera:
            frame = camera.get_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
                time.sleep(0.04) # Limit stream to ~25 FPS
            else:
                 # Should not happen as get_frame initializes a placeholder
                 time.sleep(0.1)
        else:
             error_frame = VideoCamera.get_empty_frame("No Camera Found")
             yield (b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + error_frame + b'\r\n\r\n')
             time.sleep(1)

@app.websocket("/ws/camera")
async def camera_websocket(websocket: WebSocket):
    await websocket.accept()
    print("Remote camera connected via WebSocket.")
    try:
        while True:
            # Expecting bytes: [Status Length (1 byte)] [Status String] [JPEG Bytes]
            # Or simpler: receive JSON for status + separate Binary?
            # Let's use a simple protocol:
            # The client sends: "STATUS|size|JPEG_BYTES" ?
            # Or simplified: Client sends just raw bytes of the JPEG, 
            # and we do the prediction here? NO, user wants to run mediapipe THERE.
            
            # Protocol: 
            # 1. Text message: "STATUS:LOOKING"
            # 2. Binary message: JPEG bytes
            
            data = await websocket.receive()
            
            if "text" in data:
                text = data["text"]
                if text.startswith("STATUS:"):
                    new_status = text.split(":", 1)[1]
                    # We need to update status. 
                    # We'll need to store it temporarily to pair with the next frame? 
                    # Or just update immediately.
                    if camera:
                        camera.status = new_status
            
            if "bytes" in data:
                img_bytes = data["bytes"]
                if camera:
                    # Inject into camera
                    camera.current_frame_jpeg = img_bytes

    except Exception as e:
        print(f"Remote camera disconnected: {e}")

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(gen(camera), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/attention_status")
def attention_status():
    if not camera:
        return {"status": "NO_FACE"}
    return {"status": camera.get_status()}

@app.get("/")
def root():
    return {"status": "ok"}