import asyncio
import os
import sys

# Add project root to path so we can import backend
sys.path.append(os.getcwd())

from backend.tts import tts_bytes

async def test_tts_fallback():
    print("Testing TTS Fallback...")
    try:
        # This text should trigger the fallback because the API key is invalid/exhausted
        text = "Hello, this is a test of the emergency broadcast system."
        
        print("Calling tts_bytes...")
        audio = await tts_bytes(text, gender="male")
        
        if audio and len(audio) > 0:
            print(f"SUCCESS: Received {len(audio)} bytes of audio.")
            # Check if it was likely Edge TTS (we rely on the print statements in the code for confirmation)
        else:
            print("FAILURE: Received empty audio.")
            
    except Exception as e:
        print(f"FAILURE: Exception occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_tts_fallback())
