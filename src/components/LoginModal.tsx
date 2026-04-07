import { useState } from 'react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  resetPassword,
  updateProfile 
} from '../firebase';
import { Mail, Lock, User, Github, Chrome, X, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        const userCredential = await registerWithEmail(email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        onClose();
      } else {
        await resetPassword(email);
        setSuccess('Password reset email sent! Please check your inbox.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>

        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-600/20 rotate-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">
              {mode === 'login' ? 'Welcome' : mode === 'register' ? 'Join Us' : 'Reset'} <span className="text-red-600">Back</span>
            </h2>
            <p className="text-neutral-500 text-sm mt-2">
              {mode === 'login' ? 'Sign in to access your DJ drops and orders.' : mode === 'register' ? 'Create an account to start ordering.' : 'Enter your email to reset your password.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-600/10 border border-green-600/20 rounded-2xl flex items-center gap-3 text-green-500 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600 transition-colors text-sm"
                />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600 transition-colors text-sm"
              />
            </div>

            {mode !== 'reset' && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600 transition-colors text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-600/20 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
              <span className="bg-neutral-900 px-4 text-neutral-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 bg-white text-black hover:bg-neutral-200 py-4 rounded-2xl font-bold transition-all"
            >
              <Chrome className="w-5 h-5" />
              Google
            </button>
          </div>

          <div className="mt-8 text-center space-y-2">
            {mode === 'login' ? (
              <>
                <p className="text-neutral-500 text-sm">
                  Don't have an account?{' '}
                  <button onClick={() => setMode('register')} className="text-red-500 font-bold hover:underline">
                    Sign Up
                  </button>
                </p>
                <button onClick={() => setMode('reset')} className="text-neutral-500 text-xs hover:text-white transition-colors">
                  Forgot your password?
                </button>
              </>
            ) : mode === 'register' ? (
              <p className="text-neutral-500 text-sm">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-red-500 font-bold hover:underline">
                  Sign In
                </button>
              </p>
            ) : (
              <button onClick={() => setMode('login')} className="text-red-500 font-bold text-sm hover:underline">
                Back to Login
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
