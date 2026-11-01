import React from 'react';
import { Delete, RotateCcw, Lock } from 'lucide-react';
import { triggerVibration, VIBRATION_PATTERNS } from '../services/vibration';

export default function NumericKeypad({ 
  pin, 
  setPin, 
  maxDigits = 4, 
  disabled = false,
  error = null,
  attemptsRemaining = null
}) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const handlePressDigit = (d) => {
    if (disabled || pin.length >= maxDigits) return;
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
    setPin((prev) => prev + d);
  };

  const handleBackspace = () => {
    if (disabled || pin.length === 0) return;
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled || pin.length === 0) return;
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
    setPin('');
  };

  return (
    <div className="w-full max-w-xs mx-auto space-y-4">
      
      {/* Masked PIN Indicator: Strictly Zero Text Input */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center space-x-3.5 py-3">
          {Array.from({ length: maxDigits }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 transform ${
                  isFilled
                    ? 'bg-emerald-600 scale-125 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                    : 'border-2 border-slate-300 bg-slate-100 scale-100'
                }`}
                aria-label={`Digit ${idx + 1} ${isFilled ? 'entered' : 'empty'}`}
              />
            );
          })}
        </div>

        {error && (
          <div className="text-center px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold animate-shake">
            {error}
          </div>
        )}

        {attemptsRemaining !== null && attemptsRemaining < 5 && attemptsRemaining > 0 && !error && (
          <div className="text-center text-[11px] text-amber-700 font-medium">
            Warning: {attemptsRemaining} attempt(s) remaining before lockout.
          </div>
        )}
      </div>

      {/* On-Screen Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
        {digits.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled || pin.length >= maxDigits}
            onClick={() => handlePressDigit(digit)}
            className="h-12 sm:h-14 bg-white hover:bg-slate-50 active:bg-slate-200 disabled:opacity-40 text-slate-800 text-lg sm:text-xl font-bold rounded-2xl border border-slate-200 shadow-sm transition active:scale-95 flex items-center justify-center select-none"
          >
            {digit}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleClear}
          className="h-12 sm:h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 text-slate-600 text-xs font-bold rounded-2xl border border-slate-200 transition active:scale-95 flex flex-col items-center justify-center space-y-0.5 select-none"
          title="Clear all digits"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        {/* Zero */}
        <button
          type="button"
          disabled={disabled || pin.length >= maxDigits}
          onClick={() => handlePressDigit('0')}
          className="h-12 sm:h-14 bg-white hover:bg-slate-50 active:bg-slate-200 disabled:opacity-40 text-slate-800 text-lg sm:text-xl font-bold rounded-2xl border border-slate-200 shadow-sm transition active:scale-95 flex items-center justify-center select-none"
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleBackspace}
          className="h-12 sm:h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 text-slate-600 text-xs font-bold rounded-2xl border border-slate-200 transition active:scale-95 flex flex-col items-center justify-center space-y-0.5 select-none"
          title="Delete last digit"
        >
          <Delete className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>

    </div>
  );
}

