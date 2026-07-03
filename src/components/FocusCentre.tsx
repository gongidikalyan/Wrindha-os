import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Target, 
  Compass, 
  Music, 
  History, 
  BarChart3, 
  Brain, 
  Check, 
  Trash2, 
  TrendingUp, 
  Zap, 
  BookOpen, 
  Award, 
  Sliders, 
  Eye, 
  EyeOff, 
  ChevronRight,
  ChevronLeft,
  Flame,
  Volume1,
  ListTodo
} from "lucide-react";
import { Task, StudyCourse, StudySession } from "../types";
import { cn } from "../lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

// ============================================================================
// WEB AUDIO API SOUND GENERATOR (Self-Contained Synthesizer)
// ============================================================================
class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private nodes: { [key: string]: { source: AudioScheduledSourceNode; gain: GainNode } } = {};
  private volumes: { [key: string]: number } = {
    rain: 0.4,
    waves: 0.4,
    beats: 0.25,
    white: 0.3,
  };

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setVolume(sound: string, volume: number) {
    this.volumes[sound] = volume;
    if (this.nodes[sound]) {
      this.nodes[sound].gain.gain.setValueAtTime(volume, this.ctx!.currentTime);
    }
  }

  getVolume(sound: string) {
    return this.volumes[sound] ?? 0.5;
  }

  isPlaying(sound: string) {
    return !!this.nodes[sound];
  }

  toggleSound(sound: string) {
    this.initCtx();
    if (!this.ctx) return false;

    if (this.nodes[sound]) {
      try {
        this.nodes[sound].source.stop();
      } catch (e) {}
      delete this.nodes[sound];
      return false;
    } else {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volumes[sound], this.ctx.currentTime);
      gain.connect(this.ctx.destination);

      let source: AudioScheduledSourceNode;

      if (sound === "white") {
        source = this.createNoise("white");
      } else if (sound === "rain") {
        source = this.createNoise("brown");
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(900, this.ctx.currentTime);
        source.connect(filter);
        filter.connect(gain);
      } else if (sound === "waves") {
        source = this.createNoise("pink");
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);

        // Modulate waves (LFO swell)
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // slow wave cycles
        lfoGain.gain.setValueAtTime(350, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        source.connect(filter);
        filter.connect(gain);

        lfo.start();
      } else if (sound === "beats") {
        // Binaural Beats Focus Wave (Theta wave, 6Hz difference)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        
        osc1.frequency.setValueAtTime(160, this.ctx.currentTime); 
        osc2.frequency.setValueAtTime(166, this.ctx.currentTime); 

        osc1.type = "sine";
        osc2.type = "sine";

        const panner1 = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        const panner2 = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        if (panner1 && panner2) {
          panner1.pan.setValueAtTime(-1, this.ctx.currentTime);
          panner2.pan.setValueAtTime(1, this.ctx.currentTime);
          osc1.connect(panner1).connect(gain);
          osc2.connect(panner2).connect(gain);
        } else {
          osc1.connect(gain);
          osc2.connect(gain);
        }

        osc1.start();
        osc2.start();

        const customSource = {
          stop: () => {
            osc1.stop();
            osc2.stop();
          }
        } as any;
        this.nodes[sound] = { source: customSource, gain };
        return true;
      } else {
        return false;
      }

      source!.connect(gain);
      source!.start();
      this.nodes[sound] = { source, gain };
      return true;
    }
  }

  stopAll() {
    Object.keys(this.nodes).forEach(sound => {
      try {
        this.nodes[sound].source.stop();
      } catch (e) {}
    });
    this.nodes = {};
  }

  private createNoise(type: "white" | "pink" | "brown"): AudioBufferSourceNode {
    const bufferSize = 2 * this.ctx!.sampleRate;
    const noiseBuffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "white") {
        output[i] = white;
      } else if (type === "brown") {
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      } else if (type === "pink") {
        output[i] = (lastOut + (0.12 * white)) / 1.12;
        lastOut = output[i];
        output[i] *= 2.5;
      }
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    return noise;
  }
}

// Global audio generator engine singleton instance
const audioEngine = new AmbientSoundEngine();

// ============================================================================
// FOCUS INTERFACES
// ============================================================================
export interface FocusSession {
  id: string;
  type: "pomodoro" | "deep_work" | "stopwatch";
  durationMinutes: number;
  sessionDate: string; // YYYY-MM-DD
  taskTitle?: string;
  courseName?: string;
  category: string; // Study, Work, Health, Personal, General
  notes?: string;
  rating?: number; // 1-5 score
  completedAt: string; // full ISO
}

