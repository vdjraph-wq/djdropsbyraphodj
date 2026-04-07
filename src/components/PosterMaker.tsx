import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ImageIcon, Loader2, Download, Send, Layout, Maximize, Sparkles, CheckCircle, Activity, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function PosterMaker() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:3'>('1:1');
  const [animationType, setAnimationType] = useState<'none' | 'pulse' | 'float' | 'glow' | 'slide'>('none');
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'error' | 'success' | 'info'} | null>(null);
  const navigate = useNavigate();

  const [mode, setMode] = useState<'poster' | 'logo'>('poster');

  const callAiWithRetry = async (fn: () => Promise<any>, maxRetries = 3) => {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
        const isRetryable = errorStr.includes("RESOURCE_EXHAUSTED") || 
                           errorStr.includes("429") || 
                           errorStr.includes("aborted") ||
                           errorStr.includes("signal") ||
                           errorStr.includes("fetch failed") ||
                           errorStr.includes("deadline exceeded") ||
                           error?.status === 429 ||
                           error?.code === 429;
        
        if (isRetryable && i < maxRetries) {
          setStatusMessage({ text: "AI is busy or connection interrupted. Retrying...", type: 'info' });
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  const generatePoster = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    setStatusMessage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: `Generate a professional DJ ${mode === 'poster' ? 'promotional poster' : 'brand logo'}. Style: High-energy, neon, modern. Details: ${prompt}`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: mode === 'poster' ? aspectRatio : '1:1',
            imageSize: "1K"
          },
        },
      }));

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
          setStatusMessage({ text: "Design generated successfully!", type: 'success' });
          setTimeout(() => setStatusMessage(null), 3000);
          break;
        }
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
        console.log("Poster generation aborted (expected)");
        return;
      }
      console.error("Error generating poster:", error);
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      if (errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("429")) {
        setStatusMessage({ text: "AI is currently at capacity. Please try again in a moment.", type: 'error' });
      } else {
        setStatusMessage({ text: "Error generating design. Please try again.", type: 'error' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase italic">AI <span className="text-red-600">Poster</span> Maker</h1>
        <p className="text-neutral-400">Create stunning event posters and logos instantly with DJ RAPHO's AI.</p>
      </div>

      <div className="flex gap-4 mb-8 justify-center">
        <button 
          onClick={() => setMode('poster')}
          className={cn(
            "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
            mode === 'poster' ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800"
          )}
        >
          <Layout className="w-5 h-5" />
          Poster
        </button>
        <button 
          onClick={() => setMode('logo')}
          className={cn(
            "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
            mode === 'logo' ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800"
          )}
        >
          <Maximize className="w-5 h-5" />
          Logo
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Controls */}
        <div className="space-y-8">
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border",
                  statusMessage.type === 'error' ? "bg-red-600/10 border-red-600 text-red-500" :
                  statusMessage.type === 'success' ? "bg-green-600/10 border-green-600 text-green-500" :
                  "bg-blue-600/10 border-blue-600 text-blue-500"
                )}
              >
                {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                {statusMessage.text}
                <button onClick={() => setStatusMessage(null)} className="ml-auto opacity-50 hover:opacity-100">
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-neutral-900 p-8 rounded-3xl border border-white/5 space-y-6">
            <div>
              <label className="block text-sm font-bold mb-4 uppercase tracking-wider text-neutral-500">Poster Details</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your event... (e.g. 'Neon Night Party with DJ RAPHO, Friday 10th, Club X, Entry 500')"
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-lg focus:outline-none focus:border-red-600 transition-colors resize-none"
              />
            </div>

            {mode === 'poster' && (
              <div>
                <label className="block text-sm font-bold mb-4 uppercase tracking-wider text-neutral-500">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['1:1', '9:16', '16:9', '4:3'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "p-3 rounded-xl flex flex-col items-center gap-2 transition-all border",
                        aspectRatio === ratio 
                          ? "bg-red-600 border-red-500 text-white font-bold" 
                          : "bg-black/40 border-white/5 text-neutral-400 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "border-2 border-current rounded-sm",
                        ratio === '1:1' ? "w-6 h-6" :
                        ratio === '9:16' ? "w-4 h-7" :
                        ratio === '16:9' ? "w-7 h-4" : "w-7 h-5"
                      )} />
                      <span className="text-xs">{ratio}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-4 uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Subtle Animation
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['none', 'pulse', 'float', 'glow', 'slide'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAnimationType(type)}
                    className={cn(
                      "p-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      animationType === type
                        ? "bg-red-600 border-red-500 text-white"
                        : "bg-black/40 border-white/5 text-neutral-500 hover:border-white/20"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generatePoster}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-lg shadow-lg shadow-red-600/20"
            >
              {isGenerating ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ImageIcon className="w-6 h-6" />
              )}
              {isGenerating ? 'Designing...' : 'Generate Design'}
            </button>
          </div>

          <div className="bg-neutral-900/50 p-6 rounded-3xl border border-white/5">
            <h4 className="font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-sm text-red-500">
              <Layout className="w-4 h-4" />
              Design Tips
            </h4>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex gap-3">• Mention specific colors like "Neon Pink" or "Gold & Black"</li>
              <li className="flex gap-3">• Specify the mood: "Aggressive", "Elegant", or "Street"</li>
              <li className="flex gap-3">• Include key text you want on the poster</li>
            </ul>
          </div>
        </div>

        {/* Preview */}
        <div className="relative group">
          <div className={cn(
            "relative bg-neutral-900 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center transition-all duration-500",
            aspectRatio === '1:1' ? "aspect-square" :
            aspectRatio === '9:16' ? "aspect-[9/16] max-h-[80vh]" :
            aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]"
          )}>
            <AnimatePresence mode="wait">
              {generatedImage ? (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    scale: animationType === 'pulse' ? [1, 1.02, 1] : 1,
                    y: animationType === 'float' ? [0, -10, 0] : 0,
                    x: animationType === 'slide' ? [-5, 5, -5] : 0,
                    filter: animationType === 'glow' ? ["brightness(1)", "brightness(1.2)", "brightness(1)"] : "brightness(1)"
                  }}
                  transition={{
                    opacity: { duration: 0.5 },
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    x: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                    filter: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full h-full relative"
                >
                  <img src={generatedImage} alt="Generated Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedImage;
                        link.download = 'dj-rapho-poster.png';
                        link.click();
                      }}
                      className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => navigate(`/order/poster?prompt=${encodeURIComponent(prompt)}`)}
                      className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-110 transition-transform"
                    >
                      Order High-Res
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-8"
                >
                  {isGenerating ? (
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-red-600" />
                      <p className="text-neutral-500 font-medium italic">DJ RAPHO's AI is sketching your vision...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="w-16 h-16 mx-auto text-neutral-800" />
                      <p className="text-neutral-500">Your design will appear here</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
