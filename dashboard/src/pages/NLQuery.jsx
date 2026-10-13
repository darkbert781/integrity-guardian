import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { Send, Bot, User, FileText } from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';

const SAMPLE_QUESTIONS = [
  'What changed in System32 recently?',
  'Show critical events in the last hour',
  'Which process modified a driver file?',
  'List all unauthorised changes',
];

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Bot className="w-5 h-5 text-primary relative z-10" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl p-5 ${isUser ? 'bg-primary text-white rounded-tr-sm shadow-sm' : 'bg-surface border border-borderHighlight text-textMain rounded-tl-sm shadow-sm'}`}>
        {msg.ai_response && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4 font-medium text-textMain">{msg.ai_response}</p>
        )}
        {!msg.ai_response && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        )}
        {msg.results && msg.results.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Matched Events
            </p>
            {msg.results.map((r, i) => (
              <div key={i} className="bg-background border border-borderHighlight rounded-lg p-3 text-textMain hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-4 h-4 text-textMuted" />
                  <span className="font-mono text-xs flex-1 truncate text-secondary font-bold">{r.file_path || 'Unknown path'}</span>
                  {r.severity && <SeverityBadge severity={r.severity} />}
                </div>
                {r.event_type && <p className="text-xs text-textMuted font-mono uppercase tracking-widest">{r.event_type} <span className="text-borderHighlight mx-1">|</span> {r.timestamp}</p>}
              </div>
            ))}
          </div>
        )}
        {isUser && <p className="text-sm font-medium">{msg.text}</p>}
      </div>
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          <User className="w-5 h-5 text-secondary relative z-10" />
        </div>
      )}
    </div>
  );
}

export function NLQuery() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      ai_response:
        'I am the Integrity Guardian AI assistant. Ask me about file changes, alerts, or active threats.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await api.post('/query/', { question: q });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          ai_response:
            res.data.ai_response ||
            (res.data.results?.length
              ? `Identified ${res.data.results.length} related events.`
              : 'Zero anomalous events detected for query.'),
          results: res.data.results || [],
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          ai_response: `Database link error: ${err.response?.data?.detail || err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-4xl mx-auto w-full animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold text-textMain tracking-tight">Forensic Interface</h2>
        <p className="text-sm text-textMuted mt-2">
          AI-powered assistant to query system events.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {SAMPLE_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-borderHighlight bg-surface text-textMuted hover:text-primary hover:border-primary/30 hover:bg-primary/5 shadow-sm transition-all duration-300 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex-1 enterprise-card p-6 overflow-y-auto bg-surface border border-borderHighlight border-t-4 border-t-primary shadow-md relative scrollbar-thin">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && (
            <div className="flex gap-4 mb-6 justify-start animate-fade-in-up">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="bg-surface border border-borderHighlight p-5 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-3 text-xs font-mono text-primary uppercase tracking-widest">Querying Neural Core...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex gap-3 relative">
        <input
          className="flex-1 enterprise-card bg-surface px-6 py-4 text-sm text-textMain border border-borderHighlight focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all rounded-xl relative z-10 font-mono placeholder-textMuted/50 shadow-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask a question... (Press Enter to search)"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center relative z-10 shadow-sm hover:scale-105 active:scale-95 duration-200"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
