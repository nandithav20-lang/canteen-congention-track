import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Compass, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw,
  Send,
  Zap,
  Volume2,
  SlidersHorizontal,
  Clock
} from 'lucide-react';
import { 
  triggerVibration, 
  testHardwareVibration, 
  isVibrationSupported, 
  VIBRATION_PATTERNS 
} from '../services/vibration';

export default function TiltReporter({ counters, onClose, onSubmitReport }) {
  const [selectedCounterId, setSelectedCounterId] = useState(counters[0]?.id || 'counter-a');
  
  // Real 3-Axis Gyro Readings
  const [alpha, setAlpha] = useState(0); // Z-axis compass: 0 to 360
  const [beta, setBeta] = useState(0);   // X-axis pitch (front/back): -180 to 180
  const [gamma, setGamma] = useState(0); // Y-axis roll (left/right tilt): -90 to 90
  
  // Required Visible Sensor Status: "Enabled", "Disabled", "Unsupported", or "Permission Denied"
  const [sensorStatus, setSensorStatus] = useState(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return 'Unsupported';
    }
    return 'Disabled';
  });

  const [detectedLevel, setDetectedLevel] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [vibrationFeedback, setVibrationFeedback] = useState(null);

  // Auto-submit cooldown & debounce tracking
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%
  const holdTimerRef = useRef(null);
  const prevLevelRef = useRef('MEDIUM');
  const lastSubmitTimeRef = useRef(0);
  const listenerAttachedRef = useRef(false);

  // Check hardware availability on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatus('Unsupported');
    }
  }, []);

  // Cooldown countdown
  useEffect(() => {
    let interval;
    if (cooldownRemaining > 0) {
      interval = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Actual Orientation Event Handler
  const handleDeviceOrientation = (e) => {
    // Check if real readings exist
    if (e.gamma === null && e.beta === null && e.alpha === null) {
      // In some browsers or desktop, event fires with all nulls
      return;
    }

    setSensorStatus('Enabled');

    const a = Math.round(e.alpha || 0);
    const b = Math.round(e.beta || 0);
    const g = Math.round(e.gamma || 0);

    setAlpha(a);
    setBeta(b);
    setGamma(g);

    // Map gamma (left/right tilt):
    // Left tilt (< -15°) => LOW
    // Center (-15° to +15°) => MEDIUM
    // Right tilt (> +15°) => HIGH
    let level = 'MEDIUM';
    if (g < -15) {
      level = 'LOW';
    } else if (g > 15) {
      level = 'HIGH';
    }

    setDetectedLevel(level);

    // Haptic tick on zone transition
    if (level !== prevLevelRef.current) {
      prevLevelRef.current = level;
      triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
      setHoldProgress(0);
    }
  };

  // Functional Enable Sensor handler
  const handleEnableSensor = async () => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatus('Unsupported');
      return;
    }

    // iOS 13+ permission request check
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          attachListeners();
          setSensorStatus('Enabled');
        } else {
          setSensorStatus('Permission Denied');
        }
      } catch (err) {
        console.warn('Sensor permission error:', err);
        setSensorStatus('Permission Denied');
      }
    } else {
      // Android Chrome & standard browsers (requires user gesture, which this click satisfies)
      attachListeners();
      setSensorStatus('Enabled');
    }
  };

  const attachListeners = () => {
    if (!listenerAttachedRef.current) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      // Fallback event on certain Android browsers
      window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
      listenerAttachedRef.current = true;
    }
  };

  const handleDisableSensor = () => {
    if (listenerAttachedRef.current) {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
      listenerAttachedRef.current = false;
    }
    setSensorStatus('Disabled');
  };

  useEffect(() => {
    return () => {
      if (listenerAttachedRef.current) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
        window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
      }
    };
  }, []);

  // Normal Button-Based Fallback
  const handleManualTiltFallback = (simulatedGamma) => {
    setGamma(simulatedGamma);
    let level = 'MEDIUM';
    if (simulatedGamma < -15) level = 'LOW';
    else if (simulatedGamma > 15) level = 'HIGH';
    setDetectedLevel(level);
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
  };

  // Independent Vibration Test (Strict Requirement)
  const handleTestVibrationClick = () => {
    const result = testHardwareVibration();
    setVibrationFeedback(result);
  };

  // Submit Report with Debounce / Cooldown protection
  const handleSubmit = async () => {
    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 4000 || cooldownRemaining > 0) {
      return; // Debounced
    }

    setSubmitting(true);
    lastSubmitTimeRef.current = now;
    setCooldownRemaining(5); // 5-second cooldown

    const queueMap = { LOW: 3, MEDIUM: 7, HIGH: 14 };
    try {
      await onSubmitReport({
        counter_id: selectedCounterId,
        crowd_level: detectedLevel,
        queue_estimate: queueMap[detectedLevel],
        reporter_type: sensorStatus === 'Enabled' ? 'TILT_SENSOR' : 'TILT_FALLBACK'
      });

      // Genuine vibration on successful report submission
      const vibSuccess = triggerVibration(VIBRATION_PATTERNS.REPORT_SUBMITTED);
      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (e) {
      console.error('Tilt report submit error:', e);
      setSubmitting(false);
    }
  };

  // Visual bubble position clamp: -42px to +42px
  const bubbleOffset = Math.max(-42, Math.min(42, (gamma / 45) * 42));

  // Status Badge Colors based strictly on required keywords
  const statusBadges = {
    Enabled: { text: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
    Disabled: { text: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
    Unsupported: { text: 'text-slate-600', bg: 'bg-slate-200', dot: 'bg-slate-400' },
    'Permission Denied': { text: 'text-rose-700', bg: 'bg-rose-100', dot: 'bg-rose-500' }
  };
  const currentBadge = statusBadges[sensorStatus] || statusBadges.Disabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Gyro Tilt Crowd Reporter</h3>
              <p className="text-[11px] text-slate-500">DeviceOrientation & Vibration Hardware APIs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-lg font-bold text-slate-900">Tilt Report Recorded!</h4>
            <p className="text-xs text-slate-600">
              Registered <strong>{detectedLevel}</strong> crowd level via phone gyroscope orientation.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-3">
            
            {/* Target Counter Picker (Zero Text Input) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Target Counter
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {counters.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCounterId(c.id)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                      selectedCounterId === c.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* MANDATORY: Visible Sensor Status & 3-Axis Gyro Readings */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Sensor Status:</span>
                
                {/* Strictly displays: Enabled, Disabled, Unsupported, or Permission Denied */}
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${currentBadge.bg} ${currentBadge.text}`}>
                  <span className={`w-2 h-2 rounded-full ${currentBadge.dot} ${sensorStatus === 'Enabled' ? 'animate-pulse' : ''}`} />
                  <span>{sensorStatus}</span>
                </span>

                {/* Functional Enable / Disable Button */}
                {sensorStatus !== 'Enabled' ? (
                  <button
                    type="button"
                    onClick={handleEnableSensor}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
                  >
                    Enable Sensor
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisableSensor}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold rounded-lg transition"
                  >
                    Disable
                  </button>
                )}
              </div>

              {/* 3-Axis Real Headings (Alpha, Beta, Gamma) */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs bg-white p-2 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">α (Azimuth)</span>
                  <span className="font-bold text-slate-800">{alpha}°</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">β (Pitch)</span>
                  <span className="font-bold text-slate-800">{beta}°</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">γ (Roll / Tilt)</span>
                  <span className="font-bold text-emerald-700">{gamma}°</span>
                </div>
              </div>
            </div>

            {/* MANDATORY: Independent Vibration API Test Button */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">Vibration API Test</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestVibrationClick}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
                >
                  Test Vibration [200, 100, 300]
                </button>
              </div>

              {vibrationFeedback && (
                <div className={`p-2 rounded-xl text-[11px] font-semibold border ${
                  vibrationFeedback.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}>
                  {vibrationFeedback.message}
                </div>
              )}
            </div>

            {/* Visual Horizon Bubble Level Indicator */}
            <div className="bg-slate-950 p-4 rounded-2xl text-white text-center shadow-inner relative overflow-hidden">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
                Tilt Device Left / Right to Select Crowd Level
              </div>

              {/* Threshold Zones */}
              <div className="grid grid-cols-3 gap-1 mb-3 text-[11px] font-bold">
                <div className={`p-2 rounded-xl transition ${detectedLevel === 'LOW' ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400' : 'bg-slate-800/80 text-slate-400'}`}>
                  LOW
                  <div className="text-[9px] font-normal opacity-80">&lt; -15°</div>
                </div>
                <div className={`p-2 rounded-xl transition ${detectedLevel === 'MEDIUM' ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300 font-extrabold' : 'bg-slate-800/80 text-slate-400'}`}>
                  MEDIUM
                  <div className="text-[9px] font-normal opacity-80">-15° to +15°</div>
                </div>
                <div className={`p-2 rounded-xl transition ${detectedLevel === 'HIGH' ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400' : 'bg-slate-800/80 text-slate-400'}`}>
                  HIGH
                  <div className="text-[9px] font-normal opacity-80">&gt; +15°</div>
                </div>
              </div>

              {/* Physical Horizon Tube with Bubble */}
              <div className="relative w-full h-9 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center overflow-hidden">
                <div className="absolute w-0.5 h-full bg-slate-500 z-10" />
                <div className="absolute left-[33%] w-0.5 h-full bg-slate-600 border-dashed" />
                <div className="absolute right-[33%] w-0.5 h-full bg-slate-600 border-dashed" />

                {/* Floating bubble with live position */}
                <div 
                  className={`w-7 h-7 rounded-full shadow-lg transition-transform duration-100 ease-out flex items-center justify-center font-bold text-[10px] ${
                    detectedLevel === 'LOW' ? 'bg-emerald-400 text-emerald-950' :
                    detectedLevel === 'HIGH' ? 'bg-rose-400 text-rose-950' : 'bg-amber-400 text-amber-950'
                  }`}
                  style={{ transform: `translateX(${bubbleOffset * 2.8}px)` }}
                >
                  ●
                </div>
              </div>
            </div>

            {/* MANDATORY: Normal Button-Based Fallback */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Normal Button-Based Fallback (Desktop / No Gyroscope)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleManualTiltFallback(-30)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition ${
                    gamma < -15 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Tilt Left (-30°)
                </button>
                <button
                  type="button"
                  onClick={() => handleManualTiltFallback(0)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition ${
                    gamma >= -15 && gamma <= 15 ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Center (0°)
                </button>
                <button
                  type="button"
                  onClick={() => handleManualTiltFallback(30)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition ${
                    gamma > 15 ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Tilt Right (+30°)
                </button>
              </div>
            </div>

            {/* Submit Action with Cooldown indicator */}
            <div className="space-y-1 pt-1">
              {cooldownRemaining > 0 && (
                <div className="text-center text-[10px] font-bold text-amber-700 flex items-center justify-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Report submitted. Debounce cooldown active: {cooldownRemaining}s</span>
                </div>
              )}

              <button
                type="button"
                disabled={submitting || cooldownRemaining > 0}
                onClick={handleSubmit}
                className={`w-full py-3 text-xs font-bold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 active:scale-98 ${
                  cooldownRemaining > 0 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-indigo-600/20'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting ? 'Recording Report...' : `Confirm & Submit: ${detectedLevel} Congestion`}
                </span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
