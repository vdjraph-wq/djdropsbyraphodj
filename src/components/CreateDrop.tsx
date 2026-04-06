import { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Mic, Loader2, Volume2, ArrowRight, Sparkles, Download, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function CreateDrop() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voice, setVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [mode, setMode] = useState<'standard' | 'cloning'>('standard');
  const [cloningPrompt, setCloningPrompt] = useState('Deep, energetic, Jamaican style');
  const [lastGeneratedAudio, setLastGeneratedAudio] = useState<Blob | null>(null);
  const navigate = useNavigate();

  const generateDrop = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setLastGeneratedAudio(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = mode === 'cloning' 
        ? `You are a voice cloning engine. Clone the following voice style: ${cloningPrompt}. Speak the script exactly.`
        : `Generate a professional DJ drop script and speak it.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `${systemInstruction} Script: ${prompt}` }] }],
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
        
        // Create WAV blob for downloading
        const wavBlob = createWavBlob(bytes.buffer, 24000);
        setLastGeneratedAudio(wavBlob);
        
        playPcm(bytes.buffer);
      }
    } catch (error) {
      console.error("Error generating drop:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const createWavBlob = (pcmBuffer: ArrayBuffer, sampleRate: number) => {
    const pcmData = new Int16Array(pcmBuffer);
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.length * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // format chunk identifier
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.length * 2, true);

    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
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

  const downloadAudio = () => {
    if (!lastGeneratedAudio) return;
    const url = URL.createObjectURL(lastGeneratedAudio);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dj-drop-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase italic">Create Your <span className="text-red-600">DJ Drop</span></h1>
        <p className="text-neutral-400">Write your script, preview the voice, and order a high-quality studio version.</p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-neutral-900 p-1 rounded-2xl border border-white/5 flex gap-1">
          <button
            onClick={() => setMode('standard')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mode === 'standard' ? "bg-red-600 text-white" : "text-neutral-500 hover:text-white"
            )}
          >
            Standard AI
          </button>
          <button
            onClick={() => setMode('cloning')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'cloning' ? "bg-red-600 text-white" : "text-neutral-500 hover:text-white"
            )}
          >
            <Wand2 className="w-3 h-3" />
            Voice Cloning
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Settings */}
        <div className="bg-neutral-900 p-6 rounded-3xl border border-white/5 space-y-6">
          <AnimatePresence mode="wait">
            {mode === 'standard' ? (
              <motion.div
                key="standard"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Select AI Voice</label>
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
              </motion.div>
            ) : (
              <motion.div
                key="cloning"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice Description</label>
                  <textarea
                    value={cloningPrompt}
                    onChange={(e) => setCloningPrompt(e.target.value)}
                    placeholder="Describe the voice style to clone..."
                    className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-red-600 transition-colors resize-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-2 italic">
                    Example: "Deep, raspy, high-energy Jamaican MC"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Studio Quality
            </h4>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Final orders are processed by DJ RAPHO using professional studio equipment and effects.
            </p>
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-neutral-900 p-6 rounded-3xl border border-white/5">
            <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Your Script</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your DJ drop script here... (e.g. 'You're listening to the baddest DJ in the city, DJ RAPHO!')"
              className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-lg focus:outline-none focus:border-red-600 transition-colors resize-none"
            />
            
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={generateDrop}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                  {isGenerating ? 'Generating Preview...' : 'Preview AI Voice'}
                </button>
                
                {lastGeneratedAudio && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={downloadAudio}
                      className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/20 px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download Preview
                    </button>
                    <p className="text-[10px] text-center text-green-500 font-bold uppercase tracking-widest">
                      Preview Ready to Download
                    </p>
                  </motion.div>
                )}
              </div>
              
              <button
                onClick={() => navigate(`/order/voice_drop?script=${encodeURIComponent(prompt)}`)}
                disabled={!prompt.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-600/20 h-fit"
              >
                Order Studio Drop
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-3xl">
            <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">
              <Mic className="w-4 h-4 text-red-500" />
              Writing Tips
            </h4>
            <ul className="text-xs text-neutral-500 space-y-2">
              <li>• Keep it short and punchy (under 15 words)</li>
              <li>• Use brackets for pronunciation: "DJ RAPHO [RAH-FOH]"</li>
              <li>• Add "The Mix", "In the Building", or "Official" for hype</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
