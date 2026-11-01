import sqlite3
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'queuesense.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Counters table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS counters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            current_queue INTEGER NOT NULL DEFAULT 0,
            service_rate REAL NOT NULL DEFAULT 2.0,
            food_availability TEXT NOT NULL DEFAULT 'AVAILABLE',
            walk_time_seconds INTEGER NOT NULL DEFAULT 60,
            is_active INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL
        )
    ''')

    # 2. Crowd reports table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crowd_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            counter_id TEXT NOT NULL,
            crowd_level TEXT NOT NULL,
            queue_estimate INTEGER,
            reporter_type TEXT NOT NULL DEFAULT 'STUDENT',
            timestamp TEXT NOT NULL,
            FOREIGN KEY (counter_id) REFERENCES counters (id)
        )
    ''')

    # 3. Timetable table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timetable (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_name TEXT NOT NULL,
            period_type TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            expected_demand_surge REAL NOT NULL DEFAULT 1.0,
            is_active INTEGER NOT NULL DEFAULT 1
        )
    ''')

    # 4. Recommendation history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recommended_counter_id TEXT NOT NULL,
            assigned_reason TEXT NOT NULL,
            projected_wait_minutes REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')

    # 5. Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'INFO',
            timestamp TEXT NOT NULL,
            read_status INTEGER NOT NULL DEFAULT 0
        )
    ''')

    # 6. Users table for Text-Input-Free Authentication
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            pin_hash TEXT NOT NULL,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # 7. Sessions table for Token-based Session Management
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()

