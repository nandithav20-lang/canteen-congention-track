import React from 'react';
import { 
  Users, 
  Layers, 
  Cpu, 
  Calendar, 
  Sliders, 
  BarChart3, 
  Compass,
  Zap,
  Lock,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onPromptAdminAuth }) {
  const isAdmin = currentUser?.role === 'ADMIN';

  const navItems = [
    { 
      id: 'student', 
      label: 'Student View', 
      icon: Users,
      badge: 'Live'
    },
    { 
      id: 'balancing', 
      label: 'Predictive Balancing', 
      icon: Cpu,
      badge: 'Core Innovation',
      highlight: true
    },
    { 
      id: 'counters', 
      label: 'Live Counters', 
      icon: Layers,
    },
    { 
      id: 'timetable', 
      label: 'Timetable & BreakWave', 
      icon: Calendar,
    },
    { 
      id: 'admin', 
      label: 'Admin Operations', 
      icon: isAdmin ? Sliders : Lock,
      badge: isAdmin ? 'Admin' : 'Protected',
      requiresAdmin: true
    },
    { 
      id: 'analytics', 
      label: 'Analytics & Export', 
      icon: BarChart3,
    },
  ];

  const handleNavClick = (item) => {
    if (item.requiresAdmin && !isAdmin) {
      if (onPromptAdminAuth) onPromptAdminAuth();
      return;
    }
    setActiveTab(item.id);
  };

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex md:flex-col justify-between p-3 md:p-4">
      <div className="w-full">
        <div className="hidden md:block mb-4 px-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </p>
        </div>

        <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 whitespace-nowrap md:w-full ${
                  isActive
                    ? item.highlight 
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                      : 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                    : item.highlight
                      ? 'text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive && item.highlight ? 'text-white' : isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive && item.highlight
                      ? 'bg-emerald-700 text-emerald-100'
                      : item.requiresAdmin && !isAdmin
                        ? 'bg-amber-100 text-amber-800'
                        : item.highlight
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Innovation Quick Card in Sidebar for Desktop */}
      <div className="hidden md:block mt-6 p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white shadow-md">
        <div className="flex items-center space-x-2 text-emerald-400 mb-1.5">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Stampede Guard</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          QueueSense dynamically shifts recommendations before bottlenecks cascade.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('balancing')}
          className="mt-3 w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg text-center transition"
        >
          View Live Balancing
        </button>
      </div>
    </aside>
  );
}
