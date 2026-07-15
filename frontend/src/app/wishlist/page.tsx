'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Check, Trash2, X } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { getWishlist, createWishlistItem, markWishlistPurchased, deleteWishlistItem } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', priority: 'medium' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await getWishlist();
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    setIsSubmitting(true);
    try {
      await createWishlistItem({
        name: newItem.name,
        price: parseFloat(newItem.price),
        priority: newItem.priority
      });
      toast.success('Added to wishlist!');
      setIsModalOpen(false);
      setNewItem({ name: '', price: '', priority: 'medium' });
      fetchItems();
    } catch (e) {
      toast.error('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPurchased = async (id: string) => {
    try {
      await markWishlistPurchased(id);
      toast.success('Marked as purchased!');
      fetchItems();
    } catch (e) {
      toast.error('Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWishlistItem(id);
      toast.success('Removed from wishlist');
      fetchItems();
    } catch (e) {
      toast.error('Failed to delete item');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] pb-24 text-white">
        <header className="px-6 pb-8 pt-14 safe-pt bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-display font-bold">Wishlist 🎯</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-text-secondary">Track items you're saving for</p>
        </header>

        <div className="px-4 space-y-4 -mt-4">
          {loading ? (
            <div className="text-center py-10 text-white/50">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4 glass rounded-3xl border border-white/5">
              <Target className="w-12 h-12 text-primary/40 mx-auto mb-4" />
              <p className="text-white/80 font-medium">Nothing here yet!</p>
              <p className="text-sm text-text-secondary mt-1">Add something you're saving for.</p>
            </div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-4 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-between"
              >
                {item.is_purchased === 'true' && (
                  <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-[#10b981] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2">
                      <Check className="w-5 h-5" /> Purchased
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-primary font-bold">{formatCurrency(item.price)}</p>
                  
                  {item.is_purchased !== 'true' && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all" 
                          style={{ width: `${item.progress_percent}%` }} 
                        />
                      </div>
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {item.days_to_save < 999 ? `${item.days_to_save} days to go` : 'Needs more savings'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4 relative z-20">
                  {item.is_purchased !== 'true' && (
                    <button 
                      onClick={() => handleMarkPurchased(item.id)}
                      className="p-2 bg-[#10b981]/20 text-[#10b981] rounded-full hover:bg-[#10b981]/30 transition-colors"
                      title="Mark as purchased"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      <BottomNav />

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999]"
            />
            
            <div className="fixed inset-0 z-[999] flex items-end justify-center pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md glass p-6 pt-5 rounded-t-3xl border border-white/10 border-b-0 shadow-2xl shadow-primary/20 pointer-events-auto max-h-[85vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-display font-bold">Add to Wishlist</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-text-secondary transition-colors active:scale-90">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="custom-form">
                  <p className="title">New Goal <span>Track items you're saving for</span></p>
                  
                  <div>
                    <label>Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AirPods Pro"
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label>Target Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="25000"
                      value={newItem.price}
                      onChange={e => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label>Priority</label>
                    <select
                      value={newItem.priority}
                      onChange={e => setNewItem({...newItem, priority: e.target.value})}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="oauthButton"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Item'}
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
