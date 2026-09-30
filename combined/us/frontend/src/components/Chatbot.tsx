import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Mic, Square, Send, Volume2, VolumeX } from "lucide-react";
import { api } from "@/lib/api";
import { getHistory } from "@/lib/predictionHistory";

type ChatMessage = { role: "assistant" | "user"; content: string };

// Minimal ambient typing for the Web Speech API — not in standard TS DOM libs.
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your BreatheSafe assistant. Ask me about your air quality or risk prediction.",
    },
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => setMessage(event.results[0][0].transcript);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    };
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) {
      alert("Voice input isn't supported in this browser. Try Google Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        // ignore — already starting
      }
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  async function sendMessage() {
    const text = message.trim();
    if (!text || loading) return;

    stopSpeaking();
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessage("");
    setLoading(true);

    try {
      const history = getHistory();
      const latestPrediction = history.length > 0 ? history[0] : null;
      const data = await api.chat(text, latestPrediction);
      const reply = data.reply || "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the assistant. Make sure the backend is running and GROQ_API_KEY is set.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function closeChatbot() {
    stopSpeaking();
    if (recognitionRef.current && listening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
    }
    setListening(false);
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open BreatheSafe assistant"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sunset text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-5 sm:py-3.5"
        >
          <MessageCircle className="h-6 w-6 sm:h-4.5 sm:w-4.5" />
          <span className="hidden text-sm font-semibold sm:inline">Ask BreatheSafe</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-x-4 bottom-4 top-auto z-50 flex h-[520px] max-h-[75vh] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-3.5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full bg-safe shadow-[0_0_8px_var(--safe)]" />
                BreatheSafe Assistant
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Powered by Groq</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={stopSpeaking}
                title="Stop voice"
                aria-label="Stop voice"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <VolumeX className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeChatbot}
                title="Close"
                aria-label="Close chatbot"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
            {messages.map((item, i) => (
              <div
                key={i}
                className={
                  item.role === "user"
                    ? "max-w-[82%] self-end rounded-2xl rounded-br-sm bg-sunset px-3.5 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[82%] self-start rounded-2xl rounded-bl-sm border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground"
                }
              >
                {item.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[82%] self-start rounded-2xl rounded-bl-sm border border-border bg-secondary/50 px-3.5 py-2.5 text-sm text-muted-foreground">
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-end gap-1.5 border-t border-border bg-secondary/20 p-3">
            <textarea
              className="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              placeholder={listening ? "Listening..." : "Ask about your risk..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              title={listening ? "Stop listening" : "Speak"}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              className={
                listening
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-high text-primary-foreground"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              }
            >
              {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              title="Send"
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sunset text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
