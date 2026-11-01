import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Users, 
  Clock, 
  Flame, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Power, 
  RotateCcw,
  PlusCircle,
  Coffee,
  Layers,
  ChevronDown
} from 'lucide-react';
import { updateCounter, simulateArrival } from '../services/api';

export default function AdminDashboard({ counters, onRefreshCounters, analytics }) {
  const [selectedCounterId, setSelectedCounterId] = useState(counters[0]?.id || 'counter-a');
  const [updating, setUpdating] = useState(false);

  // Service speed presets (Strictly zero text input)
  const speedPresets = [
    { label: 'Slow (1.0/min)', val: 1.0 },
    { label: 'Standard (1.8/min)', val: 1.8 },
    { label: 'Fast (2.5/min)', val: 2.5 },
    { label: 'Ultra Express (3.5/min)', val: 3.5 },
    { label: 'Super Charged (5.0/min)', val: 5.0 }
  ];

  const availabilityOptions = [
    { val: 'AVAILABLE', label: 'Full Stock / Available', color: 'text-emerald-700 bg-emerald-50' },
    { val: 'LOW_STOCK', label: 'Low Stock (Few items left)', color: 'text-amber-800 bg-amber-50' },
    { val: 'SOLD_OUT', label: 'Sold Out (Temporarily Closed)', color: 'text-rose-700 bg-rose-50' }
  ];

  const handleUpdate = async (id, partialData) => {
    setUpdating(true);
    try {
      await updateCounter(id, partialData);
      if (onRefreshCounters) await onRefreshCounters();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleInjectArrivals = async (id, count) => {
    try {
      await simulateArrival(id, count);
      if (onRefreshCounters) await onRefreshCounters();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Overview Stat Cards (Section 11.A) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Counters</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{analytics?.total_counters || counters.length}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">All active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Headcount</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {counters.reduce((acc, c) => acc + c.current_queue, 0)} <span className="text-xs font-normal text-slate-500">students</span>
          </span>
          <span className="text-[10px] text-slate-500">Across canteen</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Busiest Counter</span>
          <span className="text-lg font-black text-rose-600 mt-1 block truncate">
            {analytics?.busiest_counter || 'Counter A'}
          </span>
          <span className="text-[10px] text-rose-700 font-semibold">{analytics?.busiest_queue || 15} queued</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Least Crowded</span>
          <span className="text-lg font-black text-emerald-700 mt-1 block truncate">
            {analytics?.least_crowded_counter || 'Counter B'}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">{analytics?.least_queue || 3} queued</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Average Wait</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {analytics?.average_wait_minutes || '4.2'} <span className="text-xs font-normal text-slate-500">min</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">Campus mean</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Student Reports</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {analytics?.total_reports || '12'}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Crowdsourced</span>
        </div>

      </div>

      {/* Counter Configuration & Controls (Section 11.B) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Counter Operational Controls
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Manage service throughput, food stock availability, and live queue overrides.
            </p>
          </div>

          <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
            Zero Text-Input Admin Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          {counters.map((counter) => (
            <div 
              key={counter.id} 
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{counter.name}</h4>
                  <p className="text-xs text-slate-500">{counter.category}</p>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Active Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleUpdate(counter.id, { is_active: counter.is_active ? 0 : 1 })}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                      counter.is_active 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {counter.is_active ? 'Online' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Service Speed Selector (Presets - No text field) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Service Rate Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {speedPresets.map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleUpdate(counter.id, { service_rate: preset.val })}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-semibold transition ${
                        counter.service_rate === preset.val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Stock Toggle (Select / Pills - No text field) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Menu / Food Availability
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {availabilityOptions.map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handleUpdate(counter.id, { food_availability: opt.val })}
                      className={`py-1.5 px-2 text-[11px] rounded-lg border font-semibold transition text-center truncate ${
                        counter.food_availability === opt.val
                          ? `${opt.color} border-current shadow-sm font-bold`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Queue Overrides & Arrival Injection (Slider + Stepper) */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Live Queue: {counter.current_queue} students
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleInjectArrivals(counter.id, -1)}
                      className="px-2 py-0.5 text-xs font-bold bg-white border border-slate-200 rounded hover:bg-slate-100"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInjectArrivals(counter.id, 1)}
                      className="px-2 py-0.5 text-xs font-bold bg-white border border-slate-200 rounded hover:bg-slate-100"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInjectArrivals(counter.id, 5)}
                      className="px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-500"
                    >
                      +5 Rush
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="35"
                  value={counter.current_queue}
                  onChange={(e) => handleUpdate(counter.id, { current_queue: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

