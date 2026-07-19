'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, ExternalLink, X, Image as ImageIcon, CheckCircle2, Heart } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { getWishlist, createWishlistItem, markWishlistPurchased, deleteWishlistItem } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState('medium');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [showConfetti, setShowConfetti] = useState(false);

  const fetchWishlist = async () => {
    try {
      const data = await getWishlist();
      setItems(data);
    } catch (e) {
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    setIsSubmitting(true);
    try {
      await createWishlistItem({ 
        name, 
        price: parseFloat(price), 
        priority, 
        image_url: imageUrl, 
        link_url: linkUrl 
      });
      toast.success('Added to Dream Board!');
      setIsModalOpen(false);
      setName(''); setPrice(''); setPriority('medium'); setImageUrl(''); setLinkUrl('');
      fetchWishlist();
    } catch (e) {
      toast.error('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchase = async (id: string) => {
    try {
      await markWishlistPurchased(id);
      setShowConfetti(true);
      toast.success('Congratulations on your purchase!', { icon: '🎉' });
      fetchWishlist();
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (e) {
      toast.error('Failed to mark as purchased');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWishlistItem(id);
      toast.success('Item removed');
      fetchWishlist();
    } catch (e) {
      toast.error('Failed to delete item');
    }
  };

  return (
    <AuthGuard>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} gravity={0.15} />}
      <div className="min-h-screen bg-[#0B1021] pb-24 text-white font-sans">
        <header className="px-6 pb-6 pt-14 safe-pt bg-[#0B1021] sticky top-0 z-10">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-2">Dream Board <Heart className="w-6 h-6 text-pink-500 fill-pink-500" /></h1>
              <p className="text-sm text-text-secondary mt-1">Goals fueled by your Secret Vault</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-3 bg-gradient-to-tr from-pink-500 to-purple-500 text-white rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(236,72,153,0.3)]"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="px-4">
          {loading ? (
            <div className="text-center py-10 text-white/50">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 px-4 glass rounded-3xl border border-white/5 mt-4">
              <Gift className="w-16 h-16 text-pink-500/40 mx-auto mb-4" />
              <p className="text-white/80 font-medium text-lg">Your board is empty</p>
              <p className="text-sm text-text-secondary mt-2">Add something you've been dreaming of buying!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {items.map((item) => {
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-3xl overflow-hidden border relative group transition-all ${
                      item.is_purchased === 'true' 
                        ? 'bg-[#111827]/50 border-white/5 opacity-60' 
                        : 'bg-[#1f2937] border-white/5 shadow-xl'
                    }`}
                  >
                    {/* Image Header */}
                    <div className="h-40 w-full bg-[#111827] relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                          <ImageIcon className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                      
                      {/* Priority Badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md border border-white/10 text-white">
                        {item.priority} Priority
                      </div>
                      
                      {/* Delete Button (Hover) */}
                      <button onClick={() => handleDelete(item.id)} className="absolute top-3 right-3 p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg leading-tight line-clamp-2 pr-2">{item.name}</h3>
                        {item.link_url && (
                          <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <p className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-4">
                        {formatCurrency(item.price)}
                      </p>

                      {item.is_purchased === 'true' ? (
                        <div className="flex items-center justify-center gap-2 bg-green-500/10 text-green-400 font-bold py-3 rounded-xl border border-green-500/20">
                          <CheckCircle2 className="w-5 h-5" /> Acquired!
                        </div>
                      ) : (
                        <button 
                          onClick={() => handlePurchase(item.id)}
                          className="w-full py-3 bg-white/10 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-white/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Mark as Purchased
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="w-full bg-[#1f2937] p-6 rounded-t-3xl shadow-2xl relative z-10 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">Add to Dream Board <Gift className="w-5 h-5 text-pink-500" /></h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="overflow-y-auto pb-6 space-y-4">
                <div>
                  <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Item Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="MacBook Pro, PS5, etc." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" />
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Price</label>
                    <input type="number" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Image URL (Optional)</label>
                  <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 text-sm" />
                </div>

                <div>
                  <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Product Link (Optional)</label>
                  <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://amazon.com/..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 text-sm" />
                </div>

                {imageUrl && (
                  <div className="h-32 w-full rounded-xl overflow-hidden border border-white/10">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(236,72,153,0.3)] mt-4">
                  {isSubmitting ? 'Saving...' : 'Add to Board'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
