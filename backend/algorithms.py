import math
from datetime import datetime, timedelta

def calculate_waiting_time(queue_size, service_rate, walk_time_seconds=60):
    """
    Queue wait = queue_size / service_rate (minutes)
    Total wait = Queue wait + (walk_time_seconds / 60)
    """
    if service_rate <= 0:
        service_rate = 1.0
    queue_wait = queue_size / service_rate
    walk_wait = walk_time_seconds / 60.0
    return round(queue_wait + walk_wait, 1)

def simulate_counter_balancing(counters, incoming_students=6, walk_time_factor=True):
    """
    QueueSense Main Innovation: Predictive Counter Balancing Engine.
    
    Counters list:
    [{'id': 'counter-a', 'name': 'Counter A', 'current_queue': 15, 'service_rate': 1.8, 'walk_time_seconds': 75}, ...]
    
    Compares:
    1. Naive Strategy: All incoming students get recommended the counter that had the shortest queue at arrival start.
    2. Predictive Counter Balancing Strategy: Simulates arrivals sequentially, updating projected waiting times and distributing load.
    """
    if not counters:
        return {}

    # Filter out inactive or sold out counters
    eligible_counters = [c for c in counters if c.get('is_active', 1) and c.get('food_availability') != 'SOLD_OUT']
    if not eligible_counters:
        eligible_counters = counters

    # --- 1. NAIVE STRATEGY (Shortest initial queue takes all) ---
    naive_initial = sorted(eligible_counters, key=lambda c: c['current_queue'])[0]
    naive_result = {}
    for c in eligible_counters:
        is_naive_target = (c['id'] == naive_initial['id'])
        added = incoming_students if is_naive_target else 0
        final_q = c['current_queue'] + added
        wait = calculate_waiting_time(
            final_q, 
            c['service_rate'], 
            c['walk_time_seconds'] if walk_time_factor else 0
        )
        naive_result[c['id']] = {
            'id': c['id'],
            'name': c['name'],
            'initial_queue': c['current_queue'],
            'incoming_assigned': added,
            'projected_queue': final_q,
            'service_rate': c['service_rate'],
            'projected_wait_minutes': wait
        }

    # --- 2. PREDICTIVE BALANCING STRATEGY (Iterative optimization) ---
    balanced_state = {
        c['id']: {
            'id': c['id'],
            'name': c['name'],
            'initial_queue': c['current_queue'],
            'assigned_count': 0,
            'current_projected_queue': c['current_queue'],
            'service_rate': c['service_rate'],
            'walk_time_seconds': c['walk_time_seconds'] if walk_time_factor else 0,
            'food_availability': c.get('food_availability', 'AVAILABLE')
        }
        for c in eligible_counters
    }

    step_by_step = []

    for step_num in range(1, incoming_students + 1):
        # Evaluate projected wait time for each counter if this student is added
        best_counter_id = None
        min_projected_wait = float('inf')
        evaluated_candidates = []

        for cid, data in balanced_state.items():
            test_queue = data['current_projected_queue'] + 1
            wait = calculate_waiting_time(test_queue, data['service_rate'], data['walk_time_seconds'])
            
            # Stock availability penalty
            stock_penalty = 0.5 if data['food_availability'] == 'LOW_STOCK' else 0.0
            score = wait + stock_penalty

            evaluated_candidates.append({
                'counter_id': cid,
                'name': data['name'],
                'test_queue': test_queue,
                'projected_wait': round(score, 1)
            })

            if score < min_projected_wait:
                min_projected_wait = score
                best_counter_id = cid

        # Assign to best candidate
        chosen = balanced_state[best_counter_id]
        chosen['assigned_count'] += 1
        chosen['current_projected_queue'] += 1

        step_by_step.append({
            'step': step_num,
            'assigned_to_id': best_counter_id,
            'assigned_to_name': chosen['name'],
            'reason': f"Lowest projected wait ({round(min_projected_wait, 1)} min) including throughput capacity",
            'candidates_evaluated': evaluated_candidates,
            'new_projected_queue': chosen['current_projected_queue']
        })

    # Prepare final balanced outcome
    balanced_result = {}
    for cid, data in balanced_state.items():
        wait = calculate_waiting_time(
            data['current_projected_queue'], 
            data['service_rate'], 
            data['walk_time_seconds']
        )
        balanced_result[cid] = {
            'id': cid,
            'name': data['name'],
            'initial_queue': data['initial_queue'],
            'incoming_assigned': data['assigned_count'],
            'projected_queue': data['current_projected_queue'],
            'service_rate': data['service_rate'],
            'walk_time_seconds': data['walk_time_seconds'],
            'projected_wait_minutes': wait
        }

    # Calculate arrival-specific metrics (the wait times experienced by the new students)
    # Under Naive: arrivals 1..N queued consecutively at naive_initial counter
    naive_target_service_rate = naive_initial['service_rate']
    naive_arrival_waits = [
        calculate_waiting_time(naive_initial['current_queue'] + step, naive_target_service_rate, naive_initial['walk_time_seconds'] if walk_time_factor else 0)
        for step in range(1, incoming_students + 1)
    ]
    naive_incoming_avg_wait = sum(naive_arrival_waits) / len(naive_arrival_waits) if naive_arrival_waits else 0
    naive_incoming_max_wait = max(naive_arrival_waits) if naive_arrival_waits else 0

    # Under Predictive Balanced: each arrival was assigned to the optimal counter at that moment
    balanced_arrival_waits = []
    for step_data in step_by_step:
        c_info = balanced_result[step_data['assigned_to_id']]
        # queue position was step_data['new_projected_queue']
        w = calculate_waiting_time(step_data['new_projected_queue'], c_info['service_rate'], c_info.get('walk_time_seconds', 60))
        balanced_arrival_waits.append(w)
    
    balanced_incoming_avg_wait = sum(balanced_arrival_waits) / len(balanced_arrival_waits) if balanced_arrival_waits else 0
    balanced_incoming_max_wait = max(balanced_arrival_waits) if balanced_arrival_waits else 0

    incoming_wait_savings_pct = 0.0
    if naive_incoming_max_wait > 0:
        incoming_wait_savings_pct = round(((naive_incoming_max_wait - balanced_incoming_max_wait) / naive_incoming_max_wait) * 100, 1)

    naive_max_wait = max(r['projected_wait_minutes'] for r in naive_result.values())
    naive_avg_wait = sum(r['projected_wait_minutes'] for r in naive_result.values()) / len(naive_result)

    balanced_max_wait = max(r['projected_wait_minutes'] for r in balanced_result.values())
    balanced_avg_wait = sum(r['projected_wait_minutes'] for r in balanced_result.values()) / len(balanced_result)

    # Queue standard deviation (measure of balance across counters)
    naive_queues = [r['projected_queue'] for r in naive_result.values()]
    balanced_queues = [r['projected_queue'] for r in balanced_result.values()]
    
    def std_dev(lst):
        if not lst:
            return 0.0
        mean = sum(lst) / len(lst)
        return math.sqrt(sum((x - mean) ** 2 for x in lst) / len(lst))

    naive_target_surge_pct = round((incoming_students / max(1, naive_initial['current_queue'])) * 100, 1)

    return {
        'incoming_students': incoming_students,
        'naive': {
            'target_counter_id': naive_initial['id'],
            'target_counter_name': naive_initial['name'],
            'counters': naive_result,
            'max_wait_minutes': round(naive_max_wait, 1),
            'avg_wait_minutes': round(naive_avg_wait, 1),
            'incoming_max_wait': round(naive_incoming_max_wait, 1),
            'incoming_avg_wait': round(naive_incoming_avg_wait, 1),
            'queue_std_dev': round(std_dev(naive_queues), 2),
            'target_surge_pct': naive_target_surge_pct
        },
        'predictive_balanced': {
            'counters': balanced_result,
            'max_wait_minutes': round(balanced_max_wait, 1),
            'avg_wait_minutes': round(balanced_avg_wait, 1),
            'incoming_max_wait': round(balanced_incoming_max_wait, 1),
            'incoming_avg_wait': round(balanced_incoming_avg_wait, 1),
            'queue_std_dev': round(std_dev(balanced_queues), 2),
            'steps': step_by_step
        },
        'metrics': {
            'incoming_wait_reduction_pct': incoming_wait_savings_pct,
            'peak_incoming_wait_saved_mins': round(max(0, naive_incoming_max_wait - balanced_incoming_max_wait), 1),
            'bottleneck_prevented': True if (naive_target_surge_pct >= 50 or incoming_wait_savings_pct >= 5) else False,
            'naive_target_spike_prevented': f"{naive_target_surge_pct}% sudden queue surge on {naive_initial['name']} averted",
            'balance_improvement_score': round(max(0, std_dev(naive_queues) - std_dev(balanced_queues)), 2)
        }
    }


