import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Plus, 
  Minus, 
  Activity, 
  Coffee, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Target
} from "lucide-react";
import { Task, EisenhowerQuadrant } from "../types";
import { cn } from "../lib/utils";

interface PomodoroTimerProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  activeTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export default function PomodoroTimer({ 
  tasks, 
  onToggleTask, 
  activeTaskId, 
  onSelectTask 
}: PomodoroTimerProps) {
  const [duration, setDuration] = useState(25 * 60); // default 25 min
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "short" | "long">("focus");
  const [isMuted, setIsMuted] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(() => {
    const saved = localStorage.getItem("wrindha_pomodoro_completed");
    return saved ? parseInt(saved) : 0;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Set default times based on mode
  useEffect(() => {
    let secs = 25 * 60;
    if (mode === "short") secs = 5 * 60;
    if (mode === "long") secs = 15 * 60;
    setDuration(secs);
    setTimeLeft(secs);
    setIsRunning(false);
  }, [mode]);

  // Sync active task passed from parent
  useEffect(() => {
    if (activeTaskId) {
      // Direct focus mode engagement
      setMode("focus");
    }
  }, [activeTaskId]);

  // Timer Tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playAlarm();

    if (mode === "focus") {
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      localStorage.setItem("wrindha_pomodoro_completed", newCount.toString());
      
      // Notify parent or auto mark/prompt task completion if one is focused
      if (activeTaskId) {
        // Find focused task to check if it's already done
        const activeTask = tasks.find(t => t.id === activeTaskId);
        if (activeTask && !activeTask.completed) {
          // Play special sound to acknowledge task finished
          playTaskSuccessAlarm();
        }
      }
    }
  };

  // Synthesize Bell Ring Alarm
  const playAlarm = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Beautiful Double-Chime chord
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C5 Major chord notes
      
      chords.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (idx * 0.12));
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + (idx * 0.12) + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 2.0);
      });
    } catch (e) {
      console.warn("Web Audio API not supported/active", e);
    }
  };

  const playTaskSuccessAlarm = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Success melody: low-high
      [392.00, 523.25, 659.25, 987.77].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (idx * 0.08));
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime + (idx * 0.08));
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (idx * 0.08) + 0.5);
        
        osc.start();
        osc.stop(audioCtx.currentTime + (idx * 0.08) + 0.6);
      });
    } catch (e) {
      console.warn(e);
    }
  };

  // Format Helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Visual percentages
  const percentage = ((duration - timeLeft) / duration) * 100;
  const strokeDashoffset = 280 - (280 * percentage) / 100;

  // Selected Task
  const currentlyFocusedTask = tasks.find(t => t.id === activeTaskId);

  // Time modification controls
  const adjustTime = (deltaMinutes: number) => {
    setTimeLeft((prev) => {
      const newSecs = prev + (deltaMinutes * 60);
      return Math.max(10, Math.min(duration, newSecs));
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between tracking-tight text-gray-900 dark:text-gray-100">
      
      {/* Title & Mute Controller */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
          <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">Pomodoro Focus Timer</h3>
        </div>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-1 px-2.5 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1.5 transition-all"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5" /> Muted
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" /> Chime On
            </>
          )}
        </button>
      </div>

      {/* Modes tab selector */}
      <div className="flex bg-gray-50 dark:bg-gray-800/60 p-1 rounded-2xl mb-6">
        <button
          onClick={() => setMode("focus")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
            mode === "focus" 
              ? "bg-black dark:bg-indigo-600 text-white shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          )}
        >
          <Target className="w-3.5 h-3.5" /> Focus (25m)
        </button>
        <button
          onClick={() => setMode("short")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
            mode === "short" 
              ? "bg-green-500 text-white shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          )}
        >
          <Coffee className="w-3.5 h-3.5" /> Break (5m)
        </button>
        <button
          onClick={() => setMode("long")}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
            mode === "long" 
              ? "bg-blue-500 text-white shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          )}
        >
          <Coffee className="w-3.5 h-3.5" /> Long (15m)
        </button>
      </div>

      {/* Circle gauge and main countdown presentation */}
      <div className="flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
          
          {/* Animated pulsing background effect when active */}
          {isRunning && (
            <motion.div 
              animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.15, 0.35, 0.15] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className={cn(
                "absolute inset-0 rounded-full blur-xl",
                mode === "focus" && "bg-indigo-500",
                mode === "short" && "bg-green-500",
                mode === "long" && "bg-blue-500"
              )}
            />
          )}

          {/* SVG Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="76"
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="9"
              fill="transparent"
            />
            <motion.circle
              cx="88"
              cy="88"
              r="76"
              className={cn(
                "transition-all stroke-current",
                mode === "focus" && "text-indigo-600 dark:text-indigo-500",
                mode === "short" && "text-green-500",
                mode === "long" && "text-blue-500"
              )}
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={477}
              strokeDashoffset={477 - (477 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>

          {/* Time & Adjust controls inside ring */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-black font-mono tracking-tighter leading-none dark:text-white">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1">
              {mode === "focus" ? "focusing" : "resting"}
            </span>

            {/* Quick adjust triggers */}
            <div className="flex items-center gap-1.5 mt-2 opacity-50 hover:opacity-100 transition-opacity">
              <button 
                onClick={() => adjustTime(-1)} 
                title="Subtract 1 minute"
                className="p-1 rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button 
                onClick={() => adjustTime(1)} 
                title="Add 1 minute"
                className="p-1 rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Play Pause Reset controls under gauge */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => {
              setTimeLeft(duration);
              setIsRunning(false);
            }}
            className="p-3 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 active:scale-95 transition-all"
            title="Reset Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              "p-4 px-6 rounded-full font-bold text-sm text-white flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all",
              isRunning 
                ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/15" 
                : "bg-black dark:bg-indigo-600 hover:opacity-90 shadow-indigo-600/10"
            )}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-white" /> Pause Focus
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Start Focus
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected Task Integration */}
      <div className="mt-6 border-t border-gray-50 dark:border-gray-800 pt-5 space-y-4">
        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1 block">
          focus goal target:
        </label>
        
        {tasks.filter(t => !t.completed).length === 0 ? (
          <div className="text-center p-3 py-4 border border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/40 dark:bg-gray-950/20">
            <span className="text-xs text-gray-400 font-semibold block">All tasks completed!</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Add more items in your matrix quadrants to track.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Task selecting custom drop-down list */}
            <select
              value={activeTaskId || ""}
              onChange={(e) => onSelectTask(e.target.value ? e.target.value : null)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700/45 dark:text-white outline-none focus:ring-1 ring-indigo-500"
            >
              <option value="">-- No Specific Task Selected --</option>
              {tasks.filter(t => !t.completed).map(task => {
                let quadrantLabel = "Do First";
                if (task.quadrant === EisenhowerQuadrant.NOT_URGENT_IMPORTANT) quadrantLabel = "Schedule";
                if (task.quadrant === EisenhowerQuadrant.URGENT_NOT_IMPORTANT) quadrantLabel = "Delegate";
                if (task.quadrant === EisenhowerQuadrant.NOT_URGENT_NOT_IMPORTANT) quadrantLabel = "Eliminate";

                return (
                  <option key={task.id} value={task.id}>
                    [{quadrantLabel}] {task.title.length > 34 ? task.title.substr(0, 34) + "..." : task.title}
                  </option>
                );
              })}
            </select>

            {/* If focused, represent active state elegantly with a completion tick action directly */}
            <AnimatePresence mode="wait">
              {currentlyFocusedTask && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-indigo-50/45 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-600/20 p-4 rounded-2xl flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => {
                        onToggleTask(currentlyFocusedTask.id);
                        onSelectTask(null);
                      }}
                      className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-lg border-2 border-indigo-300 dark:border-indigo-800/80 hover:bg-indigo-500 hover:text-white transition-all text-indigo-500 shrink-0"
                      title="Done, toggle completion"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 fill-transparent" />
                    </button>
                    <div>
                      <span className="text-xs font-bold font-mono tracking-wider text-indigo-600 dark:text-indigo-400 uppercase block mb-0.5">
                        Focusing On
                      </span>
                      <p className="text-sm font-semibold dark:text-white leading-relaxed break-words">
                        {currentlyFocusedTask.title}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Pomo Streak count */}
        <div className="flex items-center justify-between bg-gray-50/60 dark:bg-gray-800/20 p-3.5 rounded-2xl text-xs">
          <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 opacity-80" /> Sessions Finished
          </span>
          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
            {sessionsCompleted} pomo{sessionsCompleted === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
