"use client";

import { useEffect, useRef, useState } from "react";
import { Lead, ConversationMessage } from "@/lib/types";
import { getLead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, Volume2 } from "lucide-react";

type Language = "en" | "ms";

interface Message {
  id: string;
  sender: "ai" | "lead";
  text: string;
}

export default function CallPage() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [sessionId] = useState(() => `call-${Date.now()}`);
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setLeadId(params.get("leadId"));
  }, []);

  useEffect(() => {
    if (!leadId) return;
    getLead(leadId).then(setLead).catch(() => setLead(null));
  }, [leadId]);

  const addMessage = (sender: "ai" | "lead", text: string) => {
    setMessages((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender, text }];
      messagesRef.current = next;
      return next;
    });
  };

  const speak = async (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined") {
      onEnd?.();
      return;
    }
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "TTS request failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        onEnd?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        onEnd?.();
      };
      await audio.play();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not play AI voice";
      setError(message);
      setIsSpeaking(false);
      onEnd?.();
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Microphone input is not supported in this browser.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === "ms" ? "ms-MY" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const results = event.results as { isFinal: boolean; [index: number]: { transcript: string } }[];
        const last = results[results.length - 1];
        const text = last[0].transcript;
        setTranscript(text);
        if (last.isFinal && text.trim()) {
          handleUserMessage(text);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setError("Could not start microphone.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
    setTranscript("");
  };

  const handleUserMessage = async (text: string) => {
    stopListening();
    setTranscript("");
    const previousMessages = messagesRef.current;
    addMessage("lead", text);
    setIsThinking(true);
    try {
      const conversation: ConversationMessage[] = previousMessages.map((m) => ({
        id: m.id,
        conversationId: leadId || "web-call",
        sender: m.sender,
        channel: "web",
        content: m.text,
        createdAt: new Date().toISOString(),
      }));
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          leadId: leadId || undefined,
          leadName: lead?.name,
          channel: "web",
          message: text,
          conversation,
          qualification: lead?.qualification,
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = (await res.json()) as { message?: string; error?: string };
      if (data.error) throw new Error(data.error);
      const reply = data.message || "I didn't catch that, could you repeat?";
      addMessage("ai", reply);
      setIsThinking(false);
      speak(reply, () => startListening());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setIsThinking(false);
      addMessage("ai", "I'm sorry, I didn't catch that. Could you say it again?");
      speak("I'm sorry, I didn't catch that. Could you say it again?", () => startListening());
    }
  };

  const handleCall = () => {
    setIsCalling(true);
    setError(null);
    const namePart = lead?.name ? `${lead.name}, ` : "";
    const greeting =
      language === "ms"
        ? `Hai ${namePart}ini Sara dari KeyNest. Apa yang boleh saya bantu hari ini?`
        : `Hi ${namePart}this is Sara from KeyNest. I'm your property assistant. How can I help you today?`;
    addMessage("ai", greeting);
    speak(greeting, () => startListening());
  };

  const handleEnd = () => {
    stopListening();
    setIsSpeaking(false);
    setIsThinking(false);
    setIsCalling(false);
    setError(null);
    setTranscript("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 p-6 text-stone-100">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <div
            className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
              isListening ? "bg-emerald-500/40 animate-pulse" : isSpeaking ? "bg-amber-500/30" : "bg-emerald-500/20"
            }`}
          >
            {isListening ? <Mic className="h-10 w-10 text-emerald-400" /> : isSpeaking ? <Volume2 className="h-10 w-10 text-amber-400" /> : <Phone className="h-10 w-10 text-emerald-400" />}
          </div>
          <h1 className="text-2xl font-semibold">
            {!isCalling
              ? "Call Sara"
              : isListening
                ? "Listening..."
                : isSpeaking
                  ? "Sara is speaking..."
                  : isThinking
                    ? "Sara is thinking..."
                    : "Call in progress"}
          </h1>
          <p className="text-stone-400">{lead ? `Property AI assistant for ${lead.name}` : "Your KeyNest property AI assistant"}</p>
        </div>

        {!isCalling && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <label htmlFor="language" className="text-sm text-stone-400">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="ms">Bahasa Malaysia</option>
              </select>
            </div>
            <p className="text-sm text-stone-400">Click Call to start a real-time voice conversation in your browser.</p>
            <div className="flex justify-center gap-4">
              <Button size="lg" className="h-14 w-14 rounded-full bg-emerald-600 p-0 hover:bg-emerald-500" onClick={handleCall}>
                <Phone className="h-6 w-6" />
              </Button>
              <Button size="lg" className="h-14 w-14 rounded-full bg-red-600 p-0 hover:bg-red-500" onClick={handleEnd}>
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}

        {isCalling && (
          <div className="space-y-4">
            <div className="h-64 overflow-y-auto rounded-2xl bg-stone-900 p-4 text-left shadow-inner">
              {messages.map((m) => (
                <div key={m.id} className={`mb-3 flex items-start gap-3 ${m.sender === "ai" ? "" : "flex-row-reverse"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.sender === "ai" ? "bg-emerald-600" : "bg-stone-700"}`}>
                    {m.sender === "ai" ? <Mic className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.sender === "ai" ? "rounded-tl-none bg-emerald-900 text-emerald-50" : "rounded-tr-none bg-stone-800 text-stone-100"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {transcript && (
                <div className="mb-3 flex flex-row-reverse items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-700">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div className="max-w-[75%] rounded-2xl rounded-tr-none bg-stone-800 px-4 py-2 text-sm text-stone-400">{transcript}</div>
                </div>
              )}
              {messages.length === 0 && !transcript && <p className="text-sm text-stone-500">Sara is speaking…</p>}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button size="lg" className="h-14 w-14 rounded-full bg-red-600 p-0 hover:bg-red-500" onClick={handleEnd}>
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        )}

        <p className="text-xs text-stone-500">Powered by ElevenLabs text-to-speech. No phone number or Twilio is used.</p>
      </div>
    </div>
  );
}
