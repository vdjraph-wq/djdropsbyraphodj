import { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Mic, Play, Square, Loader2, Volume2, Send, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import LiveAssistant from './LiveAssistant';

export default function VoiceAssistant() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voice, setVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [mode, setMode] = useState<'preview' | 'live'>('preview');
  const navigate = useNavigate();

  const generateDrop = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Generate a professional DJ drop script and speak it. Script: ${prompt}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        playPcm(bytes.buffer);
        setAudioUrl('preview-playing');
      }
    } catch (error) {
      console.error("Error generating drop:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playPcm = (buffer: ArrayBuffer) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const pcmData = new Int16Array(buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768;
    }
    const audioBuffer = audioCtx.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase italic">AI <span className="text-red-600">Voice</span> Assistant</h1>
        <p className="text-neutral-400">Preview your DJ drop script or talk live with DJ RAPHO's AI.</p>
      </div>

      <div className="flex gap-4 mb-8 justify-center">
        <button 
          onClick={() => setMode('preview')}
          className={cn(
            "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
            mode === 'preview' ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800"
          )}
        >
          <Volume2 className="w-5 h-5" />
          Drop Preview
        </button>
        <button 
          onClick={() => setMode('live')}
          className={cn(
            "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
            mode === 'live' ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          Live Talk
        </button>
      </div>

      {mode === 'live' ? (
        <div className="max-w-2xl mx-auto">
          <LiveAssistant />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Settings */}
          <div className="bg-neutral-900 p-6 rounded-3xl border border-white/5 space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Select Voice</label>
              <div className="grid grid-cols-1 gap-2">
                {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVoice(v)}
                    className={cn(
                      "px-4 py-3 rounded-xl text-left transition-all border",
                      voice === v 
                        ? "bg-red-600 border-red-500 text-white font-bold" 
                        : "bg-black/40 border-white/5 text-neutral-400 hover:border-white/20"
                    )}
                  >
                    {v} {v === 'Kore' && '(Recommended)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-neutral-900 p-6 rounded-3xl border border-white/5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your DJ drop script here... (e.g. 'You're listening to the baddest DJ in the city, DJ RAPHO!')"
                className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-lg focus:outline-none focus:border-red-600 transition-colors resize-none"
              />
              
              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  onClick={generateDrop}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                  {isGenerating ? 'Generating...' : 'Preview Voice'}
                </button>
                
                <button
                  onClick={() => navigate(`/order/voice_drop?script=${encodeURIComponent(prompt)}`)}
                  disabled={!prompt.trim()}
                  className="bg-white text-black hover:bg-neutral-200 px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
                >
                  Order High-Quality Drop
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-red-600/5 border border-red-600/10 p-6 rounded-3xl">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4 text-red-500" />
                Pro Tip
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                For the best results, include pronunciation hints in brackets. 
                Example: "DJ RAPHO [RAH-FOH] in the mix!"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
