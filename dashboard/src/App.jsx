import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Bell,
  FileBox,
  Lock,
  FileClock,
  CheckCircle,
  BrainCircuit,
  Search,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { Login }        from './pages/Login';
import { Overview }     from './pages/Overview';
import { EventFeed }    from './pages/EventFeed';
import { Alerts }       from './pages/Alerts';
import { FileRegistry } from './pages/FileRegistry';
import { Vault }        from './pages/Vault';
import { AuditLog }     from './pages/AuditLog';
import { Compliance }   from './pages/Compliance';
import { AIInsights }   from './pages/AIInsights';
import { NLQuery }      from './pages/NLQuery';
import { Settings }     from './pages/Settings';

const NAV = [
  { to: '/',           label: 'Overview',        icon: Shield },
  { to: '/events',     label: 'Event Feed',      icon: Activity },
  { to: '/alerts',     label: 'Alert Inbox',     icon: Bell },
  { to: '/files',      label: 'Monitored Files', icon: FileBox },
  { to: '/vault',      label: 'Encrypted Vault', icon: Lock },
  { to: '/audit',      label: 'Audit Log',       icon: FileClock },
  { to: '/compliance', label: 'Compliance',      icon: CheckCircle },
  { to: '/ai',         label: 'AI Insights',     icon: BrainCircuit },
  { to: '/query',      label: 'Forensic Query',  icon: Search },
];

function SidebarLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 border-l-[3px] ${
          isActive
            ? 'nav-link-active'
            : 'text-sidebarText border-transparent sidebar-link-hover'
        }`
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium tracking-wide">{label}</span>
    </NavLink>
  );
}

function DashboardLayout({ onLogout }) {
  return (
    <div className="min-h-screen bg-background text-textMain font-sans flex">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="w-64 bg-sidebar flex-shrink-0 flex flex-col z-20 border-r border-white/5">

        {/* Logo bar */}
        <div className="h-[72px] flex items-center gap-3 px-5 border-b border-white/10">
          <div className="p-2 bg-primary/20 rounded-xl">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide leading-tight">Integrity</p>
            <p className="text-primary text-xs font-semibold tracking-widest uppercase">Guardian</p>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="text-[10px] font-bold text-sidebarText/60 uppercase tracking-widest mb-3 px-3">
            Navigation
          </p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map(({ to, label, icon }) => (
              <SidebarLink key={to} to={to} label={label} icon={icon} end={to === '/'} />
            ))}
          </nav>
        </div>

        {/* System section */}
        <div className="px-3 py-4 border-t border-white/10">
          <p className="text-[10px] font-bold text-sidebarText/60 uppercase tracking-widest mb-3 px-3">
            System
          </p>
          <div className="flex flex-col gap-0.5">
            <SidebarLink to="/settings" label="Configuration" icon={SettingsIcon} />
            <button onClick={onLogout} className="sidebar-link-hover flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebarText border-l-[3px] border-transparent transition-all duration-200 w-full text-left">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium tracking-wide">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Top bar */}
        <header className="h-[72px] bg-surface border-b border-borderHighlight flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-textMuted font-mono">
            <span className="inline-flex items-center gap-1.5 bg-successBg text-primaryDark text-xs font-bold px-3 py-1 rounded-full border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Enterprise FIM
            </span>
            <span className="text-borderHighlight mx-1">/</span>
            <span className="text-textMuted">us-east-1</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-9 h-9 bg-primaryDark text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all group-hover:bg-primary">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto h-full animate-fade-in-up">
            <Routes>
              <Route path="/"           element={<Overview />} />
              <Route path="/events"     element={<EventFeed />} />
              <Route path="/alerts"     element={<Alerts />} />
              <Route path="/files"      element={<FileRegistry />} />
              <Route path="/vault"      element={<Vault />} />
              <Route path="/audit"      element={<AuditLog />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/ai"         element={<AIInsights />} />
              <Route path="/query"      element={<NLQuery />} />
              <Route path="/settings"   element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>

    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('token')
  );

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/*" element={
          isAuthenticated ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
