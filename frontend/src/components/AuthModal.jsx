import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  GraduationCap, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import NumericKeypad from './NumericKeypad';
import { fetchDemoAccounts, loginWithPin } from '../services/api';
import { triggerVibration, VIBRATION_PATTERNS } from '../services/vibration';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  defaultRole = 'STUDENT'
}) {
  const [role, setRole] = useState(defaultRole); // 'STUDENT' or 'ADMIN'
  const [accounts, setAccounts] = useState({ students: [], admins: [] });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Load demo accounts from backend
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await fetchDemoAccounts();
        setAccounts(data);
        if (role === 'STUDENT' && data.students.length > 0) {
          setSelectedUserId(data.students[0].id);
        } else if (role === 'ADMIN' && data.admins.length > 0) {
          setSelectedUserId(data.admins[0].id);
        }
      } catch (e) {
        console.error('Failed to load demo accounts:', e);
      }
    }
    loadAccounts();
  }, []);

  // Update selected default user when role tab toggles
  useEffect(() => {
    setError(null);
    setPin('');
    if (role === 'STUDENT' && accounts.students.length > 0) {
      setSelectedUserId(accounts.students[0].id);
    } else if (role === 'ADMIN' && accounts.admins.length > 0) {
      setSelectedUserId(accounts.admins[0].id);
    }
  }, [role, accounts]);

  // Lockout countdown timer
  useEffect(() => {
    let timer;
    if (lockCountdown > 0) {
      timer = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockCountdown]);

  if (!isOpen) return null;

  const currentAccountList = role === 'STUDENT' ? accounts.students : accounts.admins;
  const currentAccount = currentAccountList.find(a => a.id === selectedUserId) || currentAccountList[0];

  const handleSelectAccount = (id) => {
    setSelectedUserId(id);
    setPin('');
    setError(null);
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
  };

  const handleQuickDemoFill = (demoPin) => {
    setPin(demoPin);
    setError(null);
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
  };

  const handleSubmitLogin = async () => {
    if (!selectedUserId) {
      setError('Please select an account');
      return;
    }
    if (pin.length !== 4) {
      setError('Please enter all 4 numeric digits of your PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginWithPin(selectedUserId, pin);
      triggerVibration(VIBRATION_PATTERNS.REPORT_SUBMITTED);
      onLoginSuccess(res.user, role);
      onClose();
    } catch (err) {
      triggerVibration(VIBRATION_PATTERNS.HIGH_CONGESTION_ALERT);
      setError(err.message);
      setAttemptsRemaining(err.attempts_remaining !== undefined ? err.attempts_remaining : null);
      if (err.locked) {
        setIsLocked(true);
        setLockCountdown(err.remaining_seconds || 300);
      }
      setPin(''); // Reset entered PIN on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden">
        
        {/* Top Header & Role Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 block">
              Text-Free Secure Gateway
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">
              QueueSense Access Portal
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Toggle Selector (Strict Zero Text Input) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mt-4">
          <button
            type="button"
            onClick={() => setRole('STUDENT')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 ${
              role === 'STUDENT'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 ${
              role === 'ADMIN'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Administrator</span>
          </button>
        </div>

        {/* Account Selection (Select Dropdown - strictly zero text input) */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {role === 'STUDENT' ? 'Select Student ID & Account' : 'Select Administrator Account'}
          </label>
          
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => handleSelectAccount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none"
            >
              {currentAccountList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.id} • {acc.name} ({acc.department})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Quick Demo Pre-selected Credentials for Judges */}
        <div className="mt-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1.5">
            <span>Judge Demo Accounts</span>
            <span className="text-emerald-600 lowercase font-normal">tap to choose & fill</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {currentAccountList.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(acc.id);
                  handleQuickDemoFill(acc.demo_pin_hint);
                }}
                className={`p-2 rounded-xl border text-left text-[11px] transition ${
                  selectedUserId === acc.id
                    ? role === 'STUDENT'
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300 text-emerald-950'
                      : 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300 text-indigo-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold truncate">{acc.name}</div>
                <div className="text-[10px] text-slate-500 flex justify-between items-center mt-0.5">
                  <span>{acc.id}</span>
                  <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                    PIN: {acc.demo_pin_hint}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Numeric PIN Keypad (Pure React State & Buttons) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Enter 4-Digit Security PIN
          </div>

          {isLocked ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <h4 className="text-xs font-bold text-rose-900">Account Temporarily Locked</h4>
              <p className="text-[11px] text-rose-700">
                5 failed attempts detected. Unlocks in: <strong>{lockCountdown}s</strong>
              </p>
            </div>
          ) : (
            <NumericKeypad
              pin={pin}
              setPin={setPin}
              maxDigits={4}
              disabled={loading || isLocked}
              error={error}
              attemptsRemaining={attemptsRemaining}
            />
          )}
        </div>

        {/* Authenticate Action Button */}
        <div className="mt-5">
          <button
            type="button"
            disabled={loading || isLocked || pin.length !== 4}
            onClick={handleSubmitLogin}
            className={`w-full py-3 text-xs font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 active:scale-98 ${
              pin.length === 4 && !isLocked
                ? role === 'STUDENT'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {loading ? (
              <span>Verifying Cryptographic Hash...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>
                  {role === 'STUDENT' ? 'Sign In as Student' : 'Authenticate Administrator'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Security Assurance Badge */}
        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Zero text inputs • PBKDF2/Scrypt hash • 5-attempt rate limit</span>
          </span>
        </div>

      </div>
    </div>
  );
}

