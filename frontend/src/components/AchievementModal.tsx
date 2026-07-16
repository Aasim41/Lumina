import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Flame, Trophy, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeId: string;
}

export function AchievementModal({ isOpen, onClose, badgeId }: AchievementModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti when modal opens
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getBadgeDetails = (id: string) => {
    switch(id) {
      case '3_day_streak':
        return { title: '3-Day Streak!', icon: <Flame className="w-16 h-16 text-orange-500" />, desc: "You logged an expense 3 days in a row! Keep the fire burning!" };
      case '7_day_streak':
        return { title: '1 Week Streak!', icon: <Flame className="w-16 h-16 text-orange-500" />, desc: "A full week of tracking! You're building a great habit." };
      case '30_day_streak':
        return { title: '30-Day Streak!', icon: <Trophy className="w-16 h-16 text-yellow-400" />, desc: "A full month of tracking! You are a financial master." };
      case 'First Steps':
        return { title: 'First Steps', icon: <TrendingUp className="w-16 h-16 text-sky-400" />, desc: "You recorded your first transaction. The journey begins!" };
      case 'Super Saver':
        return { title: 'Super Saver', icon: <Trophy className="w-16 h-16 text-emerald-400" />, desc: "You saved over 20% of your budget this month!" };
      case 'On Track':
        return { title: 'On Track', icon: <TrendingUp className="w-16 h-16 text-purple-400" />, desc: "Your projected spending is well below your budget." };
      default:
        return { title: 'Achievement Unlocked!', icon: <Award className="w-16 h-16 text-orange-400" />, desc: "You unlocked a new milestone!" };
    }
  };

  const badge = getBadgeDetails(badgeId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="bg-surface border border-white/10 p-8 rounded-3xl w-full max-w-sm relative overflow-hidden shadow-2xl flex flex-col items-center text-center"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 transform -skew-x-12 animate-shine pointer-events-none" />
          
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center mb-6 relative shadow-[0_0_50px_rgba(249,115,22,0.2)]">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              {badge.icon}
            </motion.div>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-white mb-2">{badge.title}</h2>
          <p className="text-text-secondary text-sm mb-8 leading-relaxed">
            {badge.desc}
          </p>
          
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-3.5 rounded-2xl shadow-lg hover:shadow-primary/25 transition-all"
          >
            Awesome!
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
