from fastapi import APIRouter, UploadFile, File, Form
import tempfile, os, base64

from ai_backend.rag import reply
from backend.tts import tts_bytes
from backend.stt import transcribe_with_groq

router = APIRouter()
GROQ_API_KEY=os.environ.get("GROQ_API_KEY")
@router.post("/speech-chat")
async def speech_chat(
    file: UploadFile = File(...),
    user_id: str = Form("web_user"),
    role: str = Form("assistant"),
    gender: str = Form("male"),
):
    suffix = os.path.splitext(file.filename)[1] or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        audio_path = tmp.name

    # 1) STT
    transcript = transcribe_with_groq(GROQ_API_KEY, audio_path, "whisper-large-v3")

    # 2) LLM
    llm_result = reply(transcript, user_id=user_id, role=role, stream=False)

    # 3) TTS
    audio_bytes = await tts_bytes(llm_result["text"], gender=gender)

    os.remove(audio_path)

    return {
        "transcript": transcript,
        "llm": llm_result,
        "audio_b64": base64.b64encode(audio_bytes).decode("utf-8")
    }
