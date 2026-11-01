import React from 'react';
import { 
  Users, 
  Clock, 
  Zap, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Flame,
  Radio,
  ChevronRight
} from 'lucide-react';

export default function CounterCard({ counter, onOpenReport, isRecommended }) {
  const {
    id,
    name,
    category,
    current_queue,
    service_rate,
    food_availability,
    walk_time_seconds,
    estimated_wait_minutes,
    crowd_status,
    reliability
  } = counter;

  // Status badges & colors
  const crowdColors = {
    LOW: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      indicator: 'bg-emerald-500',
      label: 'Low Crowd'
    },
    MEDIUM: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      indicator: 'bg-amber-500',
      label: 'Moderate'
    },
    HIGH: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      indicator: 'bg-rose-500',
      label: 'High Congestion'
    }
  };

  const currentTheme = crowdColors[crowd_status] || crowdColors.MEDIUM;

  const availabilityBadges = {
    AVAILABLE: { label: 'Full Menu', color: 'bg-emerald-100 text-emerald-800' },
    LOW_STOCK: { label: 'Low Stock', color: 'bg-amber-100 text-amber-800' },
    SOLD_OUT: { label: 'Sold Out', color: 'bg-rose-100 text-rose-800' },
  };

  const avail = availabilityBadges[food_availability] || availabilityBadges.AVAILABLE;

  return (
    <div className={`relative bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
      isRecommended 
        ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
        : 'border-slate-200'
    } p-5 flex flex-col justify-between`}>
      
      {/* Top Banner if Recommended */}
      {isRecommended && (
        <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center space-x-1">
          <Zap className="w-3 h-3 fill-current" />
          <span>SMART RECOMMENDATION</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{name}</h3>
            <p className="text-xs text-slate-500 font-medium">{category}</p>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${currentTheme.bg} ${currentTheme.text} border ${currentTheme.border}`}>
              <span className={`w-2 h-2 rounded-full ${currentTheme.indicator} animate-pulse`} />
              <span>{currentTheme.label}</span>
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${avail.color}`}>
              {avail.label}
            </span>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-2 gap-3 my-4 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Queue</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {current_queue} <span className="text-xs font-normal text-slate-500">students</span>
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Estimated Wait</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">
              {estimated_wait_minutes} <span className="text-xs font-normal text-slate-500">mins</span>
            </div>
          </div>
        </div>

        {/* Counter Specs Details */}
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-slate-400" />
              <span>Service Speed:</span>
            </span>
            <span className="font-semibold text-slate-800">{service_rate} students/min</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>Campus Walking Time:</span>
            </span>
            <span className="font-semibold text-slate-800">~{Math.round(walk_time_seconds / 60)} min ({walk_time_seconds}s)</span>
          </div>

          {reliability && (
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 flex items-center space-x-1">
                <Radio className="w-3 h-3 text-emerald-600" />
                <span>Crowd Confidence:</span>
              </span>
              <span className="font-semibold text-emerald-700">{reliability.confidence_pct}% ({reliability.active_report_count} reports)</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button: Zero text-input, pure button trigger */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onOpenReport(counter)}
          className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 hover:text-emerald-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center space-x-1.5 shadow-sm active:scale-98"
        >
          <span>Report Live Crowd</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}

