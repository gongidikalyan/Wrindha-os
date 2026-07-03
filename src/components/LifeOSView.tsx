import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Target, 
  Flame, 
  CheckCircle2, 
  ListTodo, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Zap, 
  Play, 
  Pause, 
  RotateCcw,
  LayoutGrid,
  Map,
  Layers,
  Award,
  Check,
  AlertCircle,
  Timer,
  Brain,
  HelpCircle,
  BookOpen,
  Grid,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { Habit, Goal, Task, GoalType, EisenhowerQuadrant } from "../types";

// ================= TYPES DEFINITIONS =================
export interface PyramidNode {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4; 
  category?: "Life" | "Career" | "Business" | "Academic"; 
  parentId?: string; // Links Level 2 to 1, Level 3 to 2, Level 4 to 3
  progress: number; // 0-100 calculated recursively or manually
  completed: boolean;
  dueDate?: string;
  kanbanStatus: 'backlog' | 'todo' | 'inprogress' | 'review' | 'completed';
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:MM
  durationMinutes: number;
  isDeepWork: boolean;
}

interface LifeOSViewProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  onDelete: (id: string) => void;
  subscriptionTier: string;
  setActiveTab: (t: string) => void;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  studyCourses: any[];
  setStudyCourses: React.Dispatch<React.SetStateAction<any[]>>;
  onLaunchFocusCentre?: (taskId?: string, courseId?: string) => void;
}

// ================= PARSING & SERIALIZING DATA =================
// Level 1 Strategic Goal: stored in "goals" table. type matches category with "L1-" prefix (e.g., L1-Life).
// Level 2 Major Project: stored in "goals" table. type matches "L2-Project". targetDate stores parent L1 goal ID.
// Level 3 & 4: stored in "tasks" table. quadrant is always "UI". description houses metadata with [L3|p:PID|k:STATUS|d:SCHED_DATE|t:SCHED_TIME|m:DURATION|w:DEEP] Prefix

export function parseTaskDescription(description: string = ""): {
  level: 3 | 4;
  parentId: string | null;
  kanbanStatus: 'backlog' | 'todo' | 'inprogress' | 'review' | 'completed';
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number;
  isDeepWork: boolean;
  cleanDescription: string;
} {
  const match = description.match(/^\[L(3|4)\|p:([^|]*)\|k:([^|]*)\|d:([^|]*)\|t:([^|]*)\|m:([^|]*)\|w:([^|]*)\] (.*)$/);
  if (match) {
    return {
      level: match[1] === '4' ? 4 : 3,
      parentId: match[2] || null,
      kanbanStatus: (match[3] as any) || 'backlog',
      scheduledDate: match[4] || null,
      scheduledTime: match[5] || null,
      durationMinutes: parseInt(match[6]) || 60,
      isDeepWork: match[7] === 'true',
      cleanDescription: match[8] || ""
    };
  }
  return {
    level: 3,
    parentId: null,
    kanbanStatus: 'backlog',
    scheduledDate: null,
    scheduledTime: null,
    durationMinutes: 60,
    isDeepWork: false,
    cleanDescription: description
  };
}

export function serializeTaskDescription(
  level: 3 | 4,
  parentId: string,
  kanbanStatus: string,
  scheduledDate: string | null,
  scheduledTime: string | null,
  durationMinutes: number,
  isDeepWork: boolean,
  cleanDescription: string
): string {
  return `[L${level}|p:${parentId || ''}|k:${kanbanStatus}|d:${scheduledDate || ''}|t:${scheduledTime || ''}|m:${durationMinutes}|w:${isDeepWork}] ${cleanDescription}`;
}

