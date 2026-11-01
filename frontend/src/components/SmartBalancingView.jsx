import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  ArrowRight, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  Info,
  Clock,
  Users,
  ShieldCheck,
  Zap,
  BarChart2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { runBalancingSimulation } from '../services/api';
import { triggerVibration, VIBRATION_PATTERNS } from '../services/vibration';

export default function SmartBalancingView({ counters, onRefreshCounters }) {
  const [incomingStudents, setIncomingStudents] = useState(6);
  const [walkTimeFactor, setWalkTimeFactor] = useState(true);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlayingSteps, setIsPlayingSteps] = useState(false);

  // Run simulation on mount or parameters change
  const executeSimulation = async (count = incomingStudents) => {
    setLoading(true);
    try {
      const result = await runBalancingSimulation(count, walkTimeFactor);
      setSimData(result);
      setCurrentStepIndex(result.predictive_balanced?.steps?.length || 0);

      // Trigger celebration if bottleneck prevented
      if (result.metrics?.bottleneck_prevented) {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 }
        });
        triggerVibration(VIBRATION_PATTERNS.BETTER_COUNTER_FOUND);
      }
    } catch (err) {
      console.error('Balancing simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSimulation(incomingStudents);
  }, [walkTimeFactor]);

  // Step-by-step playback timer
  useEffect(() => {
    let interval;
    if (isPlayingSteps && simData?.predictive_balanced?.steps) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= simData.predictive_balanced.steps.length) {
            setIsPlayingSteps(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isPlayingSteps, simData]);

  const handlePresetArrivals = (num) => {
    setIncomingStudents(num);
    executeSimulation(num);
  };

  // Helper to compute intermediate queue at currentStepIndex
  const getSimulatedQueueAtStep = (counterId, stepIdx) => {
    if (!simData?.predictive_balanced?.steps) return counters.find(c => c.id === counterId)?.current_queue || 0;
    const initial = simData.predictive_balanced.counters[counterId]?.initial_queue || 0;
    const assignedSoFar = simData.predictive_balanced.steps
      .slice(0, stepIdx)
      .filter(s => s.assigned_to_id === counterId).length;
    return initial + assignedSoFar;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Hero Problem Statement & Innovation Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>The Core QueueSense Innovation</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Predictive Counter Balancing Engine
          </h1>

          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Standard queue apps always recommend the shortest queue (<strong className="text-amber-300">Counter B</strong>). But when all students follow that advice simultaneously, Counter B immediately cascades into a <em>stampede bottleneck</em>. QueueSense simulates future arrival effects in real-time and balances demand across the entire campus.
          </p>
        </div>

        {/* Interactive Simulation Control Bar (Strictly Zero Text-Input) */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Sliders & Presets (Zero text input) */}
          <div className="md:col-span-8 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">
                Simulated Incoming Student Arrivals:
              </span>
              <span className="text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                {incomingStudents} arrivals
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={incomingStudents}
                onChange={(e) => setIncomingStudents(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {[3, 6, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePresetArrivals(num)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition ${
                    incomingStudents === num
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  +{num} arrivals
                </button>
              ))}

              <div className="ml-auto flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">Walk Time:</span>
                <button
                  type="button"
                  onClick={() => setWalkTimeFactor(!walkTimeFactor)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition ${
                    walkTimeFactor ? 'bg-emerald-900/60 text-emerald-300 border-emerald-600' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {walkTimeFactor ? 'Included (+walk)' : 'Queue only'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Trigger Button: RUN SMART BALANCING */}
          <div className="md:col-span-4 flex flex-col justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => executeSimulation(incomingStudents)}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-sm font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{loading ? 'CALCULATING DYNAMICS...' : 'RUN SMART BALANCING'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Results: Naive vs Predictive Side-by-Side Comparison */}
      {simData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: Naive Strategy (The Fatal Flaw of Traditional Systems) */}
          <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-rose-500 text-white text-[11px] font-bold px-3 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              <span>Naive Shortest-Queue</span>
            </div>

            <div>
              <div className="pr-32">
                <h3 className="text-lg font-bold text-slate-900">
                  Without QueueSense
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  Static Shortest-Queue Herd Effect
                </p>
              </div>

              <div className="mt-4 p-3 bg-rose-50/80 border border-rose-100 rounded-2xl text-xs text-rose-800 space-y-1">
                <p className="font-semibold flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1.5 flex-shrink-0" />
                  Critical Bottleneck Triggered!
                </p>
                <p className="text-[11px] text-rose-700 leading-snug">
                  All {simData.incoming_students} incoming students were blindly directed to <strong>{simData.naive.target_counter_name}</strong> because it had only 3 students at the start.
                </p>
              </div>

              {/* Counter Queue Distributions */}
              <div className="mt-5 space-y-3">
                {Object.values(simData.naive.counters).map((c) => {
                  const isVictim = c.id === simData.naive.target_counter_id;
                  return (
                    <div 
                      key={c.id} 
                      className={`p-3 rounded-xl border transition ${
                        isVictim ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500">
                            {c.initial_queue} init + <strong className={isVictim ? 'text-rose-600 font-bold' : 'text-slate-700'}>{c.incoming_assigned} new</strong>
                          </span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            = {c.projected_queue} queue
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2 text-[11px]">
                        <span className="text-slate-500">
                          Throughput: {c.service_rate} std/min
                        </span>
                        <span className={`font-bold ${isVictim ? 'text-rose-700' : 'text-slate-700'}`}>
                          Wait: {c.projected_wait_minutes} mins
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <div 
                          className={`h-full ${isVictim ? 'bg-rose-500' : 'bg-slate-400'}`} 
                          style={{ width: `${Math.min(100, (c.projected_queue / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Summary for Naive */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Peak Student Wait</span>
                <span className="text-xl font-black text-rose-800">{simData.naive.incoming_max_wait} mins</span>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Queue Imbalance (σ)</span>
                <span className="text-xl font-bold text-slate-700">{simData.naive.queue_std_dev}</span>
              </div>
            </div>

          </div>


          {/* RIGHT: Predictive Balanced Strategy (QueueSense) */}
          <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-md p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>QueueSense Predictive Balancer</span>
            </div>

            <div>
              <div className="pr-36">
                <h3 className="text-lg font-bold text-slate-900">
                  With QueueSense
                </h3>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Dynamic Demand Routing
                </p>
              </div>

              <div className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-1">
                <p className="font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5 flex-shrink-0" />
                  Smooth Balanced Distribution
                </p>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  Incoming students were distributed dynamically across high-throughput counters as waiting times shifted.
                </p>
              </div>

              {/* Counter Queue Distributions */}
              <div className="mt-5 space-y-3">
                {Object.values(simData.predictive_balanced.counters).map((c) => {
                  return (
                    <div 
                      key={c.id} 
                      className="p-3 rounded-xl border bg-emerald-50/30 border-emerald-200/80 transition"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500">
                            {c.initial_queue} init + <strong className="text-emerald-700 font-bold">+{c.incoming_assigned} balanced</strong>
                          </span>
                          <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            = {c.projected_queue} queue
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2 text-[11px]">
                        <span className="text-slate-500">
                          Throughput: {c.service_rate} std/min
                        </span>
                        <span className="font-bold text-emerald-800">
                          Wait: {c.projected_wait_minutes} mins
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-emerald-600 transition-all duration-300" 
                          style={{ width: `${Math.min(100, (c.projected_queue / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Summary for Balanced */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Peak Student Wait</span>
                <span className="text-xl font-black text-emerald-800">{simData.predictive_balanced.incoming_max_wait} mins</span>
              </div>
              <div className="p-2.5 bg-emerald-100/60 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Wait Improvement</span>
                <span className="text-xl font-black text-emerald-800">
                  {simData.metrics.incoming_wait_reduction_pct > 0 ? `-${simData.metrics.incoming_wait_reduction_pct}%` : 'Balanced'}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Step-by-Step Interactive Arrival Simulator */}
      {simData?.predictive_balanced?.steps && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
                <Users className="w-3.5 h-3.5" />
                <span>Step-by-Step Arrival Trace</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Simulated Arrival Sequencing ({simData.predictive_balanced.steps.length} Decisions)
              </h3>
            </div>

            {/* Play / Step Buttons (Strictly zero text input) */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentStepIndex(0);
                  setIsPlayingSteps(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Animation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlayingSteps(false);
                  setCurrentStepIndex(0);
                }}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                title="Rewind"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 px-2">
                Step {currentStepIndex} of {simData.predictive_balanced.steps.length}
              </span>
            </div>
          </div>

          {/* Stepper slider */}
          <div className="py-4">
            <input
              type="range"
              min="0"
              max={simData.predictive_balanced.steps.length}
              value={currentStepIndex}
              onChange={(e) => {
                setIsPlayingSteps(false);
                setCurrentStepIndex(Number(e.target.value));
              }}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Live Step Explanation Card */}
          {currentStepIndex > 0 ? (
            (() => {
              const activeStep = simData.predictive_balanced.steps[currentStepIndex - 1];
              return (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-queue-drop">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                      Arrival #{activeStep.step}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Assigned to <span className="text-emerald-700">{activeStep.assigned_to_name}</span>
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 font-medium">
                    <strong>Balancing Logic:</strong> {activeStep.reason}. New projected queue at {activeStep.assigned_to_name} is {activeStep.new_projected_queue}.
                  </p>

                  {/* Candidate wait evaluations at this step */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeStep.candidates_evaluated.map((c, i) => (
                      <div 
                        key={i} 
                        className={`p-2 rounded-lg text-center text-xs border ${
                          c.counter_id === activeStep.assigned_to_id 
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' 
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="block text-[11px] font-semibold">{c.name}</span>
                        <span className="text-[10px] text-slate-500">Wait: {c.projected_wait}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
              Press "Play Animation" or drag slider to watch the algorithm allocate students one-by-one.
            </div>
          )}

        </div>
      )}

    </div>
  );
}

