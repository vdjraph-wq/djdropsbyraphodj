import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Mic, Loader2, Volume2, ArrowRight, Sparkles, Download, Wand2, Activity, Upload, Plus, CheckCircle, MessageSquare, Trash2, Play, Pause, Sliders, Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import WaveSurfer from 'wavesurfer.js';

interface AudioSample {
  id: string;
  data: string;
  name: string;
  blob: Blob;
}

const WaveformPlayer = ({ audioUrl, isPlaying, onTogglePlay }: { audioUrl: string, isPlaying: boolean, onTogglePlay: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4b5563',
      progressColor: '#ef4444',
      cursorColor: '#ef4444',
      barWidth: 2,
      barRadius: 3,
      responsive: true,
      height: 40,
      normalize: true,
      partialRender: true
    });

    wavesurfer.load(audioUrl);
    wavesurferRef.current = wavesurfer;

    wavesurfer.on('finish', () => {
      if (isPlaying) onTogglePlay();
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.play();
      } else {
        wavesurferRef.current.pause();
      }
    }
  }, [isPlaying]);

  return <div ref={containerRef} className="w-full" />;
};

const LiveWaveform = ({ stream }: { stream: MediaStream | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(239, 68, 68)`; // red-500
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={300} height={40} className="w-full h-10 rounded-lg opacity-50" />;
};

export default function CreateDrop() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voice, setVoice] = useState<string>('RAPHO');
  const [customVoices, setCustomVoices] = useState<{name: string, description: string, audioData?: string, samples?: AudioSample[]}[]>([
    { name: 'RAPHO', description: 'Deep male voice, authoritative, similar to Wigman style, high energy' }
  ]);
  const [mode, setMode] = useState<'standard' | 'cloning'>('standard');
  const [voiceName, setVoiceName] = useState('');
  const [cloningPrompt, setCloningPrompt] = useState('Deep, energetic, Jamaican style');
  const [audioQuality, setAudioQuality] = useState<'standard' | 'studio'>('standard');
  const [sampleRate, setSampleRate] = useState<number>(24000);
  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'error' | 'success' | 'info'} | null>(null);
  const [lastGeneratedAudio, setLastGeneratedAudio] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
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
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
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
          const base64 = reader.result as string;
          const newSample: AudioSample = {
            id: Math.random().toString(36).substr(2, 9),
            data: base64,
            name: `Recording ${samples.length + 1}`,
            blob: audioBlob
          };
          setSamples(prev => [...prev, newSample]);
          analyzeVoice(newSample.data);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setStatusMessage({ text: "Microphone access denied. Please check permissions.", type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const newSample: AudioSample = {
            id: Math.random().toString(36).substr(2, 9),
            data: base64,
            name: file.name,
            blob: file
          };
          setSamples(prev => {
            const updated = [...prev, newSample];
            if (updated.length === 1) analyzeVoice(base64);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSample = (id: string) => {
    setSamples(prev => prev.filter(s => s.id !== id));
  };

  const addClonedVoice = () => {
    if (samples.length === 0 && !cloningPrompt) return;
    const name = voiceName.trim() || `Cloned ${customVoices.length + 1}`;
    setCustomVoices(prev => [...prev, { 
      name, 
      description: cloningPrompt,
      audioData: samples[0]?.data || undefined,
      samples: [...samples]
    }]);
    setVoice(name);
    setMode('standard');
    setSamples([]);
    setVoiceName('');
    setCloningPrompt('');
    setStatusMessage({ text: `Voice "${name}" cloned successfully!`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const deleteVoice = (name: string) => {
    if (name === 'RAPHO') return;
    setCustomVoices(prev => prev.filter(v => v.name !== name));
    if (voice === name) setVoice('RAPHO');
  };

  const clearReference = () => {
    setUploadedAudio(null);
    setUploadedFileName(null);
    if (isRecording) stopRecording();
  };

  const playReference = () => {
    if (!uploadedAudio) return;
    const audio = new Audio(uploadedAudio);
    audio.play().catch(e => console.error("Reference playback failed:", e));
  };

  const analyzeVoice = async (audioData?: string) => {
    const dataToAnalyze = audioData || samples[0]?.data;
    if (!dataToAnalyze) return;
    setIsAnalyzingVoice(true);
    setStatusMessage({ text: "AI is analyzing your voice reference...", type: 'info' });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // If multiple samples, we can send them all for a more robust analysis
      const audioParts = samples.length > 0 
        ? samples.slice(0, 3).map(s => ({
            inlineData: {
              data: s.data.split(',')[1],
              mimeType: s.data.split(';')[0].split(':')[1]
            }
          }))
        : [{
            inlineData: {
              data: dataToAnalyze.split(',')[1],
              mimeType: dataToAnalyze.split(';')[0].split(':')[1]
            }
          }];

      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...audioParts,
          { text: "Analyze these audio samples and describe the voice's characteristics (pitch, tone, energy, accent, style) in a concise way (under 40 words). This description will be used as a prompt for a TTS engine to clone the voice. Focus on technical attributes that remain consistent across samples." }
        ]
      }));
      
      if (response.text) {
        setCloningPrompt(response.text.trim());
        setStatusMessage({ text: "Voice analyzed and description updated!", type: 'success' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (error) {
      console.error("Voice analysis error:", error);
      setStatusMessage({ text: "Failed to analyze voice. Please try again.", type: 'error' });
    } finally {
      setIsAnalyzingVoice(false);
    }
  };

  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);

  const callAiWithRetry = async (fn: () => Promise<any>, maxRetries = 2) => {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
        const isRateLimit = errorStr.includes("RESOURCE_EXHAUSTED") || 
                           errorStr.includes("429") || 
                           error?.status === 429 ||
                           error?.code === 429;
        
        if (isRateLimit && i < maxRetries) {
          // Wait before retrying: 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i + 1) * 1000));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  const previewVoice = async (vName: string, description: string, audioData?: string) => {
    setIsPreviewing(vName);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let finalDescription = description;

      if (audioData) {
        try {
          const analysisResponse = await callAiWithRetry(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                inlineData: {
                  data: audioData.split(',')[1],
                  mimeType: audioData.split(';')[0].split(':')[1]
                }
              },
              { text: `The user wants to clone a voice with this description: "${description}". Analyze the provided audio and combine its technical characteristics (tone, pitch, energy, accent) with the user's description to create a final technical profile for a TTS engine. Keep it under 60 words.` }
            ]
          }));
          if (analysisResponse.text) {
            finalDescription = analysisResponse.text;
          }
        } catch (e) {
          console.error("Analysis error during preview:", e);
        }
      }

      const response = await callAiWithRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ 
          parts: [{ 
            text: `You are a voice cloning engine. Clone the following voice style: ${finalDescription}. Say exactly: "This is your ${vName} voice preview."` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: (['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].includes(vName) ? vName : 'Kore') as any },
            },
          },
        },
      }));

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const wavBlob = createWavBlob(bytes.buffer, 24000);
        const url = URL.createObjectURL(wavBlob);
        const audio = new Audio(url);
        audio.play().catch(e => console.error("Audio playback failed:", e));
      }
    } catch (error: any) {
      console.error("Preview error:", error);
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      if (errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("429")) {
        setStatusMessage({ text: "AI is busy. Retrying automatically...", type: 'info' });
      } else {
        setStatusMessage({ text: "Error during preview. Please try again.", type: 'error' });
      }
    } finally {
      setIsPreviewing(null);
    }
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

      // Add fine-tuning instructions to the description
      const fineTuning = `Adjust the voice to have: Pitch: ${pitch > 1 ? 'higher' : pitch < 1 ? 'lower' : 'normal'}, Speed: ${speed > 1 ? 'faster' : speed < 1 ? 'slower' : 'normal'}.`;
      const effectsList = Object.entries(effects)
        .filter(([_, active]) => active)
        .map(([name]) => name)
        .join(', ');
      
      const effectsInstruction = effectsList ? ` Apply background effects: ${effectsList}.` : '';
      
      voiceDescription = `${voiceDescription}. ${fineTuning}${effectsInstruction}`;

      // If audio is provided, analyze it first to get a better description for the TTS model
      const audioData = selectedCustomVoice?.audioData || (samples.length > 0 ? samples[0].data : null);
      if (audioData) {
        try {
          const analysisResponse = await callAiWithRetry(() => ai.models.generateContent({
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
          }));
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

      if (audioQuality === 'studio') {
        systemInstruction += " Use a professional studio recording style with high clarity, presence, and perfect articulation. The output should sound like it was recorded in a high-end vocal booth.";
      }

      contents.push({ text: `${systemInstruction} Script: ${prompt}` });

      const response = await callAiWithRetry(() => ai.models.generateContent({
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
      }));

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
    } catch (error: any) {
      console.error("Error generating drop:", error);
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      if (errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("429")) {
        setStatusMessage({ text: "AI is busy. Retrying automatically...", type: 'info' });
      } else {
        setStatusMessage({ text: "Error generating drop. Please try again.", type: 'error' });
      }
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

  const playPcm = async (buffer: ArrayBuffer) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    const pcmData = new Int16Array(buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768;
    }
    // AI TTS output is always 24kHz
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
                  <div className="grid grid-cols-1 gap-2">
                    {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map((v) => (
                      <div
                        key={v}
                        className={cn(
                          "px-4 py-3 rounded-xl transition-all border flex items-center justify-between",
                          voice === v 
                            ? "bg-red-600 border-red-500 text-white font-bold" 
                            : "bg-black/40 border-white/5 text-neutral-400 hover:border-white/20"
                        )}
                      >
                        <button 
                          onClick={() => setVoice(v)}
                          className="flex-1 text-left"
                        >
                          {v} {v === 'Kore' && '(Recommended)'}
                        </button>
                        <button
                          onClick={() => previewVoice(v, `Standard voice ${v}`)}
                          disabled={isPreviewing === v}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            voice === v ? "hover:bg-white/10" : "hover:bg-red-600/10"
                          )}
                        >
                          {isPreviewing === v ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
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
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">
                      Voice Description
                      <span className="ml-2 text-[10px] font-normal normal-case text-neutral-600">(Guides the AI's tone and style)</span>
                    </label>
                    <textarea
                      value={cloningPrompt}
                      onChange={(e) => setCloningPrompt(e.target.value)}
                      placeholder="Describe the voice style... (e.g. 'Deep, raspy, high-energy Jamaican MC with a slight echo')"
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-red-600 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice Reference Samples (Upload or Record)</label>
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
                          "py-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden",
                          isRecording 
                            ? "bg-red-600/20 border-red-600 text-red-500" 
                            : "bg-black/40 border-white/10 text-neutral-500 hover:border-white/20"
                        )}
                      >
                        {isRecording && (
                          <motion.div 
                            className="absolute inset-0 bg-red-600/10"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                        <Mic className={cn("w-5 h-5 relative z-10", isRecording && "animate-pulse")} />
                        <span className="text-[10px] font-black uppercase relative z-10">
                          {isRecording ? `Recording (${recordingTime}s)` : 'Record Live'}
                        </span>
                      </button>
                    </div>
                    {uploadedAudio && !isRecording && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                            {uploadedFileName || 'Reference Ready'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => analyzeVoice()}
                            disabled={isAnalyzingVoice}
                            className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-500 transition-all flex items-center gap-1"
                            title="AI Analyze Voice"
                          >
                            {isAnalyzingVoice ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            <span className="text-[8px] font-black uppercase">AI Analyze</span>
                          </button>
                          <button
                            onClick={playReference}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
                            title="Play Reference"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={clearReference}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-600/10 text-neutral-400 hover:text-red-500 transition-all"
                            title="Clear Reference"
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={addClonedVoice}
                      disabled={!uploadedAudio && !cloningPrompt}
                      className="col-span-3 bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      Save Cloned Voice
                    </button>
                    <button
                      onClick={() => previewVoice(voiceName || "New Clone", cloningPrompt, uploadedAudio || undefined)}
                      disabled={isPreviewing !== null || (!uploadedAudio && !cloningPrompt)}
                      className="bg-red-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {isPreviewing === (voiceName || "New Clone") ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-500 italic">
                    Example: "Deep, raspy, high-energy Jamaican MC"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Always show custom voices if they exist */}
          {customVoices.length > 0 && (
            <div className="pt-6 border-t border-white/5">
              <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Your Cloned Voices</label>
              <div className="grid grid-cols-1 gap-2">
                {customVoices.map((v) => (
                  <div
                    key={v.name}
                    className={cn(
                      "px-4 py-3 rounded-xl transition-all border group relative flex items-center justify-between",
                      voice === v.name 
                        ? "bg-red-600 border-red-500 text-white font-bold" 
                        : "bg-black/40 border-white/5 text-neutral-400 hover:border-white/20"
                    )}
                  >
                    <button
                      onClick={() => setVoice(v.name)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span>{v.name}</span>
                        {v.name !== 'RAPHO' && <Wand2 className="w-3 h-3 opacity-50" />}
                      </div>
                      <p className={cn(
                        "text-[10px] mt-1 font-normal truncate",
                        voice === v.name ? "text-red-100" : "text-neutral-500"
                      )}>
                        {v.description}
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewVoice(v.name, v.description, v.audioData);
                        }}
                        disabled={isPreviewing === v.name}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          voice === v.name ? "hover:bg-white/10" : "hover:bg-red-600/10"
                        )}
                      >
                        {isPreviewing === v.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      {v.name !== 'RAPHO' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteVoice(v.name);
                          }}
                          className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio Quality & Sample Rate */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Audio Quality
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['standard', 'studio'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setAudioQuality(q);
                    if (q === 'studio') setSampleRate(48000);
                    else setSampleRate(24000);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    audioQuality === q
                      ? "bg-red-600 border-red-500 text-white"
                      : "bg-black/40 border-white/5 text-neutral-500 hover:border-white/10"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">Sample Rate (Hz)</label>
              <div className="grid grid-cols-3 gap-2">
                {[24000, 44100, 48000].map((sr) => (
                  <button
                    key={sr}
                    onClick={() => setSampleRate(sr)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[9px] font-black transition-all border",
                      sampleRate === sr
                        ? "bg-white text-black border-white"
                        : "bg-black/20 border-white/5 text-neutral-500 hover:border-white/10"
                    )}
                  >
                    {sr/1000}k
                  </button>
                ))}
              </div>
            </div>
            
            <p className="text-[9px] text-neutral-500 italic">
              * Studio quality uses higher complexity AI models and higher sample rates.
            </p>
          </div>

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

          {/* Tips & Manual Order */}
          <div className="grid md:grid-cols-2 gap-6">
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

            <div className="bg-red-600/5 border border-red-600/10 p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold mb-2 flex items-center gap-2 text-sm text-red-500">
                  <MessageSquare className="w-4 h-4" />
                  Manual Studio Order
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Can't get the AI to sound exactly right? Order a manual studio recording directly from DJ RAPHO for only <span className="text-white font-bold">KES 150</span>.
                </p>
              </div>
              <Link 
                to="/text-order"
                className="mt-4 inline-flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Order Manual Drop
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
