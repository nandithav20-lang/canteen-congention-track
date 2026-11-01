import React from 'react';
import { 
  Sparkles, 
  Clock, 
  MapPin, 
  Flame, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  ArrowRight,
  TrendingDown,
  Smartphone,
  ChevronRight,
  Coffee,
  Layers
} from 'lucide-react';
import CounterCard from './CounterCard';

export default function StudentDashboard({ 
  counters, 
  recommendation, 
  breakwave, 
  onOpenReport, 
  onOpenTilt,
  onNavigateTab 
}) {
  const rec = recommendation?.recommended_counter;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Welcome & Campus Break Status Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Live Campus Congestion Stream
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Welcome to Central Campus Canteen
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Real-time crowd intelligence powered by predictive demand balancing.
            </p>
          </div>

          {/* Break Status Pill Widget */}
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 self-start md:self-auto">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Timetable Intel
              </span>
              <span className="text-xs font-bold text-slate-900">
                {breakwave?.current_period ? breakwave.current_period.period_name : (breakwave?.next_period ? `Next: ${breakwave.next_period.period_name}` : "Classes in Session")}
              </span>
              <span className="block text-[11px] text-emerald-600 font-medium">
                {breakwave?.forecast_message || "Queues are currently moderate."}
              </span>
            </div>
          </div>

        </div>

        {/* Quick Action Badges */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onOpenReport(null)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <span>Report Crowd</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenTilt}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Tilt-Sensor Mode</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Campus canteen operational • All counters online</span>
          </div>
        </div>
      </div>

      {/* Smart Recommendation Spotlight Card (Section 5.D) */}
      {rec && (
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>AI Predictive Recommendation</span>
              </div>

              <div className="flex items-baseline space-x-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Head to {rec.name}
                </h2>
                <span className="text-emerald-200 text-sm font-semibold">
                  ({rec.category})
                </span>
              </div>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
                <strong>Why this counter?</strong> {rec.reason}
              </p>

              {/* Confidence & Speed Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="inline-flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Confidence: <strong>{rec.confidence_pct}%</strong></span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>Congestion: <strong>{rec.expected_congestion}</strong></span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-black/20 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Service: <strong>{rec.service_rate} students/min</strong></span>
                </span>
              </div>
            </div>

            {/* Wait Time Hero Metric */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center flex-shrink-0 flex flex-col justify-center min-w-[190px]">
              <span className="text-xs uppercase font-bold text-emerald-200 tracking-wider">
                Total Estimated Wait
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1">
                {rec.estimated_wait_minutes} <span className="text-base font-normal text-emerald-200">min</span>
              </div>
              <span className="text-[11px] text-emerald-100/80 mt-1">
                Current queue: {rec.current_queue} students
              </span>

              <button
                type="button"
                onClick={() => onNavigateTab('balancing')}
                className="mt-3 py-1.5 px-3 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow transition flex items-center justify-center space-x-1"
              >
                <span>View Balancing Simulation</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Live Counter Cards Section (Section 5.B) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              All Food Counters & Queues
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Live headcount, service speed, and menu availability
            </p>
          </div>

          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
            {counters.length} counters monitored
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {counters.map((counter) => (
            <CounterCard
              key={counter.id}
              counter={counter}
              onOpenReport={onOpenReport}
              isRecommended={rec?.id === counter.id}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