interface FocusCentreProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  courses: StudyCourse[];
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  theme: "light" | "dark";
  setActiveTab: (t: string) => void;
  preselectedTaskId?: string | null;
  preselectedCourseId?: string | null;
  onClearPreselected?: () => void;
}

export default function FocusCentre({
  tasks,
  onToggleTask,
  courses,
  studySessions,
  setStudySessions,
  theme,
  setActiveTab,
  preselectedTaskId,
  preselectedCourseId,
  onClearPreselected
}: FocusCentreProps) {
  const [activeTabSub, setActiveTabSub] = useState<"timer" | "sounds" | "history" | "analytics">("timer");
  const [timerMode, setTimerMode] = useState<"pomodoro" | "deep_work" | "stopwatch">("pomodoro");
  
  // Custom Timer Settings
  const [customFocusMin, setCustomFocusMin] = useState(25);
  const [customShortMin, setCustomShortMin] = useState(5);
  const [customLongMin, setCustomLongMin] = useState(15);

  // Core Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomoCycle, setPomoCycle] = useState<"focus" | "short" | "long">("focus");

  // Stopwatch States
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchLaps, setStopwatchLaps] = useState<number[]>([]);
  const lastStopwatchTick = useRef<number | null>(null);

  // Targets linking
  const [linkedTaskId, setLinkedTaskId] = useState<string>("");
  const [linkedCourseId, setLinkedCourseId] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("General");
  const [sessionNotes, setSessionNotes] = useState<string>("");
  const [sessionRating, setSessionRating] = useState<number>(5);

  // Interactive UI states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeSounds, setActiveSounds] = useState<{ [key: string]: boolean }>({
    rain: false,
    waves: false,
    beats: false,
    white: false
  });
  const [soundVolumes, setSoundVolumes] = useState<{ [key: string]: number }>({
    rain: 0.4,
    waves: 0.4,
    beats: 0.25,
    white: 0.3
  });

  // Local Storage and merged Sessions history
  const [localFocusSessions, setLocalFocusSessions] = useState<FocusSession[]>(() => {
    const saved = localStorage.getItem("wrindha_focus_sessions");
    return saved ? JSON.parse(saved) : [];
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-fill shortcuts from Study or Life OS if passed
  useEffect(() => {
    if (preselectedTaskId) {
      setLinkedTaskId(preselectedTaskId);
      setLinkedCourseId("");
      const matchedTask = tasks.find(t => t.id === preselectedTaskId);
      if (matchedTask) {
        setCustomCategory("Work");
      }
    } else if (preselectedCourseId) {
      setLinkedCourseId(preselectedCourseId);
      setLinkedTaskId("");
      setCustomCategory("Study");
    }
  }, [preselectedTaskId, preselectedCourseId, tasks]);

  // Sync Audio Volumes on Init
  useEffect(() => {
    Object.keys(soundVolumes).forEach(sound => {
      audioEngine.setVolume(sound, soundVolumes[sound]);
    });
  }, []);

  // Update Countdown timer initial values on mode/setting changes
  useEffect(() => {
    if (timerMode === "pomodoro") {
      let secs = customFocusMin * 60;
      if (pomoCycle === "short") secs = customShortMin * 60;
      if (pomoCycle === "long") secs = customLongMin * 60;
      setTimerDuration(secs);
      setTimeLeft(secs);
      setIsRunning(false);
    } else if (timerMode === "deep_work") {
      const secs = customFocusMin * 60;
      setTimerDuration(secs);
      setTimeLeft(secs);
      setIsRunning(false);
    }
  }, [timerMode, pomoCycle, customFocusMin, customShortMin, customLongMin]);

  // Main countdown timer ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleCountdownComplete();
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
  }, [isRunning, timerMode, pomoCycle]);

  // Stopwatch ticker
  useEffect(() => {
    if (stopwatchRunning) {
      lastStopwatchTick.current = Date.now();
      stopwatchRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - (lastStopwatchTick.current ?? now);
        lastStopwatchTick.current = now;
        setStopwatchMs(prev => prev + delta);
      }, 10); // tick every 10ms
    } else {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
      lastStopwatchTick.current = null;
    }

    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [stopwatchRunning]);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      // Keep sounds running if user prefers, but stop if requested.
      // We can let ambient sounds keep playing in the background as they browse the app.
    };
  }, []);

  // Handle countdown complete
  const handleCountdownComplete = () => {
    setIsRunning(false);
    playSynthesizedMelody();

    // Log the focus session
    const durationMin = Math.round(timerDuration / 60);
    
    let label = "";
    let matchedCourseName = "";
    if (linkedTaskId) {
      const matched = tasks.find(t => t.id === linkedTaskId);
      if (matched) label = matched.title;
    } else if (linkedCourseId) {
      const matched = courses.find(c => c.id === linkedCourseId);
      if (matched) matchedCourseName = matched.name;
    }

    const currentCat = linkedCourseId ? "Study" : (linkedTaskId ? "Work" : customCategory);

    const isStudySessionLog = !!linkedCourseId;

    // Create session
    const focusSessionId = Math.random().toString(36).substr(2, 9);
    const newFocusSession: FocusSession = {
      id: focusSessionId,
      type: timerMode,
      durationMinutes: durationMin,
      sessionDate: new Date().toISOString().split("T")[0],
      taskTitle: label || undefined,
      courseName: matchedCourseName || undefined,
      category: currentCat,
      notes: sessionNotes || undefined,
      rating: sessionRating,
      completedAt: new Date().toISOString()
    };

    const nextFocusList = [newFocusSession, ...localFocusSessions];
    setLocalFocusSessions(nextFocusList);
    localStorage.setItem("wrindha_focus_sessions", JSON.stringify(nextFocusList));

    // Backward compatibility: Log as StudySession if a course is selected
    if (isStudySessionLog && linkedCourseId) {
      const newStudySession: StudySession = {
        id: focusSessionId,
        courseId: linkedCourseId,
        sessionDate: new Date().toISOString().split("T")[0],
        durationMinutes: durationMin,
        topic: label || `Focus Centre ${timerMode === "pomodoro" ? "Pomodoro" : "Deep Work"}`,
        notes: sessionNotes || undefined
      };
      setStudySessions(prev => [...prev, newStudySession]);
    }

    // Trigger complete feedback
    if (timerMode === "pomodoro") {
      if (pomoCycle === "focus") {
        alert(`🎉 Focus session completed! Outstanding job. Time for a well-deserved short break!`);
        setPomoCycle("short");
      } else {
        alert(`☕ Break completed! Ready to lock back into full productivity focus?`);
        setPomoCycle("focus");
      }
    } else {
      alert(`🎉 Deep Work block accomplished! You focused uninterrupted for ${durationMin} minutes. Excellent discipline!`);
    }

    // Clear preselected inputs
    if (onClearPreselected) onClearPreselected();
    setSessionNotes("");
  };

  // Synthesize Alarm audio chord using web audio api
  const playSynthesizedMelody = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 Major Chord
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + idx * 0.1 + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 1.6);
      });
    } catch (err) {
      console.warn("Melody synth failed", err);
    }
  };

  // Toggle ambient soundtrack
  const handleToggleSound = (sound: string) => {
    const isPlaying = audioEngine.toggleSound(sound);
    setActiveSounds(prev => ({
      ...prev,
      [sound]: isPlaying
    }));
  };

  // Sound Volume adjust
  const handleVolumeChange = (sound: string, val: number) => {
    setSoundVolumes(prev => ({
      ...prev,
      [sound]: val
    }));
    audioEngine.setVolume(sound, val);
  };

  // Stopwatch action helper
  const handleLapStopwatch = () => {
    setStopwatchLaps(prev => [...prev, stopwatchMs]);
  };

  const handleResetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchMs(0);
    setStopwatchLaps([]);
  };

  // Quick helper to format standard milliseconds
  const formatMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const centiSecs = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${centiSecs.toString().padStart(2, "0")}`;
  };

  // Format Helper for Countdown timer
  const formatTimeSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timerProgressPercentage = ((timerDuration - timeLeft) / timerDuration) * 100;

  // Merge local focus sessions with Supabase-level study_sessions to make sure
  // the history is complete and backward compatible
  const mergedHistory: FocusSession[] = useMemo(() => {
    const list: FocusSession[] = [...localFocusSessions];
    
    // Add unique study sessions that are not already recorded in localFocusSessions
    studySessions.forEach(studySess => {
      const alreadyExists = list.some(item => item.id === studySess.id);
      if (!alreadyExists) {
        const course = courses.find(c => c.id === studySess.courseId);
        list.push({
          id: studySess.id,
          type: "pomodoro",
          durationMinutes: studySess.durationMinutes,
          sessionDate: studySess.sessionDate,
          courseName: course ? course.name : "Study Course",
          category: "Study",
          notes: studySess.notes || undefined,
          rating: 5,
          completedAt: new Date(studySess.sessionDate).toISOString()
        });
      }
    });

    // Sort descending by date/time
    return list.sort((a, b) => new Date(b.completedAt || b.sessionDate).getTime() - new Date(a.completedAt || a.sessionDate).getTime());
  }, [localFocusSessions, studySessions, courses]);

  // Focus Analytics calculations
  const analyticsData = useMemo(() => {
    // 1. Last 7 Days chart data
    const last7DaysMap: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      last7DaysMap[dateStr] = 0;
    }

    mergedHistory.forEach(sess => {
      if (last7DaysMap[sess.sessionDate] !== undefined) {
        last7DaysMap[sess.sessionDate] += sess.durationMinutes;
      }
    });

    const barChartData = Object.keys(last7DaysMap).map(key => {
      const dateObj = new Date(key);
      const shortLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
      return {
        date: shortLabel,
        minutes: last7DaysMap[key],
        rawDate: key
      };
    });

    // 2. Category Pie Chart
    const categoryMinutes: { [key: string]: number } = {};
    mergedHistory.forEach(sess => {
      categoryMinutes[sess.category] = (categoryMinutes[sess.category] || 0) + sess.durationMinutes;
    });

    const COLORS = ["#6366f1", "#06b6d4", "#f97316", "#10b981", "#ec4899", "#8b5cf6"];
    const pieChartData = Object.keys(categoryMinutes).map((cat, idx) => ({
      name: cat,
      value: categoryMinutes[cat],
      color: COLORS[idx % COLORS.length]
    }));

    // 3. Totals and Streaks
    const totalMinutesFocused = mergedHistory.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const totalHours = (totalMinutesFocused / 60).toFixed(1);
    
    // Streak calculations based on dates
    const uniqueDates = Array.from(new Set(mergedHistory.map(h => h.sessionDate))).sort();
    let currentStreak = 0;
    let maxStreak = 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const hasToday = uniqueDates.includes(todayStr);
    const hasYesterday = uniqueDates.includes(yesterdayStr);

    if (hasToday || hasYesterday) {
      let tempStreak = 0;
      let checkDate = hasToday ? new Date() : yesterday;
      
      while (true) {
        const checkStr = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(checkStr)) {
          tempStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = tempStreak;
    }

    // Max streak calculation
    let tempMax = 0;
    let localStreak = 0;
    let prevDateTime: number | null = null;

    uniqueDates.forEach((dateStr) => {
      const currentDateVal = new Date(dateStr).getTime();
      if (prevDateTime === null) {
        localStreak = 1;
      } else {
        const diffDays = Math.round((currentDateVal - prevDateTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          localStreak++;
        } else if (diffDays > 1) {
          localStreak = 1;
        }
      }
      prevDateTime = currentDateVal;
      if (localStreak > tempMax) {
        tempMax = localStreak;
      }
    });
    maxStreak = Math.max(tempMax, currentStreak);

    return {
      barChartData,
      pieChartData,
      totalHours,
      totalSessions: mergedHistory.length,
      currentStreak,
      maxStreak
    };
  }, [mergedHistory]);

  const handleDeleteSession = (id: string) => {
    if (!confirm("Are you sure you want to delete this focus session?")) return;
    
    // Remove from local focus sessions
    const nextLocal = localFocusSessions.filter(s => s.id !== id);
    setLocalFocusSessions(nextLocal);
    localStorage.setItem("wrindha_focus_sessions", JSON.stringify(nextLocal));

    // Remove from study sessions if needed to sync
    setStudySessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-8 animate-fade-in text-gray-900 dark:text-white pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Brain className="w-8 h-8 text-rose-500 animate-pulse" />
            <span>Wrindha Focus Centre</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Launch customized focus blocks, tune in to synthesized ambient noise loops, and view complete productivity snapshots.
          </p>
        </div>

        {/* Global tabs for Focus Centre */}
        <div className="flex bg-gray-50 dark:bg-gray-850 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 self-start md:self-auto shrink-0">
          {[
            { id: "timer", label: "Focus Timers", icon: Clock },
            { id: "sounds", label: "Soundtrack", icon: Music },
            { id: "history", label: "Session Log", icon: History },
            { id: "analytics", label: "Focus Reports", icon: BarChart3 }
          ].map(subTab => (
            <button
              key={subTab.id}
              onClick={() => setActiveTabSub(subTab.id as any)}
              className={cn(
                "px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                activeTabSub === subTab.id
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm border-b border-indigo-500/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              )}
            >
              <subTab.icon className="w-4 h-4" />
              <span>{subTab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. FOCUS TIMERS BLOCK */}
      {activeTabSub === "timer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Focus Clock Presentation Card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center justify-center relative min-h-[500px]">
            
            {/* Immersive Deep Work Mode Filter overlay */}
            {timerMode === "deep_work" && isRunning && (
              <div className="absolute inset-0 bg-black dark:bg-slate-950 rounded-[2.5rem] z-10 p-8 flex flex-col items-center justify-center space-y-12 text-white animate-fade-in">
                <div className="absolute top-6 right-6">
                  <button 
                    onClick={() => setIsRunning(false)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <EyeOff className="w-4 h-4" /> Exit Deep View
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400 block animate-pulse">Deep Focus Activated</span>
                  {linkedTaskId ? (
                    <h3 className="text-2xl font-black text-white">{tasks.find(t => t.id === linkedTaskId)?.title}</h3>
                  ) : linkedCourseId ? (
                    <h3 className="text-2xl font-black text-white">{courses.find(c => c.id === linkedCourseId)?.name} Study</h3>
                  ) : (
                    <h3 className="text-2xl font-black text-white">Distraction-Free Work Block</h3>
                  )}
                  <p className="text-xs text-gray-400">All notifications, dashboards, and sidebars are masked. Calm your mind and flow.</p>
                </div>

                {/* Pulsing visual circle clock */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute inset-0 bg-indigo-500/10 rounded-full filter blur-2xl"
                  />
                  <div className="text-7xl font-black font-mono tracking-wider z-20">
                    {formatTimeSeconds(timeLeft)}
                  </div>
                </div>

                <div className="flex gap-4 z-20">
                  <button 
                    onClick={() => setIsRunning(false)}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-2xl shadow-lg shadow-rose-500/20"
                  >
                    Pause Block
                  </button>
                  <button 
                    onClick={() => {
                      setTimeLeft(timerDuration);
                      setIsRunning(false);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-2xl"
                  >
                    Restart
                  </button>
                </div>
              </div>
            )}

            {/* Standard Mode Selector tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-855 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8 self-center">
              {[
                { id: "pomodoro", label: "Pomodoro Timer", icon: Clock },
                { id: "deep_work", label: "Deep Work Mode", icon: Brain },
                { id: "stopwatch", label: "Stopwatch", icon: Activity }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setTimerMode(mode.id as any);
                    setIsRunning(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                    timerMode === mode.id
                      ? "bg-black dark:bg-indigo-600 text-white shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white"
                  )}
                >
                  <mode.icon className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            {/* 1.1 COUNTDOWN TIMERS VIEW */}
            {(timerMode === "pomodoro" || timerMode === "deep_work") && (
              <div className="flex flex-col items-center space-y-6 w-full">
                
                {/* Pomodoro Cycles break selectors */}
                {timerMode === "pomodoro" && (
                  <div className="flex bg-gray-100/50 dark:bg-gray-800/40 p-1 rounded-xl mb-4 text-[10px]">
                    {[
                      { id: "focus", label: `Study Sprint (${customFocusMin}m)` },
                      { id: "short", label: `Short Break (${customShortMin}m)` },
                      { id: "long", label: `Long Break (${customLongMin}m)` }
                    ].map(cycle => (
                      <button
                        key={cycle.id}
                        onClick={() => {
                          setPomoCycle(cycle.id as any);
                          setIsRunning(false);
                        }}
                        className={cn(
                          "px-3 py-1.5 font-bold uppercase tracking-wider rounded-lg transition-all",
                          pomoCycle === cycle.id
                            ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-gray-500"
                        )}
                      >
                        {cycle.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Animated Pulsing Circular Progress Bar Ring */}
                <div className="relative w-56 h-56 flex items-center justify-center">
                  {isRunning && (
                    <motion.div
                      animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.1, 0.25, 0.1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className={cn(
                        "absolute inset-0 rounded-full blur-xl",
                        pomoCycle === "focus" || timerMode === "deep_work" ? "bg-indigo-500" : "bg-green-500"
                      )}
                    />
                  )}

                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="112"
                      cy="112"
                      r="96"
                      className="stroke-gray-100 dark:stroke-gray-800"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="112"
                      cy="112"
                      r="96"
                      className={cn(
                        "transition-all stroke-current",
                        pomoCycle === "focus" || timerMode === "deep_work" ? "text-indigo-600 dark:text-indigo-500" : "text-green-500"
                      )}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={603}
                      strokeDashoffset={603 - (603 * timerProgressPercentage) / 100}
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Main Countdown digits inside circular gauge */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-gray-900 dark:text-white leading-none">
                      {formatTimeSeconds(timeLeft)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
                      {timerMode === "deep_work" ? "Deep Flow" : (pomoCycle === "focus" ? "Focused Study" : "Rest Mode")}
                    </span>

                    {/* Time Increment adjustments */}
                    <div className="flex gap-2 mt-3 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg">
                      <button 
                        onClick={() => setTimeLeft(prev => Math.max(60, prev - 60))}
                        className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="- 1 Min"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setTimeLeft(prev => Math.min(timerDuration, prev + 60))}
                        className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="+ 1 Min"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clock Controls */}
                <div className="flex items-center gap-4 mt-4 z-20">
                  <button
                    onClick={() => {
                      setTimeLeft(timerDuration);
                      setIsRunning(false);
                    }}
                    className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-2xl transition-all"
                    title="Reset timer clock"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all flex items-center gap-2",
                      isRunning 
                        ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/10" 
                        : "bg-black dark:bg-indigo-600 hover:opacity-95 shadow-indigo-600/15"
                    )}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4.5 h-4.5 fill-white" /> Pause Focus
                      </>
                    ) : (
                      <>
                        <Play className="w-4.5 h-4.5 fill-white" /> Launch Focus Block
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-2xl transition-all"
                    title="Configure Custom Durations"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 1.2 STOPWATCH VIEW */}
            {timerMode === "stopwatch" && (
              <div className="flex flex-col items-center space-y-6 w-full animate-fade-in">
                <div className="text-center space-y-2">
                  <div className="text-6xl md:text-7xl font-black font-mono tracking-wider text-gray-900 dark:text-white leading-none select-none">
                    {formatMs(stopwatchMs)}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Continuous Stopwatch Mode</p>
                </div>

                {/* Stopwatch controls */}
                <div className="flex gap-4">
                  <button
                    onClick={handleResetStopwatch}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors text-gray-700 dark:text-gray-300"
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => setStopwatchRunning(!stopwatchRunning)}
                    className={cn(
                      "px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-md active:scale-95 transition-all flex items-center gap-2",
                      stopwatchRunning 
                        ? "bg-rose-500 hover:bg-rose-600" 
                        : "bg-black dark:bg-indigo-600"
                    )}
                  >
                    {stopwatchRunning ? (
                      <>
                        <Pause className="w-4 h-4 fill-white" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" /> Resume
                      </>
                    )}
                  </button>

                  {stopwatchRunning && (
                    <button
                      onClick={handleLapStopwatch}
                      className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors text-gray-700 dark:text-gray-300"
                    >
                      Lap
                    </button>
                  )}
                </div>

                {/* Laps List */}
                {stopwatchLaps.length > 0 && (
                  <div className="w-full max-w-sm max-h-[160px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-950/20 space-y-2">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Laps Logged</h5>
                    <div className="space-y-1.5 divide-y divide-gray-100/50 dark:divide-gray-800/40">
                      {stopwatchLaps.map((lap, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1.5 font-mono">
                          <span className="text-gray-400 font-bold">Lap {idx + 1}</span>
                          <span className="font-extrabold text-gray-800 dark:text-white">{formatMs(lap)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Target configuration panel / Associated Tasks Linking */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-gray-50 dark:border-gray-800 pb-3">
                <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  <span>Session Association</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1">Associate focus sessions with your study subjects or matrix tasks.</p>
              </div>

              {/* Linking Select Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Link to Academic Course</label>
                  <select
                    value={linkedCourseId}
                    onChange={(e) => {
                      setLinkedCourseId(e.target.value);
                      if (e.target.value) {
                        setLinkedTaskId("");
                        setCustomCategory("Study");
                      }
                    }}
                    className="w-full text-xs font-bold px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">-- No Academic Course Linked --</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>📚 {course.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Link to Matrix Task</label>
                  <select
                    value={linkedTaskId}
                    onChange={(e) => {
                      setLinkedTaskId(e.target.value);
                      if (e.target.value) {
                        setLinkedCourseId("");
                        setCustomCategory("Work");
                      }
                    }}
                    className="w-full text-xs font-bold px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">-- No Actionable Task Linked --</option>
                    {tasks.filter(t => !t.completed).map(task => (
                      <option key={task.id} value={task.id}>🎯 {task.title}</option>
                    ))}
                  </select>
                </div>

                {!linkedCourseId && !linkedTaskId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Custom Focus Category</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 outline-none text-gray-900 dark:text-white"
                    >
                      {["General", "Study", "Work", "Habits", "Health", "Personal", "Creative"].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Focus Intention / Notes</label>
                  <textarea
                    placeholder="Describe your primary intention for this block..."
                    className="w-full text-xs font-medium px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 outline-none text-gray-900 dark:text-white min-h-[70px] resize-none"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Target Focus Score: {sessionRating}★</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setSessionRating(star)}
                        className={cn(
                          "p-1 rounded text-xs transition-colors",
                          sessionRating >= star ? "text-yellow-500" : "text-gray-300"
                        )}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Intention button for current selected task */}
            {linkedTaskId && (
              <button
                onClick={() => {
                  onToggleTask(linkedTaskId);
                  setLinkedTaskId("");
                  alert("Task marked as completed! Excellent focus execution.");
                }}
                className="w-full py-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 mt-4 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Toggle Active Task Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. SOUNDTRACK / AMBIENT SOUND CONTROLLER */}
      {activeTabSub === "sounds" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-gray-50 dark:border-gray-800 pb-4">
            <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span>Offline Synthesized Focus Ambience</span>
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              Configure and mix custom ambient tracks. These sounds are synthesized locally in real-time using HTML5 Web Audio oscillators. No loading assets, 100% reliable.
            </p>
          </div>

          {/* Soundtrack grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: "rain", label: "Calming Rain", desc: "Brown filtered static sound mimic of soft storm showers.", icon: Sliders },
              { id: "waves", label: "Ocean Shore", desc: "Swell-modulated pink noise resembling continuous tides.", icon: Compass },
              { id: "beats", label: "Alpha Focus Beats", desc: "Binaural theta wave sine tones driving extreme deep sleep or lock-in focus.", icon: Brain },
              { id: "white", label: "Zen static noise", desc: "Standard frequency white noise to shield external distraction.", icon: Zap }
            ].map(track => {
              const playing = activeSounds[track.id] || false;
              const volume = soundVolumes[track.id] ?? 0.5;

              return (
                <div 
                  key={track.id}
                  className={cn(
                    "p-6 border rounded-3xl transition-all flex flex-col justify-between space-y-4",
                    playing 
                      ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/60 shadow-md shadow-indigo-600/5" 
                      : "bg-gray-50/30 dark:bg-gray-900/10 border-gray-100 dark:border-gray-850"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                        <track.icon className={cn("w-4.5 h-4.5", playing ? "text-indigo-500 animate-pulse" : "text-gray-400")} />
                        <span>{track.label}</span>
                      </h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        playing ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      )}>
                        {playing ? "Playing" : "Silent"}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{track.desc}</p>
                  </div>

                  {/* Volume slider controls */}
                  <div className="space-y-3">
                    {playing && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] text-gray-400 font-extrabold font-mono uppercase tracking-widest">
                          <span>Volume</span>
                          <span>{Math.round(volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => handleToggleSound(track.id)}
                      className={cn(
                        "w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        playing 
                          ? "bg-rose-500 hover:bg-rose-600 text-white" 
                          : "bg-black dark:bg-indigo-600 text-white hover:opacity-90"
                      )}
                    >
                      {playing ? "Pause Stream" : "Synthesize Track"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                audioEngine.stopAll();
                setActiveSounds({ rain: false, waves: false, beats: false, white: false });
              }}
              className="px-6 py-2.5 rounded-xl border border-gray-150 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 text-xs font-bold transition-all flex items-center gap-2"
            >
              <VolumeX className="w-4 h-4" /> Stop All Synthesized Streams
            </button>
          </div>
        </div>
      )}

      {/* 3. FOCUS HISTORY / SESSION LOG */}
      {activeTabSub === "history" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800 pb-4">
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>Productivity Logbook</span>
              </h3>
              <p className="text-gray-400 text-xs mt-1">Preserving and showing your complete focus sprints history.</p>
            </div>
            
            <button
              onClick={() => {
                if (confirm("Clear local Focus history? This will reset local records but preserve database study session integrations.")) {
                  setLocalFocusSessions([]);
                  localStorage.removeItem("wrindha_focus_sessions");
                }
              }}
              className="text-xs text-red-500 hover:underline flex items-center gap-1 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Focus Sprints
            </button>
          </div>

          {/* List items */}
          <div className="space-y-4">
            {mergedHistory.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl bg-gray-50/30">
                <Clock className="w-10 h-10 text-gray-350 mx-auto opacity-70 mb-3" />
                <p className="text-sm text-gray-400 font-bold">No focus sessions recorded yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">Launch Pomodoro, Deep Work, or Stopwatches to log productivity blocks!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[500px] overflow-y-auto pr-2 space-y-4">
                {mergedHistory.map((sess) => (
                  <div key={sess.id} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl shrink-0 flex items-center justify-center",
                        sess.category === "Study" ? "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20" : 
                        sess.category === "Work" ? "bg-cyan-50 text-cyan-500 dark:bg-cyan-950/20" : "bg-gray-50 text-gray-500 dark:bg-gray-800"
                      )}>
                        {sess.category === "Study" ? <BookOpen className="w-5 h-5" /> : 
                         sess.category === "Work" ? <Target className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm dark:text-white">
                            {sess.taskTitle || sess.courseName || "General Focus Block"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {sess.category}
                          </span>
                        </div>
                        
                        {sess.notes && (
                          <p className="text-xs text-gray-400 italic font-medium leading-normal break-words max-w-xl">
                            "{sess.notes}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-[10px] text-gray-450 dark:text-gray-500 font-semibold">
                          <span>📅 {sess.sessionDate}</span>
                          {sess.rating && <span>★ {sess.rating}/5 Score</span>}
                          <span>⚙️ Type: <span className="capitalize">{sess.type?.replace("_", " ")}</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
                      <div className="text-right">
                        <span className="text-lg font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                          +{sess.durationMinutes}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">MINUTES</span>
                      </div>

                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                        title="Delete Session Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FOCUS REPORTS & ANALYTICS VIEW */}
      {activeTabSub === "analytics" && (
        <div className="space-y-8 animate-fade-in">
          
          {/* STATS OVERVIEW BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Sprints</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-gray-900 dark:text-white">
                  {analyticsData.totalSessions}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">blocks</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hours Locked</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                  {analyticsData.totalHours}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">hours</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Streak</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-rose-500 flex items-center gap-1">
                  <Flame className="w-6 h-6 text-orange-500" />
                  {analyticsData.currentStreak}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">days</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Max Streak reached</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-yellow-500">
                  {analyticsData.maxStreak}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">days</span>
              </div>
            </div>
          </div>

          {/* CHARTS GRAPHICS PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Daily Minutes Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm space-y-6">
              <div>
                <h4 className="font-extrabold text-sm tracking-tight">Weekly Study / Work Focus Volume</h4>
                <p className="text-[11px] text-gray-400 mt-1">Focus minutes logged daily over the last week.</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.barChartData}>
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="minutes" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Distribution Chart */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-sm tracking-tight">Category Distribution</h4>
                <p className="text-[11px] text-gray-400 mt-1">Where your focused energy went.</p>
              </div>

              {analyticsData.pieChartData.length === 0 ? (
                <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
                  <p className="text-xs text-gray-400">No category breakdown data.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  <div className="h-40 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analyticsData.pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends list */}
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {analyticsData.pieChartData.map((data, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                          <span className="font-bold text-gray-600 dark:text-gray-300">{data.name}</span>
                        </div>
                        <span className="font-mono font-bold">{data.value} mins</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC PRODUCTIVITY REPORTS CARDS */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-rose-500/10 dark:from-indigo-950/20 dark:to-rose-950/20 p-8 rounded-[2.5rem] border border-indigo-500/10 shadow-sm space-y-6">
            <div className="space-y-1">
              <h4 className="text-base font-extrabold tracking-tight text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span>Focus Centre Smart Productivity Analysis</span>
              </h4>
              <p className="text-xs text-indigo-700/60 dark:text-indigo-400">Dynamically generated advice and feedback logs on your study loops.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed">
              <div className="space-y-4">
                <div className="bg-white/80 dark:bg-gray-900/60 p-5 rounded-2xl border border-white/50 space-y-2">
                  <h5 className="font-extrabold text-indigo-900 dark:text-indigo-400 text-xs uppercase tracking-wider">Productivity Balance Score</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {analyticsData.totalSessions === 0 ? (
                      "Please complete a few focus blocks first. We will analyze your work-to-break ratio and give you a balance index."
                    ) : (
                      `You completed ${analyticsData.totalSessions} focus block(s) totaling ${analyticsData.totalHours} hours. Your focus patterns demonstrate high perseverance. Keeping a dedicated 25m Pomodoro cycle with 5m breaks yields peak task completion indices.`
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/80 dark:bg-gray-900/60 p-5 rounded-2xl border border-white/50 space-y-2">
                  <h5 className="font-extrabold text-indigo-900 dark:text-indigo-400 text-xs uppercase tracking-wider">Actionable Focus Recommendations</h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {analyticsData.totalSessions === 0 ? (
                      "Synthesize alpha waves soundtrack in 'Soundtrack' tab while setting deep focus modes to prevent multi-tasking and cognitive overload."
                    ) : (
                      "Scientific study indicates that scheduling focus blocks in peak morning hours (9am - 12pm) results in 40% lower cognitive fatigue. Consider logging your most complex academic modules tomorrow morning with binaural beats focus tracks active!"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION MODAL (Pomodoro Timer Preferences) */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-6"
            >
              <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
                <h4 className="font-black text-sm uppercase tracking-wider text-gray-800 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4.5 h-4.5 text-indigo-500" />
                  <span>Cycle Configurations</span>
                </h4>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Study Sprint (Focus mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                    value={customFocusMin}
                    onChange={(e) => setCustomFocusMin(parseInt(e.target.value) || 25)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Short Break (mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                    value={customShortMin}
                    onChange={(e) => setCustomShortMin(parseInt(e.target.value) || 5)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Long Break (mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                    value={customLongMin}
                    onChange={(e) => setCustomLongMin(parseInt(e.target.value) || 15)}
                  />
                </div>
              </div>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-3 bg-black dark:bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:opacity-90"
              >
                Apply Adjustments
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
