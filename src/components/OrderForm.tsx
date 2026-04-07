import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { db, auth, loginWithGoogle as login } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { CreditCard, MessageSquare, CheckCircle, Loader2, Phone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function OrderForm({ user }: { user: any }) {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [script, setScript] = useState(searchParams.get('script') || searchParams.get('prompt') || '');
  const [whatsapp, setWhatsapp] = useState(user?.phoneNumber || '');
  const [mpesaCode, setMpesaCode] = useState('');
  const [step, setStep] = useState<'form' | 'verifying' | 'success'>('form');

  const amount = type === 'voice_drop' ? 150 : type === 'poster' ? 1000 : type === '3d_logo' ? 70 : type === '3d_logo_animation' ? 250 : 1500;
  const typeLabel = type === 'voice_drop' ? 'AI Voice Drop' : type === 'poster' ? 'Premium Poster' : type === '3d_logo' ? '3D Logo' : type === '3d_logo_animation' ? '3D Logo Animation' : 'Professional Logo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setStep('verifying');

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      const orderData = {
        userId: user.uid,
        type,
        script,
        status: 'paid', // Mark as paid immediately since we "verified" the code
        amount,
        mpesaCode,
        whatsappNumber: whatsapp,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      setStep('success');
      
      // Auto-redirect to WhatsApp after 5 seconds
      setTimeout(() => {
        const message = `Hello DJ RAPHO, I just placed an order for a ${typeLabel}.\nOrder Details: ${script}\nM-Pesa Code: ${mpesaCode}\n\nI am sending my M-Pesa message for verification now.`;
        window.open(`https://wa.me/254745260364?text=${encodeURIComponent(message)}`, '_blank');
        navigate('/orders');
      }, 5000);

    } catch (error) {
      console.error("Error placing order:", error);
      setStep('form');
    }
  };

  if (step === 'verifying') {
    return (
      <div className="max-w-2xl mx-auto text-center py-32">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-red-600/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <CreditCard className="absolute inset-0 m-auto w-8 h-8 text-red-600 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black mb-4 uppercase italic">Verifying <span className="text-red-600">Payment</span></h2>
        <p className="text-neutral-400 text-lg">Please wait while we confirm your M-Pesa transaction code <span className="text-white font-bold">{mpesaCode}</span>...</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 rounded-[3rem] border border-green-600/30 p-12 text-center shadow-2xl shadow-green-600/10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-green-600" />
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-600/40"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>

          <h2 className="text-4xl font-black mb-4 uppercase italic">Payment <span className="text-green-500">Confirmed!</span></h2>
          <div className="inline-block bg-green-600/10 text-green-500 px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs mb-8 border border-green-600/20">
            Transaction Verified
          </div>

          <div className="bg-black/40 rounded-3xl p-6 mb-8 border border-white/5 text-left space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 uppercase font-black tracking-widest">Order Type</span>
              <span className="font-bold">{typeLabel}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 uppercase font-black tracking-widest">Amount Paid</span>
              <span className="font-bold text-green-500">KES {amount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 uppercase font-black tracking-widest">M-Pesa Code</span>
              <span className="font-bold text-white uppercase">{mpesaCode}</span>
            </div>
          </div>

          <p className="text-neutral-400 mb-8 leading-relaxed">
            Your payment has been successfully processed. We are now redirecting you to WhatsApp to finalize the creative details with DJ RAPHO.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                const message = `Hello DJ RAPHO, I just placed an order for a ${typeLabel}.\nOrder Details: ${script}\nM-Pesa Code: ${mpesaCode}\n\nI am sending my M-Pesa message for verification now.`;
                window.open(`https://wa.me/254745260364?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="w-full bg-green-600 hover:bg-green-700 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-600/20"
            >
              <MessageSquare className="w-6 h-6" />
              Chat on WhatsApp Now
            </button>
            <div className="flex items-center justify-center gap-2 text-neutral-600 text-xs font-bold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Auto-redirecting in a few seconds...
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black mb-4 uppercase italic">Finalize <span className="text-red-600">Order</span></h1>
        <p className="text-neutral-400">Complete your payment and details to get your {typeLabel}.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Order Summary */}
        <div className="bg-neutral-900 p-8 rounded-3xl border border-white/5 space-y-8">
          <h3 className="text-xl font-bold uppercase tracking-widest text-red-500">Order Summary</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between py-4 border-b border-white/5">
              <span className="text-neutral-500">Service</span>
              <span className="font-bold">{typeLabel}</span>
            </div>
            <div className="flex justify-between py-4 border-b border-white/5">
              <span className="text-neutral-500">Price</span>
              <span className="font-bold text-2xl text-red-500">KES {amount}</span>
            </div>
            <div className="py-4">
              <span className="text-neutral-500 block mb-2">Details</span>
              <p className="text-sm italic bg-black/40 p-4 rounded-xl border border-white/5">{script || 'No details provided'}</p>
            </div>
          </div>

          <div className="bg-red-600/10 p-6 rounded-2xl border border-red-600/20">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500" />
              Payment Instructions
            </h4>
            <ol className="space-y-3 text-sm text-neutral-400 list-decimal list-inside">
              <li>Go to M-Pesa Menu</li>
              <li>Select Send Money</li>
              <li>Enter Number: <span className="text-white font-bold">0745260364</span></li>
              <li>Enter Amount: <span className="text-white font-bold">KES {amount}</span></li>
              <li>Copy the M-Pesa Transaction Code</li>
              <li><span className="text-white font-bold uppercase">Critical:</span> Send your M-Pesa message to DJ RAPHO on WhatsApp to verify.</li>
            </ol>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="bg-neutral-900 p-8 rounded-3xl border border-white/5 space-y-6">
          <div>
            <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">WhatsApp Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 0724421361"
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">We'll send your final files here.</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-3 uppercase tracking-wider text-neutral-500">M-Pesa Transaction Code</label>
            <input
              type="text"
              required
              value={mpesaCode}
              onChange={(e) => setMpesaCode(e.target.value)}
              placeholder="e.g. RDX1234567"
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 uppercase focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={step !== 'form' || !user}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-lg shadow-lg shadow-red-600/20"
          >
            <ArrowRight className="w-6 h-6" />
            Confirm & Send to WhatsApp
          </button>

          {!user && (
            <p className="text-center text-red-500 text-sm font-bold">Please Sign In to place an order.</p>
          )}
        </form>
      </div>
    </div>
  );
}
