import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, login, logout, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Mic, 
  Image as ImageIcon, 
  ShoppingBag, 
  MessageSquare, 
  Facebook, 
  Twitter, 
  Youtube, 
  Instagram, 
  Music,
  Menu,
  X,
  LogOut,
  Phone,
  CreditCard,
  Key,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Components (to be created)
import CreateDrop from './components/CreateDrop';
import LiveAssistantPage from './components/LiveAssistantPage';
import PosterMaker from './components/PosterMaker';
import PhotoGenerator from './components/PhotoGenerator';
import OrderForm from './components/OrderForm';
import OrdersList from './components/OrdersList';
import AIChatbot from './components/AIChatbot';
import TextDropOrder from './components/TextDropOrder';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
    // Check periodically in case they select it in another tab or dialog
    const interval = setInterval(checkApiKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleActivateKeys = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume success as per instructions to avoid race conditions
      setHasApiKey(true);
    }
  };

  const isAdmin = user?.email === 'vdjraph@gmail.com';

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then((docSnap) => {
        if (!docSnap.exists()) {
          setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'client',
            createdAt: new Date().toISOString()
          });
        }
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-600/30">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Music className="text-white w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tighter uppercase italic">DJ RAPHO <span className="text-red-600">DROPS</span></span>
              </Link>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center gap-8">
                <button 
                  onClick={handleActivateKeys}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                    hasApiKey 
                      ? "bg-green-600/10 border-green-600/30 text-green-500" 
                      : "bg-amber-600/10 border-amber-600/30 text-amber-500 hover:bg-amber-600/20"
                  )}
                >
                  {hasApiKey ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  {hasApiKey ? "API ACTIVE" : "ACTIVATE API"}
                </button>
                <Link to="/create-drop" className="hover:text-red-500 transition-colors">Create Drop</Link>
                <Link to="/text-order" className="hover:text-red-500 transition-colors">Manual Order</Link>
                <Link to="/photo-generator" className="hover:text-red-500 transition-colors">Photo Generator</Link>
                <Link to="/posters" className="hover:text-red-500 transition-colors">Poster Maker</Link>
                <Link to="/live" className="hover:text-red-500 transition-colors">Live AI</Link>
                <Link to="/orders" className="hover:text-red-500 transition-colors">My Orders</Link>
                {isAdmin && (
                  <Link to="/admin" className="bg-red-600/10 text-red-500 px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] border border-red-600/20 hover:bg-red-600/20 transition-all">
                    Admin Panel
                  </Link>
                )}
                {user ? (
                  <div className="flex items-center gap-4">
                    <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-white/20" />
                    <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={login} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold transition-all active:scale-95">
                    Sign In
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
                  {isMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-black border-b border-white/10 overflow-hidden"
              >
                  <div className="px-4 pt-2 pb-6 space-y-4">
                    <button 
                      onClick={() => { handleActivateKeys(); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl text-sm font-bold border",
                        hasApiKey 
                          ? "bg-green-600/10 border-green-600/30 text-green-500" 
                          : "bg-amber-600/10 border-amber-600/30 text-amber-500"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {hasApiKey ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                        {hasApiKey ? "API KEYS ACTIVE" : "ACTIVATE API KEYS"}
                      </div>
                      {!hasApiKey && <Key className="w-4 h-4" />}
                    </button>
                    <Link to="/create-drop" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5">Create Drop</Link>
                    <Link to="/text-order" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5">Manual Order</Link>
                    <Link to="/photo-generator" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5">Photo Generator</Link>
                    <Link to="/posters" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5">Poster Maker</Link>
                    <Link to="/live" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5">Live AI</Link>
                    <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5">My Orders</Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-lg py-2 border-b border-white/5 text-red-500 font-black">Admin Panel</Link>
                    )}
                    {user ? (
                    <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full text-left text-red-500 py-2">Sign Out</button>
                  ) : (
                    <button onClick={() => { login(); setIsMenuOpen(false); }} className="w-full bg-red-600 py-3 rounded-xl font-bold">Sign In</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Main Content */}
        <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/create-drop" element={<CreateDrop />} />
            <Route path="/text-order" element={<TextDropOrder />} />
            <Route path="/live" element={<LiveAssistantPage />} />
            <Route path="/posters" element={<PosterMaker />} />
            <Route path="/photo-generator" element={<PhotoGenerator />} />
            <Route path="/orders" element={<OrdersList user={user} />} />
            <Route path="/order/:type" element={<OrderForm user={user} />} />
            {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
          </Routes>
        </main>

        <AIChatbot />

        {/* Footer / Socials */}
        <footer className="bg-black border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex justify-center gap-6 mb-8">
              <a href="https://facebook.com" className="hover:text-blue-500 transition-colors"><Facebook /></a>
              <a href="https://twitter.com" className="hover:text-sky-400 transition-colors"><Twitter /></a>
              <a href="https://youtube.com" className="hover:text-red-600 transition-colors"><Youtube /></a>
              <a href="https://instagram.com" className="hover:text-pink-500 transition-colors"><Instagram /></a>
              <a href="https://tiktok.com" className="hover:text-white transition-colors"><Music /></a>
            </div>
            <p className="text-neutral-500 text-sm">© 2026 DJ RAPHO DROPS. All rights reserved.</p>
            <div className="mt-4 flex flex-col items-center gap-2 text-neutral-400">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> 0724421361 / 0745260364</div>
              <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> M-Pesa: 0745260364</div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function Home({ user }: { user: any }) {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-900/20 to-black border border-white/10 p-8 md:p-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-red-600/20 text-red-500 text-sm font-bold mb-6 border border-red-600/30 uppercase tracking-widest">Premium DJ Services</span>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none uppercase italic">
            Elevate Your <span className="text-red-600">Sound</span> & <span className="text-red-600">Style</span>
          </h1>
          <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Get high-quality AI-powered DJ drops, voice clones, and professional promotional posters. Powered by DJ RAPHO.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/create-drop" className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20">
              Create DJ Drop
            </Link>
            <Link to="/text-order" className="bg-white/10 hover:bg-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 backdrop-blur-sm">
              Manual Order
            </Link>
            <Link to="/photo-generator" className="bg-white/10 hover:bg-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 backdrop-blur-sm">
              Photo Generator
            </Link>
            <Link to="/posters" className="bg-white/10 hover:bg-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 backdrop-blur-sm">
              Design Poster
            </Link>
          </div>
        </motion.div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900 rounded-full blur-[120px]" />
        </div>
      </section>

      {/* Featured Promotion */}
      <section className="mb-20">
        <div className="bg-neutral-900 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 z-10" />
          <img 
            src="https://picsum.photos/seed/rapho-official-poster/1200/1500" 
            alt="DJ RAPHO Official Services" 
            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 left-0 w-full p-8 sm:p-12 z-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600 rounded-full text-white text-xs font-black uppercase tracking-widest mb-4 shadow-lg shadow-red-600/40">
              Official Promotion
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter mb-4">
              Premium <span className="text-red-600">DJ Drops</span> & Graphics
            </h2>
            <p className="text-neutral-300 max-w-xl text-sm sm:text-lg font-medium leading-relaxed">
              Get professional DJ drops, 3D logos, and animations starting from only <span className="text-white font-bold">70sh</span>. Quality service by DJ RAPHO.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
        <ServiceCard 
          icon={<Mic className="w-8 h-8 text-red-500" />}
          title="AI Voice Drops"
          description="Customized DJ drops using advanced AI voice cloning. Professional quality guaranteed."
          link="/create-drop"
        />
        <ServiceCard 
          icon={<MessageSquare className="w-8 h-8 text-red-500" />}
          title="Manual Studio Drops"
          description="Order professional studio recordings directly from DJ RAPHO for only 150sh."
          link="/text-order"
        />
        <ServiceCard 
          icon={<ImageIcon className="w-8 h-8 text-red-500" />}
          title="3D Logo Design"
          description="Get a professional 3D logo for your brand for only 70sh."
          link="/order/3d_logo"
        />
        <ServiceCard 
          icon={<Music className="w-8 h-8 text-red-500" />}
          title="3D Logo Animation"
          description="Animate your logo for only 250sh. Perfect for video intros."
          link="/order/3d_logo_animation"
        />
        <ServiceCard 
          icon={<ImageIcon className="w-8 h-8 text-red-500" />}
          title="Poster Design"
          description="Instant professional posters for your events and brand identity."
          link="/posters"
        />
        <ServiceCard 
          icon={<ShoppingBag className="w-8 h-8 text-red-500" />}
          title="Premium Packs"
          description="Ready-to-use drop packs and templates for every genre and occasion."
          link="/order/pack"
        />
      </section>

      {/* Contact Section */}
      <section className="bg-neutral-900 rounded-3xl p-8 md:p-12 border border-white/5">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Need Custom Work?</h2>
            <p className="text-neutral-400 mb-8">Contact DJ RAPHO directly for exclusive voice clones, special event posters, or bulk orders.</p>
            <div className="space-y-4">
              <a href="https://wa.me/254724421361" className="flex items-center gap-4 p-4 bg-green-600/10 border border-green-600/20 rounded-2xl hover:bg-green-600/20 transition-colors">
                <MessageSquare className="text-green-500" />
                <div>
                  <div className="font-bold">WhatsApp DJ RAPHO</div>
                  <div className="text-sm text-neutral-400">0724421361</div>
                </div>
              </a>
              <div className="flex items-center gap-4 p-4 bg-red-600/10 border border-red-600/20 rounded-2xl">
                <CreditCard className="text-red-500" />
                <div>
                  <div className="font-bold">M-Pesa Payment</div>
                  <div className="text-sm text-neutral-400">Till/Number: 0745260364</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
            <img 
              src="https://picsum.photos/seed/dj-rapho/800/800" 
              alt="DJ RAPHO" 
              className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <div className="text-xl font-black italic uppercase">DJ RAPHO <span className="text-red-600">OFFICIAL</span></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ServiceCard({ icon, title, description, link }: { icon: any, title: string, description: string, link: string }) {
  return (
    <Link to={link} className="group p-8 bg-neutral-900/50 border border-white/5 rounded-3xl hover:bg-neutral-900 hover:border-red-600/30 transition-all hover:-translate-y-2">
      <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:bg-red-600/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-neutral-500 leading-relaxed">{description}</p>
    </Link>
  );
}
