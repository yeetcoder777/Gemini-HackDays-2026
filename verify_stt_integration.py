import sys
import os
import asyncio
import numpy as np
from unittest.mock import patch, AsyncMock, MagicMock

# Setup paths
project_root = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Mock modules
with patch.dict(sys.modules, {
        "ai_backend.rag": AsyncMock(),
        "faster_whisper": AsyncMock()
    }):
    
    mock_rag = sys.modules["ai_backend.rag"]
    
    async def mock_reply_logic(user_text, user_id, role):
        return {
            "text": f"Echo: {user_text}",
            "emotion": "happy",
            "gesture": "nod",
            "intensity": 0.5
        }
    
    mock_rag.reply = AsyncMock(side_effect=mock_reply_logic)

    mock_fw = sys.modules["faster_whisper"]
    MockModel = mock_fw.WhisperModel
    mock_model_instance = MockModel.return_value
    from collections import namedtuple
    Segment = namedtuple('Segment', ['text'])
    mock_model_instance.transcribe.return_value = ([Segment(text="Hello world")], None)
    
    from backend import stt
    # Import Starlette exceptions for mocking
    from starlette.websockets import WebSocketDisconnect

async def test_unit_stt_stream():
    # Mock WebSocket
    mock_ws = AsyncMock()
    
    # Setup receive_bytes to return some data then raise Disconnect
    # 1. Send enough bytes for transcription
    # 2. Raise Disconnect to trigger finally block
    
    num_samples = 16000 * 3 # 3 seconds
    pcm_bytes = np.zeros(num_samples, dtype=np.int16).tobytes()
    
    # We need to simulate multiple calls?
    # stt_stream loop calls receive_bytes repeatedly.
    # formatting: it's an awaitable.
    
    mock_ws.receive_bytes.side_effect = [
        pcm_bytes, 
        WebSocketDisconnect()
    ]
    
    print("Running stt_stream with mock websocket...")
    await stt.stt_stream(mock_ws)
    
    print("stt_stream finished.")
    
    # Verify calls
    # 1. Did it transcribe?
    # backend.stt calls transcribe_float32 -> model.transcribe
    # But checking if reply was called is better
    
    print(f"Reply call count: {mock_rag.reply.call_count}")
    if mock_rag.reply.call_count > 0:
        print("SUCCESS: Reply was called!")
        print(f"Args: {mock_rag.reply.call_args}")
    else:
        print("FAILURE: Reply was NOT called.")

    # Verify sending back to WS
    # We expect send_json to be called with final transcript AND LLM response
    # 1. Final transcript {"text": ..., "is_final": True}
    # 2. LLM response {"type": "llm_response", ...}
    
    print(f"WS send_json call count: {mock_ws.send_json.call_count}")
    calls = mock_ws.send_json.call_args_list
    for i, call in enumerate(calls):
        print(f"Call {i}: {call}")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(test_unit_stt_stream())
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
