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
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded bg-[#f1f5f9] border border-border flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className={`max-w-[80%] rounded p-4 ${isUser ? 'bg-primary text-white' : 'enterprise-card text-textMain'}`}>
        {msg.ai_response && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{msg.ai_response}</p>
        )}
        {!msg.ai_response && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        )}
        {msg.results && msg.results.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Matched Events</p>
            {msg.results.map((r, i) => (
              <div key={i} className="bg-[#f8f9fa] border border-border rounded p-3 text-textMain">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-textMuted" />
                  <span className="font-mono text-xs flex-1 truncate">{r.file_path || 'Unknown path'}</span>
                  {r.severity && <SeverityBadge severity={r.severity} />}
                </div>
                {r.event_type && <p className="text-xs text-textMuted">{r.event_type} — {r.timestamp}</p>}
              </div>
            ))}
          </div>
        )}
        {isUser && <p className="text-sm">{msg.text}</p>}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded bg-[#e2e8f0] flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-textMuted" />
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
        'Hello. I am the Integrity Guardian forensic assistant powered by Google Gemini. Ask me anything about file integrity events, process activity, or anomalies — I will query the live database and analyse the results in real time. If Gemini is not yet configured, I will fall back to keyword matching.',
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
              ? `Found ${res.data.results.length} matching events.`
              : 'No results found.'),
          results: res.data.results || [],
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          ai_response: `Error querying the database: ${err.response?.data?.detail || err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold text-textMain tracking-tight">Forensic Query Assistant</h2>
        <p className="text-sm text-textMuted mt-1">
          Powered by Google Gemini — natural language interface to the live event database
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLE_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded border border-border bg-white text-textMuted hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex-1 enterprise-card p-6 overflow-y-auto bg-[#f8f9fa]">
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && (
          <div className="flex gap-3 mb-4 justify-start">
            <div className="w-8 h-8 rounded bg-[#f1f5f9] border border-border flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="enterprise-card p-4 flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 enterprise-card px-4 py-3 text-sm text-textMain focus:border-primary outline-none"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask a forensic question about your files... (Enter to send)"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-primary hover:bg-[#0042a3] text-white px-6 rounded font-semibold disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
