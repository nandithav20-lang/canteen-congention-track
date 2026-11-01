import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Flame, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { 
  requestNotificationPermission, 
  sendBrowserNotification,
  isNotificationSupported,
  triggerVibration,
  VIBRATION_PATTERNS
} from '../services/vibration';

export default function NotificationPanel({ 
  notifications, 
  onClose, 
  onMarkRead 
}) {
  const [permState, setPermState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const handleEnableBrowserNotifs = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res === 'granted') {
      sendBrowserNotification('QueueSense Active', {
        body: 'You will receive intelligent alerts for counter congestions and lunch breaks.'
      });
      triggerVibration(VIBRATION_PATTERNS.BETTER_COUNTER_FOUND);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'ALERT':
        return <Flame className="w-4 h-4 text-rose-600" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 p-5 flex flex-col justify-between animate-fade-in">
      
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Notifications</h3>
              <span className="text-[11px] text-slate-400">Timetable & Queue Alerts</span>
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

        {/* Browser Permission Banner */}
        {permState !== 'granted' && isNotificationSupported() && (
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
            <div className="text-xs text-indigo-900 font-medium">
              Enable native browser alerts?
            </div>
            <button
              type="button"
              onClick={handleEnableBrowserNotifs}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition"
            >
              Allow
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="mt-4 space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No new alerts. All queues flowing smoothly.
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-3 rounded-2xl border transition ${
                  n.read_status === 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onMarkRead}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          Mark all as read
        </button>
      </div>

    </div>
  );
}

