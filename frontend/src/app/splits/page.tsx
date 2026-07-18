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
  const [members, setMembers] = useState([{ name: '', share_amount: '', percentage: '' }]);
  const [splitMode, setSplitMode] = useState<'amount' | 'percentage'>('amount');
  const [settleModalOpen, setSettleModalOpen] = useState<string | null>(null);
  const [settlingAmount, setSettlingAmount] = useState(0);

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
    
    // Auto-calculate amount if in percentage mode and totalAmount is set
    if (splitMode === 'percentage' && field === 'percentage' && totalAmount) {
      const amt = parseFloat(totalAmount);
      const pct = parseFloat(value);
      if (!isNaN(amt) && !isNaN(pct)) {
        newMembers[index].share_amount = ((amt * pct) / 100).toFixed(2);
      } else {
        newMembers[index].share_amount = '';
      }
    }
    
    setMembers(newMembers);
  };

  const splitEqually = () => {
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || members.length === 0) return;
    
    if (splitMode === 'amount') {
      const splitAmt = (amt / members.length).toFixed(2);
      setMembers(members.map(m => ({ ...m, share_amount: splitAmt })));
    } else {
      const splitPct = (100 / members.length).toFixed(2);
      const splitAmt = (amt / members.length).toFixed(2);
      setMembers(members.map(m => ({ ...m, percentage: splitPct, share_amount: splitAmt })));
    }
  };

  const handleSettleUp = (bill: any) => {
    const unpaidMembers = bill.members.filter((m: any) => m.is_paid === 'false');
    const remainingAmount = unpaidMembers.reduce((sum: number, m: any) => sum + m.share_amount, 0);
    setSettlingAmount(remainingAmount);
    setSettleModalOpen(bill.id);
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
      setMembers([{ name: '', share_amount: '', percentage: '' }]);
      
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
        <header className="px-6 pb-8 pt-14 safe-pt bg-gradient-to-b from-primary/10 to-transparent">
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
                  className="bg-[#f4f4f0] text-black p-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(16,185,129,1)] relative font-mono mb-6 transition-all"
                >
                  <div className="absolute top-0 right-0 bg-black text-white px-2 py-1 text-xs font-bold border-b-4 border-l-4 border-black">
                    BILL #{split.id.substring(0, 4).toUpperCase()}
                  </div>
                  <div className="border-b-4 border-black pb-4 mb-4 mt-2">
                    <h3 className="font-black text-2xl uppercase tracking-tighter">{split.title}</h3>
                    <p className="text-sm font-bold">{split.date}</p>
                  </div>
                  
                  <div className="mb-4 flex justify-between items-center text-sm font-bold border-4 border-black p-2 bg-white">
                    <span>{paidCount}/{totalMembers} PAID</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  
                  <div className="space-y-0 border-4 border-black bg-white overflow-hidden">
                    <AnimatePresence>
                    {split.members.map((member: any, i: number) => (
                      <motion.div 
                        key={member.id} 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, backgroundColor: member.is_paid === 'true' ? '#10b981' : '#ffffff' }}
                        exit={{ opacity: 0 }}
                        onClick={() => togglePaid(split.id, member.id)}
                        className={`flex justify-between items-center p-3 cursor-pointer border-b-4 border-black last:border-b-0 transition-colors ${
                          member.is_paid === 'true' ? 'hover:bg-[#10b981]/90' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 border-2 border-black flex items-center justify-center ${
                            member.is_paid === 'true' ? 'bg-black text-[#10b981]' : 'bg-white'
                          }`}>
                            {member.is_paid === 'true' && <Check className="w-4 h-4 font-bold" />}
                          </div>
                          <span className={`font-bold ${member.is_paid === 'true' ? 'line-through opacity-70 text-black' : 'text-black'}`}>
                            {member.name}
                          </span>
                        </div>
                        <span className="font-black text-lg">
                          {formatCurrency(member.share_amount)}
                        </span>
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </div>

                  <div className="mt-4 flex justify-between items-end border-t-4 border-black pt-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDelete(split.id)}
                        className="text-xs font-bold uppercase bg-red-500 text-black border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                      >
                        Trash
                      </button>
                      {progress < 100 && (
                        <button 
                          onClick={() => handleSettleUp(split)}
                          className="text-xs font-bold uppercase bg-primary text-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                        >
                          Settle Up
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold uppercase">Total Due</p>
                      <p className="text-3xl font-black tracking-tighter">{formatCurrency(split.total_amount)}</p>
                    </div>
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
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999]"
            />
            
            <div className="fixed inset-0 z-[999] flex items-end justify-center pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md glass p-6 pt-5 rounded-t-3xl border border-white/10 border-b-0 shadow-2xl shadow-primary/20 pointer-events-auto max-h-[85vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <h2 className="text-xl font-display font-bold">New Split Bill</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-text-secondary transition-colors active:scale-90">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="custom-form overflow-y-auto pr-2 pb-4">
                  <p className="title">Split Bill <span>Share expenses with friends</span></p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="col-span-2">
                      <label>What was this for?</label>
                      <input
                        type="text"
                        required
                        placeholder="Dinner at Mama's"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Total (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="0"
                        value={totalAmount}
                        onChange={e => setTotalAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Date</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={e => setDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-semibold text-white">Who's paying?</label>
                      <div className="flex items-center gap-3">
                        <div className="flex bg-black/40 rounded-lg overflow-hidden border border-white/10 p-0.5">
                          <button 
                            type="button" 
                            onClick={() => setSplitMode('amount')}
                            className={`px-3 py-1 text-xs font-bold transition-colors rounded-md ${splitMode === 'amount' ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                          >
                            By Amount
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setSplitMode('percentage')}
                            className={`px-3 py-1 text-xs font-bold transition-colors rounded-md ${splitMode === 'percentage' ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                          >
                            By %
                          </button>
                        </div>
                        <button type="button" onClick={splitEqually} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase">
                          Split Equally
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {members.map((member, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Name"
                            value={member.name}
                            onChange={e => handleMemberChange(i, 'name', e.target.value)}
                            className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                          />
                          {splitMode === 'percentage' ? (
                            <>
                              <input
                                type="number"
                                required
                                placeholder="%"
                                value={member.percentage}
                                onChange={e => handleMemberChange(i, 'percentage', e.target.value)}
                                className="w-20 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                              />
                              <span className="text-text-secondary text-xs w-16 truncate">₹{member.share_amount || '0'}</span>
                            </>
                          ) : (
                            <input
                              type="number"
                              required
                              placeholder="₹0"
                              value={member.share_amount}
                              onChange={e => handleMemberChange(i, 'share_amount', e.target.value)}
                              className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                            />
                          )}
                          {members.length > 1 && (
                            <button type="button" onClick={() => handleRemoveMember(i)} className="p-2 text-red-400 bg-red-500/10 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button type="button" onClick={handleAddMember} className="w-full mt-3 py-3 border border-dashed border-white/20 rounded-xl text-sm font-semibold text-text-secondary hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors">
                      + Add Person
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="oauthButton mt-6"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Split Bill'}
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Settle Up Mock Overlay */}
      <AnimatePresence>
        {settleModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-[#f4f4f0] text-black p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(99,102,241,1)] relative font-mono"
            >
              <button onClick={() => setSettleModalOpen(null)} className="absolute top-4 right-4 p-1 hover:bg-black/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary mx-auto rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 text-white">
                  <Receipt className="w-8 h-8" />
                </div>
                <h3 className="font-black text-2xl uppercase tracking-tighter">Settle Up</h3>
                <p className="text-sm font-bold text-gray-600 mt-1">Remaining Balance</p>
                <p className="font-black text-4xl mt-2">{formatCurrency(settlingAmount)}</p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    toast.success('Fake UPI request sent!');
                    setSettleModalOpen(null);
                  }}
                  className="w-full py-3 bg-[#10b981] text-black font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  Pay via UPI
                </button>
                <button 
                  onClick={() => setSettleModalOpen(null)}
                  className="w-full py-3 bg-white text-black font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
