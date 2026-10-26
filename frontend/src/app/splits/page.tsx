'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Check, Trash2, X, Receipt, ArrowRight, User as UserIcon, Zap, QrCode, MessageCircle, Copy, Share2 } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BottomNav } from '@/components/BottomNav';
import { getSplits, getBalances, createSplit, toggleSplitMemberPaid, deleteSplit } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { UpiQuickPayModal } from '@/components/UpiQuickPayModal';
import { soundFX } from '@/lib/soundFx';
import { useAuth } from '@/hooks/useAuth';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export default function SplitsPage() {
  const { user } = useAuth();
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
  
  const [settleModalOpen, setSettleModalOpen] = useState<any>(null);
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; memberName: string; amount: number; title: string; upiUri: string } | null>(null);
  const [upiPayModal, setUpiPayModal] = useState<{ isOpen: boolean; name: string; amount: number; note: string }>({
    isOpen: false,
    name: '',
    amount: 0,
    note: ''
  });

  const fetchData = async () => {
    try {
      const [splitsData, balancesData] = await Promise.all([
        getSplits(),
        getBalances().catch(() => [])
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
      soundFX.playSuccess();
      toast.success('Bill split created!');
      setIsModalOpen(false);
      setTitle('');
      setTotalAmount('');
      setMembers([{ name: '', share_amount: '', percentage: '' }]);
      fetchData();
    } catch (e) {
      toast.error('Failed to create split');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePaid = async (billId: string, memberId: string) => {
    try {
      await toggleSplitMemberPaid(billId, memberId);
      soundFX.playChaChing();
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.65 }
      });
      toast.success('Marked as settled!', { icon: '🎉' });
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

  // Helper to build UPI URI
  const getUpiUriForMember = (amount: number, billTitle: string) => {
    const myVpa = user?.email?.includes('@') ? `${user.email.split('@')[0]}@okaxis` : 'user@upi';
    const myName = user?.name || 'Lumina';
    return `upi://pay?pa=${encodeURIComponent(myVpa)}&pn=${encodeURIComponent(myName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(billTitle)}`;
  };

  // 1-Tap WhatsApp Request
  const handleShareWhatsApp = (memberName: string, amount: number, billTitle: string) => {
    const upiUri = getUpiUriForMember(amount, billTitle);
    const text = `Hey ${memberName}! Your share for "${billTitle}" is ₹${amount}. Tap this UPI link to pay directly: ${upiUri}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Show On-Screen QR Code for friend to scan
  const handleShowQr = (memberName: string, amount: number, billTitle: string) => {
    const upiUri = getUpiUriForMember(amount, billTitle);
    setQrModal({
      isOpen: true,
      memberName,
      amount,
      title: billTitle,
      upiUri
    });
  };

  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="min-h-screen bg-[#0B1021] text-white pb-24 safe-pt">
          {/* Top Bar */}
          <div className="p-6 pb-2">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <span>Split with Friends</span>
                </h1>
                <p className="text-xs text-white/60">UPI Pay-Me links, on-screen QR & 1-tap WhatsApp</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New Split</span>
              </button>
            </div>

            {/* Segmented Tabs */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl mb-6">
              <button
                onClick={() => setActiveTab('balances')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'balances'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Balances ({balances.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'activity'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Recent Bills ({splits.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6">
            {loading ? (
              <div className="text-center py-12 text-xs text-white/50">Loading splits...</div>
            ) : activeTab === 'balances' ? (
              <div className="space-y-3">
                {balances.length === 0 ? (
                  <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl p-6">
                    <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <h3 className="font-bold text-white text-base mb-1">All Settled Up!</h3>
                    <p className="text-xs text-white/50 max-w-xs mx-auto mb-4">
                      No one owes you money and you don't owe anyone. Tap 'New Split' to share your next bill!
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold"
                    >
                      + Create First Split
                    </button>
                  </div>
                ) : (
                  balances.map((b: any, idx: number) => {
                    const isOwed = b.balance > 0;
                    return (
                      <div
                        key={idx}
                        className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm text-emerald-400">
                            {b.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{b.name}</h4>
                            <p className="text-[11px] text-white/50">
                              {isOwed ? 'Owes you' : 'You owe'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className={`text-base font-black ${isOwed ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatCurrency(Math.abs(b.balance))}
                            </span>
                          </div>
                          <button
                            onClick={() => setSettleModalOpen(b)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {splits.length === 0 ? (
                  <div className="text-center py-16 text-white/40 text-xs">No split bill activity yet.</div>
                ) : (
                  splits.map((split: any) => (
                    <div
                      key={split.id}
                      className="bg-white/5 border border-white/10 p-4 rounded-3xl space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-white">{split.title}</h3>
                            <p className="text-[11px] text-white/50">
                              {split.payer_name || 'You'} paid <span className="font-bold text-white">{formatCurrency(split.total_amount)}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(split.id)}
                          className="p-1.5 text-white/40 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Members List with WhatsApp & QR Actions */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        {split.members?.map((m: any) => {
                          const isPaid = m.is_paid === 'true';
                          return (
                            <div
                              key={m.id}
                              className="bg-black/30 border border-white/5 p-2.5 rounded-2xl flex items-center justify-between"
                            >
                              <div className="min-w-0 pr-2">
                                <p className={`text-xs font-bold ${isPaid ? 'line-through text-white/30' : 'text-white'}`}>
                                  {m.name}
                                </p>
                                <p className="text-[11px] font-mono text-emerald-400 font-bold">
                                  {formatCurrency(m.share_amount)}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {!isPaid && (
                                  <>
                                    {/* 1-Tap WhatsApp Request */}
                                    <button
                                      type="button"
                                      onClick={() => handleShareWhatsApp(m.name, m.share_amount, split.title)}
                                      className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all"
                                      title="Request on WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>

                                    {/* On-Screen QR Code for friend to scan */}
                                    <button
                                      type="button"
                                      onClick={() => handleShowQr(m.name, m.share_amount, split.title)}
                                      className="p-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-95 transition-all"
                                      title="Show Pay QR Code"
                                    >
                                      <QrCode className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                                {/* Mark as Paid Button */}
                                <button
                                  type="button"
                                  onClick={() => togglePaid(split.id, m.id)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                                    isPaid
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-white/10 text-white/80 hover:bg-emerald-500 hover:text-black'
                                  }`}
                                >
                                  {isPaid ? 'PAID ✓' : 'Mark Paid'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Split Bill Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 150 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 150 }}
                className="w-full sm:max-w-md bg-[#0F172A] border-t sm:border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Create Bill Split</span>
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1 block">Description</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Dinner at Paradise, Flat Rent"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1 block">Total Amount (₹)</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={totalAmount}
                        onChange={e => setTotalAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1 block">Date</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Friends / Members */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Split Between</span>
                      <button
                        type="button"
                        onClick={splitEqually}
                        className="text-[11px] text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        ⚡ Split Equally
                      </button>
                    </div>

                    <div className="space-y-2">
                      {members.map((member, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Friend's Name"
                            value={member.name}
                            onChange={e => handleMemberChange(i, 'name', e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="₹0"
                            value={member.share_amount}
                            onChange={e => handleMemberChange(i, 'share_amount', e.target.value)}
                            className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 text-right"
                          />
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(i)}
                              className="text-white/40 hover:text-rose-400 px-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="w-full py-2 border border-dashed border-white/20 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors"
                    >
                      + Add Friend
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-sm rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
                  >
                    {isSubmitting ? 'Creating...' : 'Save & Generate Payment Links'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* On-Screen Personal QR Code Modal */}
        <AnimatePresence>
          {qrModal?.isOpen && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQrModal(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-xs bg-[#0F172A] border border-white/15 p-6 rounded-3xl text-center relative z-10 shadow-2xl space-y-4"
              >
                <button
                  onClick={() => setQrModal(null)}
                  className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 text-white/70"
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Pay-Me QR Code</p>
                  <h3 className="text-base font-bold text-white mt-0.5">{qrModal.title}</h3>
                  <p className="text-xs text-white/60">Share for {qrModal.memberName}</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">₹{qrModal.amount}</p>
                </div>

                {/* QR Code Graphic */}
                <div className="w-52 h-52 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrModal.upiUri)}`}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(qrModal.upiUri);
                        toast.success('UPI payment link copied!');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UPI Link</span>
                  </button>

                  <p className="text-[10px] text-white/40">
                    Scan with any UPI app (GPay, PhonePe, Paytm, CRED)
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settle Up Overlay */}
        <AnimatePresence>
          {settleModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSettleModalOpen(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-[#0F172A] p-6 rounded-3xl relative z-10 border border-white/10 shadow-2xl text-center space-y-4"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowRight className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">Settle Balance</h3>
                  <p className="font-black text-3xl text-emerald-400 mt-1">{formatCurrency(Math.abs(settleModalOpen.balance))}</p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {settleModalOpen.balance > 0 ? `${settleModalOpen.name} pays you` : `You pay ${settleModalOpen.name}`}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {settleModalOpen.balance < 0 && (
                    <button
                      onClick={() => {
                        const amountToPay = Math.abs(settleModalOpen.balance);
                        const friendName = settleModalOpen.name;
                        setSettleModalOpen(null);
                        setUpiPayModal({
                          isOpen: true,
                          name: friendName,
                          amount: amountToPay,
                          note: `Settling balance with ${friendName}`
                        });
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Pay {formatCurrency(Math.abs(settleModalOpen.balance))} via UPI</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      soundFX.playChaChing();
                      toast.success('Marked as settled!');
                      setSettleModalOpen(null);
                      fetchData();
                    }}
                    className="w-full py-3 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 text-xs"
                  >
                    Mark as Settled Manually
                  </button>
                  <button
                    onClick={() => setSettleModalOpen(null)}
                    className="w-full py-2.5 text-xs text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* UPI Quick Pay Modal for settling balances */}
        <UpiQuickPayModal
          isOpen={upiPayModal.isOpen}
          onClose={() => setUpiPayModal(prev => ({ ...prev, isOpen: false }))}
          onSuccess={() => {
            fetchData();
            soundFX.playChaChing();
            toast.success('Balance settled and logged!');
          }}
          prefillName={upiPayModal.name}
          prefillAmount={upiPayModal.amount}
          prefillNote={upiPayModal.note}
        />

        <BottomNav />
      </AuthGuard>
    </ErrorBoundary>
  );
}
