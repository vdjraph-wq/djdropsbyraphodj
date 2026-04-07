import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function LiveAssistant() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      sessionRef.current = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are DJ RAPHO DROPS, a high-energy DJ assistant. You help users write DJ drops, suggest music, and talk about the DJ life in Kenya. Keep it hype and professional.",
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              playAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
            }
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setTranscription(prev => [...prev, `DJ RAPHO: ${message.serverContent?.modelTurn?.parts?.[0]?.text}`]);
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err: any) => {
            const msg = err?.message || String(err);
            if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
              console.log("Live session aborted (expected)");
              return;
            }
            console.error("Live API Error:", err);
            stopSession();
          }
        }
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setIsConnecting(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startMic = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(streamRef.current);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current || !isActive) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const playAudio = (base64Data: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) floatData[i] = pcmData[i] / 32768;
    
    const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  return (
    <div className="bg-neutral-900 rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-red-600/5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isActive ? "bg-green-500 animate-pulse" : "bg-neutral-700"
          )} />
          <h3 className="font-bold uppercase tracking-widest text-sm">Live AI Assistant</h3>
        </div>
        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={cn(
            "px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2",
            isActive ? "bg-red-600 hover:bg-red-700" : "bg-white text-black hover:bg-neutral-200"
          )}
        >
          {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : isActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isConnecting ? 'Connecting...' : isActive ? 'End Session' : 'Talk to DJ RAPHO'}
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-6 space-y-4 bg-black/20 font-mono text-xs">
        {transcription.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-600 italic">
            Click "Talk to DJ RAPHO" to start a live voice conversation
          </div>
        ) : (
          transcription.map((t, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={i}
              className="text-neutral-400"
            >
              {t}
            </motion.div>
          ))
        )}
      </div>
      
      {isActive && (
        <div className="p-4 bg-red-600/10 flex items-center justify-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <motion.div
                key={i}
                animate={{ height: [10, 25, 10] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-red-500 rounded-full"
              />
            ))}
          </div>
          <span className="text-xs font-bold text-red-500 uppercase tracking-tighter">Listening...</span>
        </div>
      )}
    </div>
  );
}
