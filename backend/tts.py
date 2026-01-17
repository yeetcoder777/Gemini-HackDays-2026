
# from dotenv import load_dotenv
# from elevenlabs.client import ElevenLabs
# from elevenlabs.play import play
# import os
# key = os.getenv("ELEVENLABS_API_KEY")
# print("KEY:", key)

# BASE_DIR = os.path.dirname(os.path.dirname(__file__))   # hacksync2026/
# load_dotenv(os.path.join(BASE_DIR, ".env"))

# elevenlabs = ElevenLabs(
#   api_key=os.getenv("ELEVENLABS_API_KEY"),
# )

# audio = elevenlabs.text_to_speech.convert(
#     text="Yes, We're going to win this Hackathon",
#     voice_id="JBFqnCBsd6RMkjVDRZzb",
#     model_id="eleven_multilingual_v2",
#     output_format="mp3_44100_128",
# )

# print(type(audio))

# play(audio)

# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# from fastapi.responses import Response
# import os
# import asyncio
# from elevenlabs.client import ElevenLabs
# import edge_tts
# from fastapi.concurrency import run_in_threadpool
# router = APIRouter()

# elevenlabs = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# # Voice IDs
# VOICE_ID_MALE = "JBFqnCBsd6RMkjVDRZzb"
# VOICE_ID_FEMALE = "KleDBQ7etYG6NMjnQ9Jw"

# class TTSInput(BaseModel):
#     text: str
#     voice_id: str = None
#     model_id: str = "eleven_multilingual_v2"
#     gender: str = "male" # "male" or "female"

# def get_voice_id(gender: str, explicit_voice_id: str = None) -> str:
#     if explicit_voice_id:
#         return explicit_voice_id
#     if gender and gender.lower() == "female":
#         return VOICE_ID_FEMALE
#     return VOICE_ID_MALE

# async def generate_edge_tts(text: str, gender: str) -> bytes:
#     """Generates audio using Edge TTS as a fallback."""
#     print(f"[EDGE TTS] Generating audio for text: {text[:30]}...")
#     # Map gender to an Edge TTS voice
#     voice = "en-US-GuyNeural" # Default male
#     if gender and gender.lower() == "female":
#         voice = "en-US-AriaNeural"
    
#     communicate = edge_tts.Communicate(text, voice)
#     audio_data = b""
#     async for chunk in communicate.stream():
#         if chunk["type"] == "audio":
#             audio_data += chunk["data"]
            
#     print(f"[EDGE TTS] Generated {len(audio_data)} bytes.")
#     return audio_data

# @router.post("/tts")
# async def tts(input: TTSInput):
#     print(f"[TTS DEBUG] Endpoint called. Gender: {input.gender}, VoiceID input: {input.voice_id}")
    
#     try:
#         voice_id = get_voice_id(input.gender, input.voice_id)
#         print(f"[TTS DEBUG] Selected Voice ID: {voice_id}")
        
#         # ElevenLabs generation (blocking, might need running in executor if it blocks heavily, 
#         # but the client is sync. For now wrapping in try/except is key)
#         # To make it truly non-blocking for the event loop we could use run_in_executor, 
#         # but the main issue is the crash.
        
#         audio = elevenlabs.text_to_speech.convert(
#             text=input.text,
#             voice_id=voice_id,
#             model_id=input.model_id,
#             output_format="mp3_44100_128"
#         )
#         audio_bytes = b"".join(audio)
#         return Response(content=audio_bytes, media_type="audio/mpeg")

#     except Exception as e:
#         print(f"[TTS CHECK] ElevenLabs failed: {e}")
#         print("[TTS CHECK] Falling back to Edge TTS...")
#         audio_bytes = await generate_edge_tts(input.text, input.gender)
#         return Response(content=audio_bytes, media_type="audio/mpeg")

# async def tts_bytes(text, voice_id=None, model_id="eleven_multilingual_v2", gender="male"):
#     print(f"[TTS_BYTES DEBUG] Called. Gender: {gender}, VoiceID input: {voice_id}")
    
#     try:
#         final_voice_id = get_voice_id(gender, voice_id)
#         print(f"[TTS_BYTES DEBUG] Selected Voice ID: {final_voice_id}")
        
#         audio = elevenlabs.text_to_speech.convert(
#             text=text,
#             voice_id=final_voice_id,
#             model_id=model_id,
#             output_format="mp3_44100_128"
#         )
#         audio_bytes = b"".join(audio)
#         return audio_bytes

#     except Exception as e:
#         print(f"[TTS_BYTES CHECK] ElevenLabs failed: {e}")
#         print("[TTS_BYTES CHECK] Falling back to Edge TTS...")
#         return await generate_edge_tts(text, gender)

import os
import time
import hashlib
from typing import Optional, Dict, Tuple

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from dotenv import load_dotenv

import edge_tts
from elevenlabs.client import ElevenLabs

# -----------------------------
# Env + client
# -----------------------------
load_dotenv()

ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVEN_API_KEY:
    # Don't crash import; we'll fallback to Edge TTS if missing
    ELEVEN_API_KEY = ""

elevenlabs = ElevenLabs(api_key=ELEVEN_API_KEY) if ELEVEN_API_KEY else None

# -----------------------------
# FastAPI router
# -----------------------------
router = APIRouter()

# -----------------------------
# Config
# -----------------------------
DEFAULT_MODEL_ID = "eleven_multilingual_v2"

# Choose your default voice IDs here
VOICE_MALE = "pNInz6obpgDQGcFmaJgB"     # Adam
VOICE_FEMALE = "EXAVITQu4vr4xnSDxMaL"   # Bella