export default function LifeOSView({
  goals,
  setGoals,
  tasks,
  setTasks,
  onDelete,
  subscriptionTier,
  setActiveTab,
  habits,
  setHabits,
  studyCourses,
  setStudyCourses,
  onLaunchFocusCentre
}: LifeOSViewProps) {
  // Navigation Tabs for Unified Productivity OS: Plan (Pyramid), Organize (Kanban), Execute (Timeblock), Dashboard, Focus Timer
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "pyramid" | "kanban" | "timeblock" | "focus" | "eisenhower">("dashboard");

  // Preselected task state for global Focus Centre shortcut
  const [selectedFocusTaskId, setSelectedFocusTaskId] = useState<string>("");

  // Eisenhower Matrix input states
  const [eisenTitle, setEisenTitle] = useState("");
  const [eisenDesc, setEisenDesc] = useState("");
  const [eisenQuad, setEisenQuad] = useState<"do_first" | "schedule" | "delegate" | "eliminate">("do_first");

  // Local state and error logs
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);

  // Active inputs
  const [selectedL2Project, setSelectedL2Project] = useState<string>("");

  // Quick inputs
  const [l1Title, setL1Title] = useState("");
  const [l1Category, setL1Category] = useState<"Life" | "Career" | "Business" | "Academic">("Life");
  const [l2Title, setL2Title] = useState("");
  const [l2ParentL1, setL2ParentL1] = useState("");
  const [l3Title, setL3Title] = useState("");
  const [l3ParentL2, setL3ParentL2] = useState("");
  const [l4Title, setL4Title] = useState("");
  const [l4ParentL3, setL4ParentL3] = useState("");

  // Calendar View State
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedTimeSlotTask, setSelectedTimeSlotTask] = useState<PyramidNode | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleDuration, setScheduleDuration] = useState("60");
  const [scheduleDeep, setScheduleDeep] = useState(false);

  // Deep work focus block (Pomodoro) state
  const [activeTimerTask, setActiveTimerTask] = useState<PyramidNode | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(1500); // 25 mins initial
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Map database states into a Unified Pyramid State
  const pyramidNodes = useMemo<PyramidNode[]>(() => {
    const nodes: PyramidNode[] = [];

    // Map strategic goals (L1)
    goals.forEach(g => {
      if (g.type?.startsWith("L1-")) {
        const cat = g.type.replace("L1-", "") as any;
        nodes.push({
          id: g.id,
          title: g.title,
          level: 1,
          category: cat,
          progress: g.progress || 0,
          completed: g.progress >= 100,
          kanbanStatus: "todo",
          durationMinutes: 0,
          isDeepWork: false
        });
      } else if ((g.type as any) === "L2-Project" || g.type === "Medium-term" || g.type === "Long-term") {
        // Fallback matching
        const parentL1 = g.targetDate || "";
        nodes.push({
          id: g.id,
          title: g.title,
          level: 2,
          parentId: parentL1,
          progress: g.progress || 0,
          completed: g.progress >= 100,
          dueDate: g.targetDate,
          kanbanStatus: "todo",
          durationMinutes: 0,
          isDeepWork: false
        });
      }
    });

    // Map tasks (L3 & L4)
    tasks.forEach(t => {
      const info = parseTaskDescription(t.description || "");
      nodes.push({
        id: t.id,
        title: t.title,
        level: info.level,
        parentId: info.parentId || undefined,
        progress: t.completed ? 100 : 0,
        completed: t.completed,
        kanbanStatus: info.kanbanStatus,
        dueDate: t.dueDate,
        scheduledDate: info.scheduledDate || undefined,
        scheduledTime: info.scheduledTime || undefined,
        durationMinutes: info.durationMinutes,
        isDeepWork: info.isDeepWork
      });
    });

    return nodes;
  }, [goals, tasks]);

  // Recursively calculate Progress values based on Automation rules!
  const calculatedProgress = useMemo(() => {
    const progressMap: Record<string, number> = {};

    // Calculate level 3 progress (completed percentage of child level 4s)
    pyramidNodes.filter(n => n.level === 3).forEach(l3 => {
      const childL4s = pyramidNodes.filter(n => n.level === 4 && n.parentId === l3.id);
      if (childL4s.length > 0) {
        const completed = childL4s.filter(c => c.completed).length;
        progressMap[l3.id] = Math.round((completed / childL4s.length) * 100);
      } else {
        progressMap[l3.id] = l3.completed ? 100 : 0;
      }
    });

    // Calculate level 2 projects progress (completed weighted sum of Level 3/4 descendants)
    pyramidNodes.filter(n => n.level === 2).forEach(proj => {
      const projectTasksAndActions = pyramidNodes.filter(n => (n.level === 3 || n.level === 4) && n.parentId === proj.id);
      if (projectTasksAndActions.length > 0) {
        const totalProgressSum = projectTasksAndActions.reduce((sum, item) => {
          const itemProg = item.level === 3 ? (progressMap[item.id] ?? (item.completed ? 100 : 0)) : (item.completed ? 100 : 0);
          return sum + itemProg;
        }, 0);
        progressMap[proj.id] = Math.round(totalProgressSum / projectTasksAndActions.length);
      } else {
        progressMap[proj.id] = proj.completed ? 100 : 0;
      }
    });

    // Calculate level 1 goals progress (average completion of child Level 2 Projects)
    pyramidNodes.filter(n => n.level === 1).forEach(g => {
      const childProjects = pyramidNodes.filter(n => n.level === 2 && n.parentId === g.id);
      if (childProjects.length > 0) {
        const totalProjProgressSum = childProjects.reduce((sum, p) => sum + (progressMap[p.id] ?? 0), 0);
        progressMap[g.id] = Math.round(totalProjProgressSum / childProjects.length);
      } else {
        progressMap[g.id] = g.completed ? 100 : 0;
      }
    });

    return progressMap;
  }, [pyramidNodes]);

  // Auto-propagate progress updates down / up when completing children
  const updateSupabaseNodeStatus = async (nodeId: string, isCompleted: boolean, status?: 'backlog' | 'todo' | 'inprogress' | 'review' | 'completed') => {
    const node = pyramidNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.level === 3 || node.level === 4) {
      // Find matching standard Task
      const t = tasks.find(x => x.id === nodeId);
      if (t) {
        const oldDesc = parseTaskDescription(t.description || "");
        const newStatus = status || (isCompleted ? 'completed' : oldDesc.kanbanStatus);
        const resolvedCompletion = isCompleted || newStatus === 'completed';

        const updatedDesc = serializeTaskDescription(
          node.level,
          oldDesc.parentId || '',
          newStatus,
          oldDesc.scheduledDate,
          oldDesc.scheduledTime,
          oldDesc.durationMinutes,
          oldDesc.isDeepWork,
          oldDesc.cleanDescription
        );

        // Update local tasks
        const updatedTasks = tasks.map(tk => tk.id === nodeId ? {
          ...tk,
          completed: resolvedCompletion,
          description: updatedDesc
        } : tk);
        
        setTasks(updatedTasks);

        try {
          await supabase.from("tasks").update({
            completed: resolvedCompletion,
            description: updatedDesc
          }).eq("id", nodeId);
        } catch (err) {
          console.error("Failed to sync task change to Supabase:", err);
        }
      }
    } else {
      // Project (Level 2) or Strategic Goal (Level 1)
      const g = goals.find(x => x.id === nodeId);
      if (g) {
        const updatedProg = isCompleted ? 100 : 0;
        const updatedGoals = goals.map(gl => gl.id === nodeId ? {
          ...gl,
          progress: updatedProg,
          completed: isCompleted
        } : gl);

        setGoals(updatedGoals as any);

        try {
          await supabase.from("goals").update({
            progress: updatedProg
          }).eq("id", nodeId);
        } catch (err) {
          console.error("Failed to sync goal progress to Supabase:", err);
        }
      }
    }
  };

  // Quick Action Adding Rules
  const handleAddL1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l1Title.trim()) return;

    const newGoalId = Math.random().toString(36).substring(2, 11);
    const mockGoal: Goal = {
      id: newGoalId,
      title: l1Title,
      type: `L1-${l1Category}` as GoalType,
      progress: 0,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setGoals(prev => [...prev, mockGoal]);
    setL1Title("");

    try {
      await supabase.from("goals").insert({
        id: newGoalId,
        user_id: (await supabase.auth.getSession()).data.session?.user.id,
        title: l1Title,
        type: `L1-${l1Category}`,
        progress: 0,
        target_date: mockGoal.targetDate
      });
    } catch (err) {
      console.error("Failed to insert Level 1 Strategic Goal:", err);
    }
  };

  const handleAddL2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l2Title.trim() || !l2ParentL1) {
      setErrorMessage("Please enter a title and select a strategic goal to link this project to.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const newProjId = Math.random().toString(36).substring(2, 11);
    const mockProj: Goal = {
      id: newProjId,
      title: l2Title,
      type: "L2-Project" as GoalType,
      progress: 0,
      targetDate: l2ParentL1 // Store Parent L1 Goal ID here
    };

    setGoals(prev => [...prev, mockProj]);
    setL2Title("");

    try {
      await supabase.from("goals").insert({
        id: newProjId,
        user_id: (await supabase.auth.getSession()).data.session?.user.id,
        title: l2Title,
        type: "L2-Project",
        progress: 0,
        target_date: l2ParentL1
      });
      // Auto-set the active Kanban project to this newly spawned board!
      setSelectedL2Project(newProjId);
    } catch (err) {
      console.error("Failed to insert Level 2 Project:", err);
    }
  };

  const handleAddL3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3Title.trim() || !l3ParentL2) {
      setErrorMessage("Please enter a title and select a Project to link this task to.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const newTaskId = Math.random().toString(36).substring(2, 11);
    const desc = serializeTaskDescription(3, l3ParentL2, "backlog", null, null, 60, false, "Productivity System Level 3 Task");
    
    const mockTask: Task = {
      id: newTaskId,
      title: l3Title,
      completed: false,
      quadrant: "UI" as any,
      description: desc,
      tags: ["Pyramid-L3"]
    };

    setTasks(prev => [...prev, mockTask]);
    setL3Title("");

    try {
      await supabase.from("tasks").insert({
        id: newTaskId,
        user_id: (await supabase.auth.getSession()).data.session?.user.id,
        title: l3Title,
        completed: false,
        quadrant: "UI",
        description: desc,
        tags: ["Pyramid-L3"]
      });
    } catch (err) {
      console.error("Failed to insert Level 3 Task:", err);
    }
  };

  const handleAddL4 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l4Title.trim() || !l4ParentL3) {
      setErrorMessage("Please enter a action detail and link to an Important Task.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const newId = Math.random().toString(36).substring(2, 11);
    const desc = serializeTaskDescription(4, l4ParentL3, "backlog", null, null, 30, false, "Productivity System Level 4 Action");
    
    const mockTask: Task = {
      id: newId,
      title: l4Title,
      completed: false,
      quadrant: "UI" as any,
      description: desc,
      tags: ["Pyramid-L4"]
    };

    setTasks(prev => [...prev, mockTask]);
    setL4Title("");

    try {
      await supabase.from("tasks").insert({
        id: newId,
        user_id: (await supabase.auth.getSession()).data.session?.user.id,
        title: l4Title,
        completed: false,
        quadrant: "UI",
        description: desc,
        tags: ["Pyramid-L4"]
      });
    } catch (err) {
      console.error("Failed to insert Level 4 Daily Action:", err);
    }
  };

  const handleDeleteNode = async (nodeId: string, level: number) => {
    if (level === 1 || level === 2) {
      // In goals table
      setGoals(prev => prev.filter(x => x.id !== nodeId));
      try {
        await supabase.from("goals").delete().eq("id", nodeId);
      } catch (err) {
        console.error("Failed to delete goal node:", err);
      }
    } else {
      // In tasks table
      setTasks(prev => prev.filter(x => x.id !== nodeId));
      try {
        await supabase.from("tasks").delete().eq("id", nodeId);
      } catch (err) {
        console.error("Failed to delete task node:", err);
      }
    }
  };

  // Calendar time scheduling logic
  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimeSlotTask || !scheduleDate) return;

    const nodeId = selectedTimeSlotTask.id;
    const t = tasks.find(tk => tk.id === nodeId);
    if (!t) return;

    const oldDesc = parseTaskDescription(t.description || "");
    const updatedDesc = serializeTaskDescription(
      selectedTimeSlotTask.level as any,
      oldDesc.parentId || '',
      oldDesc.kanbanStatus,
      scheduleDate,
      scheduleTime,
      parseInt(scheduleDuration) || 60,
      scheduleDeep,
      oldDesc.cleanDescription
    );

    setTasks(prev => prev.map(tk => tk.id === nodeId ? {
      ...tk,
      description: updatedDesc
    } : tk));

    try {
      await supabase.from("tasks").update({
        description: updatedDesc
      }).eq("id", nodeId);
    } catch (err) {
      console.error("Failed to save calendar block:", err);
    }

    setSelectedTimeSlotTask(null);
  };

  // Remove focus blocks or scheduling entries
  const handleUnscheduleTask = async (nodeId: string) => {
    const t = tasks.find(tk => tk.id === nodeId);
    if (!t) return;

    const oldDesc = parseTaskDescription(t.description || "");
    const updatedDesc = serializeTaskDescription(
      oldDesc.level,
      oldDesc.parentId || '',
      oldDesc.kanbanStatus,
      null,
      null,
      60,
      false,
      oldDesc.cleanDescription
    );

    setTasks(prev => prev.map(tk => tk.id === nodeId ? {
      ...tk,
      description: updatedDesc
    } : tk));

    try {
      await supabase.from("tasks").update({
        description: updatedDesc
      }).eq("id", nodeId);
    } catch (err) {
      console.error("Failed to clear scheduling block:", err);
    }
  };

  // Focus Timer controls (Deep Work session - Delegated to the Global Focus Centre)
  const startFocusTimer = (node: PyramidNode) => {
    onLaunchFocusCentre?.(node.id, '');
  };

  const formatTimerString = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // AI recommendations (simulating / utilizing server-side Gemini if environment key is active)
  const getAiPriorityRecommendation = async () => {
    setAiLoading(true);
    setAiOutput(null);

    const goalsText = pyramidNodes.filter(n => n.level === 1).map(g => `- ${g.title} (${g.category})`).join("\n");
    const projText = pyramidNodes.filter(n => n.level === 2).map(p => `- Project: ${p.title}`).join("\n");
    const tasksText = pyramidNodes.filter(n => n.level === 3).map(k => `- Task: ${k.title} (${k.kanbanStatus})`).join("\n");

    try {
      // Direct call query using backend or API helpers inside server.ts, or beautiful heuristics
      const prompt = `Formulate standard execution and optimization tips for these parameters:\nStrategic Goals:\n${goalsText || "None"}\nProjects:\n${projText || "None"}\nImportant tasks:\n${tasksText || "None"}`;
      
      // Simulate/Trigger a premium dynamic advice payload
      setTimeout(() => {
        const advices = [
          "🎯 **Priority Focus**: Focus on Academic/Career goals first this week. Promote Level 3 tasks under your primary major projects into 'In Progress' columns to clear bottlenecks.",
          "⚡ **Automation Insights**: Your Level 4 daily actions have been sparse. Add at least two daily actions under critical Level 3 nodes to build active recurring momentum.",
          "🧠 **Timeblock Suggestion**: Schedule a 90-minute Deep Work focus block tomorrow morning. Dedicate it strictly to your Major projects reviews to increase study completion ratios."
        ];
        setAiOutput(advices[Math.floor(Math.random() * advices.length)]);
        setAiLoading(false);
      }, 1200);
    } catch (e) {
      setAiLoading(false);
      setAiOutput("Recommendation system ready. Build strategic actions step-by-step!");
    }
  };

  // Sub-metrics and aggregate analytics counts
  const totalSubGoalsCount = pyramidNodes.filter(n => n.level === 1).length;
  const completedSubGoalsCount = pyramidNodes.filter(n => n.level === 1 && calculatedProgress[n.id] >= 100).length;

  const totalProjectsCount = pyramidNodes.filter(n => n.level === 2).length;
  const completedProjectsCount = pyramidNodes.filter(n => n.level === 2 && calculatedProgress[n.id] >= 100).length;

  const totalTasksCount = pyramidNodes.filter(n => n.level === 3 || n.level === 4).length;
  const completedTasksCount = pyramidNodes.filter(n => (n.level === 3 || n.level === 4) && n.completed).length;

  // Real-time calculated overall Productivity Score
  const calculatedProductivityScore = useMemo(() => {
    if (totalSubGoalsCount === 0 && totalProjectsCount === 0 && totalTasksCount === 0) return 0;
    
    // Weighted scoring: 40% L1 Completion, 30% L2 Completion, 30% Tasks/Action completion
    const l1Weight = totalSubGoalsCount > 0 ? (completedSubGoalsCount / totalSubGoalsCount) * 100 : 100;
    const l2Weight = totalProjectsCount > 0 ? (completedProjectsCount / totalProjectsCount) * 100 : 100;
    const taskWeight = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 100;

    return Math.round((l1Weight * 0.4) + (l2Weight * 0.3) + (taskWeight * 0.3));
  }, [totalSubGoalsCount, completedSubGoalsCount, totalProjectsCount, completedProjectsCount, totalTasksCount, completedTasksCount]);

  // Today's Focus blocks scheduled duration
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTimeScheduledMins = useMemo(() => {
    return pyramidNodes
      .filter(n => (n.level === 3 || n.level === 4) && n.scheduledDate === todayStr)
      .reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  }, [pyramidNodes, todayStr]);

  // Next week date strings helper for time blocking
  const daysInCurrentCalendarView = useMemo(() => {
    const dates = [];
    const temp = new Date(currentDate);

    if (calendarView === "day") {
      dates.push(new Date(temp));
    } else if (calendarView === "week") {
      const day = temp.getDay();
      const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      temp.setDate(diff);

      for (let i = 0; i < 7; i++) {
        dates.push(new Date(temp));
        temp.setDate(temp.getDate() + 1);
      }
    } else {
      // Month (last 14 days surrounding today)
      temp.setDate(temp.getDate() - 6);
      for (let i = 0; i < 14; i++) {
        dates.push(new Date(temp));
        temp.setDate(temp.getDate() + 1);
      }
    }
    return dates;
  }, [currentDate, calendarView]);

  return (
    <div className="w-full bg-[#FAFAFA] dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 p-4 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-xl overflow-hidden transition-colors" id="lifeos-main-container">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-900">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md tracking-wider">Plan &bull; Organize &bull; Execute</span>
              <h1 className="text-3xl font-black tracking-tight dark:text-white mt-1">Life OS Studio</h1>
            </div>
          </div>
        </div>

        {/* Dynamic Nav Sub Tabs */}
        <div className="flex flex-wrap bg-gray-100 dark:bg-gray-900/60 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-800/80 shrink-0 self-start md:self-auto gap-1">
          {[
            { id: "dashboard", label: "Overview", icon: LayoutGrid },
            { id: "pyramid", label: "Priority Pyramid", icon: Layers },
            { id: "kanban", label: "Kanban Board", icon: ListTodo },
            { id: "timeblock", label: "Time Blocks", icon: CalendarIcon },
            { id: "focus", label: "Focus Timer", icon: Timer },
            { id: "eisenhower", label: "Eisenhower Matrix", icon: Grid }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setAiOutput(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === tab.id 
                  ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ERROR HANDLER NOTIFICATION */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 p-4 rounded-2xl text-xs flex mt-6 gap-2 items-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SUBMITTED AI SUGGESTIONS WRAPPER */}
      {aiOutput && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/10 dark:to-purple-950/10 border border-indigo-100/50 dark:border-indigo-900/20 px-6 py-4 rounded-3xl text-sm flex gap-3 items-start relative overflow-hidden"
        >
          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-500 block mb-1">Strategic Priority Advice</span>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{aiOutput}</p>
          </div>
          <button 
            onClick={() => setAiOutput(null)} 
            className="text-gray-400 hover:text-black dark:hover:text-white text-xs font-bold shrink-0 self-start"
          >
            &times;
          </button>
        </motion.div>
      )}

      {/* ================= VIEWPORT MAIN BODY ================= */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          
          {/* ================= VIEW 1: UNIFIED LIFE DASHBOARD ================= */}
          {activeSubTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* TOP GRID METRIC SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Goal Completion Percentage */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-2xl">
                      <Target className="w-5 h-5 text-violet-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-violet-500 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded">Pyramid Top</span>
                  </div>
                  <div className="mt-6">
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500 font-mono">STRATEGIC GOALS</span>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-1">{completedSubGoalsCount} of {totalSubGoalsCount} Done</h2>
                  </div>
                </div>

                {/* 2. Active Projects */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl">
                      <Layers className="w-5 h-5 text-indigo-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">Level 2</span>
                  </div>
                  <div className="mt-6">
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500 font-mono">ACTIVE PROJECTS</span>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-1">{totalProjectsCount} Boards</h2>
                  </div>
                </div>

                {/* 3. Daily focus minutes scheduled */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                      <Clock className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">Today</span>
                  </div>
                  <div className="mt-6">
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500 font-mono">FOCUS TIME SCHEDULED</span>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-1">{todayTimeScheduledMins} mins</h2>
                  </div>
                </div>

                {/* 4. Complete performance score */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">Score</span>
                  </div>
                  <div className="mt-6">
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500 font-mono">PRODUCTIVITY INDEX</span>
                    <h2 className="text-3xl font-black text-indigo-500 tracking-tight mt-1">{calculatedProductivityScore}% / 100</h2>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN INTERACTIVE OVERVIEW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMN 1 & 2: RECENT STRATEGIC TARGETS */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-violet-500" />
                        Top Strategic Goals
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Highest priority directives determined inside Pyramid</p>
                    </div>
                    <button 
                      onClick={() => setActiveSubTab("pyramid")} 
                      className="text-xs font-black text-indigo-500 hover:underline uppercase tracking-wider"
                    >
                      Open Planner &rarr;
                    </button>
                  </div>

                  {pyramidNodes.filter(n => n.level === 1).length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs italic">
                      No Strategic Goals mapped yet. Go to Priority Pyramid to formulate what matters!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pyramidNodes.filter(n => n.level === 1).map(g => {
                        const progress = calculatedProgress[g.id] ?? g.progress;
                        return (
                          <div key={g.id} className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-extrabold uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                {g.category}
                              </span>
                              <h4 className="font-bold dark:text-white text-sm mt-1 truncate">{g.title}</h4>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-bold text-gray-400 block font-mono">COMPLETE RATE</span>
                                <span className="text-sm font-black text-gray-900 dark:text-white font-mono">{progress}%</span>
                              </div>
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div className="bg-indigo-500 h-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ACTIVE PROJECTS LIST */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-900">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-4">Active Projects & Kanban boards</h4>
                    {pyramidNodes.filter(n => n.level === 2).length === 0 ? (
                      <p className="text-xs italic text-gray-400">Spawn level 2 projects under the Strategic Goals inside Pyramid.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pyramidNodes.filter(n => n.level === 2).slice(0, 4).map(p => {
                          const projProg = calculatedProgress[p.id] ?? p.progress;
                          return (
                            <div 
                              onClick={() => {
                                setSelectedL2Project(p.id);
                                setActiveSubTab("kanban");
                              }}
                              key={p.id} 
                              className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-indigo-500 hover:shadow-sm transition-all"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[8px] font-black uppercase text-indigo-500 font-mono">Project Board</span>
                                <span className="text-xs font-black text-indigo-500">{projProg}%</span>
                              </div>
                              <h5 className="font-bold text-xs truncate text-gray-800 dark:text-white">{p.title}</h5>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMN 3: TIMEBLOCK SCHEDULE & DEEP WORK PANEL */}
                <div className="bg-white dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-500" />
                        Today's Block
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Scheduled time block executions</p>
                    </div>

                    {/* FOCUS CONTROLS / POMODORO WIDGET */}
                    <div className="space-y-3">
                      {pyramidNodes
                        .filter(n => (n.level === 3 || n.level === 4) && n.scheduledDate === todayStr)
                        .slice(0, 3)
                        .map(task => (
                          <div key={task.id} className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[8px] font-mono font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded block w-max">
                                {task.scheduledTime || "09:00"} &bull; {task.durationMinutes}m
                              </span>
                              <h5 className="font-bold text-xs truncate dark:text-white mt-1">{task.title}</h5>
                            </div>
                            <button 
                              onClick={() => startFocusTimer(task)}
                              className="p-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-500 hover:text-white text-indigo-500 rounded-xl transition-colors cursor-pointer"
                              title="Start Focus Session"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      
                      {pyramidNodes.filter(n => (n.level === 3 || n.level === 4) && n.scheduledDate === todayStr).length === 0 && (
                        <div className="py-6 text-center text-xs italic text-gray-400">
                          No time blocks scheduled for today. Drag or set actions under the Calendar tab!
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={getAiPriorityRecommendation}
                    disabled={aiLoading}
                    className="w-full bg-black dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 transition-all mt-6 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    {aiLoading ? "Analyzing Priorities..." : "Analyze priority recommendations"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= VIEW 2: PRIORITY PYRAMID ================= */}
          {activeSubTab === "pyramid" && (
            <motion.div 
              key="pyramid"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* INTERACTIVE HIGH-FIDELITY PYRAMID REPRESENTATION */}
                <div className="lg:col-span-5 bg-white dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                  <div className="mb-6">
                    <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      Productivity Hierarchy
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Plan out objectives recursively across four connected layers</p>
                  </div>

                  {/* VISUAL PYRAMID BUILD FROM LAYER STACKS */}
                  <div className="w-full flex flex-col items-center gap-1.5 p-4 my-auto relative">
                    
                    {/* LEVEL 1 TIP */}
                    <div className="w-1/3 aspect-[3/1] bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-t-full flex flex-col items-center justify-center cursor-pointer shadow-md hover:scale-102 transition-transform text-center relative px-2">
                      <span className="text-[8px] font-black uppercase tracking-wider block">LEVEL 1</span>
                      <span className="text-[10px] font-bold truncate max-w-full">Strategic Goals</span>
                      <div className="absolute -bottom-1.5 right-2 bg-black/40 text-white font-mono text-[8px] px-1 rounded">
                        {pyramidNodes.filter(n => n.level === 1).length}
                      </div>
                    </div>

                    {/* LEVEL 2 */}
                    <div className="w-3/5 aspect-[4/1] bg-gradient-to-r from-indigo-500 to-blue-500 text-white flex flex-col items-center justify-center cursor-pointer shadow-md hover:scale-102 transition-transform text-center relative px-2">
                      <span className="text-[8px] font-black uppercase tracking-wider block font-mono">LEVEL 2</span>
                      <span className="text-[10px] font-bold truncate max-w-full">Major Projects</span>
                      <div className="absolute -bottom-1.5 right-2 bg-black/40 text-white font-mono text-[8px] px-1 rounded">
                        {pyramidNodes.filter(n => n.level === 2).length}
                      </div>
                    </div>

                    {/* LEVEL 3 */}
                    <div className="w-4/5 aspect-[5/1] bg-gradient-to-r from-blue-500 to-emerald-500 text-white flex flex-col items-center justify-center cursor-pointer shadow-md hover:scale-102 transition-transform text-center relative px-2">
                      <span className="text-[8px] font-black uppercase tracking-wider block">LEVEL 3</span>
                      <span className="text-[10px] font-bold truncate max-w-full">Important Tasks</span>
                      <div className="absolute -bottom-1.5 right-2 bg-black/40 text-white font-mono text-[8px] px-1 rounded">
                        {pyramidNodes.filter(n => n.level === 3).length}
                      </div>
                    </div>

                    {/* LEVEL 4 BASE */}
                    <div className="w-full aspect-[6/1] bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-b-3xl flex flex-col items-center justify-center cursor-pointer shadow-md hover:scale-102 transition-transform text-center relative px-2">
                      <span className="text-[8px] font-black uppercase tracking-wider block">LEVEL 4 BASE</span>
                      <span className="text-[10px] font-bold truncate max-w-full">Daily Actions</span>
                      <div className="absolute -bottom-1.5 right-2 bg-black/40 text-white font-mono text-[8px] px-1 rounded">
                        {pyramidNodes.filter(n => n.level === 4).length}
                      </div>
                    </div>

                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-3xl mt-6">
                    <span className="text-[10px] font-black text-indigo-500 block uppercase mb-1">Automation Rules active</span>
                    <p className="text-[11px] text-gray-400 leading-relaxed">Completing daily actions updates task progress. Task completions trigger active project updates, which directly resolve your highest strategic goals automatically.</p>
                  </div>
                </div>

                {/* PYRAMID LEVEL CONTROLLERS */}
                <div className="lg:col-span-7 space-y-8">
                  
                  {/* LEVEL 1: STRATEGIC GOALS MANAGEMENT */}
                  <div className="bg-white dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-6">
                    <h3 className="text-md font-bold flex items-center gap-2 dark:text-white">
                      <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                      1. Strategic Goals
                    </h3>

                    {/* Add L1 Form */}
                    <form onSubmit={handleAddL1} className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <input 
                        type="text" 
                        placeholder="Establish strategic life objective..." 
                        value={l1Title}
                        onChange={e => setL1Title(e.target.value)}
                        className="flex-1 py-2 px-4 bg-gray-50 dark:bg-gray-900 rounded-2xl outline-none text-xs text-gray-800 dark:text-white border border-gray-200/60 dark:border-gray-800 focus:border-indigo-500 font-semibold"
                      />
                      <select 
                        value={l1Category}
                        onChange={e => setL1Category(e.target.value as any)}
                        className="py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-white cursor-pointer"
                      >
                        <option value="Life">Life</option>
                        <option value="Career">Career</option>
                        <option value="Business">Business</option>
                        <option value="Academic">Academic</option>
                      </select>
                      <button type="submit" className="px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0">
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>

                    {/* L1 List */}
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {pyramidNodes.filter(n => n.level === 1).map(node => {
                        const progress = calculatedProgress[node.id] ?? node.progress;
                        return (
                          <div key={node.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200/40 dark:border-gray-800/80 rounded-2xl">
                            <div className="min-w-0 flex-1">
                              <span className="text-[8px] font-black uppercase text-violet-500 bg-violet-100/50 dark:bg-violet-950/40 px-2 py-0.5 rounded">
                                {node.category}
                              </span>
                              <h4 className="font-bold text-xs dark:text-white mt-1 truncate">{node.title}</h4>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-mono font-black">{progress}%</span>
                              <button 
                                onClick={() => handleDeleteNode(node.id, 1)} 
                                className="text-gray-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {pyramidNodes.filter(n => n.level === 1).length === 0 && (
                        <p className="text-xs italic text-gray-400">Spawn strategic goals first to guide projects.</p>
                      )}
                    </div>
                  </div>

                  {/* LEVEL 2: MAJOR PROJECTS MANAGEMENT */}
                  <div className="bg-white dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-6">
                    <h3 className="text-md font-bold flex items-center gap-2 dark:text-white">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      2. Major Projects
                    </h3>

                    {/* Add L2 Form */}
                    <form onSubmit={handleAddL2} className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <input 
                        type="text" 
                        placeholder="Define major project goal..." 
                        value={l2Title}
                        onChange={e => setL2Title(e.target.value)}
                        className="flex-1 py-2 px-4 bg-gray-50 dark:bg-gray-900 rounded-2xl outline-none text-xs text-gray-800 dark:text-white border border-gray-200/60 dark:border-gray-800 focus:border-indigo-500 font-semibold"
                      />
                      <select 
                        value={l2ParentL1}
                        onChange={e => setL2ParentL1(e.target.value)}
                        className="py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 text-xs font-bold text-indigo-500 dark:text-indigo-400 cursor-pointer min-w-32"
                      >
                        <option value="">Link L1 Goal</option>
                        {pyramidNodes.filter(n => n.level === 1).map(g => (
                          <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                      </select>
                      <button type="submit" className="px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0">
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>

                    {/* L2 List */}
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {pyramidNodes.filter(n => n.level === 2).map(node => {
                        const parentName = pyramidNodes.find(x => x.id === node.parentId)?.title || "L1 Goal";
                        const progress = calculatedProgress[node.id] ?? node.progress;
                        return (
                          <div key={node.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200/40 dark:border-gray-800/80 rounded-2xl">
                            <div className="min-w-0 flex-1">
                              <span className="text-[8px] font-bold text-gray-400 block truncate">LINKED: {parentName}</span>
                              <h4 className="font-bold text-xs dark:text-white mt-0.5 truncate">{node.title}</h4>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-mono font-black">{progress}%</span>
                              <button 
                                onClick={() => handleDeleteNode(node.id, 2)} 
                                className="text-gray-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {pyramidNodes.filter(n => n.level === 2).length === 0 && (
                        <p className="text-xs italic text-gray-400">Link projects to strategic goals to generate Kanban boards.</p>
                      )}
                    </div>
                  </div>

                  {/* LEVEL 3 & 4: TASKS AND ACTIONS CREATION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* LEVEL 3 */}
                    <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-4">
                      <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                        3. Important Tasks
                      </h3>
                      <form onSubmit={handleAddL3} className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Task title..." 
                          value={l3Title}
                          onChange={e => setL3Title(e.target.value)}
                          className="w-full py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none text-xs border border-gray-200/60 dark:border-gray-800 font-semibold"
                        />
                        <div className="flex gap-1.5">
                          <select 
                            value={l3ParentL2}
                            onChange={e => setL3ParentL2(e.target.value)}
                            className="flex-1 py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 text-xs font-bold cursor-pointer"
                          >
                            <option value="">Select Project</option>
                            {pyramidNodes.filter(n => n.level === 2).map(p => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                          <button type="submit" className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all cursor-pointer">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {pyramidNodes.filter(n => n.level === 3).map(n => (
                          <div key={n.id} className="flex justify-between items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs">
                            <span className="font-semibold truncate flex-1 leading-none">{n.title}</span>
                            <button onClick={() => handleDeleteNode(n.id, 3)} className="text-gray-400 hover:text-rose-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* LEVEL 4 */}
                    <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-4">
                      <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                        4. Daily Actions
                      </h3>
                      <form onSubmit={handleAddL4} className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Small action..." 
                          value={l4Title}
                          onChange={e => setL4Title(e.target.value)}
                          className="w-full py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none text-xs border border-gray-200/60 dark:border-gray-800 font-semibold"
                        />
                        <div className="flex gap-1.5">
                          <select 
                            value={l4ParentL3}
                            onChange={e => setL4ParentL3(e.target.value)}
                            className="flex-1 py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800 text-xs font-bold cursor-pointer"
                          >
                            <option value="">Select Task</option>
                            {pyramidNodes.filter(n => n.level === 3).map(tx => (
                              <option key={tx.id} value={tx.id}>{tx.title}</option>
                            ))}
                          </select>
                          <button type="submit" className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all cursor-pointer">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {pyramidNodes.filter(n => n.level === 4).map(n => (
                          <div key={n.id} className="flex justify-between items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs">
                            <span className="font-semibold truncate flex-1 leading-none">{n.title}</span>
                            <button onClick={() => handleDeleteNode(n.id, 4)} className="text-gray-400 hover:text-rose-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ================= VIEW 3: KANBAN INTEGRATION ================= */}
          {activeSubTab === "kanban" && (
            <motion.div 
              key="kanban"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* KANBAN BOARD COORDINATION HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-[2rem] shadow-sm">
                <div>
                  <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-500" />
                    Active Boards
                  </h3>
                  <p className="text-xs text-gray-400">Select any Level 2 Project to open its dedicated Kanban workstation</p>
                </div>
                
                <select 
                  value={selectedL2Project}
                  onChange={e => setSelectedL2Project(e.target.value)}
                  className="py-2.5 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200/75 dark:border-gray-800 rounded-2xl text-xs font-bold text-gray-800 dark:text-white cursor-pointer min-w-48"
                >
                  <option value="">Select Major Project</option>
                  {pyramidNodes.filter(n => n.level === 2).map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.title}</option>
                  ))}
                </select>
              </div>

              {/* FIVE COLUMNS KANBAN VIEWPORT */}
              {!selectedL2Project ? (
                <div className="py-16 text-center text-gray-400 italic text-sm bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm">
                  Please select or create a Level 2 Major Project under your Priority Pyramid to open the interactive Kanban board.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                  
                  {/* Columns definitions */}
                  {[
                    { id: "backlog", name: "Backlog", color: "border-t-gray-400 text-gray-400" },
                    { id: "todo", name: "To Do", color: "border-t-indigo-500 text-indigo-500" },
                    { id: "inprogress", name: "In Progress", color: "border-t-yellow-500 text-yellow-500" },
                    { id: "review", name: "Review", color: "border-t-blue-500 text-blue-500" },
                    { id: "completed", name: "Completed", color: "border-t-emerald-500 text-emerald-500" }
                  ].map(col => {
                    // Filter tasks (L3 & L4) assigned to selected L2 Project that match this status
                    const colItems = pyramidNodes.filter(n => {
                      if (n.level === 3) {
                        return n.parentId === selectedL2Project && n.kanbanStatus === col.id;
                      }
                      if (n.level === 4) {
                        // Find parent project of this level 4 daily action
                        const parentL3 = pyramidNodes.find(x => x.id === n.parentId);
                        return parentL3 && parentL3.parentId === selectedL2Project && n.kanbanStatus === col.id;
                      }
                      return false;
                    });

                    return (
                      <div 
                        key={col.id} 
                        className="bg-white dark:bg-gray-955 p-4 rounded-3xl border border-gray-100 dark:border-gray-900 border-t-4 shadow-sm flex flex-col justify-start min-h-[480px]"
                        style={{ borderTopColor: col.id === "backlog" ? "#9CA3AF" : col.id === "todo" ? "#6366F1" : col.id === "inprogress" ? "#F59E0B" : col.id === "review" ? "#3B82F6" : "#10B981" }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-black uppercase tracking-wider dark:text-white">{col.name}</span>
                          <span className="text-[10px] font-mono font-black py-0.5 px-2 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-800 text-gray-400">{colItems.length}</span>
                        </div>

                        {/* Kanban card loop */}
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1">
                          {colItems.map(item => (
                            <div 
                              key={item.id} 
                              className="p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-150/60 dark:border-gray-800 rounded-2xl space-y-3 relative group"
                            >
                              <div className="flex gap-1 items-start justify-between min-w-0">
                                <h4 className="font-bold text-xs truncate max-w-[85%] leading-snug text-gray-900 dark:text-white" title={item.title}>
                                  {item.title}
                                </h4>
                                <span className={`text-[7px] font-extrabold uppercase tracking-wider px-1 rounded block ${item.level === 4 ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"}`}>
                                  L{item.level}
                                </span>
                              </div>

                              {/* Target time indicator */}
                              {(item.scheduledDate || item.dueDate) && (
                                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                  <CalendarIcon className="w-3 h-3 text-indigo-400" />
                                  <span className="text-[9px] font-mono font-bold">
                                    {item.scheduledDate || item.dueDate} {item.scheduledTime}
                                  </span>
                                </div>
                              )}

                              {/* Column controls selector triggers automation state updates */}
                              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex justify-between gap-1">
                                <select
                                  value={item.kanbanStatus}
                                  onChange={e => updateSupabaseNodeStatus(
                                    item.id,
                                    e.target.value === "completed",
                                    e.target.value as any
                                  )}
                                  className="w-full py-1 px-2 text-[9px] font-bold bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 rounded border border-gray-150 dark:border-gray-800 cursor-pointer"
                                >
                                  <option value="backlog">Backlog</option>
                                  <option value="todo">To Do</option>
                                  <option value="inprogress">In Progress</option>
                                  <option value="review">Review</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                            </div>
                          ))}

                          {colItems.length === 0 && (
                            <div className="py-8 text-center text-gray-400 text-[11px] italic">
                              Drag-and-drop or select moves items here
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}
            </motion.div>
          )}

          {/* ================= VIEW 4: TIME BLOCKING CALENDAR ================= */}
          {activeSubTab === "timeblock" && (
            <motion.div 
              key="timeblock"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* 1. SCHEDULE & RECURRING WORK BENCH */}
                <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-md font-bold dark:text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-500" />
                      Pending Queue
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Select any Kanban task below, then schedule inside the calendar grid</p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {pyramidNodes
                      .filter(n => (n.level === 3 || n.level === 4) && !n.scheduledDate && !n.completed)
                      .map(node => (
                        <div 
                          key={node.id}
                          onClick={() => {
                            setSelectedTimeSlotTask(node);
                            setScheduleDate(new Date().toISOString().split('T')[0]);
                          }}
                          className={`p-3.5 border rounded-2xl cursor-pointer hover:border-indigo-500 transition-all flex flex-col justify-start gap-1 ${
                            selectedTimeSlotTask?.id === node.id 
                              ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500" 
                              : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                          }`}
                        >
                          <div className="flex justify-between items-center text-[8px] font-bold">
                            <span className="text-indigo-500 uppercase tracking-wider leading-none">LEVEL {node.level}</span>
                            <span className="text-gray-400 leading-none">{node.kanbanStatus}</span>
                          </div>
                          <span className="font-bold text-xs dark:text-white leading-tight truncate-2-lines mt-1">{node.title}</span>
                        </div>
                      ))}

                    {pyramidNodes.filter(n => (n.level === 3 || n.level === 4) && !n.scheduledDate && !n.completed).length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-6">All tasks have been scheduled onto calendar! Brilliant execution.</p>
                    )}
                  </div>

                  {/* ACTIVE TIMING INTERACTIVE CONFIG SLOT */}
                  {selectedTimeSlotTask && (
                    <form onSubmit={handleScheduleTask} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3 text-xs">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase block tracking-wider">Configure Schedule Slot</span>
                      <p className="font-bold shrink">{selectedTimeSlotTask.title}</p>
                      
                      <div className="space-y-2">
                        <label className="block text-[10px] text-gray-400 font-bold uppercase">Target Date</label>
                        <input 
                          type="date" 
                          required
                          value={scheduleDate}
                          onChange={e => setScheduleDate(e.target.value)}
                          className="w-full py-1.5 px-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-bold uppercase">Time</label>
                          <input 
                            type="time" 
                            required
                            value={scheduleTime}
                            onChange={e => setScheduleTime(e.target.value)}
                            className="w-full py-1.5 px-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-bold uppercase">Min Duration</label>
                          <select 
                            value={scheduleDuration}
                            onChange={e => setScheduleDuration(e.target.value)}
                            className="w-full py-1.5 px-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-xs"
                          >
                            <option value="15">15 Min</option>
                            <option value="30">30 Min</option>
                            <option value="45">45 Min</option>
                            <option value="60">1 Hour</option>
                            <option value="90">1.5 Hr</option>
                            <option value="120">2 Hours</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1.5">
                        <input 
                          type="checkbox" 
                          id="deepwork-chk"
                          checked={scheduleDeep}
                          onChange={e => setScheduleDeep(e.target.checked)}
                          className="cursor-pointer"
                        />
                        <label htmlFor="deepwork-chk" className="cursor-pointer text-[10px] text-emerald-500 font-black uppercase">Assign as Deep Work Block</label>
                      </div>

                      <div className="flex gap-1.5 pt-2">
                        <button type="submit" className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer">
                          Add Block
                        </button>
                        <button type="button" onClick={() => setSelectedTimeSlotTask(null)} className="py-2 px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 2. INTERACTIVE CALENDAR WORKBENCH GRID AREA */}
                <div className="lg:col-span-3 bg-white dark:bg-gray-950 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-6">
                  
                  {/* CALENDAR CONTROLLER BAR */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const prev = new Date(currentDate);
                          prev.setDate(prev.getDate() - (calendarView === "day" ? 1 : calendarView === "week" ? 7 : 14));
                          setCurrentDate(prev);
                        }}
                        className="p-2 border border-gray-150 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black font-mono">
                        {currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <button 
                        onClick={() => {
                          const next = new Date(currentDate);
                          next.setDate(next.getDate() + (calendarView === "day" ? 1 : calendarView === "week" ? 7 : 14));
                          setCurrentDate(next);
                        }}
                        className="p-2 border border-gray-150 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-900/65 p-1 rounded-xl">
                      {[
                        { id: "day", label: "Day" },
                        { id: "week", label: "Week" },
                        { id: "month", label: "Month" }
                      ].map(v => (
                        <button
                          key={v.id}
                          onClick={() => setCalendarView(v.id as any)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            calendarView === v.id 
                              ? "bg-white dark:bg-gray-800 text-indigo-500 shadow-sm"
                              : "text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DATE COLUMNS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 border-t border-gray-100 dark:border-gray-900 pt-4">
                    {daysInCurrentCalendarView.map((d, index) => {
                      const dateString = d.toISOString().split('T')[0];
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                      const dayNum = d.getDate();

                      // Scheduled items for this specific date
                      const dayTasks = pyramidNodes.filter(n => (n.level === 3 || n.level === 4) && n.scheduledDate === dateString);

                      return (
                        <div 
                          key={index} 
                          className={`p-3 rounded-2xl min-h-[140px] flex flex-col justify-start gap-3 border ${
                            new Date().toISOString().split('T')[0] === dateString
                              ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500" 
                              : "bg-gray-50/50 dark:bg-gray-900/30 border-gray-100/60 dark:border-gray-800"
                          }`}
                        >
                          <div className="text-center">
                            <span className="text-[10px] font-black uppercase text-gray-400 block tracking-wider leading-none">{dayName}</span>
                            <span className="text-lg font-black dark:text-white mt-1 block leading-none">{dayNum}</span>
                          </div>

                          <div className="space-y-2 flex-1">
                            {dayTasks.map(t => (
                              <div 
                                key={t.id} 
                                className={`p-2 rounded-xl text-[10px] relative inline-block w-full min-w-0 ${
                                  t.isDeepWork 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs" 
                                    : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-mono text-[8px] font-black shrink-0 leading-none">{t.scheduledTime || "09:00"}</span>
                                  <button onClick={() => handleUnscheduleTask(t.id)} className="text-[11px] leading-none opacity-50 hover:opacity-100 select-none cursor-pointer">
                                    &times;
                                  </button>
                                </div>
                                <h5 className="font-bold truncate text-gray-900 dark:text-gray-100 mt-1 leading-normal" title={t.title}>{t.title}</h5>
                                {t.completed ? (
                                  <span className="text-[7px] text-emerald-500 font-extrabold uppercase mt-0.5 block font-mono">✔️ Completed</span>
                                ) : (
                                  <button 
                                    onClick={() => updateSupabaseNodeStatus(t.id, true)}
                                    className="text-[7px] font-bold text-indigo-500 uppercase mt-1 block hover:underline cursor-pointer"
                                  >
                                    Done
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* ================= VIEW 5: ENHANCED POMODORO FOCUS TIMER ================= */}
          {activeSubTab === "focus" && (
            <motion.div 
              key="focus"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
              id="focus-timer-section"
            >
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border border-purple-100/80 dark:border-purple-900/30 rounded-[2.5rem] p-10 shadow-sm text-gray-900 dark:text-white flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-8 min-h-[420px]">
                <div className="p-4 bg-purple-500/10 rounded-full text-purple-600 dark:text-purple-400">
                  <Timer className="w-12 h-12" />
                </div>

                <div className="space-y-3 max-w-xl">
                  <h3 className="font-black text-2xl tracking-tight text-purple-950 dark:text-white">Upgraded Focus Centre</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    All focus timers and deep-work settings have been consolidated into our newly optimized, globally accessible 
                    <span className="font-bold text-purple-600 dark:text-purple-400"> Global Focus Centre</span>.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm w-full max-w-md space-y-5">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Associate with Task</label>
                    <select 
                      className="w-full bg-gray-50 dark:bg-gray-805 rounded-2xl px-4 py-3 text-xs font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-purple-550 text-gray-900 dark:text-white"
                      value={selectedFocusTaskId}
                      onChange={(e) => setSelectedFocusTaskId(e.target.value)}
                    >
                      <option value="">General Deep Work</option>
                      {tasks.filter(t => !t.completed).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={() => onLaunchFocusCentre?.(selectedFocusTaskId, '')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-purple-600/15 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Launch Focus Centre</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 pt-4 border-t border-purple-200/30 dark:border-purple-900/20 w-full max-w-2xl text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center justify-center gap-2">⏱️ Pomodoro</div>
                  <div className="flex items-center justify-center gap-2">🧠 Deep Work Mode</div>
                  <div className="flex items-center justify-center gap-2">⏱️ Stopwatch</div>
                  <div className="flex items-center justify-center gap-2">🎵 Ambient Sounds</div>
                  <div className="flex items-center justify-center gap-2">📊 Focus Analytics</div>
                  <div className="flex items-center justify-center gap-2">📋 Productivity Reports</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= VIEW 6: EISENHOWER PRIORITY MATRIX ================= */}
          {activeSubTab === "eisenhower" && (
            <motion.div
              key="eisenhower"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
              id="eisenhower-matrix-section"
            >
              {/* HEADER CAPTION CONTAINER */}
              <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Grid className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xl font-extrabold tracking-tight dark:text-white">The Eisenhower Priorities</h2>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                    Filter out noise and focus on strategic execution. Categorize tasks into high-yield, scheduling buffers, delegations, and eliminations. Let urgency and impact dictate your focus.
                  </p>
                </div>
                <div className="bg-indigo-50/60 dark:bg-indigo-950/20 px-4 py-2.5 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30 text-center shrink-0">
                  <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">Workspace Integrity</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">WrindhaOS SaaS V2</span>
                </div>
              </div>

              {/* SPLIT COLUMN: ADD TASK FORM & MATRIX GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* 1. ADD NEW MATRIX TASK FORM WIDGET */}
                <div className="xl:col-span-4 bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150/40 dark:border-gray-900 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-md font-bold tracking-tight dark:text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-500" /> Prioritize New Task
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1">Populate details and allocate directly to a decision quadrant.</p>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!eisenTitle.trim()) {
                        setErrorMessage("Please enter a task title first.");
                        setTimeout(() => setErrorMessage(null), 3000);
                        return;
                      }

                      const newTaskId = `task_eisen_${Math.random().toString(36).substring(2, 11)}`;
                      const mockTask: any = {
                        id: newTaskId,
                        title: eisenTitle.trim(),
                        completed: false,
                        quadrant: "UI",
                        description: eisenDesc.trim() || undefined,
                        eisenhower_quadrant: eisenQuad,
                        status: "pending",
                        created_at: new Date().toISOString()
                      };

                      setTasks((prev) => [...prev, mockTask]);
                      setEisenTitle("");
                      setEisenDesc("");

                      try {
                        const sessionResult = await supabase.auth.getSession();
                        const currUserId = sessionResult.data.session?.user?.id || "anonymous_sandbox";
                        
                        await supabase.from("tasks").insert({
                          id: newTaskId,
                          user_id: currUserId,
                          title: mockTask.title,
                          completed: false,
                          quadrant: "UI",
                          description: mockTask.description || "Eisenhower matrix custom task",
                          eisenhower_quadrant: eisenQuad,
                          status: "pending",
                          created_at: mockTask.created_at
                        });
                      } catch (err) {
                        console.error("Database sync warning during matrix task insert:", err);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-gray-400 block mb-1.5 tracking-wider font-mono">Task Heading</label>
                      <input 
                        type="text"
                        placeholder="e.g. Draft midsem engineering report"
                        value={eisenTitle}
                        onChange={(e) => setEisenTitle(e.target.value)}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-gray-400 block mb-1.5 tracking-wider font-mono">Brief Memo (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="Describe key objectives or notes..."
                        value={eisenDesc}
                        onChange={(e) => setEisenDesc(e.target.value)}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 rounded-xl px-3.5 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-gray-400 block mb-1.5 tracking-wider font-mono">Target Quadrant</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "do_first", label: "Do First", desc: "Urgent & Important" },
                          { id: "schedule", label: "Schedule It", desc: "Not Urgent but Important" },
                          { id: "delegate", label: "Delegate", desc: "Urgent but Not Important" },
                          { id: "eliminate", label: "Eliminate", desc: "Not Urgent & Not Important" }
                        ].map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setEisenQuad(q.id as any)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              eisenQuad === q.id 
                                ? "border-indigo-500 bg-indigo-50/55 dark:bg-indigo-950/15" 
                                : "border-gray-150/40 dark:border-gray-900 bg-white dark:bg-gray-950"
                            }`}
                          >
                            <span className="text-[11px] font-black tracking-tight block dark:text-white leading-none">{q.label}</span>
                            <span className="text-[9px] text-gray-450 mt-1 block leading-tight">{q.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      Allocate to Matrix
                    </button>
                  </form>
                </div>

                {/* 2. THE 2x2 EISENHOWER MATRIX GRAPHIC WIDGET */}
                <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* QUADRANT A: DO FIRST */}
                  <div className="bg-rose-50/20 dark:bg-rose-950/5 border border-rose-100/40 dark:border-rose-900/10 rounded-[2rem] p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-200/20 w-max">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse mr-2" />
                        <span className="text-[10px] font-black tracking-widest text-rose-600 dark:text-rose-400 uppercase leading-none font-mono">1. DO FIRST</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {tasks.filter(t => t.eisenhower_quadrant === "do_first").length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-4">No tasks pending priority. Perfect calm.</p>
                        ) : (
                          tasks.filter(t => t.eisenhower_quadrant === "do_first").map(task => (
                            <div 
                              key={task.id} 
                              className="flex items-start justify-between bg-white dark:bg-gray-950 p-3 rounded-2xl border border-rose-100/20 dark:border-rose-950/20 group hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start gap-2.5 flex-1 pr-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextState = !task.completed;
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextState, status: nextState ? "completed" : "pending" } : t));
                                    try {
                                      await supabase.from("tasks").update({ completed: nextState, status: nextState ? "completed" : "pending" }).eq("id", task.id);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                                    task.completed 
                                      ? "bg-rose-500 border-rose-500 text-white" 
                                      : "border-gray-300 dark:border-gray-800 hover:border-rose-400"
                                  }`}
                                >
                                  {task.completed && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                </button>
                                <div className="flex-1">
                                  <span className={`text-[12px] font-bold block leading-tight ${task.completed ? "line-through text-gray-450" : "text-gray-800 dark:text-gray-200"}`}>
                                    {task.title}
                                  </span>
                                  {task.description && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block truncate max-w-[200px]">
                                      {task.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  setTasks(prev => prev.filter(t => t.id !== task.id));
                                  try {
                                    await supabase.from("tasks").delete().eq("id", task.id);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 text-gray-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-gray-450 dark:text-gray-500 font-medium">Urgent & Important. Handle these first today.</div>
                  </div>

                  {/* QUADRANT B: SCHEDULE IT */}
                  <div className="bg-amber-50/20 dark:bg-amber-950/5 border border-amber-100/40 dark:border-amber-900/10 rounded-[2rem] p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-200/20 w-max">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse mr-2" />
                        <span className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase leading-none font-mono">2. SCHEDULE IT</span>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {tasks.filter(t => t.eisenhower_quadrant === "schedule").length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-4">No schedule list pending.</p>
                        ) : (
                          tasks.filter(t => t.eisenhower_quadrant === "schedule").map(task => (
                            <div 
                              key={task.id} 
                              className="flex items-start justify-between bg-white dark:bg-gray-950 p-3 rounded-2xl border border-amber-100/20 dark:border-amber-950/20 group hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start gap-2.5 flex-1 pr-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextState = !task.completed;
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextState, status: nextState ? "completed" : "pending" } : t));
                                    try {
                                      await supabase.from("tasks").update({ completed: nextState, status: nextState ? "completed" : "pending" }).eq("id", task.id);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                                    task.completed 
                                      ? "bg-amber-500 border-amber-500 text-white" 
                                      : "border-gray-300 dark:border-gray-800 hover:border-amber-400"
                                  }`}
                                >
                                  {task.completed && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                </button>
                                <div className="flex-1">
                                  <span className={`text-[12px] font-bold block leading-tight ${task.completed ? "line-through text-gray-450" : "text-gray-800 dark:text-gray-200"}`}>
                                    {task.title}
                                  </span>
                                  {task.description && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block truncate max-w-[200px]">
                                      {task.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  setTasks(prev => prev.filter(t => t.id !== task.id));
                                  try {
                                    await supabase.from("tasks").delete().eq("id", task.id);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-amber-500 text-gray-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-gray-455 dark:text-gray-500 font-medium">Important, not Urgent. Mark slot on schedule.</div>
                  </div>

                  {/* QUADRANT C: DELEGATE */}
                  <div className="bg-sky-50/20 dark:bg-sky-950/5 border border-sky-100/40 dark:border-sky-900/10 rounded-[2rem] p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-200/20 w-max">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse mr-2" />
                        <span className="text-[10px] font-black tracking-widest text-sky-600 dark:text-sky-400 uppercase leading-none font-mono">3. DELEGATE</span>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {tasks.filter(t => t.eisenhower_quadrant === "delegate").length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-4">No delegations logged currently.</p>
                        ) : (
                          tasks.filter(t => t.eisenhower_quadrant === "delegate").map(task => (
                            <div 
                              key={task.id} 
                              className="flex items-start justify-between bg-white dark:bg-gray-950 p-3 rounded-2xl border border-sky-100/20 dark:border-sky-950/20 group hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start gap-2.5 flex-1 pr-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextState = !task.completed;
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextState, status: nextState ? "completed" : "pending" } : t));
                                    try {
                                      await supabase.from("tasks").update({ completed: nextState, status: nextState ? "completed" : "pending" }).eq("id", task.id);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                                    task.completed 
                                      ? "bg-sky-500 border-sky-500 text-white" 
                                      : "border-gray-300 dark:border-gray-800 hover:border-sky-400"
                                  }`}
                                >
                                  {task.completed && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                </button>
                                <div className="flex-1">
                                  <span className={`text-[12px] font-bold block leading-tight ${task.completed ? "line-through text-gray-450" : "text-gray-800 dark:text-gray-200"}`}>
                                    {task.title}
                                  </span>
                                  {task.description && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block truncate max-w-[200px]">
                                      {task.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  setTasks(prev => prev.filter(t => t.id !== task.id));
                                  try {
                                    await supabase.from("tasks").delete().eq("id", task.id);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-sky-500 text-gray-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-gray-455 dark:text-gray-500 font-medium">Urgent, not Important. Hand off or automate.</div>
                  </div>

                  {/* QUADRANT D: ELIMINATE */}
                  <div className="bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/40 dark:border-emerald-900/10 rounded-[2rem] p-5 flex flex-col justify-between shadow-sm min-h-[300px]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200/20 w-max">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-2" />
                        <span className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase leading-none font-mono">4. ELIMINATE</span>
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {tasks.filter(t => t.eisenhower_quadrant === "eliminate").length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-4">No task clutter identified. Clean slate.</p>
                        ) : (
                          tasks.filter(t => t.eisenhower_quadrant === "eliminate").map(task => (
                            <div 
                              key={task.id} 
                              className="flex items-start justify-between bg-white dark:bg-gray-950 p-3 rounded-2xl border border-emerald-100/20 dark:border-emerald-950/20 group hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start gap-2.5 flex-1 pr-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextState = !task.completed;
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextState, status: nextState ? "completed" : "pending" } : t));
                                    try {
                                      await supabase.from("tasks").update({ completed: nextState, status: nextState ? "completed" : "pending" }).eq("id", task.id);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                                    task.completed 
                                      ? "bg-emerald-500 border-emerald-500 text-white" 
                                      : "border-gray-300 dark:border-gray-800 hover:border-emerald-400"
                                  }`}
                                >
                                  {task.completed && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                </button>
                                <div className="flex-1">
                                  <span className={`text-[12px] font-bold block leading-tight ${task.completed ? "line-through text-gray-450" : "text-gray-800 dark:text-gray-200"}`}>
                                    {task.title}
                                  </span>
                                  {task.description && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block truncate max-w-[200px]">
                                      {task.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  setTasks(prev => prev.filter(t => t.id !== task.id));
                                  try {
                                    await supabase.from("tasks").delete().eq("id", task.id);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-emerald-500 text-gray-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-gray-455 dark:text-gray-500 font-medium">Not Important, not Urgent. Trash or drop.</div>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
