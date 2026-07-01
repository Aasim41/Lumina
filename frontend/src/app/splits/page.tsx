'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Check, Trash2, X, Receipt } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { getSplits, createSplit, toggleSplitMemberPaid, deleteSplit } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SplitsPage() {
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState([{ name: '', share_amount: '' }]);

  const fetchSplits = async () => {
    try {
      const data = await getSplits();
      setSplits(data);
    } catch (e) {
      toast.error('Failed to load splits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplits();
  }, []);

  const handleAddMember = () => {
    setMembers([...members, { name: '', share_amount: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const splitEqually = () => {
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || members.length === 0) return;
    const splitAmt = (amt / members.length).toFixed(2);
    setMembers(members.map(m => ({ ...m, share_amount: splitAmt })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !totalAmount || members.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await createSplit({
        title,
        total_amount: parseFloat(totalAmount),
        date,
        members: members.map(m => ({ name: m.name, share_amount: parseFloat(m.share_amount) }))
      });
      toast.success('Split created!');
      setIsModalOpen(false);
      
      // Reset form
      setTitle('');
      setTotalAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setMembers([{ name: '', share_amount: '' }]);
      
      fetchSplits();
    } catch (e) {
      toast.error('Failed to create split');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePaid = async (billId: string, memberId: string) => {
    try {
      await toggleSplitMemberPaid(billId, memberId);
      fetchSplits();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSplit(id);
      toast.success('Split removed');
      fetchSplits();
    } catch (e) {
      toast.error('Failed to delete split');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] pb-24 text-white">
        <header className="px-6 py-8 safe-pt bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-display font-bold">Split Bills 💸</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-text-secondary">Track shared expenses with friends</p>
        </header>

        <div className="px-4 space-y-6 -mt-4">
          {loading ? (
            <div className="text-center py-10 text-white/50">Loading...</div>
          ) : splits.length === 0 ? (
            <div className="text-center py-12 px-4 glass rounded-3xl border border-white/5">
              <Users className="w-12 h-12 text-primary/40 mx-auto mb-4" />
              <p className="text-white/80 font-medium">No splits yet</p>
              <p className="text-sm text-text-secondary mt-1">Split a bill with friends!</p>
            </div>
          ) : (
            splits.map((split) => {
              const paidCount = split.members.filter((m: any) => m.is_paid === 'true').length;
              const totalMembers = split.members.length;
              const progress = totalMembers > 0 ? (paidCount / totalMembers) * 100 : 0;
              
              return (
                <motion.div
                  key={split.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-5 rounded-3xl border border-white/5"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{split.title}</h3>
                      <p className="text-xs text-text-secondary">{split.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-display font-bold text-primary">{formatCurrency(split.total_amount)}</p>
                      <button 
                        onClick={() => handleDelete(split.id)}
                        className="text-xs text-red-400 mt-1 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4 flex justify-between items-center text-xs text-text-secondary">
                    <span>{paidCount} of {totalMembers} paid</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mb-5">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  
                  <div className="space-y-2">
                    {split.members.map((member: any) => (
                      <div 
                        key={member.id} 
                        onClick={() => togglePaid(split.id, member.id)}
                        className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-colors border ${
                          member.is_paid === 'true' 
                            ? 'bg-[#10b981]/10 border-[#10b981]/20' 
                            : 'bg-black/20 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            member.is_paid === 'true' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-white/10 text-white/40'
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span className={member.is_paid === 'true' ? 'text-white/80' : 'text-white'}>
                            {member.name}
                          </span>
                        </div>
                        <span className={`font-medium ${member.is_paid === 'true' ? 'text-white/50' : 'text-primary'}`}>
                          {formatCurrency(member.share_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#12081C] rounded-t-3xl border-t border-white/10 p-6 z-[101] max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-xl font-display font-bold text-white">New Split Bill</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="overflow-y-auto pr-2 pb-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">What was this for?</label>
                    <input
                      type="text"
                      required
                      placeholder="Dinner at Mama's"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Total (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={totalAmount}
                      onChange={e => setTotalAmount(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-medium text-text-secondary">Who's paying?</label>
                    <button type="button" onClick={splitEqually} className="text-xs text-primary hover:text-primary/80 transition-colors">
                      Split Equally
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {members.map((member, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Name"
                          value={member.name}
                          onChange={e => handleMemberChange(i, 'name', e.target.value)}
                          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50"
                        />
                        <input
                          type="number"
                          required
                          placeholder="₹0"
                          value={member.share_amount}
                          onChange={e => handleMemberChange(i, 'share_amount', e.target.value)}
                          className="w-24 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50"
                        />
                        {members.length > 1 && (
                          <button type="button" onClick={() => handleRemoveMember(i)} className="p-2 text-red-400 bg-red-500/10 rounded-xl">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button type="button" onClick={handleAddMember} className="w-full mt-3 py-2 border border-dashed border-white/20 rounded-xl text-sm text-text-secondary hover:text-white hover:border-white/40 transition-colors">
                    + Add Person
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-black font-bold rounded-xl shadow-[0_0_20px_rgba(124,197,68,0.3)] disabled:opacity-50 mt-4 shrink-0"
                >
                  {isSubmitting ? 'Creating...' : 'Create Split Bill'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
