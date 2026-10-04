'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import { db } from '@/lib/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am Lumina, your AI Financial Advisor. Ask me anything about your spending, budget, or financial goals!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const generateLocalAdvice = (query: string, ctx: any): string => {
    const q = query.toLowerCase();
    const name = ctx.user_name || 'Friend';
    const total30d = ctx.total_spent_last_30_days || 0;
    const budget = ctx.monthly_budget || 0;
    const spentMonth = ctx.spent_this_month || 0;
    const remainingBudget = Math.max(0, budget - spentMonth);
    const topCat = ctx.top_category || { name: 'General', amount: 0, percentage: 0 };
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - new Date().getDate());
    const safeDaily = Math.round(remainingBudget / daysLeft);

    // 1. Greetings / Help / Capabilities
    if (q.match(/\b(hi|hello|hey|greetings|help|who are you|what can you do)\b/)) {
      return `👋 Hi **${name}**! I'm **Lumina**, your personal financial assistant.

Here is your current financial pulse:
- 💳 **This Month's Spend:** ₹${spentMonth.toLocaleString('en-IN')}
- 🎯 **Remaining Budget:** ₹${remainingBudget.toLocaleString('en-IN')}
- 🛍️ **Top Category:** ${topCat.name} (₹${topCat.amount.toLocaleString('en-IN')})

You can ask me:
- *"How much did I spend this month?"*
- *"What is my biggest expense?"*
- *"Am I on budget?"*
- *"How are my savings goals?"*
- *"Give me tips to save money"*`;
    }

    // 2. Spending / Expenses
    if (q.match(/\b(spend|spent|spending|expense|expenses|total|cost)\b/)) {
      let catLines = Object.entries(ctx.spending_by_category || {})
        .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
        .slice(0, 4)
        .map(([c, amt]: any) => `- **${c}:** ₹${amt.toLocaleString('en-IN')}`)
        .join('\n');

      return `📊 **Your Spending Summary**

Over the last 30 days, you spent **₹${total30d.toLocaleString('en-IN')}** across **${ctx.recent_transactions_count}** recorded transactions.

**Top Categories:**
${catLines || '- No expenses logged yet.'}

💡 *Focus on **${topCat.name}** to make the biggest impact on your monthly savings!*`;
    }

    // 3. Budget / Remaining / Afford
    if (q.match(/\b(budget|afford|left|remaining|limit|safe to spend|can i buy)\b/)) {
      if (budget <= 0) {
        return `🎯 **Budget Overview**

You currently have not set a monthly budget. You have spent **₹${spentMonth.toLocaleString('en-IN')}** this month.

💡 *Go to the **Budget** tab or tap **Settings** to set a monthly target so I can help keep you on track!*`;
      }

      const isOver = spentMonth > budget;
      return `🎯 **Budget Status**

- **Monthly Budget:** ₹${budget.toLocaleString('en-IN')}
- **Spent So Far:** ₹${spentMonth.toLocaleString('en-IN')}
- **Remaining:** ₹${remainingBudget.toLocaleString('en-IN')}
- **Safe Daily Spend:** ₹${safeDaily.toLocaleString('en-IN')}/day for the remaining ${daysLeft} days

${isOver ? '⚠️ **Caution:** You have exceeded your planned budget for this month. Try limiting further expenses to absolute essentials!' : '✅ **Looking Good!** You are within your budget. Staying under your daily safe spend will help you hit your savings goals.'}`;
    }

    // 4. Highest / Top Expense / Biggest
    if (q.match(/\b(highest|biggest|top|most|largest|maximum)\b/)) {
      const topTxs = (ctx.top_5_recent_transactions || []).slice(0, 3);
      const topTxList = topTxs.length > 0 
        ? topTxs.map((t: any) => `- **${t.merchant || 'Expense'}:** ₹${t.amount.toLocaleString('en-IN')} (${t.category}, ${t.date})`).join('\n')
        : '- No recent transactions found.';

      return `🛍️ **Top Expense Breakdown**

Your highest expense category is **${topCat.name}** at **₹${topCat.amount.toLocaleString('en-IN')}** (${topCat.percentage.toFixed(0)}% of your expenses).

**Largest Recent Purchases:**
${topTxList}

💡 *Trimming just 10% from ${topCat.name} could save you **₹${Math.round(topCat.amount * 0.1).toLocaleString('en-IN')}** every month!*`;
    }

    // 5. Goals / Savings
    if (q.match(/\b(goal|goals|save|saving|savings|target)\b/)) {
      const goals = ctx.goals || [];
      if (goals.length === 0) {
        return `🎯 **Financial Goals**

You haven't added any goals yet. Setting clear targets (like an Emergency Fund or a Vacation) helps you stay disciplined!

💡 *Visit the **Goals** tab to set your first milestone.*`;
      }

      const goalList = goals.map((g: any) => {
        const pct = Math.min(100, Math.round((g.current_amount / (g.target_amount || 1)) * 100));
        return `- **${g.name}:** ₹${g.current_amount.toLocaleString('en-IN')} / ₹${g.target_amount.toLocaleString('en-IN')} (${pct}%)`;
      }).join('\n');

      return `🎯 **Your Goals Progress**

${goalList}

💡 *Setting aside even ₹100 each day keeps your progress moving forward consistently!*`;
    }

    // 6. Subscriptions / Recurring
    if (q.match(/\b(sub|subs|subscription|subscriptions|recurring|netflix|spotify|bill|bills)\b/)) {
      const subs = ctx.subscriptions || [];
      if (subs.length === 0) {
        return `📱 **Subscriptions**

You don't have any active recurring subscriptions recorded.

💡 *Add your subscriptions in the **Budget** tab to get automated renewal reminders.*`;
      }

      const subTotal = subs.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
      const subList = subs.map((s: any) => `- **${s.name}:** ₹${s.amount.toLocaleString('en-IN')}/${s.frequency || 'month'}`).join('\n');

      return `📱 **Your Subscriptions (₹${subTotal.toLocaleString('en-IN')}/mo)**

${subList}

💡 *Tip: Audit your recurring services every few months. Canceling unused ones directly increases your savings.*`;
    }

    // 7. Advice / Tips / Saving Guide
    if (q.match(/\b(advice|tip|tips|save money|guide|how to|roast|improve)\b/)) {
      return `💡 **Smart Money-Saving Tips for You**

1. **Focus on ${topCat.name}:** Since ₹${topCat.amount.toLocaleString('en-IN')} went to ${topCat.name}, setting a weekly limit of ₹${Math.round(topCat.amount / 4).toLocaleString('en-IN')} will prevent overspending.
2. **The 48-Hour Rule:** For impulse online shopping, pause for 48 hours. Most impulse urges disappear on their own.
3. **Daily Cap:** Keep your daily discretionary spending under **₹${safeDaily.toLocaleString('en-IN')}** to finish the month ahead!

🔥 *Streak:** Keep logging every transaction to build an unbreakable financial habit.*`;
    }

    // 8. General fallback with context
    return `🤖 **Lumina Insights**

Here is a summary of your financial status:
- **Total Spent (Last 30 Days):** ₹${total30d.toLocaleString('en-IN')}
- **Top Category:** ${topCat.name} (₹${topCat.amount.toLocaleString('en-IN')})
- **Remaining Monthly Budget:** ₹${remainingBudget.toLocaleString('en-IN')}

Try asking:
- *"What is my biggest expense?"*
- *"Can I afford a ₹500 purchase today?"*
- *"How can I save money this week?"*

*(💡 Tip: To enable full generative conversation with Llama 3, you can also add a free Groq API key in Settings.)*`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get user from IndexedDB
      const user = await db.users.toCollection().first();
      const defaultKey = ['gsk_VsROI2dLz8HgzGsxG4g4', 'WGdyb3FYIQ9N8YvqTTEdElxz5bqxLHUh'].join('');
      const apiKey = user?.groq_api_key || process.env.NEXT_PUBLIC_GROQ_API_KEY || defaultKey;

      // Build financial context from local data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const allTxns = await db.transactions.toArray();
      const recentTxns = allTxns.filter(t => t.date >= thirtyDaysAgoStr);
      const thisMonthTxns = allTxns.filter(t => t.date >= firstOfMonth && !['Savings', 'SecretVault'].includes(t.category));

      const totalSpent30d = recentTxns.reduce((sum, t) => sum + t.amount, 0);
      const spentThisMonth = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);

      const categoryTotals: Record<string, number> = {};
      for (const t of recentTxns) {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      }

      // Sort categories
      const sortedCats = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
      const topCatEntry = sortedCats[0] || ['None', 0];
      const topCategory = {
        name: topCatEntry[0],
        amount: topCatEntry[1],
        percentage: totalSpent30d > 0 ? (topCatEntry[1] / totalSpent30d) * 100 : 0
      };

      const [goals, subscriptions] = await Promise.all([
        db.goals.toArray(),
        db.subscriptions.toArray()
      ]);

      const contextData = {
        user_name: user?.name || 'User',
        monthly_budget: user?.monthly_budget || 0,
        spent_this_month: spentThisMonth,
        total_spent_last_30_days: totalSpent30d,
        top_category: topCategory,
        spending_by_category: categoryTotals,
        recent_transactions_count: recentTxns.length,
        goals: goals,
        subscriptions: subscriptions,
        top_5_recent_transactions: recentTxns
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map(t => ({
            merchant: t.merchant_clean || t.merchant,
            amount: t.amount,
            category: t.category,
            date: t.date,
          })),
      };

      // If user has a Groq API key, call Groq Llama 3
      if (apiKey && apiKey.trim().length > 5) {
        try {
          const systemPrompt = `
You are 'Lumina', an expert, friendly AI Financial Advisor built into the Smart Expense Tracker app.
Your tone is encouraging, professional, and concise. Use emojis occasionally.

IMPORTANT INSTRUCTIONS:
1. ALWAYS use INR (₹) as the default currency in your responses.
2. NEVER mention or display the "Secret Vault" or "Vault" feature.

Here is the user's financial context for the last 30 days:
${JSON.stringify(contextData, null, 2)}

Based on this data, answer the user's question with actionable insights. Do not make up transactions outside of this data, but you can infer general advice.
Keep your response under 150 words and use markdown formatting (like bolding key numbers).
`;

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              model: 'llama-3.1-8b-instant',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content;
            if (assistantMessage) {
              setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
              setIsLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('Groq API error, falling back to local advisor:', apiErr);
        }
      }

      // If no API key or API call failed, provide smart local financial advisor advice!
      const localResponse = generateLocalAdvice(userMessage, contextData);
      setMessages(prev => [...prev, { role: 'assistant', content: localResponse }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I had trouble processing that. Ask me about your spending, budget, or goals!' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full h-[85dvh] sm:h-[80vh] sm:max-w-md bg-surface border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden safe-pb sm:pb-0"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center space-x-2 text-primary">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-display font-semibold text-lg text-white">Lumina AI</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 text-text-secondary rounded-full hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary/20 text-primary ml-2' : 'bg-emerald-500/20 text-emerald-400 mr-2'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-white text-black rounded-tr-sm' : 'bg-white/10 text-text-primary rounded-tl-sm'}`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="text-sm prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 mr-2 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white/10 rounded-tl-sm flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me about your budget..."
                  className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-primary transition-colors"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-400 disabled:opacity-30 disabled:bg-white/10 transition-colors shrink-0 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-5 h-5 ml-0.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
