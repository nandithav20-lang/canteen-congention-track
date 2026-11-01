import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import StudentDashboard from './components/StudentDashboard';
import SmartBalancingView from './components/SmartBalancingView';
import TimetableManager from './components/TimetableManager';
import AdminDashboard from './components/AdminDashboard';
import AnalyticsView from './components/AnalyticsView';
import CrowdReportingModal from './components/CrowdReportingModal';
import TiltReporter from './components/TiltReporter';
import NotificationPanel from './components/NotificationPanel';
import CounterCard from './components/CounterCard';
import AuthModal from './components/AuthModal';

import { 
  fetchCounters, 
  fetchSmartRecommendation, 
  fetchBreakwave, 
  fetchAnalytics, 
  fetchNotifications,
  markNotificationsAsRead,
  submitCrowdReport,
  resetDemoData,
  simulateArrival,
  getStoredUser,
  fetchCurrentUser,
  logoutUser,
  loginWithPin
} from './services/api';

import { Sparkles, Zap, RotateCcw, AlertTriangle, Layers, Users } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('student');
  const [counters, setCounters] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [breakwave, setBreakwave] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState('STUDENT');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCounterForReport, setSelectedCounterForReport] = useState(null);
  const [isTiltModalOpen, setIsTiltModalOpen] = useState(false);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);

  // Demo Mode
  const [demoMode, setDemoMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // Global Data Fetcher
  const loadAllData = async () => {
    try {
      const [cData, rData, bData, aData, nData] = await Promise.all([
        fetchCounters(),
        fetchSmartRecommendation(),
        fetchBreakwave(),
        fetchAnalytics(),
        fetchNotifications()
      ]);
      setCounters(cData);
      setRecommendation(rData);
      setBreakwave(bData);
      setAnalytics(aData);
      setNotifications(nData);
    } catch (err) {
      console.error('Error fetching QueueSense data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial user authentication
    async function initAuth() {
      const verified = await fetchCurrentUser();
      if (verified) {
        setCurrentUser(verified);
      } else {
        // Auto sign-in demo student STU-101 (PIN: 1234) for immediate out-of-the-box experience
        try {
          const res = await loginWithPin('STU-101', '1234');
          setCurrentUser(res.user);
        } catch (e) {
          console.warn('Auto demo login skipped:', e);
        }
      }
    }

    initAuth();
    loadAllData();

    // Auto-poll every 12 seconds for live feeling
    const interval = setInterval(() => {
      loadAllData();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Demo Reset Handler
  const handleResetDemo = async () => {
    try {
      await resetDemoData();
      await loadAllData();
    } catch (err) {
      console.error('Demo reset error:', err);
      // If unauthorized, prompt for admin auth
      if (currentUser?.role !== 'ADMIN') {
        setAuthDefaultRole('ADMIN');
        setIsAuthModalOpen(true);
      }
    }
  };

  // Quick Crowd Report Submission
  const handleSubmitReport = async (reportData) => {
    await submitCrowdReport({
      ...reportData,
      reporter_type: currentUser ? `STUDENT (${currentUser.id})` : 'STUDENT'
    });
    await loadAllData();
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    await markNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read_status: 1 })));
  };

  // Auth Handlers
  const handleOpenAuth = (role = 'STUDENT') => {
    setAuthDefaultRole(role);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (user, loggedInRole) => {
    setCurrentUser(user);
    loadAllData();
    if (loggedInRole === 'ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('student');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    handleOpenAuth('STUDENT');
  };

  const unreadNotifsCount = notifications.filter(n => n.read_status === 0).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Navbar with Auth Status */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        onResetDemo={handleResetDemo}
        breakwave={breakwave}
        unreadNotifsCount={unreadNotifsCount}
        onToggleNotifs={() => setIsNotifPanelOpen(!isNotifPanelOpen)}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Demo Mode Floating Announcement Banner */}
      {demoMode && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold py-1.5 px-4 text-center shadow-inner flex flex-wrap items-center justify-center gap-2">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              <strong>TEXT-FREE AUTH ACTIVE:</strong> Authenticated as <strong>{currentUser ? `${currentUser.name} (${currentUser.role})` : 'Guest'}</strong>.
            </span>
          </span>
          <button
            type="button"
            onClick={() => handleOpenAuth(currentUser?.role === 'ADMIN' ? 'STUDENT' : 'ADMIN')}
            className="underline hover:text-emerald-100 text-[11px] font-bold"
          >
            Switch to {currentUser?.role === 'ADMIN' ? 'Student' : 'Admin'} Login
          </button>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          currentUser={currentUser}
          onPromptAdminAuth={() => handleOpenAuth('ADMIN')}
        />

        {/* Content View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loading && counters.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Initializing QueueSense Core Engines...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'student' && (
                <StudentDashboard
                  counters={counters}
                  recommendation={recommendation}
                  breakwave={breakwave}
                  onOpenReport={(counter) => {
                    setSelectedCounterForReport(counter);
                    setIsReportModalOpen(true);
                  }}
                  onOpenTilt={() => setIsTiltModalOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'balancing' && (
                <SmartBalancingView
                  counters={counters}
                  onRefreshCounters={loadAllData}
                />
              )}

              {activeTab === 'counters' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Live Campus Counter Matrix
                    </h2>
                    <p className="text-xs text-slate-500">
                      Real-time queue depth, service throughput, and inventory status across all counters.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {counters.map((c) => (
                      <CounterCard
                        key={c.id}
                        counter={c}
                        onOpenReport={(counter) => {
                          setSelectedCounterForReport(counter);
                          setIsReportModalOpen(true);
                        }}
                        isRecommended={recommendation?.recommended_counter?.id === c.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'timetable' && (
                <TimetableManager
                  breakwave={breakwave}
                  onRefreshBreakwave={(bw) => setBreakwave(bw)}
                />
              )}

              {activeTab === 'admin' && (
                <AdminDashboard
                  counters={counters}
                  onRefreshCounters={loadAllData}
                  analytics={analytics}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  counters={counters}
                  analytics={analytics}
                />
              )}
            </>
          )}
        </main>

      </div>

      {/* Zero Text-Input Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        defaultRole={authDefaultRole}
      />

      {/* Crowd Reporting Modal (Strict Zero Text Input) */}
      {isReportModalOpen && (
        <CrowdReportingModal
          counters={counters}
          selectedCounter={selectedCounterForReport}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleSubmitReport}
          onOpenTiltMode={() => setIsTiltModalOpen(true)}
        />
      )}

      {/* Gyro DeviceOrientation Modal */}
      {isTiltModalOpen && (
        <TiltReporter
          counters={counters}
          onClose={() => setIsTiltModalOpen(false)}
          onSubmitReport={handleSubmitReport}
        />
      )}

      {/* Notifications Drawer */}
      {isNotifPanelOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setIsNotifPanelOpen(false)}
          onMarkRead={handleMarkNotificationsRead}
        />
      )}

    </div>
  );
}
