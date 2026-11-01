import React, { useState } from 'react';
import { 
  X, 
  Send, 
  ThumbsUp, 
  Users, 
  CheckCircle2, 
  Flame, 
  Sparkles,
  Smartphone,
  Volume2
} from 'lucide-react';
import { 
  triggerVibration, 
  testHardwareVibration, 
  VIBRATION_PATTERNS 
} from '../services/vibration';

export default function CrowdReportingModal({ 
  counters, 
  selectedCounter, 
  onClose, 
  onSubmitReport,
  onOpenTiltMode
}) {
  const [targetCounterId, setTargetCounterId] = useState(selectedCounter?.id || counters[0]?.id || 'counter-a');
  const [crowdLevel, setCrowdLevel] = useState('MEDIUM');
  const [estimatedCount, setEstimatedCount] = useState(
    selectedCounter?.current_queue || 5
  );
  const [submitting, setSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [vibeResult, setVibeResult] = useState(null);

  const crowdPresets = [
    { 
      level: 'LOW', 
      label: 'Low Crowd', 
      desc: '1-4 in line (Fast)', 
      color: 'border-emerald-500 bg-emerald-50 text-emerald-800', 
      activeRing: 'ring-2 ring-emerald-500',
      defaultVal: 3
    },
    { 
      level: 'MEDIUM', 
      label: 'Moderate', 
      desc: '5-9 in line (Normal)', 
      color: 'border-amber-500 bg-amber-50 text-amber-800', 
      activeRing: 'ring-2 ring-amber-500',
      defaultVal: 7
    },
    { 
      level: 'HIGH', 
      label: 'High Rush', 
      desc: '10+ in line (Crowded)', 
      color: 'border-rose-500 bg-rose-50 text-rose-800', 
      activeRing: 'ring-2 ring-rose-500',
      defaultVal: 14
    },
  ];

  const handleLevelSelect = (level, defaultVal) => {
    setCrowdLevel(level);
    setEstimatedCount(defaultVal);
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
  };

  const handleStepCount = (delta) => {
    setEstimatedCount((prev) => Math.max(1, Math.min(40, prev + delta)));
    triggerVibration(VIBRATION_PATTERNS.TILT_TICK);
  };

  const handleTestVibration = () => {
    const res = testHardwareVibration();
    setVibeResult(res);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitReport({
        counter_id: targetCounterId,
        crowd_level: crowdLevel,
        queue_estimate: estimatedCount,
        reporter_type: 'STUDENT'
      });

      // Real hardware haptic vibration after crowd-report submission
      const vibRan = triggerVibration(VIBRATION_PATTERNS.REPORT_SUBMITTED);

      setSubmittedFeedback({
        counterName: counters.find(c => c.id === targetCounterId)?.name || 'Counter',
        level: crowdLevel,
        estimate: estimatedCount,
        vibrated: vibRan
      });

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Crowdsourced Intelligence
            </span>
            <h2 className="text-xl font-bold text-slate-900">Report Live Canteen Crowd</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedFeedback ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Thank you for reporting!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Your report for <strong>{submittedFeedback.counterName}</strong> ({submittedFeedback.level} crowd, ~{submittedFeedback.estimate} in queue) has been calibrated into the predictive balancer.
            </p>
            {submittedFeedback.vibrated && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                Haptic vibration [150, 75, 150] ms dispatched
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-4">

            {/* Independent Vibration Test Button */}
            <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
              <span className="font-semibold text-amber-900 flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>Test Vibration API:</span>
              </span>
              <button
                type="button"
                onClick={handleTestVibration}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-sm active:scale-95 transition"
              >
                Vibrate [200, 100, 300]
              </button>
            </div>
            {vibeResult && (
              <div className={`p-2 rounded-xl text-[11px] font-semibold border ${
                vibeResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}>
                {vibeResult.message}
              </div>
            )}

            {/* Step 1: Select Counter (Pills - No text field) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Select Counter
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {counters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setTargetCounterId(c.id);
                      setEstimatedCount(c.current_queue);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                      targetCounterId === c.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Crowd Level (Visual cards - No text field) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Crowd Intensity
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {crowdPresets.map((preset) => {
                  const isSelected = crowdLevel === preset.level;
                  return (
                    <button
                      key={preset.level}
                      type="button"
                      onClick={() => handleLevelSelect(preset.level, preset.defaultVal)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between ${
                        isSelected 
                          ? `${preset.color} ${preset.activeRing} shadow-sm font-bold` 
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-bold">{preset.label}</span>
                      <span className="text-[10px] text-slate-500 mt-1">{preset.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Estimated Queue Stepper & Slider (Strict zero text input) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Queue Headcount Estimate
                </label>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                  ~{estimatedCount} students
                </span>
              </div>

              <div className="flex items-center space-x-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleStepCount(-1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base flex items-center justify-center transition active:scale-95"
                >
                  -
                </button>
                
                {/* HTML5 Range Slider (strictly allowed per prompt section 3) */}
                <input
                  type="range"
                  min="1"
                  max="35"
                  value={estimatedCount}
                  onChange={(e) => setEstimatedCount(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => handleStepCount(+1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base flex items-center justify-center transition active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Alternative Interaction: DeviceOrientation Tilt Reporter Banner */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-indigo-900 font-medium">
                  Hands-Free Gyroscope Tilt Reporter
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTiltMode();
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-lg shadow-sm transition"
              >
                Launch Tilt Mode
              </button>
            </div>

            {/* Submit Action */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <span>Recording report...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Live Crowd Report</span>
                </>
              )}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
