import { useState, useEffect } from 'react';
import { db, loginWithGoogle as login } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ShoppingBag, Clock, CheckCircle, XCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function OrdersList({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

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
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'paid').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-neutral-900 rounded-[3rem] border border-white/5">
        <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-neutral-800" />
        <h2 className="text-2xl font-black uppercase italic mb-4">Please Sign In</h2>
        <p className="text-neutral-500 mb-8">You need to be signed in to view your order history.</p>
        <button onClick={() => login()} className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-2xl font-bold transition-all">
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header & Stats */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">Order <span className="text-red-600">History</span></h1>
            <p className="text-neutral-400 font-medium">Manage and track your premium DJ drops and designs.</p>
          </div>
          
          <div className="flex gap-4">
            <StatCard label="Total" value={stats.total} color="neutral" />
            <StatCard label="Active" value={stats.pending} color="red" />
            <StatCard label="Done" value={stats.completed} color="green" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-900 border border-white/5 rounded-2xl w-fit">
          {['all', 'pending', 'paid', 'completed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === f 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-neutral-500 hover:text-white hover:bg-white/5"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-600">Loading your history...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-32 bg-neutral-900 rounded-[3rem] border border-white/5">
          <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-neutral-800" />
          <h2 className="text-2xl font-black uppercase italic mb-4">No {filter !== 'all' ? filter : ''} Orders</h2>
          <p className="text-neutral-500">Your orders will appear here once you place them.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-neutral-900 p-6 rounded-[2rem] border border-white/5 hover:border-red-600/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-start sm:items-center gap-6">
                    <div className={cn(
                      "w-20 h-20 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-inner",
                      order.type === 'voice_drop' ? "bg-blue-600/10 text-blue-500" :
                      order.type === 'poster' ? "bg-purple-600/10 text-purple-500" : "bg-orange-600/10 text-orange-500"
                    )}>
                      {order.type === 'voice_drop' ? <Clock className="w-10 h-10" /> : <ExternalLink className="w-10 h-10" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-black text-xl uppercase italic tracking-tighter">
                          {order.type === 'voice_drop' ? 'AI Voice Drop' : order.type === 'poster' ? 'Premium Poster' : 'Professional Logo'}
                        </h3>
                        <StatusBadge status={order.status} />
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-neutral-400 font-medium line-clamp-2 italic">
                          "{order.script || order.prompt}"
                        </p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">Amount</span>
                            <span className="text-sm font-bold text-white">KES {order.amount}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">Date</span>
                            <span className="text-sm font-bold text-neutral-400">{new Date(order.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">M-Pesa</span>
                            <span className="text-sm font-bold text-red-500/80 uppercase">{order.mpesaCode}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button 
                      onClick={() => {
                        const message = `Hello DJ RAPHO, I'm checking on my order ID: ${order.id}.\nType: ${order.type}\nStatus: ${order.status}`;
                        window.open(`https://wa.me/254745260364?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="w-full sm:w-auto bg-green-600/10 hover:bg-green-600/20 text-green-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all border border-green-600/20 shadow-lg shadow-green-600/5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Support
                    </button>
                    
                    <div className="text-[10px] font-black uppercase text-neutral-700 tracking-[0.2em] hidden lg:block">
                      ID: {order.id.slice(0, 8)}
                    </div>
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

function StatCard({ label, value, color }: { label: string, value: number, color: 'neutral' | 'red' | 'green' }) {
  const colors = {
    neutral: "bg-neutral-900 border-white/5",
    red: "bg-red-600/10 border-red-600/20 text-red-500",
    green: "bg-green-600/10 border-green-600/20 text-green-500"
  };

  return (
    <div className={cn("px-6 py-4 rounded-2xl border flex flex-col items-center justify-center min-w-[100px]", colors[color])}>
      <div className="text-2xl font-black italic tracking-tighter">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</div>
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
