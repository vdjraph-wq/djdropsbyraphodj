import { useState } from 'react';
import { MessageSquare, Send, Phone, CreditCard, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function TextDropOrder() {
  const [text, setText] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [quantity, setQuantity] = useState<1 | 2>(1);
  const [isSent, setIsSent] = useState(false);

  const price = quantity === 1 ? 150 : 300;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const message = `Hello DJ RAPHO, I want to order ${quantity} custom text drop(s).\n\nScript: ${text}\nMy WhatsApp: ${whatsapp}\n\nI am sending my M-Pesa message for verification now.`;
    const whatsappUrl = `https://wa.me/254745260364?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    setIsSent(true);
    setTimeout(() => setIsSent(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 uppercase italic">Manual <span className="text-red-600">Text Drop</span> Order</h1>
        <p className="text-neutral-400">Send your script directly to DJ RAPHO for a professional custom recording.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-neutral-900 p-8 rounded-[2rem] border border-white/5 space-y-6 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="text-red-500 w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight">Your Script</h2>
          </div>

          <form onSubmit={handleSend} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Number of Drops</label>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q as 1 | 2)}
                    className={cn(
                      "py-3 rounded-xl font-black uppercase tracking-widest text-xs border transition-all",
                      quantity === q 
                        ? "bg-red-600 border-red-600 text-white" 
                        : "bg-black/40 border-white/10 text-neutral-500 hover:border-white/20"
                    )}
                  >
                    {q} Drop{q > 1 ? 's' : ''} (KES {q * 150})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Drop Text / Script</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the exact words you want DJ RAPHO to say..."
                className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-lg focus:outline-none focus:border-red-600 transition-colors resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">Your WhatsApp Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. 0724421361"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-600/20 active:scale-95"
            >
              <Send className="w-5 h-5" />
              Send & Verify on WhatsApp
            </button>

            <p className="text-[10px] text-center text-neutral-500 font-bold uppercase tracking-widest">
              * Verification: Send your M-Pesa message to verify after clicking send.
            </p>

            {isSent && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-green-500 font-bold text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Redirecting to WhatsApp...
              </motion.div>
            )}
          </form>
        </motion.div>

        <div className="space-y-8">
          <div className="bg-neutral-900 p-8 rounded-[2rem] border border-white/5 space-y-6">
            <h3 className="text-xl font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Details
            </h3>
            
            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-xs font-black uppercase tracking-widest">M-Pesa Number</span>
                <span className="text-white font-bold text-lg">0745260364</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-xs font-black uppercase tracking-widest">Price ({quantity} Drop{quantity > 1 ? 's' : ''})</span>
                <span className="text-red-500 font-black text-xl italic">KES {price}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">How it works:</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  Pay KES {price} to 0745260364 via M-Pesa.
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  Enter your script and click "Send & Verify".
                </li>
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  <span className="text-white font-bold">CRITICAL:</span> Send your M-Pesa confirmation message in the WhatsApp chat.
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-red-600/5 p-6 rounded-[2rem] border border-red-600/10">
            <p className="text-xs text-neutral-500 italic text-center">
              "Quality is my priority. Every manual drop is recorded in a professional studio environment."
              <br />
              <span className="font-bold text-red-500 mt-2 block">— DJ RAPHO</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
