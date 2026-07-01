'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUserProfile } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, ChevronDown } from 'lucide-react';

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
  { name: 'Short Round', value: 'shortRound' },
  { name: 'Caesar', value: 'theCaesar' },
  { name: 'Caesar + Part', value: 'theCaesarAndSidePart' },
  { name: 'Sides', value: 'sides' },
  { name: 'Shaved Sides', value: 'shavedSides' },
  { name: 'Dreads 1', value: 'dreads01' },
  { name: 'Dreads 2', value: 'dreads02' },
  { name: 'Frizzle', value: 'frizzle' },
  { name: 'Shaggy', value: 'shaggy' },
  { name: 'Shaggy Mullet', value: 'shaggyMullet' },
  { name: 'Bob', value: 'bob' },
  { name: 'Long', value: 'longButNotToo' },
  { name: 'Curvy', value: 'curvy' },
  { name: 'Straight 1', value: 'straight01' },
  { name: 'Straight 2', value: 'straight02' },
  { name: 'Straight & Strand', value: 'straightAndStrand' },
  { name: 'Bun', value: 'bun' },
  { name: 'Big Hair', value: 'bigHair' },
  { name: 'Fro', value: 'fro' },
  { name: 'Fro + Band', value: 'froAndBand' },
  { name: 'Mia Wallace', value: 'miaWallace' },
  { name: 'Frida', value: 'frida' },
  { name: 'Turban', value: 'turban' },
  { name: 'Hijab', value: 'hijab' },
  { name: 'Winter Hat', value: 'winterHat02' },
  { name: 'Cap', value: 'hat' },
  { name: 'No Hair', value: 'noHair' },
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
  { name: 'Prescription 01', value: 'prescription01' },
  { name: 'Prescription 02', value: 'prescription02' },
  { name: 'Wayfarers', value: 'wayfarers' },
  { name: 'Sunglasses', value: 'sunglasses' },
  { name: 'Kurt', value: 'kurt' },
];

const EYES = [
  { name: 'Default', value: 'default' },
  { name: 'Happy', value: 'happy' },
  { name: 'Wink', value: 'wink' },
  { name: 'Squint', value: 'squint' },
  { name: 'Hearts', value: 'hearts' },
  { name: 'Side', value: 'side' },
  { name: 'Surprised', value: 'surprised' },
  { name: 'Dizzy', value: 'dizzy' },
  { name: 'Wink Wacky', value: 'winkWacky' },
  { name: 'Cry', value: 'cry' },
  { name: 'Closed', value: 'close' },
  { name: 'Roll', value: 'eyeRoll' },
];

const MOUTH = [
  { name: 'Smile', value: 'smile' },
  { name: 'Default', value: 'default' },
  { name: 'Twinkle', value: 'twinkle' },
  { name: 'Tongue', value: 'tongue' },
  { name: 'Serious', value: 'serious' },
  { name: 'Eating', value: 'eating' },
  { name: 'Grimace', value: 'grimace' },
  { name: 'Sad', value: 'sad' },
  { name: 'Scream', value: 'screamOpen' },
  { name: 'Disbelief', value: 'disbelief' },
  { name: 'Concerned', value: 'concerned' },
  { name: 'Vomit', value: 'vomit' },
];

const CLOTHING = [
  { name: 'Hoodie', value: 'hoodie' },
  { name: 'Crew Neck', value: 'shirtCrewNeck' },
  { name: 'Scoop Neck', value: 'shirtScoopNeck' },
  { name: 'V Neck', value: 'shirtVNeck' },
  { name: 'Blazer + Shirt', value: 'blazerAndShirt' },
  { name: 'Blazer + Sweater', value: 'blazerAndSweater' },
  { name: 'Collar + Sweater', value: 'collarAndSweater' },
  { name: 'Graphic Shirt', value: 'graphicShirt' },
  { name: 'Overall', value: 'overall' },
];

const CLOTHING_COLORS = [
  { name: 'Black', hex: '262e33' },
  { name: 'Blue', hex: '65c9ff' },
  { name: 'Navy', hex: '25557c' },
  { name: 'Gray', hex: '929598' },
  { name: 'Heather', hex: '3c4f5c' },
  { name: 'Pastel Blue', hex: 'b1e2ff' },
  { name: 'Pink', hex: 'ff488e' },
  { name: 'Red', hex: 'ff5c5c' },
  { name: 'White', hex: 'ffffff' },
  { name: 'Green', hex: 'a7ffc4' },
  { name: 'Yellow', hex: 'ffd93d' },
  { name: 'Purple', hex: 'c17aff' },
];

