import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const amount = type === 'voice_drop' ? 500 : type === 'poster' ? 1000 : 1500;
  const typeLabel = type === 'voice_drop' ? 'AI Voice Drop' : type === 'poster' ? 'Premium Poster' : 'Professional Logo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const orderData = {
        userId: user.uid,
        type,
        script,
        status: 'pending',
        amount,
        mpesaCode,
        whatsappNumber: whatsapp,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      setIsSuccess(true);
      
      // Auto-redirect to WhatsApp after 2 seconds
      setTimeout(() => {
        const message = `Hello DJ RAPHO, I just placed an order for a ${typeLabel}.\nOrder Details: ${script}\nM-Pesa Code: ${mpesaCode}`;
        window.open(`https://wa.me/254745260364?text=${encodeURIComponent(message)}`, '_blank');
        navigate('/orders');
      }, 3000);

    } catch (error) {
      console.error("Error placing order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-4xl font-black mb-4 uppercase italic">Order <span className="text-green-500">Received!</span></h2>
        <p className="text-neutral-400 text-lg mb-8">Redirecting you to WhatsApp to finalize your order with DJ RAPHO...</p>
        <div className="flex items-center justify-center gap-2 text-green-500 font-bold animate-pulse">
          <MessageSquare className="w-5 h-5" />
          Opening WhatsApp...
        </div>
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
            disabled={isSubmitting || !user}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-lg shadow-lg shadow-red-600/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <ArrowRight className="w-6 h-6" />
            )}
            {isSubmitting ? 'Processing...' : 'Confirm & Send to WhatsApp'}
          </button>

          {!user && (
            <p className="text-center text-red-500 text-sm font-bold">Please Sign In to place an order.</p>
          )}
        </form>
      </div>
    </div>
  );
}
