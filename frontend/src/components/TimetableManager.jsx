import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Plus, 
  Layers, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { fetchTimetable, updateTimetablePeriod, fetchBreakwave } from '../services/api';

export default function TimetableManager({ breakwave, onRefreshBreakwave }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulatedTime, setSimulatedTime] = useState('12:20');
  const [liveBreakwave, setLiveBreakwave] = useState(breakwave);

  // Predefined time slots for strict zero text-input requirement
  const timeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:15', '10:30', '11:00', '11:30',
    '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '14:00',
    '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const periodTypes = [
    { type: 'CLASS', label: 'Class / Lecture', surge: 1.0, color: 'bg-slate-100 text-slate-800' },
    { type: 'SHORT_BREAK', label: 'Short Break (15m)', surge: 2.8, color: 'bg-amber-100 text-amber-900' },
    { type: 'LUNCH_BREAK', label: 'Campus Lunch Break', surge: 4.5, color: 'bg-rose-100 text-rose-900' },
  ];

  const loadTimetableData = async () => {
    setLoading(true);
    try {
      const data = await fetchTimetable();
      setPeriods(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetableData();
  }, []);

  // Update BreakWave when simulatedTime changes
  const handleSimulatedTimeChange = async (newTime) => {
    setSimulatedTime(newTime);
    try {
      const bw = await fetchBreakwave(newTime);
      setLiveBreakwave(bw);
      if (onRefreshBreakwave) onRefreshBreakwave(bw);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (period) => {
    try {
      await updateTimetablePeriod({
        ...period,
        is_active: period.is_active ? 0 : 1
      });
      loadTimetableData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTimes = async (period, field, val) => {
    try {
      await updateTimetablePeriod({
        ...period,
        [field]: val
      });
      loadTimetableData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* BreakWave Intelligence Spotlight Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-100">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>BreakWave Demand Forecaster</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Predicting Congestion Before Bells Ring
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
              QueueSense synchronizes with the official campus timetable to forecast crowd surges 15-20 minutes before class periods dismiss.
            </p>
          </div>

          {/* Interactive Simulated Time Controller (Zero text input - dropdown select & presets) */}
          <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col space-y-2 min-w-[240px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
              Simulate Campus Clock
            </span>

            <select
              value={simulatedTime}
              onChange={(e) => handleSimulatedTimeChange(e.target.value)}
              className="bg-slate-900 text-white text-sm font-bold py-2 px-3 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
            >
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time} ({time >= '12:00' && time <= '13:30' ? 'Lunch Window' : (time.includes('10:') ? 'Morning Break' : 'Class Hour')})
                </option>
              ))}
            </select>

            {/* Quick time jump pills */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => handleSimulatedTimeChange('10:05')}
                className={`text-[10px] py-1 px-1.5 rounded font-bold transition ${
                  simulatedTime === '10:05' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                10:05 Break
              </button>
              <button
                type="button"
                onClick={() => handleSimulatedTimeChange('12:20')}
                className={`text-[10px] py-1 px-1.5 rounded font-bold transition ${
                  simulatedTime === '12:20' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                12:20 Pre-Lunch
              </button>
              <button
                type="button"
                onClick={() => handleSimulatedTimeChange('12:45')}
                className={`text-[10px] py-1 px-1.5 rounded font-bold transition ${
                  simulatedTime === '12:45' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                12:45 Peak Lunch
              </button>
            </div>
          </div>
        </div>

        {/* Live BreakWave Result Display */}
        {liveBreakwave && (
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Forecast Status</span>
              <span className="text-base font-bold text-white flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{liveBreakwave.wave_status}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Predicted Demand Surge</span>
              <span className="text-base font-extrabold text-amber-300">
                {liveBreakwave.surge_multiplier}x Normal ({liveBreakwave.predicted_incoming_students} incoming students)
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">System Forecast</span>
              <span className="text-xs text-emerald-100 font-medium">
                {liveBreakwave.forecast_message}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* College Timetable Configuration (Zero Text-Input Table) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Campus Daily Schedule Configuration
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Configure class timings, short breaks, and lunch intervals using predefined slot selectors.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
            {periods.filter(p => p.is_active).length} Active Periods
          </span>
        </div>

        {/* Schedule List */}
        <div className="mt-5 space-y-3">
          {periods.map((period) => (
            <div 
              key={period.id} 
              className={`p-4 rounded-2xl border transition-all ${
                period.is_active ? 'bg-slate-50/60 border-slate-200' : 'bg-slate-100/40 border-slate-200 opacity-60'
              } flex flex-col md:flex-row md:items-center justify-between gap-4`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl text-xs font-bold ${
                  period.period_type === 'LUNCH_BREAK' ? 'bg-rose-100 text-rose-800' :
                  period.period_type === 'SHORT_BREAK' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {period.period_type.replace('_', ' ')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{period.period_name}</h4>
                  <p className="text-[11px] text-slate-500">
                    Surge factor: <strong>{period.expected_demand_surge}x</strong> load
                  </p>
                </div>
              </div>

              {/* Time Pickers (Dropdown Selects - strictly zero text input) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                  <span className="text-slate-400">Start:</span>
                  <select
                    value={period.start_time}
                    onChange={(e) => handleUpdateTimes(period, 'start_time', e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                  <span className="text-slate-400">End:</span>
                  <select
                    value={period.end_time}
                    onChange={(e) => handleUpdateTimes(period, 'end_time', e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Active Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(period)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                    period.is_active 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  {period.is_active ? 'Active' : 'Disabled'}
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

