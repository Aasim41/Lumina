'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Check, Trash2, X, Receipt, ArrowRight, User as UserIcon } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { getSplits, getBalances, createSplit, toggleSplitMemberPaid, deleteSplit } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SplitsPage() {
  const [activeTab, setActiveTab] = useState<'balances' | 'activity'>('balances');
  const [splits, setSplits] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerName, setPayerName] = useState('You');
  const [members, setMembers] = useState([{ name: '', share_amount: '', percentage: '' }]);
  const [splitMode, setSplitMode] = useState<'amount' | 'percentage'>('amount');
  
  const [settleModalOpen, setSettleModalOpen] = useState<any>(null); // friend name or bill

  const fetchData = async () => {
    try {
      const [splitsData, balancesData] = await Promise.all([
        getSplits(),
        getBalances().catch(() => []) // fallback if API not migrated yet
      ]);
      setSplits(splitsData);
      setBalances(balancesData);
    } catch (e) {
      toast.error('Failed to load splits data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMember = () => setMembers([...members, { name: '', share_amount: '', percentage: '' }]);
  const handleRemoveMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    if (splitMode === 'percentage' && field === 'percentage' && totalAmount) {
      const amt = parseFloat(totalAmount);
      const pct = parseFloat(value);
      newMembers[index].share_amount = (!isNaN(amt) && !isNaN(pct)) ? ((amt * pct) / 100).toFixed(2) : '';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !totalAmount || members.length === 0) return;
    setIsSubmitting(true);
    try {
      await createSplit({
        title,
        total_amount: parseFloat(totalAmount),
        date,
        payer_name: payerName || 'You',
        members: members.map(m => ({ name: m.name, share_amount: parseFloat(m.share_amount) }))
      });
      toast.success('Split added!');
      setIsModalOpen(false);
      setTitle(''); setTotalAmount(''); setPayerName('You');
      setMembers([{ name: '', share_amount: '', percentage: '' }]);
      fetchData();
    } catch (e) {
      toast.error('Failed to add split');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePaid = async (billId: string, memberId: string) => {
    try {
      await toggleSplitMemberPaid(billId, memberId);
      fetchData();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSplit(id);
      toast.success('Deleted');
      fetchData();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B1021] pb-24 text-white font-sans">
        <header className="px-6 pb-4 pt-14 safe-pt bg-[#111827] border-b border-white/5 sticky top-0 z-10 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-display font-bold">Groups 🍕</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-[#5bc5a7]/20 text-[#5bc5a7] rounded-full hover:bg-[#5bc5a7]/30 transition-colors shadow-[0_0_15px_rgba(91,197,167,0.2)]"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex bg-[#1f2937] p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('balances')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'balances' ? 'bg-[#5bc5a7] text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
            >
              Balances
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'activity' ? 'bg-[#5bc5a7] text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
            >
              Activity
            </button>
          </div>
        </header>

        <div className="px-4 py-6">
          {loading ? (
            <div className="text-center py-10 text-white/50">Loading...</div>
          ) : activeTab === 'balances' ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-widest pl-2 mb-2">Overall Balances</h2>
              {balances.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#1f2937] rounded-3xl border border-white/5">
                  <div className="w-16 h-16 bg-[#5bc5a7]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-[#5bc5a7]" />
                  </div>
                  <p className="text-white/80 font-medium">You're all settled up!</p>
                  <p className="text-sm text-text-secondary mt-1">Add an expense to split it with friends.</p>
                </div>
              ) : (
                <div className="bg-[#1f2937] rounded-3xl overflow-hidden border border-white/5 shadow-xl">
                  {balances.map((b: any, idx: number) => (
                    <div key={idx} className={`flex items-center justify-between p-4 ${idx !== balances.length - 1 ? 'border-b border-white/5' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <p className="font-bold">{b.name}</p>
                          <p className={`text-xs font-semibold ${b.net_balance > 0 ? 'text-[#5bc5a7]' : 'text-[#ff652f]'}`}>
                            {b.net_balance > 0 ? `owes you ${formatCurrency(b.net_balance)}` : `you owe ${formatCurrency(Math.abs(b.net_balance))}`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSettleModalOpen({ name: b.name, amount: b.net_balance })}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border ${b.net_balance > 0 ? 'border-[#5bc5a7] text-[#5bc5a7] hover:bg-[#5bc5a7]/10' : 'border-[#ff652f] text-[#ff652f] hover:bg-[#ff652f]/10'}`}
                      >
                        Settle Up
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {splits.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-secondary">No activity yet.</p>
                </div>
              ) : (
                splits.map((split) => {
                  const youPaid = !split.payer_name || split.payer_name === 'You';
                  return (
                    <div key={split.id} className="bg-[#1f2937] p-4 rounded-2xl border border-white/5 flex gap-4 items-start relative">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                        <Receipt className="w-6 h-6 text-white/50" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-lg">{split.title}</h3>
                          <button onClick={() => handleDelete(split.id)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary mb-3">{split.payer_name || 'You'} paid {formatCurrency(split.total_amount)}</p>
                        
                        <div className="space-y-2 mt-2 border-t border-white/5 pt-3">
                          {split.members.map((m: any) => (
                            <div key={m.id} className="flex justify-between items-center text-sm" onClick={() => togglePaid(split.id, m.id)}>
                              <span className={`cursor-pointer ${m.is_paid === 'true' ? 'line-through text-white/30' : 'text-white/80'}`}>
                                {m.name} owes {formatCurrency(m.share_amount)}
                              </span>
                              {m.is_paid === 'true' ? (
                                <span className="text-[#5bc5a7] text-xs font-bold bg-[#5bc5a7]/10 px-2 py-0.5 rounded">PAID</span>
                              ) : (
                                <span className="text-orange-400 text-xs bg-orange-400/10 px-2 py-0.5 rounded">PENDING</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      {/* Add Split Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="w-full bg-[#1f2937] p-6 rounded-t-3xl shadow-2xl relative z-10 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Add an expense</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="overflow-y-auto pb-6 space-y-4">
                <div>
                  <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Description</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Dinner, Uber, etc." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5bc5a7]" />
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Amount</label>
                    <input type="number" required value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5bc5a7]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Date</label>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5bc5a7]" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 block">Who paid?</label>
                  <input type="text" required value={payerName} onChange={e => setPayerName(e.target.value)} placeholder="You" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5bc5a7]" />
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold">Split with...</span>
                    <button type="button" onClick={splitEqually} className="text-xs text-[#5bc5a7] font-bold uppercase hover:underline">Split Equally</button>
                  </div>
                  <div className="space-y-3">
                    {members.map((member, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" required placeholder="Name" value={member.name} onChange={e => handleMemberChange(i, 'name', e.target.value)} className="flex-1 bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                        <input type="number" required placeholder="₹0" value={member.share_amount} onChange={e => handleMemberChange(i, 'share_amount', e.target.value)} className="w-24 bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                        {members.length > 1 && <button type="button" onClick={() => handleRemoveMember(i)} className="text-red-400 px-2"><X className="w-4 h-4"/></button>}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddMember} className="w-full mt-3 py-2 border border-dashed border-white/20 rounded-lg text-sm text-text-secondary hover:text-white transition-colors">+ Add Person</button>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#5bc5a7] text-white font-bold py-4 rounded-xl hover:bg-[#5bc5a7]/90 transition-colors shadow-lg shadow-[#5bc5a7]/20 mt-4">
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settle Up Mock Overlay */}
      <AnimatePresence>
        {settleModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSettleModalOpen(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-[#1f2937] p-6 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${settleModalOpen.amount > 0 ? 'bg-[#5bc5a7]/20 text-[#5bc5a7]' : 'bg-[#ff652f]/20 text-[#ff652f]'}`}>
                  <ArrowRight className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-2xl">Settle Up</h3>
                <p className="text-text-secondary mt-1">Record a payment for</p>
                <p className="font-bold text-3xl mt-2">{formatCurrency(Math.abs(settleModalOpen.amount))}</p>
                <p className="text-sm mt-1">{settleModalOpen.amount > 0 ? `${settleModalOpen.name} paid you` : `You paid ${settleModalOpen.name}`}</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => { toast.success('Settled!'); setSettleModalOpen(null); fetchData(); }} className="w-full py-3 bg-[#5bc5a7] text-white font-bold rounded-xl shadow-lg shadow-[#5bc5a7]/20">Record Payment</button>
                <button onClick={() => setSettleModalOpen(null)} className="w-full py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
