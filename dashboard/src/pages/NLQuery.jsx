import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

/* ── icons ─────────────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  send:    'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  bot:     'M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2zM7 8h10M7 12h10M7 16h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  search:  'M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z',
  shield:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  user:    'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  file:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  alert:   'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
};

const SAMPLE_QUESTIONS = [
  { q: 'What changed in System32 yesterday?',   icon: ICONS.file   },
  { q: 'Show critical events in the last hour',  icon: ICONS.alert  },
  { q: 'Which process modified ntoskrnl.exe?',   icon: ICONS.search },
  { q: 'List all unauthorised registry changes',  icon: ICONS.shield },
  { q: 'How many files were deleted today?',      icon: ICONS.file   },
  { q: 'Show top anomalous files this week',      icon: ICONS.alert  },
];

/* ── result card for structured query results ──────────────────────────────── */
function ResultCard({ result, idx }) {
  return (
    <div style={{ ...S.resultCard, animationDelay: `${idx * 50}ms` }} className="res-card">
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <Icon d={ICONS.file} size={12} color="#1E6FBF" />
        <span style={{ fontFamily:'monospace', fontSize:11, color:'#94a3b8', flex:1,
                       overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {result.file_path || 'Unknown path'}
        </span>
        {result.severity && (
          <span style={{ fontSize:9, fontWeight:700, borderRadius:20, padding:'1px 7px',
                         background: result.severity==='CRITICAL' ? 'rgba(239,68,68,0.15)' : result.severity==='WARNING' ? 'rgba(245,158,11,0.12)' : 'rgba(30,111,191,0.12)',
                         color: result.severity==='CRITICAL' ? '#f87171' : result.severity==='WARNING' ? '#fcd34d' : '#93c5fd',
                         border: `1px solid ${result.severity==='CRITICAL' ? 'rgba(239,68,68,0.25)' : result.severity==='WARNING' ? 'rgba(245,158,11,0.2)' : 'rgba(30,111,191,0.2)'}` }}>
            {result.severity}
          </span>
        )}
      </div>
      {result.details && (
        <p style={{ margin:0, fontSize:11, color:'#64748b', lineHeight:1.5 }}>{result.details}</p>
      )}
    </div>
  );
}

/* ── chat message bubble ────────────────────────────────────────────────────── */
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap:8 }}
         className="msg-bubble">
      {!isUser && (
        <div style={S.botAvatar}><Icon d={ICONS.shield} size={14} color="#1E6FBF" /></div>
      )}
      <div style={{ maxWidth:'72%' }}>
        <div style={isUser ? S.userBubble : S.botBubble}>
          <p style={{ margin:0, fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{msg.text}</p>
        </div>
        {/* Structured results */}
        {msg.results && msg.results.length > 0 && (
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
            {msg.results.map((r, i) => <ResultCard key={i} result={r} idx={i} />)}
          </div>
        )}
      </div>
      {isUser && (
        <div style={S.userAvatar}><Icon d={ICONS.user} size={14} color="#60a5fa" /></div>
      )}
    </div>
  );
}

