'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import { apiFetch } from '@/lib/api';

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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await apiFetch('/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ message: userMessage }) 
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to my servers. Please try again later.' }]);
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