def seed_default_data(force=False):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM counters')
    counter_count = cursor.fetchone()[0]

    if counter_count == 0 or force:
        if force:
            cursor.execute('DELETE FROM counters')
            cursor.execute('DELETE FROM crowd_reports')
            cursor.execute('DELETE FROM timetable')
            cursor.execute('DELETE FROM recommendation_history')
            cursor.execute('DELETE FROM notifications')
            cursor.execute('DELETE FROM users')
            cursor.execute('DELETE FROM sessions')

        now = datetime.now()
        now_str = now.isoformat()

        # Seed sample counters with the official master prompt initial condition:
        # Counter A: 15 students
        # Counter B: 3 students
        # Counter C: 5 students
        # Plus Counter D: Express Bakery / Coffee for additional variety
        counters_data = [
            ('counter-a', 'Counter A', 'Main Meals & Thali', 15, 1.8, 'AVAILABLE', 75, 1, now_str),
            ('counter-b', 'Counter B', 'Snacks & Quick Bites', 3, 2.5, 'AVAILABLE', 45, 1, now_str),
            ('counter-c', 'Counter C', 'Fresh Juices & Healthy Bowls', 5, 2.0, 'AVAILABLE', 60, 1, now_str),
            ('counter-d', 'Counter D', 'Express Coffee & Bakery', 8, 3.2, 'LOW_STOCK', 30, 1, now_str),
        ]

        cursor.executemany('''
            INSERT INTO counters (id, name, category, current_queue, service_rate, food_availability, walk_time_seconds, is_active, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', counters_data)

        # Seed realistic recent crowd reports with varying timestamps (some fresh, some decayed)
        reports_data = [
            ('counter-a', 'HIGH', 15, 'STUDENT', (now - timedelta(minutes=2)).isoformat()),
            ('counter-a', 'HIGH', 14, 'STUDENT', (now - timedelta(minutes=6)).isoformat()),
            ('counter-a', 'MEDIUM', 12, 'TILT_SENSOR', (now - timedelta(minutes=14)).isoformat()),
            ('counter-b', 'LOW', 3, 'STUDENT', (now - timedelta(minutes=3)).isoformat()),
            ('counter-b', 'LOW', 2, 'TILT_SENSOR', (now - timedelta(minutes=8)).isoformat()),
            ('counter-b', 'LOW', 4, 'STUDENT', (now - timedelta(minutes=18)).isoformat()),
            ('counter-c', 'MEDIUM', 5, 'STUDENT', (now - timedelta(minutes=4)).isoformat()),
            ('counter-c', 'MEDIUM', 6, 'STUDENT', (now - timedelta(minutes=11)).isoformat()),
            ('counter-c', 'LOW', 4, 'STUDENT', (now - timedelta(minutes=25)).isoformat()),
            ('counter-d', 'MEDIUM', 8, 'STUDENT', (now - timedelta(minutes=5)).isoformat()),
        ]

        cursor.executemany('''
            INSERT INTO crowd_reports (counter_id, crowd_level, queue_estimate, reporter_type, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', reports_data)

        # Seed standard college timetable slots as required in prompt
        # 09:00-10:00 Class, 10:00-10:15 Short Break, 10:15-12:30 Class, 12:30-13:15 Lunch Break, 13:15-16:00 Class
        timetable_data = [
            ('Morning Lecture 1', 'CLASS', '09:00', '10:00', 1.0, 1),
            ('Morning Short Break', 'SHORT_BREAK', '10:00', '10:15', 2.8, 1),
            ('Mid-Day Lectures', 'CLASS', '10:15', '12:30', 1.0, 1),
            ('Campus Lunch Break', 'LUNCH_BREAK', '12:30', '13:15', 4.5, 1),
            ('Afternoon Labs & Classes', 'CLASS', '13:15', '16:00', 1.2, 1),
            ('Evening Tea / Wrap-Up', 'SHORT_BREAK', '16:00', '16:30', 2.0, 1),
        ]

        cursor.executemany('''
            INSERT INTO timetable (period_name, period_type, start_time, end_time, expected_demand_surge, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', timetable_data)

        # Seed initial smart notifications
        notifications_data = [
            ('BreakWave Alert', 'Upcoming Lunch Break at 12:30 PM. Surge of ~60 students anticipated.', 'WARNING', (now - timedelta(minutes=10)).isoformat(), 0),
            ('Counter Balancing', 'Counter B currently has optimal throughput. Recommended for fastest service.', 'SUCCESS', (now - timedelta(minutes=5)).isoformat(), 0),
            ('Stock Notice', 'Counter D Express Coffee has Low Stock on bakery items.', 'INFO', (now - timedelta(minutes=15)).isoformat(), 1),
            ('Congestion Warning', 'Counter A experiencing heavy demand (15 in queue). Consider Counter B or C.', 'ALERT', (now - timedelta(minutes=2)).isoformat(), 0),
        ]

        cursor.executemany('''
            INSERT INTO notifications (title, message, type, timestamp, read_status)
            VALUES (?, ?, ?, ?, ?)
        ''', notifications_data)

        # Seed pre-configured student and admin accounts with securely hashed PINs
        # (Zero plaintext PINs stored!)
        users_data = [
            ('STU-101', 'Alex Rivera', 'STUDENT', 'Computer Science & Eng', generate_password_hash('1234'), 0, None, now_str),
            ('STU-102', 'Priya Sharma', 'STUDENT', 'Electronics & Comm', generate_password_hash('2468'), 0, None, now_str),
            ('STU-103', 'Jordan Lee', 'STUDENT', 'Mechanical Engineering', generate_password_hash('1111'), 0, None, now_str),
            ('STU-104', 'Amina Yusuf', 'STUDENT', 'Biotechnology', generate_password_hash('4321'), 0, None, now_str),
            ('ADM-01', 'Dr. Robert Vance', 'ADMIN', 'Canteen Director & Operations', generate_password_hash('9876'), 0, None, now_str),
            ('ADM-02', 'Sarah Connor', 'ADMIN', 'Campus Logistics Supervisor', generate_password_hash('8888'), 0, None, now_str),
        ]

        cursor.executemany('''
            INSERT INTO users (id, name, role, department, pin_hash, failed_attempts, locked_until, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', users_data)

        conn.commit()

    conn.close()

if __name__ == '__main__':
    init_db()
    seed_default_data(force=True)
    print("Database initialized and seeded successfully.")