/* ── typing indicator ───────────────────────────────────────────────────────── */
function Typing() {
  return (
    <div style={{ display:'flex', gap:8, justifyContent:'flex-start' }}>
      <div style={S.botAvatar}><Icon d={ICONS.shield} size={14} color="#1E6FBF" /></div>
      <div style={{ ...S.botBubble, padding:'10px 16px' }}>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#1E6FBF',
                                   animation:'typingDot 1.2s infinite ease-in-out',
                                   animationDelay:`${i*0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── main NLQuery component ─────────────────────────────────────────────────── */
export function NLQuery() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '👋 Hello! I\'m your Integrity Guardian forensic assistant.\n\nAsk me anything about file integrity events, process activity, registry changes, or anomalies. You can use natural language — I\'ll query the live event database and return structured results.' }
  ]);
  const [input,   setInput]   = useState('');
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
      const results = res.data.results || [];
      const text = results.length === 0
        ? '🔍 No results found matching your query. Try rephrasing or asking about a different time range.'
        : `Found **${results.length}** result${results.length !== 1 ? 's' : ''} matching your query:`;
      setMessages(prev => [...prev, { role: 'assistant', text, results }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `⚠️ Error querying the database: ${err.response?.data?.detail || err.message}\n\nIs the Integrity Guardian service running?`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={S.iconWrap}><Icon d={ICONS.search} size={20} color="#1E6FBF" /></div>
          <div>
            <h2 style={S.title}>Forensic Query Assistant</h2>
            <p style={S.subtitle}>Natural language interface to the live event database</p>
          </div>
        </div>
      </div>

      {/* Suggestions row */}
      <div style={S.suggestions}>
        {SAMPLE_QUESTIONS.map(({ q, icon }) => (
          <button key={q} onClick={() => sendMessage(q)} style={S.chip} className="chip" disabled={loading}>
            <Icon d={icon} size={11} color="#475569" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={S.chatArea}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && <Typing />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div style={S.inputRow}>
        <input
          id="forensic-query-input"
          style={S.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask a forensic question… (Enter to send)"
          disabled={loading}
        />
        <button
          id="forensic-query-send"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ ...S.sendBtn, opacity: (loading || !input.trim()) ? 0.45 : 1 }}>
          <Icon d={ICONS.send} size={16} color="white" />
        </button>
      </div>

      <style>{`
        @keyframes typingDot { 0%,80%,100%{transform:scale(0.5);opacity:.4;} 40%{transform:scale(1);opacity:1;} }
        @keyframes bubbleIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        @keyframes resIn { from{opacity:0;transform:translateX(-4px);} to{opacity:1;transform:translateX(0);} }
        .msg-bubble { animation: bubbleIn 0.2s ease-out; }
        .res-card { animation: resIn 0.25s ease-out both; }
        .chip:hover:not(:disabled) { border-color: rgba(30,111,191,0.5) !important; color: #60a5fa !important; background: rgba(30,111,191,0.1) !important; }
        .chip { transition: all 0.15s; }
      `}</style>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────────── */
const S = {
  page:       { display:'flex', flexDirection:'column', height:'100%', gap:0 },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  iconWrap:   { width:40, height:40, borderRadius:10, background:'rgba(30,111,191,0.12)', border:'1px solid rgba(30,111,191,0.22)', display:'flex', alignItems:'center', justifyContent:'center' },
  title:      { margin:0, fontSize:19, fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' },
  subtitle:   { margin:0, fontSize:12, color:'#475569', marginTop:2 },
  suggestions:{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 },
  chip:       { display:'flex', alignItems:'center', gap:5, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:20, padding:'5px 12px', cursor:'pointer', fontSize:11, color:'#64748b', fontFamily:'inherit' },
  chatArea:   { flex:1, background:'rgba(15,23,42,0.5)', border:'1px solid rgba(30,111,191,0.1)', borderRadius:14, padding:'16px 18px', overflowY:'auto', backdropFilter:'blur(8px)', marginBottom:12 },
  inputRow:   { display:'flex', gap:10 },
  input:      { flex:1, background:'rgba(15,23,42,0.7)', border:'1px solid rgba(51,65,85,0.5)', borderRadius:12, padding:'12px 16px', color:'#f1f5f9', fontSize:13, outline:'none', fontFamily:'inherit', transition:'border-color 0.2s' },
  sendBtn:    { background:'linear-gradient(135deg, #1E6FBF, #1557a0)', border:'none', borderRadius:12, padding:'12px 18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity 0.2s' },
  botAvatar:  { width:30, height:30, borderRadius:'50%', background:'rgba(30,111,191,0.15)', border:'1px solid rgba(30,111,191,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  userAvatar: { width:30, height:30, borderRadius:'50%', background:'rgba(30,111,191,0.2)', border:'1px solid rgba(30,111,191,0.35)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  botBubble:  { background:'rgba(30,41,59,0.6)', border:'1px solid rgba(51,65,85,0.4)', borderRadius:'16px 16px 16px 4px', padding:'12px 16px', color:'#cbd5e1', backdropFilter:'blur(4px)' },
  userBubble: { background:'linear-gradient(135deg, rgba(30,111,191,0.4), rgba(30,111,191,0.25))', border:'1px solid rgba(30,111,191,0.3)', borderRadius:'16px 16px 4px 16px', padding:'12px 16px', color:'#e2e8f0' },
  resultCard: { background:'rgba(30,41,59,0.5)', border:'1px solid rgba(51,65,85,0.35)', borderRadius:9, padding:'8px 12px' },
};
