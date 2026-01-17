import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { ScrollArea } from "./ui/ScrollArea";
import { SendIcon, Loader2Icon, MicIcon, Volume2Icon, VolumeXIcon, CameraIcon, CameraOffIcon } from "./Icons";
import RoleSelector from "./RoleSelector";
import AvatarScene from "../AvatarScene";


// Mood colors for UI elements (matching AvatarScene)
const MOOD_UI_COLORS = {
  neutral: { accent: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  happy: { accent: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  sad: { accent: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  angry: { accent: "#f87171", bg: "rgba(248,113,113,0.1)" },
  excited: { accent: "#f472b6", bg: "rgba(244,114,182,0.1)" },
  calm: { accent: "#34d399", bg: "rgba(52,211,153,0.1)" },
  confused: { accent: "#fcd34d", bg: "rgba(252,211,77,0.1)" },
  thinking: { accent: "#818cf8", bg: "rgba(129,140,248,0.1)" },
};

// Simple mood detection from text
const detectMoodFromText = (text) => {
  const lowerText = text.toLowerCase();

  // Happy indicators
  if (/\b(happy|glad|great|awesome|wonderful|excited|amazing|love|yay|haha|lol|:D|:\)|good)\b/.test(lowerText)) {
    return "happy";
  }
  // Sad indicators
  if (/\b(sad|unhappy|depressed|down|crying|tears|miss|lonely|sorry|unfortunately)\b/.test(lowerText)) {
    return "sad";
  }
  // Angry indicators
  if (/\b(angry|mad|furious|hate|annoyed|frustrated|pissed|upset|damn|ugh)\b/.test(lowerText)) {
    return "angry";
  }
  // Excited indicators
  if (/\b(excited|thrilled|can't wait|omg|wow|incredible|fantastic)\b/.test(lowerText)) {
    return "excited";
  }
  // Confused indicators
  if (/\b(confused|don't understand|what\?|huh|unclear|lost|puzzled|\?{2,})\b/.test(lowerText)) {
    return "confused";
  }
  // Calm indicators
  if (/\b(calm|relaxed|peaceful|chill|zen|okay|fine|alright)\b/.test(lowerText)) {
    return "calm";
  }

  return "neutral";
};

const styles = {
  container: {
    display: "flex",
    height: "100%", // Changed from 100vh to fit in App layout
    backgroundColor: "var(--background)",
  },
  mainArea: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    gap: 0,
  },
  avatarSection: {
    width: "40%",
    minWidth: "350px",
    position: "relative",
    borderRight: "1px solid var(--border)",
    overflow: "hidden",
  },
  avatarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  chatSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--card)",
  },
  chatHeader: {
    borderBottom: "1px solid var(--border)",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "background-color 0.3s ease",
  },
  headerTitle: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--foreground)",
    textTransform: "capitalize",
    margin: 0,
  },
  headerSubtitle: {
    fontSize: "14px",
    color: "var(--muted-foreground)",
    margin: "4px 0 0 0",
  },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    transition: "background-color 0.3s ease, box-shadow 0.3s ease",
  },
  statusText: {
    fontSize: "12px",
    color: "var(--muted-foreground)",
    textTransform: "capitalize",
  },
  moodBadge: {
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 500,
    textTransform: "capitalize",
    transition: "all 0.3s ease",
    marginLeft: "12px",
  },
  messagesContainer: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
  },
  messagesInner: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingBottom: "16px",
  },
  messageRow: {
    display: "flex",
    animation: "fadeSlideIn 0.3s ease",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: "12px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  userMessage: {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    borderBottomRightRadius: "4px",
    marginLeft: "auto",
  },
  botMessage: {
    backgroundColor: "var(--secondary)",
    color: "var(--card-foreground)",
    borderBottomLeftRadius: "4px",
  },
  messageText: {
    fontSize: "14px",
    lineHeight: 1.5,
    margin: 0,
  },
  messageTime: {
    fontSize: "11px",
    marginTop: "4px",
    opacity: 0.7,
  },
  inputArea: {
    borderTop: "1px solid var(--border)",
    padding: "16px 24px",
    backgroundColor: "var(--card)",
    transition: "background-color 0.3s ease",
  },
  inputForm: {
    display: "flex",
    gap: "12px",
  },
  sendButton: {
    gap: "8px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  genderButton: {
    position: "absolute",
    bottom: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    backdropFilter: "blur(8px)",
    backgroundColor: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(0,0,0,0.1)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  typingIndicator: {
    display: "flex",
    gap: "4px",
    padding: "8px 16px",
    backgroundColor: "var(--secondary)",
    borderRadius: "12px",
    borderBottomLeftRadius: "4px",
    width: "fit-content",
  },
  typingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--muted-foreground)",
    animation: "typingBounce 1.4s ease-in-out infinite",
  },
  // SPEAKING MIC - Microphone button style
  micButton: {
    padding: "10px",
    borderRadius: "8px",
    backgroundColor: "var(--secondary)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  micButtonActive: {
    backgroundColor: "var(--destructive)",
    color: "var(--destructive-foreground)",
    border: "1px solid var(--destructive)",
    animation: "pulse 1s infinite",
  },
};