type Mode = 'preset' | 'custom';

// How many pills to show before "Show More"
const PILL_LIMIT = 6;

export default function CreateAvatarPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [mode, setMode] = useState<Mode>('preset');

  // Track which sections are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

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
      eyes, mouth, clothing, clothesColor: clothingColor,
    };

    if (facialHair !== 'blank') {
      p.facialHair = facialHair;
      p.facialHairProbability = '100';
    } else {
      p.facialHairProbability = '0';
    }

    if (accessories !== 'blank') {
      p.accessories = accessories;
      p.accessoriesProbability = '100';
    } else {
      p.accessoriesProbability = '0';
    }

    return `https://api.dicebear.com/9.x/avataaars/svg?${new URLSearchParams(p).toString()}`;
  }, [skinColor, hairStyle, hairColor, facialHair, accessories, eyes, mouth, clothing, clothingColor]);

  const activeUrl = mode === 'preset' ? presetUrl : customUrl;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ avatar_url: activeUrl });
      await refreshUser();
    } catch (e: any) {
      console.error('Failed to save avatar', e);
    }
    // Always navigate to dashboard with explicit file path
    window.location.replace('/index.html');
  };

  const handleSkip = async () => {
    try { await updateUserProfile({ avatar_url: '' }); await refreshUser(); } catch {}
    window.location.replace('/index.html');
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

  // Renders a pill section with "Show More" for long lists
  const PillSection = ({ title, sectionKey, items, selectedValue, onSelect }: {
    title: string;
    sectionKey: string;
    items: { name: string; value: string }[];
    selectedValue: string;
    onSelect: (v: string) => void;
  }) => {
    const isExpanded = expanded[sectionKey];
    const needsExpand = items.length > PILL_LIMIT;
    const visible = needsExpand && !isExpanded ? items.slice(0, PILL_LIMIT) : items;
    // If the selected item is hidden, always show it
    const selectedHidden = needsExpand && !isExpanded && !visible.find(i => i.value === selectedValue);
    const selectedItem = items.find(i => i.value === selectedValue);

    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">{title}</p>
        <div className="flex gap-2 flex-wrap">
          {visible.map(i => (
            <Pill key={i.value} label={i.name} selected={selectedValue === i.value} onClick={() => onSelect(i.value)} />
          ))}
          {selectedHidden && selectedItem && (
            <Pill label={selectedItem.name} selected={true} onClick={() => {}} />
          )}
          {needsExpand && (
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full flex gap-2 flex-wrap"
                />
              )}
            </AnimatePresence>
          )}
        </div>
        {needsExpand && (
          <button
            onClick={() => toggleExpand(sectionKey)}
            className="mt-2 flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors px-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            {isExpanded ? 'Show Less' : `Show ${items.length - PILL_LIMIT} More`}
          </button>
        )}
      </div>
    );
  };

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
            <div>
              <Section title="Skin Tone">
                <div className="flex gap-3 flex-wrap">
                  {SKIN_TONES.map(s => <ColorSwatch key={s.hex} hex={s.hex} selected={skinColor === s.hex} onClick={() => setSkinColor(s.hex)} />)}
                </div>
              </Section>

              <PillSection title="Hair Style" sectionKey="hair" items={HAIR_STYLES} selectedValue={hairStyle} onSelect={setHairStyle} />

              <Section title="Hair Color">
                <div className="flex gap-3 flex-wrap">
                  {HAIR_COLORS.map(c => <ColorSwatch key={c.hex} hex={c.hex} selected={hairColor === c.hex} onClick={() => setHairColor(c.hex)} />)}
                </div>
              </Section>

              <PillSection title="Facial Hair" sectionKey="facial" items={FACIAL_HAIR} selectedValue={facialHair} onSelect={setFacialHair} />

              <PillSection title="Eyes" sectionKey="eyes" items={EYES} selectedValue={eyes} onSelect={setEyes} />

              <PillSection title="Mouth" sectionKey="mouth" items={MOUTH} selectedValue={mouth} onSelect={setMouth} />

              <PillSection title="Accessories" sectionKey="acc" items={ACCESSORIES} selectedValue={accessories} onSelect={setAccessories} />

              <PillSection title="Clothing" sectionKey="cloth" items={CLOTHING} selectedValue={clothing} onSelect={setClothing} />

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
