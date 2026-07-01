'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { updateUserProfile } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight } from 'lucide-react';

const MALE_SEEDS = ['Felix', 'Marcus', 'Leo', 'Aiden', 'Ravi', 'Omar', 'James', 'Max', 'Ryan', 'Kai', 'Sam', 'Dante'];
const FEMALE_SEEDS = ['Sophia', 'Maya', 'Zara', 'Luna', 'Aria', 'Priya', 'Emma', 'Lily', 'Nova', 'Ruby', 'Mia', 'Ella'];

const SKIN_TONES = [
  { name: 'Light', hex: 'ffdbb4' },
  { name: 'Fair', hex: 'edb98a' },
  { name: 'Medium', hex: 'd08b5b' },
  { name: 'Tan', hex: 'c68642' },
  { name: 'Brown', hex: 'ae5d29' },
  { name: 'Dark', hex: '614335' },
];

const HAIR_STYLES = [
  { name: 'Short Flat', value: 'shortFlat' },
  { name: 'Short Waved', value: 'shortWaved' },
  { name: 'Short Curly', value: 'shortCurly' },
  { name: 'Caesar', value: 'theCaesar' },
  { name: 'Dreads', value: 'dreads01' },
  { name: 'Frizzle', value: 'frizzle' },
  { name: 'Shaggy', value: 'shaggy' },
  { name: 'Bob', value: 'bob' },
  { name: 'Long', value: 'longButNotToo' },
  { name: 'Curvy', value: 'curvy' },
  { name: 'Straight', value: 'straight01' },
  { name: 'Bun', value: 'bun' },
  { name: 'Fro', value: 'fro' },
  { name: 'Mia Wallace', value: 'miaWallace' },
  { name: 'Turban', value: 'turban' },
  { name: 'Hijab', value: 'hijab' },
];

const HAIR_COLORS = [
  { name: 'Black', hex: '2c1b18' },
  { name: 'Dark Brown', hex: '4a312c' },
  { name: 'Brown', hex: '724133' },
  { name: 'Auburn', hex: 'a55728' },
  { name: 'Blonde', hex: 'b58143' },
  { name: 'Platinum', hex: 'ecdcbf' },
  { name: 'Red', hex: 'c93305' },
  { name: 'Gray', hex: 'b1b1b1' },
];

const FACIAL_HAIR = [
  { name: 'None', value: 'blank' },
  { name: 'Light Beard', value: 'beardLight' },
  { name: 'Medium Beard', value: 'beardMedium' },
  { name: 'Majestic', value: 'beardMajestic' },
  { name: 'Fancy Stache', value: 'moustacheFancy' },
  { name: 'Magnum', value: 'moustacheMagnum' },
];

const ACCESSORIES = [
  { name: 'None', value: 'blank' },
  { name: 'Round', value: 'round' },
  { name: 'Prescription', value: 'prescription01' },
  { name: 'Wayfarers', value: 'wayfarers' },
  { name: 'Sunglasses', value: 'sunglasses' },
];

const EYES = [
  { name: 'Default', value: 'default' },
  { name: 'Happy', value: 'happy' },
  { name: 'Wink', value: 'wink' },
  { name: 'Squint', value: 'squint' },
  { name: 'Hearts', value: 'hearts' },
  { name: 'Side', value: 'side' },
];

const MOUTH = [
  { name: 'Smile', value: 'smile' },
  { name: 'Default', value: 'default' },
  { name: 'Twinkle', value: 'twinkle' },
  { name: 'Tongue', value: 'tongue' },
  { name: 'Serious', value: 'serious' },
];

const CLOTHING = [
  { name: 'Hoodie', value: 'hoodie' },
  { name: 'Crew Neck', value: 'shirtCrewNeck' },
  { name: 'V Neck', value: 'shirtVNeck' },
  { name: 'Blazer', value: 'blazerAndShirt' },
  { name: 'Sweater', value: 'collarAndSweater' },
  { name: 'Overall', value: 'overall' },
];

