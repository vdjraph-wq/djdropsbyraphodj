import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Search,
  Filter,
  User,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'completed'>('all');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.mpesaCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.whatsappNumber?.includes(searchTerm) ||
      order.script?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Admin <span className="text-red-600">Dashboard</span></h1>
          <p className="text-neutral-500">Manage orders and verify payments.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-3">
            <ShoppingBag className="text-red-500 w-5 h-5" />
            <div>
              <div className="text-[10px] font-black uppercase text-neutral-500">Total Orders</div>
              <div className="font-bold">{orders.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by M-Pesa code, phone, or script..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-600 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-neutral-500 ml-2" />
          {(['all', 'paid', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                filterStatus === status 
                  ? "bg-red-600 border-red-600 text-white" 
                  : "bg-neutral-900 border-white/5 text-neutral-500 hover:border-white/20"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-all group"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        order.status === 'completed' ? "bg-green-600/20 text-green-500" : "bg-amber-600/20 text-amber-500"
                      )}>
                        {order.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase text-neutral-500 tracking-widest">{order.type?.replace('_', ' ')}</div>
                        <div className="font-bold text-lg uppercase tracking-tight italic">{order.mpesaCode || 'NO CODE'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase text-neutral-500">Amount</div>
                      <div className="font-black text-red-500 italic">KES {order.amount}</div>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                    <div className="text-[10px] font-black uppercase text-neutral-500 mb-2">Script / Details</div>
                    <p className="text-sm italic text-neutral-300">{order.script || 'No details provided'}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <User className="w-3 h-3" />
                      <span>{order.userId?.substring(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <MessageSquare className="w-3 h-3" />
                      <span>{order.whatsappNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:w-48 flex flex-col gap-2">
                  <button
                    onClick={() => window.open(`https://wa.me/${order.whatsappNumber?.replace(/\D/g, '')}`, '_blank')}
                    className="w-full bg-green-600/10 hover:bg-green-600/20 text-green-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Chat Client
                  </button>
                  
                  {order.status !== 'completed' ? (
                    <button
                      onClick={() => updateStatus(order.id, 'completed')}
                      className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Mark Done
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(order.id, 'paid')}
                      className="w-full bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                    >
                      <Clock className="w-3 h-3" />
                      Re-open
                    </button>
                  )}

                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="text-center py-20 bg-neutral-900/50 rounded-[3rem] border border-dashed border-white/10">
            <ShoppingBag className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 font-bold">No orders found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
