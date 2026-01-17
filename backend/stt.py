# import asyncio
# from fastapi import WebSocket, APIRouter, UploadFile, File
# import numpy as np
# from faster_whisper import WhisperModel
# import os
# from groq import Groq
# import pyaudio
# import wave
# import logging
# import speech_recognition as sr
# from pydub import AudioSegment 
# from io import BytesIO



# SAMPLE_RATE = 16000
# BUFFER_SECONDS = 2.0  # run whisper every 2s
# MIN_SAMPLES = int(SAMPLE_RATE * BUFFER_SECONDS)

# # ✅ CPU friendly model
# # tiny  = fastest
# # base  = good balance
# # small = better but slower
# model = WhisperModel("base", device="cpu", compute_type="int8")


# def transcribe_float32(audio: np.ndarray) -> str:
#     """
#     audio: float32 mono [-1,1] at 16kHz
#     returns transcript text
#     """
#     segments, info = model.transcribe(audio, language="en")
#     return "".join([s.text for s in segments]).strip()


# @router.websocket("/stt-stream")
# async def stt_stream(ws: WebSocket):
#     await ws.accept()

#     # We'll store audio as float32 in a python list then convert to np array
#     audio_samples = []
#     last_text = ""

#     from starlette.websockets import WebSocketDisconnect
#     try:
#         while True:
#             # frontend sends raw PCM16
#             pcm_bytes = await ws.receive_bytes()

#             # bytes -> int16 -> float32
#             pcm = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
#             audio_samples.extend(pcm.tolist())

#             # whenever buffer gets >= 2 sec, transcribe
#             if len(audio_samples) >= MIN_SAMPLES:
#                 audio_np = np.array(audio_samples, dtype=np.float32)

#                 # run whisper in background thread so websocket stays responsive
#                 text = await asyncio.to_thread(transcribe_float32, audio_np)
#                 print(text)

#                 if text and text != last_text:
#                     last_text = text
#                     try:
#                         await ws.send_json({"text": text, "is_final": False})
#                     except WebSocketDisconnect:
#                         print("WebSocket disconnected during send (partial)")
#                         break

#                 # keep last 0.5 sec overlap (prevents cutting words)
#                 keep = int(SAMPLE_RATE * 0.5)
#                 audio_samples = audio_samples[-keep:]

#     except WebSocketDisconnect:
#         print("WebSocket disconnected")
#     except Exception as e:
#         print(f"Error in stt_stream: {e}")
#     finally:
#         # connection closed: final transcript
#         if audio_samples:
#             audio_np = np.array(audio_samples, dtype=np.float32)
#             final_text = await asyncio.to_thread(transcribe_float32, audio_np)
#             try:
#                 await ws.send_json({"text": final_text, "is_final": True})
#             except Exception:
#                 pass
#         try:
#             await ws.close()
#         except Exception:
#             pass

# def audio_recording():

#     FORMAT = pyaudio.paInt16
#     CHANNELS = 1
#     RATE = 44100
#     SECONDS = 5
#     OUTPUT = "recording.wav"

#     p = pyaudio.PyAudio()

#     stream = p.open(format=FORMAT,
#                     channels=CHANNELS,
#                     rate=RATE,
#                     input=True,
#                     frames_per_buffer=1024)

#     print("Recording...")
#     frames = []

#     for _ in range(0, int(RATE / 1024 * SECONDS)):
#         frames.append(stream.read(1024))

#     print("Finished")

#     stream.stop_stream()
#     stream.close()
#     p.terminate()

#     with wave.open(OUTPUT, 'wb') as wf:
#         wf.setnchannels(CHANNELS)
#         wf.setsampwidth(p.get_sample_size(FORMAT))
#         wf.setframerate(RATE)
#         wf.writeframes(b''.join(frames))

# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
# def record_audio(file_path, timeout=20, phrase_time_limit=None):
#     """
#     Simplified function to record audio from the microphone and save it as an MP3 file.

#     Args:   
#     file_path (str): Path to save the recorded audio file.
#     timeout (int): Maximum time to wait for a phrase to start (in seconds).
#     phrase_time_lfimit (int): Maximum time for the phrase to be recorded (in seconds).
#     """
#     recognizer = sr.Recognizer()
    
#     try:
#         with sr.Microphone() as source:
#             logging.info("Start speaking now...")
            
#             # Record the audio
#             audio_data = recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
#             logging.info("Recording complete.")
            
#             wav_data = audio_data.get_wav_data()
#             audio_segment = AudioSegment.from_wav(BytesIO(wav_data))
#             audio_segment.export(file_path, format="mp3", bitrate="128k")
            
#             logging.info(f"Audio saved to {file_path}")

#     except Exception as e:
#         logging.error(f"An error occurred: {e}")
    
    # return file_path

from groq import Groq
from fastapi import APIRouter, UploadFile, File
import tempfile
import os
from dotenv import load_dotenv
load_dotenv()
def transcribe_with_groq(GROQ_API_KEY, audio_filepath, stt_model):
    
    client = Groq(api_key = GROQ_API_KEY)

    filename = audio_filepath 

    with open(filename, "rb") as file:
        transcription = client.audio.transcriptions.create(
        file=file, 
        model=stt_model, 
        language="en",  
        )
        
        return transcription.text

# audio_recording()
# file_path = "recording.wav"
# transcription = transcribe_with_groq(GROQ_API_KEY, file_path, "whisper-large-v3")
# print(transcription)

router = APIRouter()
GROQ_API_KEY=os.environ.get("GROQ_API_KEY")
@router.post("/stt")
async def stt_file(file: UploadFile = File(...)):
    # save temp audio
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    transcription = transcribe_with_groq(GROQ_API_KEY, tmp_path, "whisper-large-v3")
    os.remove(tmp_path)
    return {"transcription": transcription}