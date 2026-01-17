import os
import json
import re
from datetime import datetime, timezone
import google.genai as genai
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_core.documents import Document
from fastapi import APIRouter
from pydantic import BaseModel
load_dotenv()

router = APIRouter()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")



client = genai.Client(api_key=api_key)

def call_llm(messages, system_instruction=None):
    # If messages is a list of dicts with "content"
    # messages coming in are like: [{"role": "user", "parts": ["text"]}]
    # But here we are constructing the prompt manually in previous code?
    # Let's fix the call_llm to accept standard Gemini chat history format if possible, 
    # OR just keep it simple as a single turn for now since we build context manually.
    
    # Actually, for Native JSON, we pass the config.
    
    prompt = "\n".join(m["content"] for m in messages if m["role"] != "system")
    
    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json"
        )
    )
    
    return response.text
  
def system_prompt(language: str = "English"):
    return """
You are MIRAGE, a calm, lifelike AI avatar.

You MUST ALWAYS output ONLY valid JSON with these keys:
- content_type: one of ["safe","suicidal","explicit_18_plus"]
- reply_text: string
- emotion: one of ["neutral","calm","happy","joyful","excited","sad","anxious","nervous","stressed","angry","frustrated","confused","scared","relieved","thoughtful"]
- intensity: number from -1.0 to 1.0, ranging from extreme negative to extreme positive emotions
- gesture: one of ["none","nod","shake_head","wave","point","thinking"]

LANGUAGE RULE (VERY IMPORTANT):
- The user is speaking in {language}.
- You MUST reply in {language}.
- Reply in Hinglish if User asks a question in Hinglish.
- Do NOT mix languages.
- Do NOT translate unless asked.

SAFETY RULES (VERY IMPORTANT):
- If the user expresses suicidal thoughts, self-harm intent, or desire to die:
  - Set content_type to "suicidal"
  - Reply in the SAME language as the user
  - Be calm, empathetic, and supportive
  - DO NOT provide instructions for self-harm
  - Encourage the user to seek immediate help
  - INCLUDE an appropriate suicide prevention helpline
  - If country is unclear, provide an international helpline
- If the user expresses stress, anxiety, sadness, or emotional pain WITHOUT self-harm intent:
  - Set content_type to "safe"
  - Offer emotional support, NOT emergency framing

EXPLICIT CONTENT RULES:
- If the user asks for explicit sexual content:
  - Set content_type to "explicit_18_plus"
  - Refuse politely in the SAME language
  - Redirect to a respectful topic

Rules:
- Speak naturally, like a human.
- Keep answers short (2–4 sentences).
- Never hallucinate or invent facts.
- Avoid explicit sexual content.
- Never provide instructions for self-harm or suicide.
- If user is distressed, encourage seeking help.
- If content_type is "suicidal", reply_text MUST be a crisis-safe supportive message and include helpline.
- If content_type is "explicit_18_plus", refuse politely.
Return ONLY JSON. No extra text, no markdown.

Emotion selection rules:
- Choose emotion based on the USER'S message emotion (not your reply tone).
- Use:
  joyful = strong happiness
  happy = mild positive
  anxious/nervous/stressed = worry, pressure, panic
  sad = sadness/hopelessness
  angry/frustrated = anger/irritation
  confused = uncertainty
  scared = fear
  relieved = relief after tension
  thoughtful = reflective/serious
  calm/neutral = neutral or factual

Important:
- Do NOT always pick calm.
- If user says "pissed/angry/hate", emotion MUST be "angry".
- If user is joking, keep emotion "happy" or "neutral" based on tone.
- intensity:
  0.8–1.0 = intense
  0.4–0.7 for clear emotion
  0.0–0.3 for neutral
  Use negative intensity for negative emotions where appropriate.
"""

def role_prompt(role="assistant"):
    if role == "teacher":
        return "Explain concepts slowly and simply, like a patient teacher."
    if role == "companion":
        return "Be warm, friendly, and emotionally supportive."
    if role == "assistant":
        return "Be concise, clear, and professional."
    return ""

