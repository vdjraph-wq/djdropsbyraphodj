import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Mic, Loader2, Volume2, ArrowRight, Sparkles, Download, Wand2, Activity, Upload, Plus, CheckCircle, MessageSquare, Trash2, Play, Pause, Sliders, Music2, Cloud, Save, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import WaveSurfer from 'wavesurfer.js';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

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
      height: 40,
      normalize: true
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
  const [user] = useAuthState(auth);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voice, setVoice] = useState<string>('RAPHO');
  const [customVoices, setCustomVoices] = useState<{name: string, description: string, audioData?: string, samples?: AudioSample[], id?: string}[]>([
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
  const [emotionalTag, setEmotionalTag] = useState('Energetic');
  const [soundEffect, setSoundEffect] = useState('None');
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
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch saved voices from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/cloned_voices`),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const voices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      setCustomVoices([
        { name: 'RAPHO', description: 'Deep male voice, authoritative, similar to Wigman style, high energy' },
        ...voices
      ]);
    });

    return () => unsubscribe();
  }, [user]);

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
          setSamples(prev => {
            const updated = [...prev, newSample];
            analyzeVoice(newSample.data, updated);
            return updated;
          });
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
            // Analyze with the new set of samples
            analyzeVoice(base64, updated);
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
    const name = voiceName.trim() || `Cloned ${customVoices.length}`;
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
    setStatusMessage({ text: `Voice "${name}" added to session!`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const saveVoiceToProfile = async () => {
    if (!user) {
      setStatusMessage({ text: "Please sign in to save voices to your profile.", type: 'error' });
      return;
    }
    if (samples.length === 0 && !cloningPrompt) return;
    
    setIsSavingVoice(true);
    try {
      const name = voiceName.trim() || `Cloned ${customVoices.length}`;
      await addDoc(collection(db, `users/${user.uid}/cloned_voices`), {
        userId: user.uid,
        name,
        description: cloningPrompt,
        createdAt: new Date().toISOString()
      });
      
      setVoice(name);
      setMode('standard');
      setSamples([]);
      setVoiceName('');
      setCloningPrompt('');
      setStatusMessage({ text: `Voice "${name}" saved to your profile!`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error saving voice:", error);
      setStatusMessage({ text: "Failed to save voice to profile.", type: 'error' });
    } finally {
      setIsSavingVoice(false);
    }
  };

  const deleteVoice = async (v: any) => {
    if (v.name === 'RAPHO') return;
    
    if (v.id && user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/cloned_voices`, v.id));
        setStatusMessage({ text: "Voice deleted from profile.", type: 'success' });
      } catch (error) {
        console.error("Error deleting voice:", error);
        setStatusMessage({ text: "Failed to delete voice.", type: 'error' });
      }
    } else {
      setCustomVoices(prev => prev.filter(cv => cv.name !== v.name));
    }
    
    if (voice === v.name) setVoice('RAPHO');
  };

  const clearReference = () => {
    setSamples([]);
    if (isRecording) stopRecording();
  };

  const playReference = () => {
    if (samples.length === 0) return;
    const audio = new Audio(samples[0].data);
    audio.play().catch(e => console.error("Reference playback failed:", e));
  };

  const analysisAbortControllerRef = useRef<AbortController | null>(null);

  const analyzeVoice = async (audioData?: string, currentSamples?: AudioSample[]) => {
    const samplesToUse = currentSamples || samples;
    const dataToAnalyze = audioData || samplesToUse[0]?.data;
    if (!dataToAnalyze && samplesToUse.length === 0) return;
    
    // Cancel any ongoing analysis
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
    analysisAbortControllerRef.current = new AbortController();
    const signal = analysisAbortControllerRef.current.signal;

    setIsAnalyzingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // If multiple samples, we can send them all for a more robust analysis
      const audioParts = samplesToUse.length > 0 
        ? samplesToUse.slice(0, 3).map(s => ({
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
          { text: "Analyze these audio samples and extract the 'Voice DNA' (pitch, tone, energy, accent, unique vocal artifacts) in a concise way (under 40 words). This DNA profile will be used to power a high-fidelity voice cloning engine. Focus on the core identity of the voice that remains consistent." }
        ]
      }));
      
      // Check if this request is still the latest one
      if (signal.aborted) return;

      if (response.text) {
        setCloningPrompt(response.text.trim());
        setStatusMessage({ text: "Voice analyzed and description updated!", type: 'success' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (error: any) {
      if (signal.aborted) return;
      
      const msg = error?.message || String(error);
      if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
        console.log("Voice analysis aborted (expected)");
        return;
      }
      console.error("Voice analysis error:", error);
      setStatusMessage({ text: "Failed to analyze voice. Please try again.", type: 'error' });
    } finally {
      if (!signal.aborted) {
        setIsAnalyzingVoice(false);
        analysisAbortControllerRef.current = null;
      }
    }
  };

  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);

  const callAiWithRetry = async (fn: () => Promise<any>, maxRetries = 3) => {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
        
        // Check for common transient errors including the "signal is aborted" one
        const isRetryable = errorStr.includes("RESOURCE_EXHAUSTED") || 
                           errorStr.includes("429") || 
                           errorStr.includes("aborted") ||
                           errorStr.includes("signal") ||
                           errorStr.includes("fetch failed") ||
                           errorStr.includes("deadline exceeded") ||
                           error?.status === 429 ||
                           error?.code === 429;
        
        if (isRetryable && i < maxRetries) {
          // Exponential backoff with jitter: 1s, 2s, 4s... plus random offset
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  const previewVoice = async (vName: string, description: string, audioSamples?: AudioSample[]) => {
    setIsPreviewing(vName);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let finalDescription = description;

      if (audioSamples && audioSamples.length > 0) {
        try {
          const audioParts = audioSamples.slice(0, 3).map(s => ({
            inlineData: {
              data: s.data.split(',')[1],
              mimeType: s.data.split(';')[0].split(':')[1]
            }
          }));

          const analysisResponse = await callAiWithRetry(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              ...audioParts,
              { text: `The user wants to clone a voice with this description: "${description}". Analyze the provided audio samples and combine their technical characteristics (tone, pitch, energy, accent) with the user's description to create a final technical profile for a TTS engine. Keep it under 60 words.` }
            ]
          }));
          if (analysisResponse.text) {
            finalDescription = analysisResponse.text;
          }
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
            console.log("Analysis aborted during preview (expected)");
          } else {
            console.error("Analysis error during preview:", e);
          }
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
      const msg = error?.message || String(error);
      if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
        console.log("Preview aborted (expected)");
        return;
      }
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
      
      const emotionalInstruction = `Deliver the script with a ${emotionalTag.toLowerCase()} emotion.`;
      const sfxInstruction = soundEffect !== 'None' ? ` Incorporate a ${soundEffect.toLowerCase()} sound effect at the beginning or end of the drop.` : '';
      
      voiceDescription = `${voiceDescription}. ${emotionalInstruction}${sfxInstruction} ${fineTuning}${effectsInstruction}`;

      // If audio samples are provided, analyze them for better cloning
      const referenceSamples = selectedCustomVoice?.samples || samples;
      if (referenceSamples.length > 0) {
        try {
          const audioParts = referenceSamples.slice(0, 3).map(s => ({
            inlineData: {
              data: s.data.split(',')[1],
              mimeType: s.data.split(';')[0].split(':')[1]
            }
          }));

          const analysisResponse = await callAiWithRetry(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              ...audioParts,
              { text: `The user wants to clone a voice with this description: "${voiceDescription}". Analyze the provided audio samples and combine their technical characteristics (tone, pitch, energy, accent) with the user's description to create a final technical profile for a TTS engine. Focus on consistency across samples. Keep it under 60 words.` }
            ]
          }));
          if (analysisResponse.text) {
            voiceDescription = analysisResponse.text;
          }
        } catch (analysisError: any) {
          const msg = analysisError?.message || String(analysisError);
          if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
            console.log("Voice analysis aborted during generation (expected)");
          } else {
            console.error("Error analyzing voice audio:", analysisError);
          }
          // Fallback to original description
        }
      }

      if (mode === 'cloning' || selectedCustomVoice) {
        systemInstruction = `You are a high-fidelity Voice DNA cloning engine. Clone the following Voice DNA profile: ${voiceDescription}. Speak the script exactly as written, maintaining the unique vocal identity provided in the DNA.`;
      } else {
        systemInstruction = `Generate a professional DJ drop script and speak it using the selected voice profile.`;
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
      const msg = error?.message || String(error);
      if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
        console.log("Generation aborted (expected)");
        return;
      }
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
            <Activity className="w-3 h-3" />
            Voice DNA Cloning
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

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="block text-sm font-bold uppercase tracking-wider text-neutral-500">Emotional Tag</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Energetic', 'Authoritative', 'Deep', 'Raspy', 'Excited', 'Aggressive'] as const).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setEmotionalTag(tag)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          emotionalTag === tag 
                            ? "bg-red-600 border-red-600 text-white" 
                            : "bg-black/40 border-white/10 text-neutral-500 hover:border-white/20"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="block text-sm font-bold uppercase tracking-wider text-neutral-500">Sound Effects</label>
                  <select
                    value={soundEffect}
                    onChange={(e) => setSoundEffect(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-neutral-300 focus:outline-none focus:border-red-600"
                  >
                    <option value="None">No Sound Effects</option>
                    <option value="Airhorn">Airhorn</option>
                    <option value="Vinyl Scratch">Vinyl Scratch</option>
                    <option value="Explosion">Explosion</option>
                    <option value="Echo">Heavy Echo</option>
                    <option value="Reverb">Deep Reverb</option>
                    <option value="Laser">Laser Shot</option>
                  </select>
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
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice DNA Name</label>
                    <input
                      type="text"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="e.g. My DNA Voice"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">
                      <div className="flex items-center gap-2">
                        Voice DNA Profile
                        <span className="text-[10px] font-normal normal-case text-neutral-600">(AI-generated DNA description)</span>
                      </div>
                      {isAnalyzingVoice && (
                        <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-black uppercase animate-pulse">
                          <Sparkles className="w-3 h-3" />
                          AI Analyzing...
                        </div>
                      )}
                    </label>
                    <div className="relative">
                      <textarea
                        value={cloningPrompt}
                        onChange={(e) => setCloningPrompt(e.target.value)}
                        placeholder="Describe the voice style... (e.g. 'Deep, raspy, high-energy Jamaican MC with a slight echo')"
                        className={cn(
                          "w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-red-600 transition-all resize-none",
                          isAnalyzingVoice && "opacity-50 cursor-wait"
                        )}
                      />
                      {isAnalyzingVoice && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Voice Reference Samples (Upload or Record)</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="audio/*"
                        multiple
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="py-4 rounded-2xl border-2 border-dashed bg-black/40 border-white/10 text-neutral-500 hover:border-white/20 flex flex-col items-center justify-center gap-2 transition-all"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Upload Samples</span>
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
                          {isRecording ? `Recording (${recordingTime}s)` : 'Record Sample'}
                        </span>
                      </button>
                    </div>
                    {isRecording && (
                      <div className="mb-4 bg-black/60 p-4 rounded-2xl border border-red-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase text-red-500 animate-pulse">Live Input</span>
                          <span className="text-[10px] font-mono text-neutral-400">{recordingTime}s</span>
                        </div>
                        <LiveWaveform stream={recordingStream} />
                      </div>
                    )}

                    {/* Samples List */}
                    <div className="space-y-3 mb-6">
                      <AnimatePresence mode="popLayout">
                        {samples.map((sample) => (
                          <motion.div
                            key={sample.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center shrink-0">
                                  <Music2 className="w-4 h-4 text-red-500" />
                                </div>
                                <span className="text-xs font-bold truncate text-neutral-300">{sample.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setPlayingSampleId(playingSampleId === sample.id ? null : sample.id)}
                                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 transition-colors"
                                >
                                  {playingSampleId === sample.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => removeSample(sample.id)}
                                  className="p-2 rounded-lg hover:bg-red-600/10 text-neutral-500 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {playingSampleId === sample.id && (
                              <div className="px-2">
                                <WaveformPlayer 
                                  audioUrl={sample.data} 
                                  isPlaying={true} 
                                  onTogglePlay={() => setPlayingSampleId(null)} 
                                />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {samples.length > 0 && (
                        <button
                          onClick={() => analyzeVoice()}
                          disabled={isAnalyzingVoice}
                          className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-600/20"
                        >
                          {isAnalyzingVoice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Re-Analyze All Samples
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fine-Tuning Section */}
                  <div className="bg-black/40 rounded-[2rem] p-6 border border-white/5 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Sliders className="w-4 h-4 text-red-500" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Voice Fine-Tuning</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 group relative">
                            <label className="text-[10px] font-black uppercase text-neutral-500">Pitch</label>
                            <Info className="w-3 h-3 text-neutral-600 cursor-help" />
                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-neutral-800 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10 shadow-xl">
                              Adjusts the highness or lowness of the voice tone. Higher values make the voice sound more high-pitched.
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-red-500">{pitch.toFixed(2)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.05" 
                          value={pitch}
                          onChange={(e) => setPitch(parseFloat(e.target.value))}
                          className="w-full accent-red-600 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 group relative">
                            <label className="text-[10px] font-black uppercase text-neutral-500">Speed</label>
                            <Info className="w-3 h-3 text-neutral-600 cursor-help" />
                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-neutral-800 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10 shadow-xl">
                              Adjusts how fast or slow the voice speaks. 1.0x is normal speed.
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-red-500">{speed.toFixed(2)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.05" 
                          value={speed}
                          onChange={(e) => setSpeed(parseFloat(e.target.value))}
                          className="w-full accent-red-600 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-neutral-500">Background Effects</label>
                      <div className="flex flex-wrap gap-2">
                        {(['reverb', 'echo', 'flanger', 'wahWah'] as const).map((effect) => (
                          <button
                            key={effect}
                            onClick={() => setEffects(prev => ({ ...prev, [effect]: !prev[effect] }))}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                              effects[effect] 
                                ? "bg-red-600 border-red-600 text-white" 
                                : "bg-black/40 border-white/10 text-neutral-500 hover:border-white/20"
                            )}
                          >
                            {effect}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={addClonedVoice}
                      disabled={samples.length === 0 && !cloningPrompt}
                      className="col-span-2 bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all disabled:opacity-50"
                    >
                      <Activity className="w-3 h-3" />
                      Clone Voice DNA
                    </button>
                    <button
                      onClick={saveVoiceToProfile}
                      disabled={isSavingVoice || (samples.length === 0 && !cloningPrompt)}
                      className="bg-neutral-800 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-700 transition-all disabled:opacity-50"
                    >
                      {isSavingVoice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save DNA
                    </button>
                    <button
                      onClick={() => previewVoice(voiceName || "New Clone", cloningPrompt, samples)}
                      disabled={isPreviewing !== null || (samples.length === 0 && !cloningPrompt)}
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
                    Tip: Upload 3-5 samples of 10-30s each for best results.
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
                          previewVoice(v.name, v.description, v.samples);
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
                            deleteVoice(v);
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
