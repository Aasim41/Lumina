'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { updateUserProfile } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { ChevronRight } from 'lucide-react';

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
  { name: 'Kurt', value: 'kurt' },
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
  { name: 'Collar Sweater', value: 'collarAndSweater' },
  { name: 'Overall', value: 'overall' },
];

const CLOTHING_COLORS = [
  { name: 'Black', hex: '262e33' },
  { name: 'Blue', hex: '65c9ff' },
  { name: 'Navy', hex: '25557c' },
  { name: 'Gray', hex: '929598' },
  { name: 'Heather', hex: '3c4f5c' },
  { name: 'Pink', hex: 'ff488e' },
  { name: 'Red', hex: 'ff5c5c' },
  { name: 'Green', hex: 'a7ffc4' },
];

export default function CreateAvatarPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [skinColor, setSkinColor] = useState('edb98a');
  const [hairStyle, setHairStyle] = useState('shortFlat');
  const [hairColor, setHairColor] = useState('2c1b18');
  const [facialHair, setFacialHair] = useState('blank');
  const [accessories, setAccessories] = useState('blank');
  const [eyes, setEyes] = useState('default');
  const [mouth, setMouth] = useState('smile');
  const [clothing, setClothing] = useState('hoodie');
  const [clothingColor, setClothingColor] = useState('262e33');

  const avatarUrl = useMemo(() => {
    const params = new URLSearchParams({
      skinColor: skinColor,
      top: hairStyle,
      hairColor: hairColor,
      facialHair: facialHair,
      facialHairProbability: facialHair === 'blank' ? '0' : '100',
      accessories: accessories,
      accessoriesProbability: accessories === 'blank' ? '0' : '100',
      eyes: eyes,
      mouth: mouth,
      clothing: clothing,
      clothingColor: clothingColor,
    });
    return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
  }, [skinColor, hairStyle, hairColor, facialHair, accessories, eyes, mouth, clothing, clothingColor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ avatar_url: avatarUrl });
      router.push('/');
    } catch (e) {
      console.error('Failed to save avatar', e);
      router.push('/');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-5">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 px-1">{title}</p>
      {children}
    </div>
  );

  const ColorSwatch = ({ hex, selected, onClick }: { hex: string, selected: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${selected ? 'border-primary scale-110 shadow-[0_0_12px_rgba(124,197,68,0.5)]' : 'border-white/10 hover:border-white/30'}`}
      style={{ backgroundColor: `#${hex}` }}
    />
  );

  const OptionPill = ({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${selected ? 'bg-primary text-black shadow-[0_0_12px_rgba(124,197,68,0.4)]' : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 safe-pt relative">
          <button 
            onClick={() => router.push('/')}
            className="absolute right-6 top-8 text-sm text-text-secondary hover:text-white transition-colors"
          >
            Skip →
          </button>
          <div className="text-center">
            <span className="font-display font-bold tracking-[0.3em] text-[10px] text-primary/50 uppercase">Lumina</span>
            <h1 className="text-2xl font-display font-bold text-white mt-3">Create Your Avatar</h1>
            <p className="text-sm text-text-secondary mt-1">Make it yours!</p>
          </div>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center py-4">
          <motion.div
            key={avatarUrl}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/30 shadow-[0_0_40px_rgba(124,197,68,0.2)] overflow-hidden flex items-center justify-center"
          >
            <img src={avatarUrl} alt="Your Avatar" className="w-28 h-28" />
          </motion.div>
        </div>

        {/* Customization Options */}
        <div className="flex-1 overflow-y-auto px-5 pb-32">
          <Section title="Skin Tone">
            <div className="flex gap-3 flex-wrap">
              {SKIN_TONES.map(s => (
                <ColorSwatch key={s.hex} hex={s.hex} selected={skinColor === s.hex} onClick={() => setSkinColor(s.hex)} />
              ))}
            </div>
          </Section>

          <Section title="Hair Style">
            <div className="flex gap-2 flex-wrap">
              {HAIR_STYLES.map(h => (
                <OptionPill key={h.value} label={h.name} selected={hairStyle === h.value} onClick={() => setHairStyle(h.value)} />
              ))}
            </div>
          </Section>

          <Section title="Hair Color">
            <div className="flex gap-3 flex-wrap">
              {HAIR_COLORS.map(c => (
                <ColorSwatch key={c.hex} hex={c.hex} selected={hairColor === c.hex} onClick={() => setHairColor(c.hex)} />
              ))}
            </div>
          </Section>

          <Section title="Facial Hair">
            <div className="flex gap-2 flex-wrap">
              {FACIAL_HAIR.map(f => (
                <OptionPill key={f.value} label={f.name} selected={facialHair === f.value} onClick={() => setFacialHair(f.value)} />
              ))}
            </div>
          </Section>

          <Section title="Eyes">
            <div className="flex gap-2 flex-wrap">
              {EYES.map(e => (
                <OptionPill key={e.value} label={e.name} selected={eyes === e.value} onClick={() => setEyes(e.value)} />
              ))}
            </div>
          </Section>

          <Section title="Mouth">
            <div className="flex gap-2 flex-wrap">
              {MOUTH.map(m => (
                <OptionPill key={m.value} label={m.name} selected={mouth === m.value} onClick={() => setMouth(m.value)} />
              ))}
            </div>
          </Section>

          <Section title="Accessories">
            <div className="flex gap-2 flex-wrap">
              {ACCESSORIES.map(a => (
                <OptionPill key={a.value} label={a.name} selected={accessories === a.value} onClick={() => setAccessories(a.value)} />
              ))}
            </div>
          </Section>

          <Section title="Clothing">
            <div className="flex gap-2 flex-wrap">
              {CLOTHING.map(c => (
                <OptionPill key={c.value} label={c.name} selected={clothing === c.value} onClick={() => setClothing(c.value)} />
              ))}
            </div>
          </Section>

          <Section title="Clothing Color">
            <div className="flex gap-3 flex-wrap">
              {CLOTHING_COLORS.map(c => (
                <ColorSwatch key={c.hex} hex={c.hex} selected={clothingColor === c.hex} onClick={() => setClothingColor(c.hex)} />
              ))}
            </div>
          </Section>
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