EDGE_VOICE_MALE = "en-US-GuyNeural"
EDGE_VOICE_FEMALE = "en-US-JennyNeural"

# Caching to avoid repeated API calls (huge for stability + avoiding abuse detection)
CACHE_SECONDS = 15 * 60  # 15 minutes

# Circuit breaker:
# if ElevenLabs starts returning 401 unusual_activity, we disable it temporarily
ELEVEN_COOLDOWN_SECONDS = 10 * 60  # 10 minutes

# In-memory cache: key -> (expires_ts, audio_bytes)
_TTS_CACHE: Dict[str, Tuple[float, bytes]] = {}

# Circuit breaker state
_ELEVEN_DISABLED_UNTIL = 0.0


# -----------------------------
# Models
# -----------------------------
class TTSRequest(BaseModel):
    text: str
    gender: Optional[str] = "female"   # "male" or "female"
    voice_id: Optional[str] = None     # override voice
    model_id: Optional[str] = DEFAULT_MODEL_ID


# -----------------------------
# Helpers
# -----------------------------
def _now() -> float:
    return time.time()


def _cache_key(text: str, gender: str, voice_id: str, model_id: str) -> str:
    payload = f"{gender}|{voice_id}|{model_id}|{text}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _cache_get(key: str) -> Optional[bytes]:
    item = _TTS_CACHE.get(key)
    if not item:
        return None
    exp, val = item
    if _now() > exp:
        _TTS_CACHE.pop(key, None)
        return None
    return val


def _cache_set(key: str, audio_bytes: bytes) -> None:
    _TTS_CACHE[key] = (_now() + CACHE_SECONDS, audio_bytes)


def _eleven_allowed() -> bool:
    return elevenlabs is not None and _now() > _ELEVEN_DISABLED_UNTIL


def _disable_eleven_for(seconds: int = ELEVEN_COOLDOWN_SECONDS) -> None:
    global _ELEVEN_DISABLED_UNTIL
    _ELEVEN_DISABLED_UNTIL = _now() + seconds


def _pick_voice_id(gender: str, override: Optional[str]) -> str:
    if override:
        return override
    g = (gender or "female").lower()
    return VOICE_MALE if g == "male" else VOICE_FEMALE


def _pick_edge_voice(gender: str) -> str:
    g = (gender or "female").lower()
    return EDGE_VOICE_MALE if g == "male" else EDGE_VOICE_FEMALE


def _looks_like_unusual_activity_error(e: Exception) -> bool:
    """
    ElevenLabs python SDK errors can be wrapped; we detect via string.
    """
    msg = str(e).lower()
    return ("detected_unusual_activity" in msg) or ("unusual activity" in msg) or ("status_code: 401" in msg) or (" 401" in msg)


# -----------------------------
# TTS engines
# -----------------------------
def _elevenlabs_tts_sync(text: str, voice_id: str, model_id: str) -> bytes:
    """
    Blocking call: must run in threadpool.
    Returns MP3 bytes.
    """
    if elevenlabs is None:
        raise RuntimeError("ElevenLabs client not configured (missing API key).")

    audio_iter = elevenlabs.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id=model_id,
        output_format="mp3_44100_128",
    )
    return b"".join(audio_iter)


async def _edge_tts_async(text: str, gender: str) -> bytes:
    """
    Edge TTS fallback. Returns MP3 bytes.
    """
    voice = _pick_edge_voice(gender)
    communicator = edge_tts.Communicate(text, voice)
    audio = bytearray()

    async for chunk in communicator.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


# -----------------------------
# Core generation logic
# -----------------------------
async def tts_generate(text: str, gender: str = "female", voice_id: Optional[str] = None, model_id: str = DEFAULT_MODEL_ID) -> bytes:
    """
    Robust TTS generation:
      - Uses ElevenLabs if allowed
      - Caches output
      - Circuit breaker cooldown after 401 unusual activity
      - Falls back to Edge TTS
    """
    if not text or not text.strip():
        raise ValueError("Text is empty.")

    voice = _pick_voice_id(gender, voice_id)
    key = _cache_key(text, gender or "female", voice, model_id or DEFAULT_MODEL_ID)

    cached = _cache_get(key)
    if cached:
        return cached

    # Try ElevenLabs (threadpool)
    if _eleven_allowed():
        try:
            audio_bytes = await run_in_threadpool(_elevenlabs_tts_sync, text, voice, model_id or DEFAULT_MODEL_ID)
            _cache_set(key, audio_bytes)
            return audio_bytes
        except Exception as e:
            # If ElevenLabs blocked you, DO NOT keep retrying it
            if _looks_like_unusual_activity_error(e):
                _disable_eleven_for(ELEVEN_COOLDOWN_SECONDS)
            # fall through to Edge

    # Fallback to Edge TTS
    audio_bytes = await _edge_tts_async(text, gender)
    _cache_set(key, audio_bytes)
    return audio_bytes


# -----------------------------
# Public helpers (for other routes)
# -----------------------------
async def tts_bytes(text: str, gender: str = "female") -> bytes:
    """
    Backwards-compatible helper used elsewhere.
    """
    return await tts_generate(text=text, gender=gender)


# -----------------------------
# API endpoint
# -----------------------------
@router.post("/tts")
async def tts_endpoint(req: TTSRequest):
    """
    Returns MP3 audio bytes directly.
    """
    try:
        audio_bytes = await tts_generate(
            text=req.text,
            gender=req.gender or "female",
            voice_id=req.voice_id,
            model_id=req.model_id or DEFAULT_MODEL_ID,
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")