// Voice selection utility
const getVoiceForGender = (gender) => {
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

  const malePatterns = ["male", "david", "james", "daniel", "george", "guy", "aaron", "reed", "evan", "tom"];
  const femalePatterns = ["female", "samantha", "victoria", "karen", "moira", "fiona", "susan", "zira", "hazel", "sara"];

  let selectedVoice = null;

  if (gender === "male") {
    selectedVoice = englishVoices.find((v) =>
      malePatterns.some((pattern) => v.name.toLowerCase().includes(pattern))
    );
    if (!selectedVoice) {
      selectedVoice = englishVoices.find((v) =>
        !femalePatterns.some((pattern) => v.name.toLowerCase().includes(pattern))
      );
    }
  } else {
    selectedVoice = englishVoices.find((v) =>
      femalePatterns.some((pattern) => v.name.toLowerCase().includes(pattern))
    );
    if (!selectedVoice) {
      selectedVoice = englishVoices.find((v) =>
        !malePatterns.some((pattern) => v.name.toLowerCase().includes(pattern))
      );
    }
  }

  if (!selectedVoice) selectedVoice = englishVoices[0] || voices[0];
  return selectedVoice;
};

// Typing indicator component
const TypingIndicator = () => (
  <div style={styles.typingIndicator}>
    <div style={{ ...styles.typingDot, animationDelay: "0s" }} />
    <div style={{ ...styles.typingDot, animationDelay: "0.2s" }} />
    <div style={{ ...styles.typingDot, animationDelay: "0.4s" }} />
  </div>
);

