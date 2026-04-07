import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';

export default function HeroBackground() {
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('night');
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 50);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 50);
    };

    const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) setTimeOfDay('morning');
      else if (hour >= 12 && hour < 18) setTimeOfDay('afternoon');
      else if (hour >= 18 && hour < 22) setTimeOfDay('evening');
      else setTimeOfDay('night');
    };

    window.addEventListener('mousemove', handleMouseMove);
    updateTimeOfDay();
    const interval = setInterval(updateTimeOfDay, 60000); // Update every minute

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  const getColors = () => {
    switch (timeOfDay) {
      case 'morning':
        return {
          primary: 'rgba(239, 68, 68, 0.3)', // Red-500
          secondary: 'rgba(245, 158, 11, 0.2)', // Amber-500
          accent: 'rgba(251, 191, 36, 0.15)', // Yellow-400
        };
      case 'afternoon':
        return {
          primary: 'rgba(239, 68, 68, 0.3)',
          secondary: 'rgba(59, 130, 246, 0.2)', // Blue-500
          accent: 'rgba(255, 255, 255, 0.1)',
        };
      case 'evening':
        return {
          primary: 'rgba(239, 68, 68, 0.3)',
          secondary: 'rgba(139, 92, 246, 0.2)', // Violet-500
          accent: 'rgba(236, 72, 153, 0.15)', // Pink-500
        };
      case 'night':
      default:
        return {
          primary: 'rgba(153, 27, 27, 0.3)', // Red-800
          secondary: 'rgba(0, 0, 0, 0.4)',
          accent: 'rgba(69, 10, 10, 0.2)', // Red-950
        };
    }
  };

  const colors = getColors();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Gradients */}
      <motion.div
        animate={{
          backgroundColor: colors.primary,
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ x: x, y: y }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-40"
      />
      
      <motion.div
        animate={{
          backgroundColor: colors.secondary,
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ x: useTransform(x, (v) => v * -1.2), y: useTransform(y, (v) => v * -1.2) }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-30"
      />

      <motion.div
        animate={{
          backgroundColor: colors.accent,
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ x: useTransform(x, (v) => v * 0.8), y: useTransform(y, (v) => v * -0.8) }}
        className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-20"
      />

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5 + 0.2
            }}
            animate={{
              y: [null, "-20px", "20px", null],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-1 h-1 bg-red-500/40 rounded-full"
          />
        ))}
      </div>

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />
    </div>
  );
}
