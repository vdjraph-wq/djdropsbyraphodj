import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Image as ImageIcon, Loader2, Download, Sparkles, Wand2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function PhotoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [style, setStyle] = useState('Professional DJ Poster, neon lights, high contrast');

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const fullPrompt = `${style}. Subject: ${prompt}. High quality, 4k resolution, cinematic lighting.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: fullPrompt },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `dj-rapho-design-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-600/10 border border-purple-600/20 rounded-full text-purple-500 text-xs font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3 h-3" />
          AI Design Studio
        </div>
        <h1 className="text-4xl font-black mb-4 uppercase italic">AI <span className="text-purple-600">Photo Generator</span></h1>
        <p className="text-neutral-400">Create professional posters and logos for your DJ brand in seconds.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Controls */}
        <div className="space-y-8">
          <div className="bg-neutral-900 p-8 rounded-[3rem] border border-white/5 space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">What should we create?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision (e.g. 'A futuristic DJ booth with glowing red decks and a crowd in the background')"
                className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-lg focus:outline-none focus:border-purple-600 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Aspect Ratio</label>
                <div className="flex gap-2">
                  {(['1:1', '16:9', '9:16'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[10px] font-black border transition-all",
                        aspectRatio === r ? "bg-purple-600 border-purple-500 text-white" : "bg-black/40 border-white/5 text-neutral-500"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Style Preset</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs text-neutral-300 focus:outline-none focus:border-purple-600"
                >
                  <option value="Professional DJ Poster, neon lights, high contrast">Neon Nightlife</option>
                  <option value="Minimalist DJ Logo, vector art, clean lines, black and gold">Minimalist Logo</option>
                  <option value="3D Render, futuristic, chrome textures, cinematic lighting">Futuristic 3D</option>
                  <option value="Vintage vinyl record style, retro colors, grainy texture">Retro Vinyl</option>
                </select>
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-600/20"
            >
              {isGenerating ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Wand2 className="w-6 h-6" />
              )}
              {isGenerating ? 'Generating Masterpiece...' : 'Generate Design'}
            </button>
          </div>

          <div className="bg-neutral-900/50 border border-white/5 p-6 rounded-3xl">
            <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">
              <ImageIcon className="w-4 h-4 text-purple-500" />
              Design Tips
            </h4>
            <ul className="text-xs text-neutral-500 space-y-2">
              <li>• Be specific about colors (e.g. "Electric Blue and Hot Pink")</li>
              <li>• Mention the mood (e.g. "Aggressive", "Chill", "Underground")</li>
              <li>• For logos, keep descriptions simple for better clarity</li>
            </ul>
          </div>
        </div>

        {/* Preview */}
        <div className="relative aspect-square lg:aspect-auto lg:h-full min-h-[500px]">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-900 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-purple-600/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <ImageIcon className="absolute inset-0 m-auto w-8 h-8 text-purple-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-black uppercase italic mb-2">AI is <span className="text-purple-600">Painting</span></h3>
                <p className="text-neutral-500 text-sm">Mixing colors and rendering details...</p>
              </motion.div>
            ) : generatedImage ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 group"
              >
                <img
                  src={generatedImage}
                  alt="Generated design"
                  className="w-full h-full object-cover rounded-[3rem] border border-white/5 shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem] flex flex-col items-center justify-center gap-4">
                  <button
                    onClick={downloadImage}
                    className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-transform"
                  >
                    <Download className="w-5 h-5" />
                    Download PNG
                  </button>
                  <button
                    onClick={generateImage}
                    className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/20 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Regenerate
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-neutral-900 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center p-12 text-center text-neutral-700">
                <ImageIcon className="w-20 h-20 mb-6 opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">Your design will appear here</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
