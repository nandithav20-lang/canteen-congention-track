const BASE_URL = '/api';

// Token helpers in localStorage
export function getStoredToken() {
  return localStorage.getItem('queuesense_token') || '';
}

export function setStoredSession(token, user) {
  localStorage.setItem('queuesense_token', token);
  localStorage.setItem('queuesense_user', JSON.stringify(user));
}

export function getStoredUser() {
  const user = localStorage.getItem('queuesense_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

export function clearStoredSession() {
  localStorage.removeItem('queuesense_token');
  localStorage.removeItem('queuesense_user');
}

function getAuthHeaders() {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['X-Auth-Token'] = token;
  }
  return headers;
}

// -------------------------------------------------------------
// Authentication Endpoints (Zero Text-Input)
// -------------------------------------------------------------
export async function fetchDemoAccounts() {
  const res = await fetch(`${BASE_URL}/auth/accounts`);
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function loginWithPin(userId, pin) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, pin: String(pin) })
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || 'Authentication failed');
    error.attempts_remaining = data.attempts_remaining;
    error.locked = data.locked;
    error.remaining_seconds = data.remaining_seconds;
    throw error;
  }
  setStoredSession(data.token, data.user);
  return data;
}

export async function fetchCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      clearStoredSession();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch (e) {
    return null;
  }
}

export async function logoutUser() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch (e) {
    // Ignore network error on logout
  } finally {
    clearStoredSession();
  }
}

// -------------------------------------------------------------
// Core QueueSense API Endpoints
// -------------------------------------------------------------
export async function fetchCounters() {
  const res = await fetch(`${BASE_URL}/counters`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch counters');
  return res.json();
}

export async function updateCounter(id, data) {
  const res = await fetch(`${BASE_URL}/counters/${id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update counter. Requires admin privileges.');
  }
  return res.json();
}

export async function fetchReports() {
  const res = await fetch(`${BASE_URL}/reports`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function submitCrowdReport(report) {
  const res = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(report)
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
}

export async function fetchSmartRecommendation() {
  const res = await fetch(`${BASE_URL}/recommendations`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch recommendation');
  return res.json();
}

export async function runBalancingSimulation(incomingStudents = 6, walkTimeFactor = true) {
  const res = await fetch(`${BASE_URL}/balancing/simulate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      incoming_students: incomingStudents,
      walk_time_factor: walkTimeFactor
    })
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export async function fetchTimetable() {
  const res = await fetch(`${BASE_URL}/timetable`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch timetable');
  return res.json();
}

export async function updateTimetablePeriod(period) {
  const res = await fetch(`${BASE_URL}/timetable`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(period)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update timetable. Requires admin privileges.');
  }
  return res.json();
}

export async function fetchBreakwave(simulatedTime = null) {
  const url = simulatedTime ? `${BASE_URL}/breakwave?time=${simulatedTime}` : `${BASE_URL}/breakwave`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch BreakWave data');
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${BASE_URL}/analytics`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchNotifications() {
  const res = await fetch(`${BASE_URL}/notifications`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationsAsRead() {
  const res = await fetch(`${BASE_URL}/notifications/mark-read`, { 
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to mark notifications read');
  return res.json();
}

export async function resetDemoData() {
  const res = await fetch(`${BASE_URL}/demo/reset`, { 
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to reset demo. Requires admin privileges.');
  }
  return res.json();
}

export async function simulateArrival(counterId, count = 1) {
  const res = await fetch(`${BASE_URL}/demo/simulate-arrival`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ counter_id: counterId, count })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to simulate arrival. Requires admin privileges.');
  }
  return res.json();
}

export function getCsvExportUrl() {
  const token = getStoredToken();
  return token ? `${BASE_URL}/export/csv?token=${encodeURIComponent(token)}` : `${BASE_URL}/export/csv`;
}