# Embedding model (local, fast, no API key)
embeddings = SentenceTransformerEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

# Persistent Chroma DB for conversation memory
memory_db = Chroma(
    collection_name="conversation_memory",
    persist_directory="./chroma_memory",
    embedding_function=embeddings
)

def store_message(user_id: str, message: str, emotion: str = "neutral", intensity: float = 0.5):
    """
    Store a user message in ChromaDB as vector memory
    """
    doc = Document(
        page_content=message,
        metadata={
            "user_id": user_id,
            "emotion": emotion,
            "intensity": intensity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).date().isoformat()
            }
    )
    memory_db.add_documents([doc])

def get_emotion_timeline(user_id: str, date: str):
    """
    date format: YYYY-MM-DD
    """

    # Fetch all messages for this user (semantic query can be empty)
    docs = memory_db.similarity_search(
        query="",
        k=1000,
        filter={"user_id": user_id}
    )

    timeline = []

    for doc in docs:
        meta = doc.metadata

        # Filter by date
        if meta.get("date") == date:
            timeline.append({
                "emotion": meta.get("emotion"),
                "intensity": meta.get("intensity"),
                "timestamp": meta.get("timestamp")
            })

    # Sort by timestamp
    timeline.sort(key=lambda x: x["timestamp"])

    return timeline

class EmotionGraphRequest(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD

@router.post("/emotion-graph")
def emotion_graph(input: EmotionGraphRequest):
    timeline = get_emotion_timeline(
        user_id=input.user_id,
        date=input.date
    )

    return {
        "date": input.date,
        "points": timeline
    }

def retrieve_memory(user_id: str, query: str, k: int = 5):
    """
    Retrieve semantically relevant past messages for a user
    """
    results = memory_db.similarity_search(
        query=query,
        k=k,
        filter={"user_id": user_id}
    )
    return [doc.page_content for doc in results]

def build_memory_context(user_id: str, user_text: str):
    """
    Build formatted memory context to inject into LLM prompt
    """
    past_messages = retrieve_memory(user_id, user_text)

    if not past_messages:
        return ""

    return (
        "Relevant past conversation:\n"
        + "\n".join(f"- {msg}" for msg in past_messages)
    )


# def detect_emotion(text: str) -> str:
#     """
#     Uses the LLM to classify the emotion in the user text.
#     Output is intentionally small & avatar-friendly.
#     """
#     prompt = (
#         "Classify the emotion in the following text as one of: sad, happy, angry, or neutral. "
#         "Only reply with the single word: sad, happy, angry, or neutral.\n\nText: " + text
#     )
#     emotion = client.models.generate_content(
#         model="gemini-1.5-flash", contents=prompt
#     )
#     # Clean up response to ensure only valid output
#     emotion_text = emotion.text.strip().lower()
#     if emotion_text in ["sad", "happy", "angry", "neutral"]:
#         return emotion_text
#     return "neutral"

# def classify_content(text: str) -> str:
#     """
#     Uses the LLM to classify content into safety categories: suicidal, explicit_18_plus, or safe.
#     """
#     prompt = (
#         "Classify the following text for safety. "
#         "Reply with one word: 'suicidal' if the text contains suicidal/self-harm intent, "
#         "'explicit_18_plus' if the text contains explicit sexual content, or 'safe' if neither applies.\n\nText: " + text
#     )
#     result = client.models.generate_content(
#         model="gemini-3-flash-preview", contents=prompt
#     )
#     label = result.text.strip().lower()
#     if label in ["suicidal", "explicit_18_plus", "safe"]:
#         return label
#     return "safe"
  


def detect_language(user_text: str) -> str:
    """
    Detects the language of the user input using Gemini.
    Returns ISO-style language name (e.g. English, Hindi, Spanish).
    """
    prompt = (
        "Detect the language of the following text. "
        "Reply with ONLY the language name in English (e.g. English, Hindi, Spanish, Marathi).\n\n"
        f"Text: {user_text}"
    )

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=prompt
    )

    return response.text.strip()


# ========== FINAL REPLY PIPELINE ==========

