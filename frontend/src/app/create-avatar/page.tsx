'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { updateUserProfile } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight } from 'lucide-react';

const MALE_SEEDS = [
  'Felix', 'Marcus', 'Leo', 'Aiden', 'Ravi', 'Omar',
  'James', 'Max', 'Ryan', 'Kai', 'Sam', 'Dante',
];

const FEMALE_SEEDS = [
  'Sophia', 'Maya', 'Zara', 'Luna', 'Aria', 'Priya',
  'Emma', 'Lily', 'Nova', 'Ruby', 'Mia', 'Ella',
];

const SKIN_TONES = [
  { name: 'Light', hex: 'ffdbb4' },
  { name: 'Fair', hex: 'edb98a' },
  { name: 'Medium', hex: 'd08b5b' },
  { name: 'Tan', hex: 'c68642' },
  { name: 'Brown', hex: 'ae5d29' },
  { name: 'Dark', hex: '614335' },
];

function buildAvatarUrl(seed: string, skinColor?: string) {
  let url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  if (skinColor) {
    url += `&skinColor=${skinColor}`;
  }
  return url;
}

export default function CreateAvatarPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedSeed, setSelectedSeed] = useState('Felix');
  const [skinColor, setSkinColor] = useState('');
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());

  const seeds = gender === 'male' ? MALE_SEEDS : FEMALE_SEEDS;
  const selectedUrl = buildAvatarUrl(selectedSeed, skinColor || undefined);

  useEffect(() => {
    setSelectedSeed(seeds[0]);
    setLoadErrors(new Set());
  }, [gender]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ avatar_url: selectedUrl });
      await refreshUser();
      router.push('/');
    } catch (e) {
      console.error('Failed to save avatar', e);
      router.push('/');
    }
  };

  const handleSkip = async () => {
    // Clear avatar so dashboard shows name initial
    try {
      await updateUserProfile({ avatar_url: '' });
      await refreshUser();
    } catch (e) {
      // ignore
    }
    router.push('/');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-8 pb-2 safe-pt relative">
          <button
            onClick={handleSkip}
            className="absolute right-6 top-8 text-sm text-text-secondary hover:text-white transition-colors"
          >
            Skip →
          </button>
          <div className="text-center">
            <span className="font-display font-bold tracking-[0.3em] text-[10px] text-primary/50 uppercase">Lumina</span>
            <h1 className="text-2xl font-display font-bold text-white mt-3">Create Your Avatar</h1>
            <p className="text-sm text-text-secondary mt-1">Pick one that looks like you!</p>
          </div>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center py-4">
          <motion.div
            key={selectedUrl}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/30 shadow-[0_0_40px_rgba(124,197,68,0.2)] overflow-hidden flex items-center justify-center"
          >
            <img
              src={selectedUrl}
              alt="Selected Avatar"
              className="w-24 h-24"
              onError={() => setLoadErrors(prev => new Set(prev).add(selectedSeed))}
            />
          </motion.div>
        </div>

        {/* Gender Tabs */}
        <div className="flex justify-center gap-3 px-6 mb-4">
          <button
            onClick={() => setGender('male')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${gender === 'male' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-text-secondary border border-white/10'}`}
          >
            👨 Male
          </button>
          <button
            onClick={() => setGender('female')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${gender === 'female' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-white/5 text-text-secondary border border-white/10'}`}
          >
            👩 Female
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-32">
          {/* Skin Tone */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">Skin Tone</p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setSkinColor('')}
                className={`w-10 h-10 rounded-full border-2 transition-all text-xs font-bold ${!skinColor ? 'border-primary scale-110 shadow-[0_0_12px_rgba(124,197,68,0.5)]' : 'border-white/10'} bg-white/10 text-text-secondary`}
              >
                Auto
              </button>
              {SKIN_TONES.map(s => (
                <button
                  key={s.hex}
                  onClick={() => setSkinColor(s.hex)}
                  className={`w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${skinColor === s.hex ? 'border-primary scale-110 shadow-[0_0_12px_rgba(124,197,68,0.5)]' : 'border-white/10 hover:border-white/30'}`}
                  style={{ backgroundColor: `#${s.hex}` }}
                />
              ))}
            </div>
          </div>

          {/* Avatar Grid */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">Choose Your Look</p>
            <div className="grid grid-cols-4 gap-3">
              {seeds.map(seed => {
                const url = buildAvatarUrl(seed, skinColor || undefined);
                const isSelected = selectedSeed === seed;
                return (
                  <motion.button
                    key={seed}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedSeed(seed)}
                    className={`aspect-square rounded-2xl overflow-hidden flex items-center justify-center transition-all ${isSelected ? 'border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,197,68,0.3)] scale-105' : 'border border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    {loadErrors.has(seed) ? (
                      <span className="text-2xl font-bold text-primary">{seed.charAt(0)}</span>
                    ) : (
                      <img
                        src={url}
                        alt={seed}
                        className="w-full h-full p-1"
                        onError={() => setLoadErrors(prev => new Set(prev).add(seed))}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-5 bg-gradient-to-t from-[#0B1021] via-[#0B1021] to-transparent">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-[#7cc544] hover:bg-[#8ade4b] text-black font-bold text-lg rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(124,197,68,0.3)]"
          >
            {saving ? 'Saving...' : 'Continue to Dashboard'}
            {!saving && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