def compute_report_reliability(reports_for_counter):
    """
    Section 8: Report Reliability and Expiry Engine.
    - Decays reports over time.
    - Fresh reports (<5 mins): Weight 1.0
    - Decaying reports (5-15 mins): Weight 0.9 -> 0.5
    - Stale reports (15-30 mins): Weight 0.5 -> 0.1
    - Expired (>30 mins): Weight 0.0
    - Consensus & Agreement percentage
    """
    now = datetime.now()
    weighted_sum = 0.0
    total_weight = 0.0
    active_reports = []
    level_map = {'LOW': 1.0, 'MEDIUM': 2.0, 'HIGH': 3.0}
    reverse_level_map = {1: 'LOW', 2: 'MEDIUM', 3: 'HIGH'}

    for r in reports_for_counter:
        try:
            r_time = datetime.fromisoformat(r['timestamp'])
        except Exception:
            continue
        
        age_minutes = (now - r_time).total_seconds() / 60.0
        
        if age_minutes < 0:
            age_minutes = 0.1

        # Exponential / piecewise time decay
        if age_minutes <= 5.0:
            weight = 1.0
            status = 'FRESH'
        elif age_minutes <= 15.0:
            weight = max(0.5, 1.0 - 0.05 * (age_minutes - 5.0))
            status = 'ACTIVE'
        elif age_minutes <= 30.0:
            weight = max(0.1, 0.5 - 0.026 * (age_minutes - 15.0))
            status = 'DECAYING'
        else:
            weight = 0.0
            status = 'EXPIRED'

        val = level_map.get(r['crowd_level'], 2.0)
        
        if weight > 0:
            weighted_sum += val * weight
            total_weight += weight
            active_reports.append({
                'id': r['id'],
                'crowd_level': r['crowd_level'],
                'age_minutes': round(age_minutes, 1),
                'weight': round(weight, 2),
                'status': status,
                'reporter_type': r.get('reporter_type', 'STUDENT')
            })

    if total_weight == 0 or not active_reports:
        return {
            'consensus_level': 'MEDIUM',
            'consensus_score': 2.0,
            'confidence_pct': 45, # Baseline default
            'active_report_count': 0,
            'agreement_pct': 50,
            'reliability_status': 'NO_RECENT_REPORTS',
            'details': 'No crowd reports in the last 30 minutes. Fallback to counter sensor/schedule estimate.'
        }

    consensus_numeric = weighted_sum / total_weight
    rounded_level_int = max(1, min(3, int(round(consensus_numeric))))
    consensus_level = reverse_level_map[rounded_level_int]

    # Calculate agreement ratio: fraction of active reports matching consensus
    agreeing_reports = [r for r in active_reports if level_map[r['crowd_level']] == rounded_level_int]
    agreement_pct = round((len(agreeing_reports) / len(active_reports)) * 100)

    # Confidence score calculation: function of total weight, volume of reports, and consensus agreement
    volume_factor = min(1.0, total_weight / 3.0)  # Reaches 1.0 with ~3-4 fresh reports
    confidence_pct = round((volume_factor * 0.6 + (agreement_pct / 100.0) * 0.4) * 100)
    confidence_pct = max(35, min(98, confidence_pct))

    return {
        'consensus_level': consensus_level,
        'consensus_score': round(consensus_numeric, 2),
        'confidence_pct': confidence_pct,
        'active_report_count': len(active_reports),
        'agreement_pct': agreement_pct,
        'reliability_status': 'HIGH_CONFIDENCE' if confidence_pct >= 75 else ('MODERATE' if confidence_pct >= 55 else 'LOW_CONFIDENCE'),
        'details': f"Derived from {len(active_reports)} weighted reports within 30 min. Agreement: {agreement_pct}%."
    }


