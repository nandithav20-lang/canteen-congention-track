import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Bell, 
  Clock, 
  ShieldCheck, 
  GraduationCap,
  Flame, 
  ChevronRight,
  User,
  LogOut,
  Lock,
  Volume2
} from 'lucide-react';
import { testHardwareVibration } from '../services/vibration';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  demoMode, 
  setDemoMode, 
  onResetDemo, 
  breakwave, 
  unreadNotifsCount, 
  onToggleNotifs,
  currentUser,
  onOpenAuth,
  onLogout
}) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [vibeStatus, setVibeStatus] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleTestVibrationClick = () => {
    const result = testHardwareVibration();
    setVibeStatus(result);
    setTimeout(() => {
      setVibeStatus(null);
    }, 3500);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('student')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Queue<span className="text-emerald-600">Sense</span>
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  v2.0 AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Predictive Counter Balancing & Canteen Intelligence
              </p>
            </div>
          </div>

          {/* Center: Live Timetable BreakWave Status */}
          <div className="hidden lg:flex items-center space-x-3 bg-slate-100/80 px-3.5 py-1.5 rounded-full border border-slate-200">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">
              {currentTime}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-xs text-slate-600 font-medium">
              {breakwave?.current_period ? (
                <span className="text-emerald-700 font-semibold">{breakwave.current_period.period_name} Active</span>
              ) : breakwave?.next_period ? (
                <span>Next: <strong className="text-slate-800">{breakwave.next_period.period_name}</strong> in {breakwave.minutes_to_next}m</span>
              ) : (
                "Academic Hours Active"
              )}
            </span>
            {breakwave?.wave_status === 'INCOMING_WAVE_ALERT' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                <Flame className="w-3 h-3 mr-1" />
                SURGE IMMINENT
              </span>
            )}
          </div>

          {/* Right Controls: Auth Profile, Vibe Test, Demo Mode, Reset, Notifications */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Authenticated User Profile Pill / Login Trigger */}
            {currentUser ? (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onOpenAuth(currentUser.role)}
                  className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                  }`}
                  title="Click to switch demo account or change PIN"
                >
                  {currentUser.role === 'ADMIN' ? (
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className="max-w-[100px] sm:max-w-none truncate">
                    {currentUser.name.split(' ')[0]} ({currentUser.id})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                  title="Sign out of current account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('STUDENT')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-sm transition active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* MANDATORY: Independent Test Vibration Button */}
            <button
              type="button"
              onClick={handleTestVibrationClick}
              title="Test Vibration API with [200, 100, 300] ms pattern"
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg border border-amber-300 shadow-sm transition active:scale-95 flex items-center space-x-1"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Test Vibration</span>
            </button>

            {/* Demo Mode Toggle Switch (Zero text input) */}
            <div className="flex items-center space-x-1.5 bg-emerald-50/70 border border-emerald-200 px-2 py-1 rounded-lg">
              <span className="text-[11px] font-bold text-emerald-800 hidden md:inline">DEMO</span>
              <button
                type="button"
                role="switch"
                aria-checked={demoMode}
                onClick={() => setDemoMode(!demoMode)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  demoMode ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    demoMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reset Demo Button */}
            <button
              type="button"
              onClick={onResetDemo}
              title="Reset queues to initial judging baseline (A:15, B:3, C:5)"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition active:scale-95 flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={onToggleNotifs}
              className="relative p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

          </div>

        </div>
      </div>

      {/* Vibration Result Floating Toast */}
      {vibeStatus && (
        <div className={`py-1.5 px-4 text-xs font-bold text-center border-b transition-all animate-fade-in ${
          vibeStatus.success 
            ? 'bg-emerald-500 text-white border-emerald-600' 
            : 'bg-rose-500 text-white border-rose-600'
        }`}>
          {vibeStatus.message}
        </div>
      )}
    </header>
  );
}
