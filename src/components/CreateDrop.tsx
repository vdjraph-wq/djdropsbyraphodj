import { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Mic, Loader2, Volume2, ArrowRight, Sparkles, Download, Wand2, Activity, Upload, Plus, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function CreateDrop() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voice, setVoice] = useState<string>('Kore');
  const [customVoices, setCustomVoices] = useState<{name: string, description: string, audioData?: string}[]>([
    { name: 'RAPHO', description: 'Deep male voice, authoritative, similar to Wigman style, high energy' }
  ]);
  const [mode, setMode] = useState<'standard' | 'cloning'>('standard');
  const [voiceName, setVoiceName] = useState('');
  const [cloningPrompt, setCloningPrompt] = useState('Deep, energetic, Jamaican style');
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [lastGeneratedAudio, setLastGeneratedAudio] = useState<Blob | null>(null);
  const [effects, setEffects] = useState({
    reverb: false,
    echo: false,
    hiFilter: false,
    flanger: false,
    wahWah: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedAudio(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedAudio(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addClonedVoice = () => {
    if (!uploadedAudio && !cloningPrompt) return;
    const name = voiceName.trim() || `Cloned ${customVoices.length + 1}`;
    setCustomVoices(prev => [...prev, { 
      name, 
      description: cloningPrompt,
      audioData: uploadedAudio || undefined 
    }]);
    setVoice(name);
    setMode('standard');
    setUploadedAudio(null);
    setVoiceName('');
  };

  const generateDrop = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setLastGeneratedAudio(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const selectedCustomVoice = customVoices.find(v => v.name === voice);
      
      let contents: any[] = [];
      let systemInstruction = "";

      let voiceDescription = selectedCustomVoice?.description || cloningPrompt;

      // If audio is provided, analyze it first to get a better description for the TTS model
      const audioData = selectedCustomVoice?.audioData || uploadedAudio;
      if (audioData) {
        try {
          const analysisResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                inlineData: {
                  data: audioData.split(',')[1],
                  mimeType: audioData.split(';')[0].split(':')[1]
                }
              },
              { text: `The user wants to clone a voice with this description: "${voiceDescription}". Analyze the provided audio and combine its technical characteristics (tone, pitch, energy, accent) with the user's description to create a final technical profile for a TTS engine. Keep it under 60 words.` }
            ]
          });
          if (analysisResponse.text) {
            voiceDescription = analysisResponse.text;
          }
        } catch (analysisError) {
          console.error("Error analyzing voice audio:", analysisError);
          // Fallback to original description
        }
      }

      if (mode === 'cloning' || selectedCustomVoice) {
        systemInstruction = `You are a voice cloning engine. Clone the following voice style: ${voiceDescription}. Speak the script exactly.`;
      } else {
        systemInstruction = `Generate a professional DJ drop script and speak it.`;
      }

      contents.push({ text: `${systemInstruction} Script: ${prompt}` });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: contents }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: (['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].includes(voice) ? voice : 'Kore') as any },
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

    let lastNode: AudioNode = source;

    // 1. High Pass Filter
    if (effects.hiFilter) {
      const hpf = audioCtx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 1000;
      lastNode.connect(hpf);
      lastNode = hpf;
    }

    // 2. Wah-Wah (Auto-wah)
    if (effects.wahWah) {
      const wah = audioCtx.createBiquadFilter();
      wah.type = 'lowpass';
      wah.Q.value = 10;
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 2;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 1000;
      lfo.connect(lfoGain);
      lfoGain.connect(wah.frequency);
      lfo.start();
      lastNode.connect(wah);
      lastNode = wah;
    }

    // 3. Flanger
    if (effects.flanger) {
      const delay = audioCtx.createDelay();
      delay.delayTime.value = 0.003;
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.5;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.002;
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      lfo.start();
      
      const feedback = audioCtx.createGain();
      feedback.gain.value = 0.5;
      delay.connect(feedback);
      feedback.connect(delay);
      
      const dryGain = audioCtx.createGain();
      const wetGain = audioCtx.createGain();
      dryGain.gain.value = 0.5;
      wetGain.gain.value = 0.5;
      
      lastNode.connect(dryGain);
      lastNode.connect(delay);
      delay.connect(wetGain);
      
      const merger = audioCtx.createGain();
      dryGain.connect(merger);
      wetGain.connect(merger);
      lastNode = merger;
    }

    // 4. Echo / Delay
    if (effects.echo) {
      const delay = audioCtx.createDelay();
      delay.delayTime.value = 0.3;
      const feedback = audioCtx.createGain();
      feedback.gain.value = 0.4;
      delay.connect(feedback);
      feedback.connect(delay);
      
      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.3;
      delay.connect(wetGain);
      
      const merger = audioCtx.createGain();
      lastNode.connect(merger);
      wetGain.connect(merger);
      lastNode = merger;
    }

    // 5. Reverb (Simple Delay-based)
    if (effects.reverb) {
      const reverb = audioCtx.createConvolver();
      // Create a simple impulse response for reverb
      const length = audioCtx.sampleRate * 2;
      const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
      for (let i = 0; i < 2; i++) {
        const channel = impulse.getChannelData(i);
        for (let j = 0; j < length; j++) {
          channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2);
        }
      }
      reverb.buffer = impulse;
      
      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.3;
      reverb.connect(wetGain);
      
      const merger = audioCtx.createGain();
      lastNode.connect(merger);
      lastNode.connect(reverb);
      wetGain.connect(merger);
      lastNode = merger;
    }

    lastNode.connect(audioCtx.destination);
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

  const toggleEffect = (effect: keyof typeof effects) => {
    setEffects(prev => ({ ...prev, [effect]: !prev[effect] }));
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
                  <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Standard AI Voices</label>
                  <div className="grid grid-cols-1 gap-2 mb-6">
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

                  {customVoices.length > 0 && (
                    <div>
                      <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Your Cloned Voices</label>
                      <div className="grid grid-cols-1 gap-2">
                        {customVoices.map((v) => (
                          <button
                            key={v.name}
                            onClick={() => setVoice(v.name)}
                            className={cn(
                              "px-4 py-3 rounded-xl text-left transition-all border group relative",
                              voice === v.name 
                                ? "bg-red-600 border-red-500 text-white font-bold" 
                                : "bg-black/40 border-white/5 text-neutral-400 hover:border-white/20"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{v.name}</span>
                              <Wand2 className="w-3 h-3 opacity-50" />
                            </div>
                            <p className={cn(
                              "text-[10px] mt-1 font-normal truncate",
                              voice === v.name ? "text-red-100" : "text-neutral-500"
                            )}>
                              {v.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice Name</label>
                    <input
                      type="text"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="e.g. My Jamaican MC"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice Description</label>
                    <textarea
                      value={cloningPrompt}
                      onChange={(e) => setCloningPrompt(e.target.value)}
                      placeholder="Describe the voice style to clone..."
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-red-600 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice Reference (Upload or Record)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="audio/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "py-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                          uploadedAudio && !isRecording
                            ? "bg-green-600/10 border-green-600/50 text-green-500" 
                            : "bg-black/40 border-white/10 text-neutral-500 hover:border-white/20"
                        )}
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Upload File</span>
                      </button>

                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={cn(
                          "py-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                          isRecording 
                            ? "bg-red-600/20 border-red-600 text-red-500 animate-pulse" 
                            : "bg-black/40 border-white/10 text-neutral-500 hover:border-white/20"
                        )}
                      >
                        <Mic className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">
                          {isRecording ? 'Stop Recording' : 'Record Live'}
                        </span>
                      </button>
                    </div>
                    {uploadedAudio && !isRecording && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Reference Ready</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={addClonedVoice}
                    disabled={!uploadedAudio && !cloningPrompt}
                    className="w-full bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    Save Cloned Voice
                  </button>

                  <p className="text-[10px] text-neutral-500 italic">
                    Example: "Deep, raspy, high-energy Jamaican MC"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audio Effects */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Audio Effects
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(effects) as Array<keyof typeof effects>).map((effect) => (
                <button
                  key={effect}
                  onClick={() => toggleEffect(effect)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    effects[effect]
                      ? "bg-red-600/20 border-red-600 text-red-500"
                      : "bg-black/40 border-white/5 text-neutral-500 hover:border-white/10"
                  )}
                >
                  {effect.replace(/([A-Z])/g, ' $1')}
                </button>
              ))}
            </div>
          </div>
          
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
