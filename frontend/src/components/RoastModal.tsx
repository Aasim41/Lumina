'use client';

import { Flame } from 'lucide-react';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export function RoastModal({ isOpen, message, onClose }: { isOpen: boolean, message: string, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000]"
            onClick={onClose}
          />
          
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-sm glass bg-red-950/40 p-8 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-900/50 text-center relative overflow-hidden pointer-events-auto"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -z-10" />

              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Flame className="w-10 h-10 text-red-500" />
              </motion.div>
              
              <h2 className="text-2xl font-display font-bold text-white mb-4">Financial Roast</h2>
              
              <p className="text-red-100 text-lg mb-8 font-medium leading-relaxed italic">
                "{message}"
              </p>

              <Button type="button" size="lg" className="w-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30" onClick={onClose}>
                I'll do better
              </Button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
