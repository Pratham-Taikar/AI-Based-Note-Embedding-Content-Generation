import { useEffect, useRef, useState } from "react";
import { parseVoiceCommand, type VoiceCommand } from "../voice/commandRouter";

type Mode = "qa" | "study";

interface VoiceButtonProps {
  onFinalText: (text: string) => void;
  onCommand?: (cmd: VoiceCommand) => void;
  mode: Mode;
  onListeningChange?: (listening: boolean) => void;
}

export const VoiceButton = ({ onFinalText, onCommand, mode, onListeningChange }: VoiceButtonProps) => {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
  }, []);

  const stopInternal = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }
    recognitionRef.current = null;
    setListening(false);
    if (onListeningChange) {
      onListeningChange(false);
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError("Voice recognition is not supported in this browser.");
      return;
    }

    setError(null);

    // Stop any ongoing speech while the user is speaking.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (!last || !last.isFinal) return;
      const transcript = last[0].transcript.trim();
      if (!transcript) return;

      const parsed = parseVoiceCommand(transcript);
      if (parsed.kind === "command") {
        if (parsed.command.type === "STOP") {
          stopInternal();
        }
        if (onCommand) {
          onCommand(parsed.command);
        }
      } else {
        onFinalText(parsed.text);
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "permission-denied") {
        setError("Microphone permission denied. Please enable it in your browser settings.");
      } else {
        setError("Voice recognition error. Please try again.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (onListeningChange) {
        onListeningChange(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    if (onListeningChange) {
      onListeningChange(true);
    }
  };

  const handleToggle = () => {
    if (listening) {
      stopInternal();
    } else {
      startListening();
    }
  };

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        Voice controls are not available in this browser.
      </p>
    );
  }

  const label = listening ? "Stop listening" : mode === "qa" ? "Speak question" : "Speak command";

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={handleToggle} className="btn-ghost text-sm">
        {label}
      </button>
      {listening && <span className="text-xs text-emerald-300">Listening...</span>}
      {error && <span className="text-xs text-red-400 max-w-xs">{error}</span>}
    </div>
  );
};

