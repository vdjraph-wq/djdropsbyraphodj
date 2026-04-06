import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ShoppingBag, Clock, CheckCircle, XCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function OrdersList({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(loading && false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-neutral-900 rounded-3xl border border-white/5">
        <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-neutral-800" />
        <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
        <p className="text-neutral-500">You need to be signed in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase italic">My <span className="text-red-600">Orders</span></h1>
          <p className="text-neutral-400">Track your DJ drops and poster designs.</p>
        </div>
        <div className="bg-red-600/10 px-4 py-2 rounded-full border border-red-600/20 text-red-500 font-bold text-sm">
          {orders.length} Orders
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900 rounded-3xl border border-white/5">
          <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-neutral-800" />
          <h2 className="text-2xl font-bold mb-4">No Orders Yet</h2>
          <p className="text-neutral-500">Your orders will appear here once you place them.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-neutral-900 p-6 rounded-3xl border border-white/5 hover:border-red-600/30 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                      order.type === 'voice_drop' ? "bg-blue-600/10 text-blue-500" :
                      order.type === 'poster' ? "bg-purple-600/10 text-purple-500" : "bg-orange-600/10 text-orange-500"
                    )}>
                      {order.type === 'voice_drop' ? <Clock className="w-8 h-8" /> : <ExternalLink className="w-8 h-8" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg uppercase tracking-tight">
                          {order.type === 'voice_drop' ? 'AI Voice Drop' : order.type === 'poster' ? 'Premium Poster' : 'Professional Logo'}
                        </h3>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-neutral-500 line-clamp-1 italic">"{order.script}"</p>
                      <div className="text-xs text-neutral-600 mt-2 flex items-center gap-4">
                        <span>KES {order.amount}</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span>M-Pesa: {order.mpesaCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        const message = `Hello DJ RAPHO, I'm checking on my order ID: ${order.id}.\nType: ${order.type}\nStatus: ${order.status}`;
                        window.open(`https://wa.me/254745260364?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="flex-1 md:flex-none bg-green-600/10 hover:bg-green-600/20 text-green-500 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-green-600/20"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat DJ RAPHO
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-600/10 text-yellow-500 border-yellow-600/20",
    paid: "bg-blue-600/10 text-blue-500 border-blue-600/20",
    completed: "bg-green-600/10 text-green-500 border-green-600/20",
    cancelled: "bg-red-600/10 text-red-500 border-red-600/20"
  };

  const icons = {
    pending: <Clock className="w-3 h-3" />,
    paid: <CheckCircle className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    cancelled: <XCircle className="w-3 h-3" />
  };

  return (
    <div className={cn(
      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
      styles[status as keyof typeof styles]
    )}>
      {icons[status as keyof typeof icons]}
      {status}
    </div>
  );
}
