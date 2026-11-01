import os
import io
import csv
import secrets
from functools import wraps
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from werkzeug.security import check_password_hash

from database import init_db, seed_default_data, get_connection
from algorithms import (
    calculate_waiting_time,
    simulate_counter_balancing,
    compute_report_reliability,
    evaluate_breakwave
)

app = Flask(__name__)
CORS(app)

# Initialize and seed database on startup
init_db()
seed_default_data()

# -------------------------------------------------------------
# Security & Session Helpers
# -------------------------------------------------------------
def get_authenticated_user():
    """
    Extracts and validates session token from headers or query parameters.
    Returns user dictionary or None.
    """
    token = request.headers.get('X-Auth-Token')
    if not token and 'Authorization' in request.headers:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
    if not token:
        token = request.args.get('token')

    if not token:
        return None

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT s.token, s.user_id, s.role, s.expires_at, u.name, u.department, u.failed_attempts
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > ?
    ''', (token, datetime.now().isoformat()))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None

def require_admin(f):
    """
    Decorator protecting administrative API routes.
    Enforces server-side role verification.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return jsonify({
                'error': 'Authentication required. Please log in.',
                'code': 'AUTH_REQUIRED'
            }), 401
        if user.get('role') != 'ADMIN':
            return jsonify({
                'error': 'Access denied. Administrator privileges required.',
                'code': 'FORBIDDEN'
            }), 403
        return f(*args, **kwargs)
    return decorated_function

# -------------------------------------------------------------
# Authentication Routes (Strict Zero Text-Input)
# -------------------------------------------------------------
@app.route('/api/auth/accounts', methods=['GET'])
def get_demo_accounts():
    """
    Returns predefined demo accounts for zero text-input dropdown population.
    Never exposes PIN hashes!
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, role, department, failed_attempts, locked_until FROM users ORDER BY role DESC, id ASC')
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Demo PIN hints for seamless hackathon testing by judges
    demo_pin_hints = {
        'STU-101': '1234',
        'STU-102': '2468',
        'STU-103': '1111',
        'STU-104': '4321',
        'ADM-01': '9876',
        'ADM-02': '8888'
    }

    students = []
    admins = []
    now = datetime.now()

    for r in rows:
        is_locked = False
        remaining_lock_seconds = 0
        if r['locked_until']:
            try:
                locked_dt = datetime.fromisoformat(r['locked_until'])
                if now < locked_dt:
                    is_locked = True
                    remaining_lock_seconds = int((locked_dt - now).total_seconds())
            except Exception:
                pass

        account_info = {
            'id': r['id'],
            'name': r['name'],
            'role': r['role'],
            'department': r['department'],
            'demo_pin_hint': demo_pin_hints.get(r['id'], '1234'),
            'is_locked': is_locked,
            'remaining_lock_seconds': remaining_lock_seconds
        }

        if r['role'] == 'ADMIN':
            admins.append(account_info)
        else:
            students.append(account_info)

    return jsonify({
        'students': students,
        'admins': admins
    })

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """
    Zero text-input authentication route.
    Accepts user_id from dropdown and numeric 4-digit PIN from on-screen keypad.
    Checks password hashes and enforces failed attempt lockouts.
    """
    data = request.get_json() or {}
    user_id = data.get('user_id')
    pin = str(data.get('pin', ''))

    if not user_id or len(pin) != 4 or not pin.isdigit():
        return jsonify({
            'error': 'Please select an account and enter a complete 4-digit numeric PIN.',
            'code': 'INVALID_FORMAT'
        }), 400

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'Selected user account not found.'}), 404

    now = datetime.now()

    # Check brute-force lockout status
    if user['locked_until']:
        try:
            locked_dt = datetime.fromisoformat(user['locked_until'])
            if now < locked_dt:
                remaining_secs = int((locked_dt - now).total_seconds())
                conn.close()
                return jsonify({
                    'error': f'Account locked due to 5 consecutive failed attempts. Try again in {remaining_secs} seconds.',
                    'code': 'ACCOUNT_LOCKED',
                    'locked': True,
                    'remaining_seconds': remaining_secs
                }), 429
            else:
                # Lockout period expired - reset
                cursor.execute('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', (user_id,))
        except Exception:
            pass

    # Verify securely hashed PIN (Never compared in plaintext!)
    if not check_password_hash(user['pin_hash'], pin):
        new_attempts = user['failed_attempts'] + 1
        locked_until_str = None
        is_locked_now = False

        if new_attempts >= 5:
            locked_until_dt = now + timedelta(minutes=5)
            locked_until_str = locked_until_dt.isoformat()
            is_locked_now = True

        cursor.execute('''
            UPDATE users 
            SET failed_attempts = ?, locked_until = ? 
            WHERE id = ?
        ''', (new_attempts, locked_until_str, user_id))
        conn.commit()
        conn.close()

        attempts_left = max(0, 5 - new_attempts)
        if is_locked_now:
            return jsonify({
                'error': 'Maximum PIN attempts exceeded. Account is now locked for 5 minutes.',
                'code': 'ACCOUNT_LOCKED',
                'locked': True,
                'remaining_seconds': 300
            }), 429
        else:
            return jsonify({
                'error': f'Invalid 4-digit PIN. {attempts_left} attempt(s) remaining before security lockout.',
                'code': 'INVALID_PIN',
                'attempts_remaining': attempts_left,
                'locked': False
            }), 401

    # Authentication successful! Reset fail counter and generate secure session
    cursor.execute('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', (user_id,))
    
    session_token = secrets.token_hex(32)
    expires_at = (now + timedelta(hours=24)).isoformat()

    cursor.execute('''
        INSERT INTO sessions (token, user_id, role, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (session_token, user['id'], user['role'], now.isoformat(), expires_at))

    conn.commit()
    conn.close()

    return jsonify({
        'status': 'success',
        'message': f'Welcome, {user["name"]}',
        'token': session_token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'role': user['role'],
            'department': user['department']
        }
    })

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    """
    Validates current session token and returns user profile.
    """
    user = get_authenticated_user()
    if not user:
        return jsonify({'error': 'No active session or session expired.'}), 401
    return jsonify({
        'authenticated': True,
        'user': {
            'id': user['user_id'],
            'name': user['name'],
            'role': user['role'],
            'department': user['department']
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """
    Terminates the active session token.
    """
    token = request.headers.get('X-Auth-Token')
    if not token and 'Authorization' in request.headers:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

    if token:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM sessions WHERE token = ?', (token,))
        conn.commit()
        conn.close()

    return jsonify({'status': 'success', 'message': 'Logged out successfully.'})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'QueueSense Backend',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/counters', methods=['GET'])
def get_counters():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM counters ORDER BY id ASC')
    counter_rows = [dict(row) for row in cursor.fetchall()]

    # Fetch recent reports for each counter to compute reliability & crowd consensus
    cursor.execute('SELECT * FROM crowd_reports ORDER BY timestamp DESC LIMIT 100')
    all_reports = [dict(row) for row in cursor.fetchall()]
    conn.close()

    result = []
    for c in counter_rows:
        counter_reports = [r for r in all_reports if r['counter_id'] == c['id']]
        reliability = compute_report_reliability(counter_reports)
        
        wait_time = calculate_waiting_time(
            c['current_queue'],
            c['service_rate'],
            c['walk_time_seconds']
        )

        # Determine crowd badge
        if c['current_queue'] <= 4:
            crowd_status = 'LOW'
        elif c['current_queue'] <= 9:
            crowd_status = 'MEDIUM'
        else:
            crowd_status = 'HIGH'

        result.append({
            **c,
            'estimated_wait_minutes': wait_time,
            'crowd_status': crowd_status,
            'reliability': reliability
        })

    return jsonify(result)

@app.route('/api/counters/<counter_id>', methods=['POST', 'PUT'])
@require_admin
def update_counter(counter_id):
    data = request.get_json() or {}
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM counters WHERE id = ?', (counter_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': 'Counter not found'}), 404

    current_queue = data.get('current_queue', existing['current_queue'])
    service_rate = data.get('service_rate', existing['service_rate'])
    food_availability = data.get('food_availability', existing['food_availability'])
    walk_time_seconds = data.get('walk_time_seconds', existing['walk_time_seconds'])
    is_active = data.get('is_active', existing['is_active'])
    now_str = datetime.now().isoformat()

    cursor.execute('''
        UPDATE counters
        SET current_queue = ?, service_rate = ?, food_availability = ?,
            walk_time_seconds = ?, is_active = ?, updated_at = ?
        WHERE id = ?
    ''', (current_queue, service_rate, food_availability, walk_time_seconds, is_active, now_str, counter_id))

    conn.commit()
    conn.close()

    return jsonify({'status': 'success', 'counter_id': counter_id})

@app.route('/api/reports', methods=['GET'])
def get_reports():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT cr.*, c.name as counter_name 
        FROM crowd_reports cr
        LEFT JOIN counters c ON cr.counter_id = c.id
        ORDER BY cr.timestamp DESC 
        LIMIT 50
    ''')
    reports = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(reports)

@app.route('/api/reports', methods=['POST'])
def add_report():
    data = request.get_json() or {}
    counter_id = data.get('counter_id')
    crowd_level = data.get('crowd_level', 'MEDIUM').upper()
    reporter_type = data.get('reporter_type', 'STUDENT') # STUDENT, TILT_SENSOR, etc.
    
    if crowd_level not in ['LOW', 'MEDIUM', 'HIGH']:
        return jsonify({'error': 'Invalid crowd level'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM counters WHERE id = ?', (counter_id,))
    counter = cursor.fetchone()
    if not counter:
        conn.close()
        return jsonify({'error': 'Counter not found'}), 404

    # Estimated queue based on reported level
    level_est = {'LOW': 3, 'MEDIUM': 7, 'HIGH': 14}
    queue_est = data.get('queue_estimate', level_est.get(crowd_level, 5))
    timestamp = datetime.now().isoformat()

    cursor.execute('''
        INSERT INTO crowd_reports (counter_id, crowd_level, queue_estimate, reporter_type, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (counter_id, crowd_level, queue_est, reporter_type, timestamp))

    # Real-time slight calibration of counter queue based on report
    alpha = 0.35 # Bayesian-like adjustment weight
    updated_queue = max(0, int(round((1 - alpha) * counter['current_queue'] + alpha * queue_est)))
    cursor.execute('UPDATE counters SET current_queue = ?, updated_at = ? WHERE id = ?', 
                   (updated_queue, timestamp, counter_id))

    # Create notification for notable change
    if crowd_level == 'HIGH' and counter['current_queue'] < 10:
        cursor.execute('''
            INSERT INTO notifications (title, message, type, timestamp, read_status)
            VALUES (?, ?, ?, ?, 0)
        ''', ('Crowd Spike Alert', f"Student report indicates HIGH congestion at {counter['name']}.", 'WARNING', timestamp))

    conn.commit()
    conn.close()

    return jsonify({
        'status': 'success',
        'message': f'Report recorded for {counter["name"]}',
        'crowd_level': crowd_level,
        'new_queue_estimate': updated_queue,
        'timestamp': timestamp
    }), 201

@app.route('/api/recommendations', methods=['GET'])
def get_smart_recommendation():
    """
    Returns the real-time recommended counter using predictive balancing principles,
    taking into account queue length, service speed, walk time, and timetable surges.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM counters WHERE is_active = 1')
    counters = [dict(row) for row in cursor.fetchall()]

    cursor.execute('SELECT * FROM timetable WHERE is_active = 1')
    timetable_periods = [dict(row) for row in cursor.fetchall()]

    cursor.execute('SELECT * FROM crowd_reports ORDER BY timestamp DESC LIMIT 50')
    recent_reports = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not counters:
        return jsonify({'error': 'No active counters available'}), 404

    breakwave = evaluate_breakwave(timetable_periods)

    # Filter out SOLD_OUT counters
    eligible = [c for c in counters if c['food_availability'] != 'SOLD_OUT']
    if not eligible:
        eligible = counters

    # Calculate score for each counter
    candidates = []
    for c in eligible:
        wait = calculate_waiting_time(c['current_queue'], c['service_rate'], c['walk_time_seconds'])
        
        # Reliability check
        c_reports = [r for r in recent_reports if r['counter_id'] == c['id']]
        rel = compute_report_reliability(c_reports)
        
        # Scoring: lower wait is better; slight penalty for low stock
        stock_penalty = 1.0 if c['food_availability'] == 'LOW_STOCK' else 0.0
        effective_score = wait + stock_penalty

        candidates.append({
            'counter': c,
            'wait_minutes': wait,
            'score': effective_score,
            'reliability': rel
        })

    candidates.sort(key=lambda x: x['score'])
    best = candidates[0]
    best_c = best['counter']

    # Reason synthesis
    reasons = []
    if best_c['current_queue'] <= 5:
        reasons.append(f"Shortest effective wait ({best['wait_minutes']} mins)")
    if best_c['service_rate'] >= 2.5:
        reasons.append(f"High-speed throughput ({best_c['service_rate']} students/min)")
    if best_c['food_availability'] == 'AVAILABLE':
        reasons.append("Full menu availability")
    if not reasons:
        reasons.append(f"Optimal balance across campus counters")

    reason_text = " • ".join(reasons)

    # Alternatives for comparison
    alternatives = []
    for cand in candidates[1:]:
        c = cand['counter']
        alternatives.append({
            'counter_id': c['id'],
            'name': c['name'],
            'wait_minutes': cand['wait_minutes'],
            'delta_minutes': round(cand['wait_minutes'] - best['wait_minutes'], 1),
            'queue_count': c['current_queue']
        })

    return jsonify({
        'recommended_counter': {
            'id': best_c['id'],
            'name': best_c['name'],
            'category': best_c['category'],
            'estimated_wait_minutes': best['wait_minutes'],
            'current_queue': best_c['current_queue'],
            'service_rate': best_c['service_rate'],
            'food_availability': best_c['food_availability'],
            'reason': reason_text,
            'confidence_pct': best['reliability']['confidence_pct'],
            'expected_congestion': 'LOW' if best['wait_minutes'] < 4 else ('MEDIUM' if best['wait_minutes'] < 8 else 'HIGH')
        },
        'breakwave_context': breakwave,
        'alternatives': alternatives,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/balancing/simulate', methods=['POST'])
def run_balancing_simulation():
    """
    POST /api/balancing/simulate
    Core Innovation Engine: Simulates incoming student load and contrasts Naive shortest-queue vs Predictive Counter Balancing.
    """
    data = request.get_json() or {}
    incoming_students = int(data.get('incoming_students', 6))
    walk_time_factor = bool(data.get('walk_time_factor', True))

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM counters WHERE is_active = 1')
    counters = [dict(row) for row in cursor.fetchall()]
    conn.close()

    simulation_result = simulate_counter_balancing(
        counters=counters,
        incoming_students=incoming_students,
        walk_time_factor=walk_time_factor
    )

    return jsonify(simulation_result)

@app.route('/api/timetable', methods=['GET'])
def get_timetable():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM timetable ORDER BY start_time ASC')
    periods = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(periods)

@app.route('/api/timetable', methods=['POST'])
@require_admin
def update_timetable():
    data = request.get_json() or {}
    period_id = data.get('id')
    period_name = data.get('period_name')
    period_type = data.get('period_type', 'CLASS')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    expected_demand_surge = float(data.get('expected_demand_surge', 1.0))
    is_active = int(data.get('is_active', 1))

    conn = get_connection()
    cursor = conn.cursor()

    if period_id:
        cursor.execute('''
            UPDATE timetable
            SET period_name = ?, period_type = ?, start_time = ?, end_time = ?,
                expected_demand_surge = ?, is_active = ?
            WHERE id = ?
        ''', (period_name, period_type, start_time, end_time, expected_demand_surge, is_active, period_id))
    else:
        cursor.execute('''
            INSERT INTO timetable (period_name, period_type, start_time, end_time, expected_demand_surge, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (period_name, period_type, start_time, end_time, expected_demand_surge, is_active))

    conn.commit()
    conn.close()

    return jsonify({'status': 'success'})

@app.route('/api/breakwave', methods=['GET'])
def get_breakwave():
    simulated_time = request.args.get('time') # e.g. "12:20"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM timetable WHERE is_active = 1')
    timetable_periods = [dict(row) for row in cursor.fetchall()]
    conn.close()

    breakwave_data = evaluate_breakwave(timetable_periods, simulated_time)
    return jsonify(breakwave_data)

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM counters')
    counters = [dict(row) for row in cursor.fetchall()]

    cursor.execute('SELECT COUNT(*) FROM crowd_reports')
    total_reports = cursor.fetchone()[0]

    cursor.execute('SELECT * FROM crowd_reports ORDER BY timestamp DESC LIMIT 100')
    reports = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Calculate overview stats
    total_queue = sum(c['current_queue'] for c in counters)
    busiest_c = max(counters, key=lambda c: c['current_queue']) if counters else None
    least_c = min(counters, key=lambda c: c['current_queue']) if counters else None
    
    avg_wait = 0
    if counters:
        waits = [calculate_waiting_time(c['current_queue'], c['service_rate'], c['walk_time_seconds']) for c in counters]
        avg_wait = round(sum(waits) / len(waits), 1)

    # Hourly mock distribution for demo charts
    hourly_trends = [
        {'time': '09:00', 'arrivals': 12, 'avg_wait': 3.2},
        {'time': '10:00', 'arrivals': 48, 'avg_wait': 8.5}, # Morning break
        {'time': '11:00', 'arrivals': 18, 'avg_wait': 4.1},
        {'time': '12:00', 'arrivals': 30, 'avg_wait': 5.8},
        {'time': '12:30', 'arrivals': 95, 'avg_wait': 14.2}, # Peak lunch
        {'time': '13:00', 'arrivals': 80, 'avg_wait': 12.0},
        {'time': '14:00', 'arrivals': 22, 'avg_wait': 3.8},
        {'time': '15:00', 'arrivals': 19, 'avg_wait': 3.5},
        {'time': '16:00', 'arrivals': 52, 'avg_wait': 7.9}, # Evening break
    ]

    return jsonify({
        'total_counters': len(counters),
        'total_current_queue': total_queue,
        'busiest_counter': busiest_c['name'] if busiest_c else 'None',
        'busiest_queue': busiest_c['current_queue'] if busiest_c else 0,
        'least_crowded_counter': least_c['name'] if least_c else 'None',
        'least_queue': least_c['current_queue'] if least_c else 0,
        'total_reports': total_reports,
        'average_wait_minutes': avg_wait,
        'counters_summary': [
            {
                'id': c['id'],
                'name': c['name'],
                'current_queue': c['current_queue'],
                'service_rate': c['service_rate'],
                'estimated_wait': calculate_waiting_time(c['current_queue'], c['service_rate'], c['walk_time_seconds']),
                'food_availability': c['food_availability']
            }
            for c in counters
        ],
        'hourly_trends': hourly_trends
    })

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 20')
    notifs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(notifs)

@app.route('/api/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE notifications SET read_status = 1')
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/demo/reset', methods=['POST'])
@require_admin
def reset_demo():
    seed_default_data(force=True)
    return jsonify({
        'status': 'success',
        'message': 'Demo data reset to initial judge baseline (Counter A: 15, B: 3, C: 5, D: 8)'
    })

@app.route('/api/demo/simulate-arrival', methods=['POST'])
@require_admin
def simulate_arrival():
    """
    Simulates real-time arrival of students for live demo responsiveness.
    """
    data = request.get_json() or {}
    counter_id = data.get('counter_id', 'counter-b')
    count = int(data.get('count', 1))

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE counters SET current_queue = current_queue + ?, updated_at = ? WHERE id = ?',
                   (count, datetime.now().isoformat(), counter_id))
    
    cursor.execute('SELECT name, current_queue FROM counters WHERE id = ?', (counter_id,))
    updated = cursor.fetchone()

    # Log in notifications
    cursor.execute('''
        INSERT INTO notifications (title, message, type, timestamp, read_status)
        VALUES (?, ?, ?, ?, 0)
    ''', ('Demo Arrival Injected', f"+{count} students arrived at {updated['name']}. Queue now {updated['current_queue']}.", 'INFO', datetime.now().isoformat()))

    conn.commit()
    conn.close()

    return jsonify({
        'status': 'success',
        'counter_id': counter_id,
        'new_queue': updated['current_queue']
    })

@app.route('/api/export/csv', methods=['GET'])
@require_admin
def export_csv():
    """
    Export congestion summaries as CSV for administrative reporting.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT cr.id, c.name as counter_name, cr.timestamp, cr.queue_estimate, cr.crowd_level, cr.reporter_type, c.service_rate
        FROM crowd_reports cr
        LEFT JOIN counters c ON cr.counter_id = c.id
        ORDER BY cr.timestamp DESC
    ''')
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Report_ID', 'Counter_Name', 'Timestamp', 'Queue_Count', 'Crowd_Level', 'Reporter_Type', 'Estimated_Wait_Minutes'])

    for r in rows:
        service_rate = r['service_rate'] or 2.0
        q_count = r['queue_estimate'] or 5
        wait_m = round(q_count / service_rate + 1.0, 1)
        writer.writerow([r['id'], r['counter_name'], r['timestamp'], q_count, r['crowd_level'], r['reporter_type'], wait_m])

    csv_data = output.getvalue()
    filename = f"queuesense_congestion_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={filename}"}
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"QueueSense Flask Backend starting on http://localhost:{port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
