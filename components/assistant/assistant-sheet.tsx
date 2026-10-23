"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ASSISTANT_OFFLINE_MESSAGE,
  SUGGESTED_COMMANDS,
  canUseAiAssistant,
  executeAssistantCommand,
  parseAssistantCommand,
  type AssistantExecutionCallbacks,
  type AssistantExecutionContext,
  type AssistantMessage,
  type AssistantResultCard,
  type VoiceState,
} from "@/lib/assistant";
import { cn } from "@/lib/utils";

type AssistantSheetProps = {
  open: boolean;
  onClose: () => void;
  isOnline: boolean;
  context: AssistantExecutionContext;
  callbacks: AssistantExecutionCallbacks;
  onCardAction?: (actionId: string) => void;
};

function createMessage(
  role: AssistantMessage["role"],
  text: string,
  extra?: Partial<AssistantMessage>,
): AssistantMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    text,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

function ResultCardView({
  card,
  onAction,
}: {
  card: AssistantResultCard;
  onAction?: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
      <p className="text-sm font-bold text-slate-900">{card.title}</p>
      <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
        {card.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {card.actions?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {card.actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => onAction?.(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AssistantSheet({
  open,
  onClose,
  isOnline,
  context,
  callbacks,
  onCardAction,
}: AssistantSheetProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    createMessage(
      "assistant",
      "Hi! I'm Shivshakti AI Assistant. I can help you create products, calculate cutting sizes, show workshop cost, and navigate the app.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("ready");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<{
    command: Parameters<typeof executeAssistantCommand>[0];
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);
  const transcriptRef = useRef("");

  const canUse = canUseAiAssistant();

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open, liveTranscript]);

  const runCommand = useCallback(
    async (text: string, voiceTranscript?: string, confirmed = false) => {
      if (!text.trim() || !canUse) return;

      setMessages((prev) => [...prev, createMessage("user", text)]);
      setIsProcessing(true);
      setLiveTranscript("");

      const command = await parseAssistantCommand(text, isOnline);
      const execContext = { ...context, voiceTranscript };
      const result = await executeAssistantCommand(command, execContext, callbacks, {
        confirmed,
      });

      setIsProcessing(false);

      if (result.status === "pending-confirmation" && result.command) {
        setPendingConfirm({ command: result.command });
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", result.message, { command: result.command, card: result.card }),
        ]);
        return;
      }

      setPendingConfirm(null);
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", result.message, { card: result.card }),
      ]);
    },
    [callbacks, canUse, context, isOnline],
  );

  function handleSend() {
    void runCommand(input);
    setInput("");
  }

  function handleSuggested(chip: string) {
    void runCommand(chip);
  }

  function handleConfirm() {
    if (!pendingConfirm) return;
    void runCommand(pendingConfirm.command.rawText ?? "", context.voiceTranscript, true);
    setPendingConfirm(null);
  }

  function speakText(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (typeof window === "undefined") return;

    type SpeechRecognitionInstance = {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onstart: (() => void) | null;
      onresult: ((event: {
        resultIndex: number;
        results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } };
      }) => void) | null;
      onerror: ((event: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };

    const SpeechRecognitionCtor =
      window.SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceState("unavailable");
      return;
    }

    const recognition = new SpeechRecognitionCtor() as SpeechRecognitionInstance;
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setVoiceState("listening");
      setLiveTranscript("");
      transcriptRef.current = "";
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      const combined = (final || interim).trim();
      transcriptRef.current = combined;
      setLiveTranscript(combined);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") setVoiceState("permission-denied");
      else if (event.error === "no-speech") setVoiceState("could-not-understand");
      else setVoiceState("could-not-understand");
    };

    recognition.onend = () => {
      setVoiceState("processing");
      const transcript = transcriptRef.current.trim();
      recognitionRef.current = null;
      if (transcript) {
        void runCommand(transcript, transcript).finally(() => setVoiceState("ready"));
      } else {
        setVoiceState("could-not-understand");
        setTimeout(() => setVoiceState("ready"), 2000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close assistant"
        className="fixed inset-0 z-[60] bg-slate-900/40 md:hidden"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shivshakti AI Assistant"
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-h-[min(78vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:bottom-auto md:top-16 md:right-4 md:left-auto md:max-h-[70vh] md:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">Shivshakti AI Assistant</p>
              <p className="text-[10px] text-slate-500">Text & voice commands</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {!isOnline ? (
          <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            {ASSISTANT_OFFLINE_MESSAGE}
          </p>
        ) : null}

        {!canUse ? (
          <p className="px-4 py-3 text-sm text-red-700">AI Assistant is not available for your role.</p>
        ) : null}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-800",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.card ? (
                <div className="mt-2">
                  <ResultCardView
                    card={msg.card}
                    onAction={(id) => {
                      if (id === "confirm") handleConfirm();
                      else if (id === "cancel") setPendingConfirm(null);
                      else onCardAction?.(id);
                    }}
                  />
                </div>
              ) : null}
              {msg.role === "assistant" && msg.card ? (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700"
                  onClick={() => speakText(`${msg.card?.title}. ${msg.card?.lines.join(". ")}`)}
                >
                  <Volume2 className="size-3" />
                  Read Aloud
                </button>
              ) : null}
            </div>
          ))}

          {liveTranscript ? (
            <p className="text-xs italic text-slate-500">Listening: {liveTranscript}</p>
          ) : null}

          {voiceState === "listening" ? (
            <p className="text-xs font-medium text-violet-700">Listening…</p>
          ) : null}
          {voiceState === "processing" || isProcessing ? (
            <p className="text-xs font-medium text-slate-500">Processing…</p>
          ) : null}
          {voiceState === "permission-denied" ? (
            <p className="text-xs text-red-600">Microphone permission denied.</p>
          ) : null}
          {voiceState === "unavailable" ? (
            <p className="text-xs text-red-600">Microphone unavailable on this device.</p>
          ) : null}
          {voiceState === "could-not-understand" ? (
            <p className="text-xs text-amber-700">Could not understand. Please try again.</p>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-3 py-2">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {SUGGESTED_COMMANDS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSuggested(chip)}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              aria-label={voiceState === "listening" ? "Stop listening" : "Start voice input"}
              disabled={!canUse || isProcessing}
              onClick={voiceState === "listening" ? stopListening : startListening}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                voiceState === "listening"
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-slate-200 bg-white text-violet-700",
              )}
            >
              {voiceState === "listening" ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Type a command…"
              disabled={!canUse || isProcessing}
              className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <Button
              type="button"
              size="icon"
              className="size-10 shrink-0 rounded-xl"
              disabled={!canUse || isProcessing || !input.trim()}
              onClick={handleSend}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
