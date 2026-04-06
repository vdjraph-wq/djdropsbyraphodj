import LiveAssistant from './LiveAssistant';
import { Mic, Sparkles } from 'lucide-react';

export default function LiveAssistantPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600/10 border border-red-600/20 rounded-full text-red-500 text-xs font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3 h-3" />
          Live AI Assistant
        </div>
        <h1 className="text-4xl font-black mb-4 uppercase italic">Talk to <span className="text-red-600">DJ RAPHO AI</span></h1>
        <p className="text-neutral-400">Have a real-time conversation with our AI. Ask about drops, pricing, or just say hi!</p>
      </div>

      <div className="bg-neutral-900 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />
        
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LiveAssistant />
          
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
              <Mic className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <div className="text-[10px] font-black uppercase text-neutral-500">Real-time Voice</div>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
              <Sparkles className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <div className="text-[10px] font-black uppercase text-neutral-500">AI Powered</div>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-center">
              <div className="w-5 h-5 text-red-500 mx-auto mb-2 font-black">24/7</div>
              <div className="text-[10px] font-black uppercase text-neutral-500">Always Online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
