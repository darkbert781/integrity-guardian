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
        `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors border-l-[3px] ${
          isActive
            ? 'bg-[#131921] text-white border-[#0052cc] font-semibold'
            : 'text-gray-400 border-transparent hover:bg-[#1c2531] hover:text-gray-100'
        }`
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function DashboardLayout({ onLogout }) {
  return (
    <div className="min-h-screen bg-background text-textMain font-sans flex">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="w-64 bg-[#232f3e] flex-shrink-0 flex flex-col shadow-lg z-10">

        {/* Logo bar */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-700 bg-[#131921]">
          <Shield className="w-5 h-5 text-[#0052cc]" />
          <span className="text-white font-semibold text-sm tracking-widest uppercase">
            Integrity Guardian
          </span>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">
            Navigation
          </p>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon }) => (
              <SidebarLink key={to} to={to} label={label} icon={icon} end={to === '/'} />
            ))}
          </nav>
        </div>

        {/* System section */}
        <div className="px-3 py-4 border-t border-gray-700 bg-[#131921]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">
            System
          </p>
          <div className="flex flex-col gap-1">
            <SidebarLink to="/settings" label="Configuration" icon={SettingsIcon} />
            <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 rounded text-sm text-gray-400 border-l-[3px] border-transparent hover:bg-[#1c2531] hover:text-gray-100 transition-colors w-full text-left">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-textMuted">
            <span className="font-semibold text-textMain">Enterprise FIM</span>
            <span>/</span>
            <span>us-east-1</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0052cc] text-white rounded-full flex items-center justify-center text-xs font-bold">
              A
            </div>
            <span className="text-sm font-medium text-textMain">Admin User</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto bg-background">
          <div className="max-w-7xl mx-auto h-full">
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