export default function ChatPage() {
  const [isTyping, setIsTyping] = useState(false);
  const [currentMood, setCurrentMood] = useState("neutral");

  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I'm excited to chat with you today.",
      sender: "bot",
      timestamp: new Date(),
      mood: "happy",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [role, setRole] = useState("companion");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarState, setAvatarState] = useState("idle");
  const [avatarGender, setAvatarGender] = useState("female");
  const [isMuted, setIsMuted] = useState(false); // Mute state
  const [isCameraEnabled, setIsCameraEnabled] = useState(true); // Camera toggle state
  const [attentionStatus, setAttentionStatus] = useState("LOOKING");

  // SPEAKING MIC - State for microphone recording
  const [isMicRecording, setIsMicRecording] = useState(false);
  const scrollRef = useRef(null);

  // SPEAKING MIC - Refs for audio recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null); // Ref to hold current audio object
  const wasPlayingRef = useRef(false); // Track if audio was playing before looking away

  // Poll for attention status
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isCameraEnabled) return; // Skip polling if camera is disabled

      try {
        const res = await fetch("http://localhost:8000/attention_status");
        if (res.ok) {
          const data = await res.json();
          setAttentionStatus(data.status);
        }
      } catch (e) {
        // console.error("Attention poll error", e);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isCameraEnabled]);

  // Handle auto-pause/resume based on attention
  useEffect(() => {
    if (currentAudioRef.current) {
      if (attentionStatus === "NOT_LOOKING" || attentionStatus === "NO_FACE") {
        // Only pause if camera is enabled (if disabled, we assume user wants audio to play freely or we don't track)
        if (isCameraEnabled && !currentAudioRef.current.paused) {
          currentAudioRef.current.pause();
          wasPlayingRef.current = true;
          setAvatarState("idle"); // Pause animation
        }
      } else if (attentionStatus === "LOOKING") {
        if (wasPlayingRef.current) {
          currentAudioRef.current.play().catch(e => console.error("Resume error", e));
          wasPlayingRef.current = false;
          setAvatarState("talking"); // Resume animation
        }
      }
    }
  }, [attentionStatus]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Update avatar mood when currentMood changes
  useEffect(() => {
    if (window.setMood) {
      window.setMood(currentMood);
    }
  }, [currentMood]);

  // Fetch and play TTS audio from backend
  const speakText = async (text) => {
    try {
      // Set avatar to talking state
      if (window.startLipSync) window.startLipSync();
      setAvatarState("talking");

      const response = await fetch("http://localhost:8000/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          gender: avatarGender, // Pass current avatar gender
        }),
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        if (window.startLipSync) window.startLipSync();
        setAvatarState("talking");
      };

      audio.onended = () => {
        if (window.stopLipSync) window.stopLipSync();
        setAvatarState("idle");
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        if (window.stopLipSync) window.stopLipSync();
        setAvatarState("idle");
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      if (!isMuted) {
        audio.play().catch(e => console.error("Audio play error:", e));
      }

    } catch (error) {
      console.error("TTS Error:", error);
      setAvatarState("idle");
      // Fallback or error handling if needed, but avoiding browser TTS as requested
    }
  };

  // SPEAKING MIC - Play base64 encoded audio with avatar lip sync
  const playBase64Audio = (base64Audio) => {
    return Promise.resolve(); /*
    return new Promise((resolve, reject) => {
      try {
        // Decode base64 to binary
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob and audio URL
        const blob = new Blob([bytes], { type: "audio/mp3" });
        const audioUrl = URL.createObjectURL(blob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          if (window.startLipSync) window.startLipSync();
          setAvatarState("talking");
        };

        audio.onended = () => {
          if (window.stopLipSync) window.stopLipSync();
          setAvatarState("idle");
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };

        audio.onerror = (e) => {
          if (window.stopLipSync) window.stopLipSync();
          setAvatarState("idle");
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          reject(e);
        };

        if (!isMuted) {
          audio.play().catch(e => reject(e));
        } else {
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  */ };

  // SPEAKING MIC - Start recording audio from microphone
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        // Create audio blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Process the recorded audio
        await processSpeechChat(audioBlob);
      };

      mediaRecorder.start();
      setIsMicRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  // SPEAKING MIC - Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsMicRecording(false);
    }
  };

  // SPEAKING MIC - Toggle recording
  const toggleRecording = () => {
    if (isMicRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // SPEAKING MIC - Process recorded audio through speech-chat endpoint
  const processSpeechChat = async (audioBlob) => {
    setIsLoading(true);
    setAvatarState("thinking");
    setIsTyping(true);

    // Set thinking mood
    if (window.setMood) {
      window.setMood("thinking");
    }

    try {
      // Create form data with audio file
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("user_id", "web_user");
      formData.append("role", role);
      formData.append("gender", avatarGender); // Pass current avatar gender

      // Send to backend speech-chat endpoint
      const response = await fetch("http://localhost:8000/speech-chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract response data
      const { transcript, llm, audio_b64 } = data;

      // Detect mood from user's transcribed message
      const userMood = detectMoodFromText(transcript);

      // Add user message (transcribed text)
      const userMessage = {
        id: Date.now().toString(),
        text: transcript,
        sender: "user",
        timestamp: new Date(),
        mood: userMood,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Update mood from LLM response emotion
      const responseMood = llm.emotion || "neutral";
      setCurrentMood(responseMood);
      setExpressionForMood(responseMood);

      // Add bot message
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: llm.text,
        sender: "bot",
        timestamp: new Date(),
        mood: responseMood,
      };
      setMessages((prev) => [...prev, botMessage]);

      setIsTyping(false);
      setIsLoading(false);

      // Play the audio response with lip sync
      if (audio_b64) {
        await playBase64Audio(audio_b64);
      } else {
        // Fallback to browser TTS if no audio
        speakText(llm.text);
      }

    } catch (error) {
      console.error("Speech chat error:", error);
      setIsTyping(false);
      setIsLoading(false);
      setAvatarState("idle");

      // Add error message to chat
      const errorMessage = {
        id: Date.now().toString(),
        text: "Sorry, there was an error processing your voice message. Please try again.",
        sender: "bot",
        timestamp: new Date(),
        mood: "neutral",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Set avatar expression based on mood
  const setExpressionForMood = (mood) => {
    if (window.setExpression) {
      switch (mood) {
        case "happy":
        case "excited":
          window.setExpression("happy");
          break;
        case "angry":
          window.setExpression("angry");
          break;
        case "sad":
        case "confused":
        case "neutral":
        case "calm":
        default:
          window.setExpression("neutral");
      }
    }
  };

  // Handle role change
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    // Set initial mood based on role
    if (newRole === "companion") {
      setCurrentMood("happy");
      setExpressionForMood("happy");
    } else {
      setCurrentMood("neutral");
      setExpressionForMood("neutral");
    }
  };

  // Handle avatar gender toggle
  const toggleAvatarGender = () => {
    const newGender = avatarGender === "female" ? "male" : "female";
    setAvatarGender(newGender);
    if (window.setGender) {
      window.setGender(newGender);
    }
  };

  // Handle Mute Toggle
  const toggleMute = () => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (currentAudioRef.current) {
        if (newMuted) {
          currentAudioRef.current.pause();
        } else {
          currentAudioRef.current.play().catch(err => console.error("Resume failed:", err));
        }
      }
      return newMuted;
    });
  };

  // Handle Camera Toggle
  const toggleCamera = () => {
    setIsCameraEnabled(prev => !prev);
    // If disabling, ensure we don't get stuck in paused state?
    // Actually, if we disable, we probably want to resume audio if it was paused due to "not looking"
    // But strictly, if we disable camera, we stop TRACKING attention.
    // If audio was paused because I looked away, and then I disable camera, should it resume?
    // Probably yes, because "camera disabled" implies "ignore my face".
    if (!isCameraEnabled) { // effectively becoming enabled
      setAttentionStatus("LOOKING"); // Assuming looking when turning on until detected otherwise?
    } else { // becoming disabled
      setAttentionStatus("LOOKING"); // Reset to LOOKING so audio resumes/keeps playing
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Detect mood from user's message
    const detectedMood = detectMoodFromText(inputValue);
    setCurrentMood(detectedMood);
    setExpressionForMood(detectedMood);

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
      mood: detectedMood,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setAvatarState("thinking");
    setIsTyping(true);

    // Set thinking mood
    if (window.setMood) {
      window.setMood("thinking");
    }

    try {
      const response = await fetch("http://localhost:8000/llm-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_text: inputValue,
          user_id: "web_user",
          role: role,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const llm = await response.json();

      // Determine response mood
      // Use emotion from backend, or fallback to happy/neutral
      const responseMood = llm.emotion || "neutral";
      setCurrentMood(responseMood);
      setExpressionForMood(responseMood);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: llm.text,
        sender: "bot",
        timestamp: new Date(),
        mood: responseMood,
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);

      // Start "talking" animation
      setAvatarState("talking");
      setIsTyping(false);

      // Speak the response with lip sync
      speakText(llm.text);

    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      setIsTyping(false);
      setAvatarState("idle");

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again.",
        sender: "bot",
        timestamp: new Date(),
        mood: "sad",
      };
      setMessages((prev) => [...prev, errorMessage]);
      speakText("Sorry, I'm having trouble connecting right now.");
    }
  };

  const getStatusDotStyle = () => {
    const moodColor = MOOD_UI_COLORS[currentMood]?.accent || MOOD_UI_COLORS.neutral.accent;
    return {
      ...styles.statusDot,
      backgroundColor: avatarState === "talking" ? moodColor : avatarState === "thinking" ? MOOD_UI_COLORS.thinking.accent : "var(--muted)",
      boxShadow: avatarState !== "idle" ? `0 0 8px ${moodColor}` : "none",
      animation: avatarState === "talking" || avatarState === "thinking" ? "pulse 1s infinite" : "none",
    };
  };

  const getMoodBadgeStyle = () => {
    const colors = MOOD_UI_COLORS[currentMood] || MOOD_UI_COLORS.neutral;
    return {
      ...styles.moodBadge,
      backgroundColor: colors.bg,
      color: colors.accent,
      border: `1px solid ${colors.accent}`,
    };
  };

  return (
    <div style={styles.container}>
      {/* Sidebar - Role Selector */}
      <RoleSelector role={role} onRoleChange={handleRoleChange} />

      {/* Main Chat Area */}
      <div style={styles.mainArea}>
        {/* Avatar Section */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarContainer}>
            <AvatarScene />
          </div>
          {/* Gender Toggle Button */}
          <Button
            onClick={toggleAvatarGender}
            variant="secondary"
            style={styles.genderButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(-50%) scale(1.05)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateX(-50%) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
            }}
          >
            Switch to {avatarGender === "female" ? "Male" : "Female"}
          </Button>

          {/* Camera Feed - Moved to Left Side (Avatar Section) */}
          {isCameraEnabled && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              overflow: 'hidden',
              width: '120px',
              height: '90px',
              zIndex: 20,
              backgroundColor: "#000",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}>
              <img
                src="http://localhost:8000/video_feed"
                alt="Camera"
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              {(attentionStatus === "NOT_LOOKING" || attentionStatus === "NO_FACE") && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(2px)'
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>
                    {attentionStatus === "NO_FACE" ? "No Face" : "Paused"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div style={styles.chatSection}>
          {/* Chat Header */}
          <div style={{
            ...styles.chatHeader,
            backgroundColor: MOOD_UI_COLORS[currentMood]?.bg || "transparent",
          }}>


            <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div>
                <h1 style={styles.headerTitle}>{role} Mode</h1>
                <p style={styles.headerSubtitle}>
                  {role === "teacher" && "Let me help you learn"}
                  {role === "companion" && "Let's chat together"}
                  {role === "assistant" && "How can I help?"}
                </p>
              </div>
              <span style={getMoodBadgeStyle()}>{currentMood}</span>
            </div>
            <div style={styles.statusContainer}>
              {/* Mute/Unmute Button */}
              <button
                onClick={toggleMute}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--foreground)",
                  opacity: 0.7,
                  transition: "opacity 0.2s ease, background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.opacity = 1;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.opacity = 0.7;
                }}
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isMuted ? <VolumeXIcon size={20} /> : <Volume2Icon size={20} />}
              </button>

              {/* Camera Toggle Button */}
              <button
                onClick={toggleCamera}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--foreground)",
                  opacity: 0.7,
                  transition: "opacity 0.2s ease, background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.opacity = 1;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.opacity = 0.7;
                }}
                title={isCameraEnabled ? "Disable Camera" : "Enable Camera"}
              >
                {isCameraEnabled ? <CameraIcon size={20} /> : <CameraOffIcon size={20} />}
              </button>
              <div style={getStatusDotStyle()} />
              <span style={styles.statusText}>{avatarState}</span>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea style={styles.messagesContainer}>
            <div style={styles.messagesInner}>
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(message.sender === "user" ? styles.userMessage : styles.botMessage),
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <p style={styles.messageText}>{message.text}</p>
                    <p style={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
                  <TypingIndicator />
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div style={{
            ...styles.inputArea,
            backgroundColor: MOOD_UI_COLORS[currentMood]?.bg || "var(--card)",
          }}>
            <form onSubmit={handleSendMessage} style={styles.inputForm}>
              {/* SPEAKING MIC - Microphone button for voice input */}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading}
                style={{
                  ...styles.micButton,
                  ...(isMicRecording ? styles.micButtonActive : {}),
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!isMicRecording && !isLoading) {
                    e.currentTarget.style.backgroundColor = "var(--muted)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMicRecording && !isLoading) {
                    e.currentTarget.style.backgroundColor = "var(--secondary)";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
                title={isMicRecording ? "Stop recording" : "Start voice input"}
              >
                <MicIcon size={20} />
              </button>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                style={{ flex: 1 }}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                style={{
                  ...styles.sendButton,
                  backgroundColor: MOOD_UI_COLORS[currentMood]?.accent || "var(--primary)",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && inputValue.trim()) {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2Icon size={16} />
                    <span>Sending</span>
                  </>
                ) : (
                  <>
                    <SendIcon size={16} />
                    <span>Send</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