def reply(user_text: str, user_id: str, role: str, stream: bool = False):

    # 1) DETECT USER LANGUAGE
    language = detect_language(user_text)

    # 2) BUILD MEMORY CONTEXT
    memory_context = build_memory_context(user_id, user_text)
    
    # 3) PREPARE SYSTEM INSTRUCTIONS
    sys_instruction = system_prompt(language) + "\n\n" + role_prompt(role)
    if memory_context:
        sys_instruction += "\n\n" + memory_context

    # 4) CONSTRUCT MESSAGES (User only, as system is separate now)
    messages = [
        {"role": "user", "content": user_text}
    ]

    # 5) SINGLE LLM CALL
    # call_llm now handles JSON parsing (via Native JSON) and system instructions
    raw_response = call_llm(messages, system_instruction=sys_instruction)

    try:
        # It's already JSON string, just load it
        data = json.loads(raw_response)
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        data = {
            "content_type": "safe",
            "reply_text": "I'm having trouble thinking right now.",
            "emotion": "confused",
            "intensity": 0.5,
            "gesture": "none"
        }

    # Store memory only for safe content
    if data.get("content_type") == "safe":
        # Store User Message
        store_message(
            user_id=user_id, 
            message=user_text, 
            emotion=data.get("emotion", "neutral"),
            intensity=data.get("intensity", 0.0)
        )
        # Store Bot Message (so we have a timeline of BOT emotions too?)
        # Actually, store_message stores *vectors* for retrieval. 
        # Usually we only store USER messages for retrieval (to remember what user said).
        # But for the *Emotion Graph*, we might want to track the BOT'S emotion?
        # The prompt says "Store a user message". 
        # Let's stick to storing the user message for RAG. 
        # BUT the emotion graph endpoint looks at `memory_db`. 
        # If we want the graph to show the *Conversation's* emotional journey, we should store both or just user's.
        # The user's code modification to `store_message` added `emotion` and `intensity`.
        # And he called `store_message(user_id, user_text)` at the end (originally).
        # Let's save the BOT response too so the graph is richer? 
        # Or just save the User's text with the DETECTED user emotion?
        # The prompt currently only returns Bot Emotion. 
        # Let's use the Bot's emotion as the "conversation mood" for now, or just save the user text with "neutral" 
        # since we aren't running a separate user-emotion classifier.
        
        # Let's save the BOT response as a document too? 
        # "Retrieving relevant past messages" -> usually user messages.
        
        # PROPOSAL: Just store user message for now, but we need the emotion.
        # Since we don't have user emotion, we'll use the Bot's reaction emotion as a proxy for the scene?
        # Or better: We leave it as is.
        pass

    # 6) RETURN
    return {
        "text": data.get("reply_text", ""),
        "emotion": data.get("emotion", "neutral"),
        "confidence": 0.9,
        "gesture": data.get("gesture", "none"),
        "intensity": float(data.get("intensity", 0.5)),
        "sources": []
    }

# ========== TERMINAL / CLI CHAT LOOP ==========

# def start_cli_chat(user_id="terminal_user", role="assistant"):
#     """
#     Interactive terminal-style chat loop.
#     Type 'exit' to stop.
#     """
#     print("\n🧠 MIRAGE AI (Terminal Mode)")
#     print("Type your message and press Enter.")
#     print("Type 'exit' to quit.\n")

#     while True:
#         try:
#             user_text = input("You: ")

#             if user_text.lower() in ["exit", "quit"]:
#                 print("👋 Exiting MIRAGE. Goodbye!")
#                 break

#             response = reply(
#                 user_text=user_text,
#                 user_id=user_id,
#                 role=role
#             )

#             print("\nMIRAGE:", response["text"])
#             print("Emotion:", response["emotion"])
#             print("-" * 50)

#         except KeyboardInterrupt:
#             print("\n👋 Chat interrupted. Exiting.")
#             break

# start_cli_chat()

class LLMInput(BaseModel):
    user_text: str
    user_id: str
    role: str

@router.post("/llm-response")
def llm_response(input: LLMInput):
    return reply(input.user_text, input.user_id, input.role, stream=False)