const CLOTHING_COLORS = [
  { name: 'Black', hex: '262e33' },
  { name: 'Blue', hex: '65c9ff' },
  { name: 'Navy', hex: '25557c' },
  { name: 'Gray', hex: '929598' },
  { name: 'Pink', hex: 'ff488e' },
  { name: 'Red', hex: 'ff5c5c' },
  { name: 'Green', hex: 'a7ffc4' },
];

type Mode = 'preset' | 'custom';

export default function CreateAvatarPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [mode, setMode] = useState<Mode>('preset');

  // Preset mode state
  const [selectedSeed, setSelectedSeed] = useState('Felix');

  // Custom mode state
  const [skinColor, setSkinColor] = useState('edb98a');
  const [hairStyle, setHairStyle] = useState('shortFlat');
  const [hairColor, setHairColor] = useState('2c1b18');
  const [facialHair, setFacialHair] = useState('blank');
  const [accessories, setAccessories] = useState('blank');
  const [eyes, setEyes] = useState('default');
  const [mouth, setMouth] = useState('smile');
  const [clothing, setClothing] = useState('hoodie');
  const [clothingColor, setClothingColor] = useState('262e33');

  const seeds = gender === 'male' ? MALE_SEEDS : FEMALE_SEEDS;

  useEffect(() => {
    setSelectedSeed(seeds[0]);
  }, [gender]);

  const presetUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(selectedSeed)}`;

  const customUrl = useMemo(() => {
    const p: Record<string, string> = {
      seed: 'custom-avatar',
      skinColor, top: hairStyle, hairColor,
      facialHair, facialHairProbability: facialHair === 'blank' ? '0' : '100',
      accessories, accessoriesProbability: accessories === 'blank' ? '0' : '100',
      eyes, mouth, clothing, clothingColor,
    };
    return `https://api.dicebear.com/9.x/avataaars/svg?${new URLSearchParams(p).toString()}`;
  }, [skinColor, hairStyle, hairColor, facialHair, accessories, eyes, mouth, clothing, clothingColor]);

  const activeUrl = mode === 'preset' ? presetUrl : customUrl;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ avatar_url: activeUrl });
      await refreshUser();
      router.push('/');
    } catch (e) {
      console.error('Failed to save avatar', e);
      router.push('/');
    }
  };

  const handleSkip = async () => {
    try { await updateUserProfile({ avatar_url: '' }); await refreshUser(); } catch {}
    router.push('/');
  };

  const ColorSwatch = ({ hex, selected, onClick }: { hex: string; selected: boolean; onClick: () => void }) => (
    <button onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${selected ? 'border-primary scale-110 shadow-[0_0_12px_rgba(124,197,68,0.5)]' : 'border-white/10 hover:border-white/30'}`}
      style={{ backgroundColor: `#${hex}` }} />
  );

  const Pill = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${selected ? 'bg-primary text-black shadow-[0_0_12px_rgba(124,197,68,0.4)]' : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'}`}>
      {label}
    </button>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">{title}</p>
      {children}
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-8 pb-2 safe-pt relative">
          <button onClick={handleSkip} className="absolute right-6 top-8 text-sm text-text-secondary hover:text-white transition-colors">Skip →</button>
          <div className="text-center">
            <span className="font-display font-bold tracking-[0.3em] text-[10px] text-primary/50 uppercase">Lumina</span>
            <h1 className="text-2xl font-display font-bold text-white mt-3">Create Your Avatar</h1>
            <p className="text-sm text-text-secondary mt-1">Pick a preset or design your own!</p>
          </div>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center py-4">
          <motion.div key={activeUrl} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }}
            className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/30 shadow-[0_0_40px_rgba(124,197,68,0.2)] overflow-hidden flex items-center justify-center">
            <img src={activeUrl} alt="Avatar" className="w-24 h-24" />
          </motion.div>
        </div>

        {/* Gender Tabs */}
        <div className="flex justify-center gap-3 px-6 mb-3">
          <button onClick={() => setGender('male')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${gender === 'male' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-text-secondary border border-white/10'}`}>
            👨 Male
          </button>
          <button onClick={() => setGender('female')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${gender === 'female' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-white/5 text-text-secondary border border-white/10'}`}>
            👩 Female
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center gap-2 px-6 mb-4">
          <button onClick={() => setMode('preset')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${mode === 'preset' ? 'bg-white/10 text-white border border-white/20' : 'text-text-secondary hover:text-white'}`}>
            🎨 Presets
          </button>
          <button onClick={() => setMode('custom')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${mode === 'custom' ? 'bg-white/10 text-white border border-white/20' : 'text-text-secondary hover:text-white'}`}>
            ✏️ Customize
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-32">
          {mode === 'preset' ? (
            /* ---- PRESET MODE ---- */
            <div>
              <Section title="Choose Your Look">
                <div className="grid grid-cols-4 gap-3">
                  {seeds.map(seed => {
                    const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
                    const isSelected = selectedSeed === seed;
                    return (
                      <motion.button key={seed} whileTap={{ scale: 0.9 }} onClick={() => setSelectedSeed(seed)}
                        className={`aspect-square rounded-2xl overflow-hidden flex items-center justify-center transition-all ${isSelected ? 'border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(124,197,68,0.3)] scale-105' : 'border border-white/10 bg-white/5 hover:bg-white/10'}`}>
                        <img src={url} alt={seed} className="w-full h-full p-1" />
                      </motion.button>
                    );
                  })}
                </div>
              </Section>
            </div>
          ) : (
            /* ---- CUSTOM MODE ---- */
            <div>
              <Section title="Skin Tone">
                <div className="flex gap-3 flex-wrap">
                  {SKIN_TONES.map(s => <ColorSwatch key={s.hex} hex={s.hex} selected={skinColor === s.hex} onClick={() => setSkinColor(s.hex)} />)}
                </div>
              </Section>

              <Section title="Hair Style">
                <div className="flex gap-2 flex-wrap">
                  {HAIR_STYLES.map(h => <Pill key={h.value} label={h.name} selected={hairStyle === h.value} onClick={() => setHairStyle(h.value)} />)}
                </div>
              </Section>

              <Section title="Hair Color">
                <div className="flex gap-3 flex-wrap">
                  {HAIR_COLORS.map(c => <ColorSwatch key={c.hex} hex={c.hex} selected={hairColor === c.hex} onClick={() => setHairColor(c.hex)} />)}
                </div>
              </Section>

              <Section title="Facial Hair">
                <div className="flex gap-2 flex-wrap">
                  {FACIAL_HAIR.map(f => <Pill key={f.value} label={f.name} selected={facialHair === f.value} onClick={() => setFacialHair(f.value)} />)}
                </div>
              </Section>

              <Section title="Eyes">
                <div className="flex gap-2 flex-wrap">
                  {EYES.map(e => <Pill key={e.value} label={e.name} selected={eyes === e.value} onClick={() => setEyes(e.value)} />)}
                </div>
              </Section>

              <Section title="Mouth">
                <div className="flex gap-2 flex-wrap">
                  {MOUTH.map(m => <Pill key={m.value} label={m.name} selected={mouth === m.value} onClick={() => setMouth(m.value)} />)}
                </div>
              </Section>

              <Section title="Accessories">
                <div className="flex gap-2 flex-wrap">
                  {ACCESSORIES.map(a => <Pill key={a.value} label={a.name} selected={accessories === a.value} onClick={() => setAccessories(a.value)} />)}
                </div>
              </Section>

              <Section title="Clothing">
                <div className="flex gap-2 flex-wrap">
                  {CLOTHING.map(c => <Pill key={c.value} label={c.name} selected={clothing === c.value} onClick={() => setClothing(c.value)} />)}
                </div>
              </Section>

              <Section title="Clothing Color">
                <div className="flex gap-3 flex-wrap">
                  {CLOTHING_COLORS.map(c => <ColorSwatch key={c.hex} hex={c.hex} selected={clothingColor === c.hex} onClick={() => setClothingColor(c.hex)} />)}
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-5 bg-gradient-to-t from-[#0B1021] via-[#0B1021] to-transparent">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 bg-[#7cc544] hover:bg-[#8ade4b] text-black font-bold text-lg rounded-full transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(124,197,68,0.3)]">
            {saving ? 'Saving...' : 'Continue to Dashboard'}
            {!saving && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
