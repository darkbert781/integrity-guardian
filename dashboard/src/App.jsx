import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { EventFeed } from './pages/EventFeed';
import { Alerts } from './pages/Alerts';
import { FileRegistry } from './pages/FileRegistry';
import { Vault } from './pages/Vault';
import { AuditLog } from './pages/AuditLog';
import { Compliance } from './pages/Compliance';
import { AIInsights } from './pages/AIInsights';
import { NLQuery } from './pages/NLQuery';
import { Settings } from './pages/Settings';

const NAV = [
  { to: '/',           label: '🛡  Overview'        },
  { to: '/events',     label: '📋 Event Feed'       },
  { to: '/alerts',     label: '🚨 Alert Inbox'      },
  { to: '/files',      label: '📁 Monitored Files'  },
  { to: '/vault',      label: '🔒 Encrypted Vault'  },
  { to: '/audit',      label: '📜 Audit Log'        },
  { to: '/compliance', label: '✅ Compliance'        },
  { to: '/ai',         label: '🤖 AI Insights'      },
  { to: '/query',      label: '🔍 Forensic Query'   },
];

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-textMain font-sans flex">
        {/* Sidebar */}
        <aside className="w-64 bg-surface border-r border-gray-700 p-5 hidden md:flex flex-col flex-shrink-0">
          <div className="mb-8">
            <h1 className="text-lg font-bold text-white">🛡 Integrity Guardian</h1>
            <p className="text-xs text-textMuted mt-1">Enterprise FIM v2.0</p>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition font-medium ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-textMuted hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-gray-700">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition font-medium ${
                  isActive ? 'bg-primary text-white' : 'text-textMuted hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              ⚙️  Settings
            </NavLink>
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/login"      element={<Login />} />
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
        </main>
      </div>
    </Router>
  );
}

export default App;