def evaluate_breakwave(timetable_periods, simulated_time_str=None):
    """
    Section 7: College Timetable Intelligence & BreakWave Demand Prediction.
    Evaluates upcoming class periods, breaks, and demand surges.
    """
    if simulated_time_str:
        try:
            curr_time = datetime.strptime(simulated_time_str, "%H:%M").time()
        except Exception:
            curr_time = datetime.now().time()
    else:
        curr_time = datetime.now().time()

    curr_minutes = curr_time.hour * 60 + curr_time.minute

    current_period = None
    next_period = None
    minutes_to_next = float('inf')

    # Convert periods to minutes
    parsed_periods = []
    for p in timetable_periods:
        if not p.get('is_active', 1):
            continue
        try:
            s_h, s_m = map(int, p['start_time'].split(':'))
            e_h, e_m = map(int, p['end_time'].split(':'))
            s_min = s_h * 60 + s_m
            e_min = e_h * 60 + e_m
            parsed_periods.append({
                **p,
                's_min': s_min,
                'e_min': e_min
            })
        except Exception:
            continue

    # Sort chronologically
    parsed_periods.sort(key=lambda x: x['s_min'])

    for p in parsed_periods:
        if p['s_min'] <= curr_minutes <= p['e_min']:
            current_period = p
        elif p['s_min'] > curr_minutes:
            diff = p['s_min'] - curr_minutes
            if diff < minutes_to_next:
                minutes_to_next = diff
                next_period = p

    # BreakWave forecasting logic
    wave_status = "STABLE"
    predicted_surge_multiplier = 1.0
    forecast_message = "Normal academic hour traffic. Queues steady."

    if current_period:
        if current_period['period_type'] == 'LUNCH_BREAK':
            wave_status = "PEAK_LUNCH_WAVE"
            predicted_surge_multiplier = current_period.get('expected_demand_surge', 4.5)
            forecast_message = "Active Lunch Break! High congestion expected across primary counters. Counter balancing active."
        elif current_period['period_type'] == 'SHORT_BREAK':
            wave_status = "SHORT_BREAK_SURGE"
            predicted_surge_multiplier = current_period.get('expected_demand_surge', 2.8)
            forecast_message = "Short Break active. Quick grab-and-go counters experiencing sudden spike."
        else:
            # In class period: check if next period is imminent
            if next_period and minutes_to_next <= 20:
                wave_status = "INCOMING_WAVE_ALERT"
                predicted_surge_multiplier = next_period.get('expected_demand_surge', 2.5)
                forecast_message = f"BreakWave Warning: {next_period['period_name']} starts in {minutes_to_next} mins! Expected arrival wave of ~{int(predicted_surge_multiplier * 12)} students."
    elif next_period:
        forecast_message = f"Next period: {next_period['period_name']} at {next_period['start_time']}."

    return {
        'current_time': curr_time.strftime("%H:%M"),
        'current_period': current_period,
        'next_period': next_period,
        'minutes_to_next': minutes_to_next if next_period else None,
        'wave_status': wave_status,
        'surge_multiplier': round(predicted_surge_multiplier, 1),
        'forecast_message': forecast_message,
        'predicted_incoming_students': int(predicted_surge_multiplier * 6)
    }
