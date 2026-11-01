import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { fetchReports, getCsvExportUrl } from '../services/api';

export default function AnalyticsView({ counters, analytics }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await fetchReports();
        setReports(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Banner with CSV Export (Section 11.E) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Campus Intelligence & Auditing</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Crowd Analytics & Reliability Reports
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Time-decay weighted metrics, peak arrival trends, and CSV compliance export.
          </p>
        </div>

        {/* CSV Export Button */}
        <a
          href={getCsvExportUrl()}
          download="queuesense_congestion_report.csv"
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Congestion CSV</span>
        </a>
      </div>

      {/* Hourly Trend Chart Representation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Peak Campus Congestion Profile (Hourly Distribution)
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Simulated student arrival waves throughout the academic timetable.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 items-end h-56 pt-6 pb-2 border-b border-slate-200">
          {(analytics?.hourly_trends || []).map((slot) => {
            const heightPct = Math.min(100, (slot.arrivals / 100) * 100);
            const isPeak = slot.time === '12:30' || slot.time === '10:00';
            return (
              <div key={slot.time} className="flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition">
                  {slot.arrivals} std
                </span>
                <div 
                  className={`w-full max-w-[40px] rounded-t-lg transition-all duration-300 ${
                    isPeak 
                      ? 'bg-gradient-to-t from-rose-500 to-amber-400 group-hover:brightness-110' 
                      : 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:brightness-110'
                  }`}
                  style={{ height: `${Math.max(12, heightPct)}%` }}
                />
                <span className={`text-[10px] font-bold mt-2 ${isPeak ? 'text-rose-700' : 'text-slate-500'}`}>
                  {slot.time}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-1">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Timetable Break Surges (10:00 & 12:30)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Regular Lecture Hours</span>
          </span>
        </div>
      </div>

      {/* Report Reliability & Time Decay Breakdown (Section 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Reliability Engine Explanation */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center space-x-2 text-emerald-700 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">
              Report Reliability & Decay Engine
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            QueueSense does not treat all crowd reports equally. Stale reports decay rapidly according to our mathematical half-life decay function, preventing outdated crowd levels from lingering.
          </p>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
              <div>
                <span className="font-bold text-emerald-900">Fresh Reports (&lt; 5 mins)</span>
                <p className="text-[11px] text-emerald-700">100% influence weight in balancing algorithm</p>
              </div>
              <span className="font-mono font-bold text-emerald-800">1.0x Weight</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex justify-between items-center">
              <div>
                <span className="font-bold text-amber-900">Decaying Reports (5–15 mins)</span>
                <p className="text-[11px] text-amber-700">Linear half-life decay (50% to 90% weight)</p>
              </div>
              <span className="font-mono font-bold text-amber-800">0.5x–0.9x</span>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800">Expired Reports (&gt; 30 mins)</span>
                <p className="text-[11px] text-slate-500">Automatically pruned from queue calculations</p>
              </div>
              <span className="font-mono font-bold text-slate-500">0.0x (Purged)</span>
            </div>
          </div>
        </div>

        {/* Live Crowd Reports Stream */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-slate-900">
                Recent Crowd Submissions
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {reports.length} recorded
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {reports.slice(0, 7).map((r) => (
                <div 
                  key={r.id} 
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      r.crowd_level === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                      r.crowd_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.crowd_level}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800">{r.counter_name || r.counter_id}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {r.reporter_type}
                      </span>
                    </div>
                  </div>

                  <span className="font-semibold text-slate-700 text-right">
                    ~{r.queue_estimate} queued
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-500">
              Verified by timestamp validation & Bayesian consensus aggregation
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

