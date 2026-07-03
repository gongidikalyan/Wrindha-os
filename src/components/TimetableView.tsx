import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  BookOpen,
  Brain,
  User,
  Users,
  CheckSquare,
  Sparkles,
  AlertCircle,
  Bell,
  CheckCircle2,
  SlidersHorizontal,
  Briefcase,
  MapPin,
  Paperclip,
  RefreshCw,
  ArrowRight,
  Tag,
  Save,
  Check,
  Zap,
  CheckCircle,
  TrendingUp,
  FileText,
  HelpCircle,
  CalendarDays,
} from "lucide-react";
import { cn } from "../lib/utils";
import { TimetableEntry, TimetableType, StudyCourse, Task, StudySession, Goal } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface TimetableViewProps {
  entries: TimetableEntry[];
  setEntries: (e: React.SetStateAction<TimetableEntry[]>) => void;
  onDelete: (id: string) => void;
  theme: "light" | "dark";
  courses: StudyCourse[];
  setCourses?: React.Dispatch<React.SetStateAction<StudyCourse[]>>;
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  onLaunchFocusCentre?: (taskId?: string, courseId?: string) => void;
  goals?: Goal[];
}

interface SavedFilter {
  id: string;
  name: string;
  search: string;
  category: string;
  priority: string;
  subjectId: string;
}

export function TimetableView({
  entries,
  setEntries,
  onDelete,
  theme,
  courses,
  setCourses,
  tasks = [],
  setTasks,
  studySessions,
  setStudySessions,
  onLaunchFocusCentre,
  goals = [],
}: TimetableViewProps) {
  // Calendar Navigation States
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  // Views: week (default), day, month, agenda
  const [viewTab, setViewTab] = useState<"week" | "day" | "month" | "agenda">("week");
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterCompletion, setFilterCompletion] = useState("All"); // All, Active, Completed
  
  // Saved Filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem("wrindha_saved_timetable_filters");
    return saved ? JSON.parse(saved) : [
      { id: "1", name: "⚠️ Urgent Classes", search: "", category: "Class", priority: "urgent", subjectId: "All" },
      { id: "2", name: "🧠 Deep Study", search: "", category: "Study Session", priority: "All", subjectId: "All" }
    ];
  });
  const [newFilterName, setNewFilterName] = useState("");
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);

  // Form Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);

  // Notifications State
  const [notification, setNotification] = useState<{ message: string; entry?: TimetableEntry } | null>(null);

  // New Event Form Fields
  const [formFields, setFormFields] = useState<{
    title: string;
    description: string;
    type: TimetableType;
    date: string;
    startTime: string;
    endTime: string;
    specifyTime: boolean;
    color: string;
    category: string;
    priority: "low" | "medium" | "high" | "urgent";
    location: string;
    notes: string;
    recurring: "none" | "daily" | "weekly" | "monthly" | "alternate" | "custom";
    reminderMinutes: number;
    subjectId: string;
    attachments: { id: string; name: string; url: string }[];
  }>({
    title: "",
    description: "",
    type: TimetableType.WEEKLY,
    date: selectedDateStr,
    startTime: "09:00",
    endTime: "10:00",
    specifyTime: true,
    color: "bg-indigo-500",
    category: "Study Session",
    priority: "medium",
    location: "",
    notes: "",
    recurring: "none",
    reminderMinutes: 15,
    subjectId: "",
    attachments: []
  });

  // Keep date synced
  useEffect(() => {
    setFormFields(prev => ({ ...prev, date: selectedDateStr }));
  }, [selectedDateStr]);

  // Recurrence occurrences generator
  const getEventsForDate = (dateStr: string): TimetableEntry[] => {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const targetTime = targetDate.getTime();

    const output: TimetableEntry[] = [];

    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      const entryTime = entryDate.getTime();

      // If in future relative to when it starts
      if (targetTime < entryTime) return;

      const diffTime = targetTime - entryTime;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let isMatch = false;

      if (entry.date === dateStr) {
        isMatch = true;
      } else if (entry.recurring && entry.recurring !== "none") {
        if (entry.recurring === "daily") {
          isMatch = true;
        } else if (entry.recurring === "weekly") {
          isMatch = entryDate.getDay() === targetDate.getDay();
        } else if (entry.recurring === "monthly") {
          isMatch = entryDate.getDate() === targetDate.getDate();
        } else if (entry.recurring === "alternate") {
          // Every 2 weeks (14 days)
          isMatch = (entryDate.getDay() === targetDate.getDay()) && (Math.floor(diffDays / 7) % 2 === 0);
        }
      }

      if (isMatch) {
        // Return a virtual clone of the entry for this specific date
        output.push({
          ...entry,
          date: dateStr, // Override to match target date
          id: entry.recurring && entry.recurring !== "none" ? `${entry.id}-${dateStr}` : entry.id, // Unique ID for occurrences
          parentId: entry.id // Reference original
        } as TimetableEntry);
      }
    });

    return output;
  };

  // Real-time notification polling / trigger (In-App Reminders)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const todayEvents = getEventsForDate(todayStr);

      const minutesNow = now.getHours() * 60 + now.getMinutes();

      todayEvents.forEach(e => {
        if (!e.startTime || e.completed) return;
        const [h, m] = e.startTime.split(":").map(Number);
        const eventMinutes = h * 60 + m;

        const reminderOffset = e.reminderMinutes || 15;
        const diff = eventMinutes - minutesNow;

        // If event is starting in exactly `reminderOffset` minutes, show toast
        if (diff === reminderOffset) {
          // Trigger custom browser/in-app alert
          setNotification({
            message: `⏰ Study Reminder: "${e.title}" is scheduled to start in ${reminderOffset} minutes!`,
            entry: e
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Run once on load
    return () => clearInterval(interval);
  }, [entries]);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    e.dataTransfer.setData("text/plain", entryId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const entryId = e.dataTransfer.getData("text/plain");
    if (!entryId) return;

    // Is it a virtual recurring occurrence? If so, get original ID
    const baseId = entryId.includes("-202") ? entryId.split("-202")[0] : entryId;

    const updatedEntries = entries.map(item => {
      if (item.id === baseId) {
        return { ...item, date: targetDateStr };
      }
      return item;
    });

    setEntries(updatedEntries);
    localStorage.setItem("wrindha_timetable", JSON.stringify(updatedEntries));
  };

  // Filter & Search Engine
  const getFilteredEntries = (dateStr?: string): TimetableEntry[] => {
    let list: TimetableEntry[] = [];
    
    if (dateStr) {
      list = getEventsForDate(dateStr);
    } else {
      // For global views like Agenda, generate virtual occurrences for next 30 days
      const days: string[] = [];
      const tempDate = new Date();
      for (let i = 0; i < 30; i++) {
        days.push(tempDate.toISOString().split("T")[0]);
        tempDate.setDate(tempDate.getDate() + 1);
      }
      const allOccurrences: TimetableEntry[] = [];
      const seen = new Set<string>();
      days.forEach(d => {
        getEventsForDate(d).forEach(e => {
          const uniqueKey = `${e.id}-${e.date}`;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            allOccurrences.push(e);
          }
        });
      });
      list = allOccurrences;
    }

    return list.filter(e => {
      // Search text query
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter
      const matchCategory = filterCategory === "All" || e.category === filterCategory;

      // Priority filter
      const matchPriority = filterPriority === "All" || e.priority === filterPriority;

      // Subject/Course filter
      const matchSubject = filterSubject === "All" || e.subjectId === filterSubject;

      // Completion Status filter
      const matchCompletion =
        filterCompletion === "All" ||
        (filterCompletion === "Completed" && e.completed) ||
        (filterCompletion === "Active" && !e.completed);

      return matchSearch && matchCategory && matchPriority && matchSubject && matchCompletion;
    });
  };

  // Create or Update Entry Handler
  const handleSaveEntry = () => {
    if (!formFields.title || !formFields.date) return;

    if (editingEntry) {
      // UPDATE
      const baseId = editingEntry.id.includes("-202") ? editingEntry.id.split("-202")[0] : editingEntry.id;
      const updated = entries.map(item => {
        if (item.id === baseId) {
          return {
            ...item,
            title: formFields.title,
            description: formFields.description,
            type: formFields.type,
            date: formFields.date,
            startTime: formFields.specifyTime ? formFields.startTime : undefined,
            endTime: formFields.specifyTime ? formFields.endTime : undefined,
            color: formFields.color,
            category: formFields.category,
            priority: formFields.priority,
            location: formFields.location,
            notes: formFields.notes,
            recurring: formFields.recurring,
            reminderMinutes: formFields.reminderMinutes,
            subjectId: formFields.subjectId,
            attachments: formFields.attachments,
          };
        }
        return item;
      });
      setEntries(updated);
      localStorage.setItem("wrindha_timetable", JSON.stringify(updated));
      setEditingEntry(null);
    } else {
      // CREATE NEW
      const newEntry: TimetableEntry = {
        id: Math.random().toString(36).substr(2, 9),
        title: formFields.title,
        description: formFields.description,
        type: formFields.type,
        date: formFields.date,
        startTime: formFields.specifyTime ? formFields.startTime : undefined,
        endTime: formFields.specifyTime ? formFields.endTime : undefined,
        color: formFields.color,
        category: formFields.category,
        priority: formFields.priority,
        location: formFields.location,
        notes: formFields.notes,
        recurring: formFields.recurring,
        reminderMinutes: formFields.reminderMinutes,
        subjectId: formFields.subjectId,
        attachments: formFields.attachments,
        completed: false
      };

      const updated = [...entries, newEntry];
      setEntries(updated);
      localStorage.setItem("wrindha_timetable", JSON.stringify(updated));
    }

    // Reset Form
    setFormFields({
      title: "",
      description: "",
      type: TimetableType.WEEKLY,
      date: selectedDateStr,
      startTime: "09:00",
      endTime: "10:00",
      specifyTime: true,
      color: "bg-indigo-500",
      category: "Study Session",
      priority: "medium",
      location: "",
      notes: "",
      recurring: "none",
      reminderMinutes: 15,
      subjectId: "",
      attachments: []
    });
    setShowAddModal(false);
  };

  // Populate form for editing
  const handleEditClick = (e: React.MouseEvent, entry: TimetableEntry) => {
    e.stopPropagation();
    setEditingEntry(entry);
    setFormFields({
      title: entry.title,
      description: entry.description || "",
      type: entry.type || TimetableType.WEEKLY,
      date: entry.date,
      startTime: entry.startTime || "09:00",
      endTime: entry.endTime || "10:00",
      specifyTime: !!entry.startTime,
      color: entry.color || "bg-indigo-500",
      category: entry.category || "Study Session",
      priority: entry.priority || "medium",
      location: entry.location || "",
      notes: entry.notes || "",
      recurring: entry.recurring || "none",
      reminderMinutes: entry.reminderMinutes || 15,
      subjectId: entry.subjectId || "",
      attachments: entry.attachments || []
    });
    setShowAddModal(true);
  };

  // Convert a timetable block into a study session (Integration)
  const handleConvertToStudySession = (entry: TimetableEntry) => {
    if (!entry.subjectId) {
      alert("Please connect this block to a subject first to log study hours!");
      return;
    }

    // Calculate duration in minutes
    let duration = 60;
    if (entry.startTime && entry.endTime) {
      const [sh, sm] = entry.startTime.split(":").map(Number);
      const [eh, em] = entry.endTime.split(":").map(Number);
      duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration < 0) duration += 24 * 60;
    }

    const newSession: StudySession = {
      id: Math.random().toString(36).substr(2, 9),
      courseId: entry.subjectId,
      sessionDate: entry.date,
      durationMinutes: duration,
      topic: entry.title,
      notes: entry.notes || entry.description || "Auto-logged from Timetable activity",
    };

    const updatedSessions = [...studySessions, newSession];
    setStudySessions(updatedSessions);
    localStorage.setItem("wrindha_study_sessions", JSON.stringify(updatedSessions));

    // Mark event as completed
    const baseId = entry.id.includes("-202") ? entry.id.split("-202")[0] : entry.id;
    const updatedEntries = entries.map(item => {
      if (item.id === baseId) {
        return { ...item, completed: true };
      }
      return item;
    });
    setEntries(updatedEntries);
    localStorage.setItem("wrindha_timetable", JSON.stringify(updatedEntries));

    // Dynamic alert
    setNotification({
      message: `🎉 Successfully converted "${entry.title}" into a logged Study Session! Planned hours synced.`
    });
  };

  // Launch Focus Centre Integration
  const handleStartFocus = (entry: TimetableEntry) => {
    if (onLaunchFocusCentre) {
      // Find a matching task, or pass the connected subject/course ID
      onLaunchFocusCentre(undefined, entry.subjectId || undefined);
    }
  };

  // Smart Timetable Scheduler / Recommendations (Integrates with Revision Planner)
  const handleAutoRecommendSlots = () => {
    // Generate a set of proposed 2h study blocks during free hours for the coming week
    const recommendations: TimetableEntry[] = [];
    const subjects = courses;

    if (subjects.length === 0) {
      alert("Please set up your subjects in the Study Planner first so we can schedule revision slots for them!");
      return;
    }

    // Propose 3 non-conflicting study blocks over the next 3 days
    const nextThreeDays = [1, 2, 3].map(offset => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().split("T")[0];
    });

    // Clean slot times
    const proposedTimes = [
      { start: "10:00", end: "12:00", label: "Morning Fresh Brain Revision" },
      { start: "16:00", end: "18:00", label: "Evening Focused Drill" },
      { start: "20:00", end: "22:00", label: "Night Review & Checklist" }
    ];

    let proposalsAdded = 0;

    nextThreeDays.forEach((dayStr, dIdx) => {
      const existingEvents = getEventsForDate(dayStr);
      
      proposedTimes.forEach((timeOpt, tIdx) => {
        // Check for overlaps
        const hasOverlap = existingEvents.some(evt => {
          if (!evt.startTime || !evt.endTime) return false;
          return (timeOpt.start < evt.endTime && timeOpt.end > evt.startTime);
        });

        if (!hasOverlap && proposalsAdded < 3) {
          const subject = subjects[(dIdx + tIdx) % subjects.length];
          recommendations.push({
            id: `proposal-${Math.random().toString(36).substr(2, 5)}`,
            title: `📚 Revision: ${subject.name}`,
            type: TimetableType.WEEKLY,
            date: dayStr,
            startTime: timeOpt.start,
            endTime: timeOpt.end,
            color: "bg-amber-500",
            category: "Study Session",
            priority: "high",
            notes: `Recommended study block for ${subject.name}. Avoids calendar conflicts and targets peak focus hours.`,
            subjectId: subject.id,
            completed: false
          });
          proposalsAdded++;
        }
      });
    });

    if (recommendations.length > 0) {
      const updatedEntries = [...entries, ...recommendations];
      setEntries(updatedEntries);
      localStorage.setItem("wrindha_timetable", JSON.stringify(updatedEntries));
      setShowRecommendationModal(false);
      setNotification({
        message: `⚡ Conflict-free Revision Calendar slots generated for your subjects! ${recommendations.length} new blocks added.`
      });
    } else {
      alert("Your timetable is completely packed! Clear some blocks to generate recommendations.");
    }
  };

  // Convert To-Do task directly into Calendar Block
  const handleDragTaskToCalendar = (task: Task, dateStr: string) => {
    const newEntry: TimetableEntry = {
      id: Math.random().toString(36).substr(2, 9),
      title: task.title,
      description: task.description,
      type: TimetableType.WEEKLY,
      date: dateStr,
      startTime: "11:00",
      endTime: "12:00",
      color: "bg-cyan-500",
      category: "Task",
      priority: task.quadrant === "UI" ? "urgent" : "medium",
      completed: task.completed,
    };

    const updated = [...entries, newEntry];
    setEntries(updated);
    localStorage.setItem("wrindha_timetable", JSON.stringify(updated));

    setNotification({
      message: `📅 Placed To-Do Task "${task.title}" onto your schedule!`
    });
  };

  // Toggle Event Completion
  const handleToggleCompleted = (e: React.MouseEvent, entry: TimetableEntry) => {
    e.stopPropagation();
    const baseId = entry.id.includes("-202") ? entry.id.split("-202")[0] : entry.id;
    const updated = entries.map(item => {
      if (item.id === baseId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    setEntries(updated);
    localStorage.setItem("wrindha_timetable", JSON.stringify(updated));
  };

  // Saved Filters Logic
  const handleSaveFilter = () => {
    if (!newFilterName) return;
    const item: SavedFilter = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFilterName,
      search: searchQuery,
      category: filterCategory,
      priority: filterPriority,
      subjectId: filterSubject
    };
    const updated = [...savedFilters, item];
    setSavedFilters(updated);
    localStorage.setItem("wrindha_saved_timetable_filters", JSON.stringify(updated));
    setNewFilterName("");
    setShowSaveFilterModal(false);
  };

  const handleApplySavedFilter = (sf: SavedFilter) => {
    setSearchQuery(sf.search);
    setFilterCategory(sf.category);
    setFilterPriority(sf.priority);
    setFilterSubject(sf.subjectId);
  };

  const handleDeleteSavedFilter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem("wrindha_saved_timetable_filters", JSON.stringify(updated));
  };

  // Date Nav Helpers
  const adjustDate = (days: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + days);
    setCurrentDate(next);
    setSelectedDateStr(next.toISOString().split("T")[0]);
  };

  const adjustMonth = (months: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + months);
    setCurrentDate(next);
    setSelectedDateStr(next.toISOString().split("T")[0]);
  };

  // Get start of the week for weekly calendar grid
  const getStartOfWeek = (d: Date) => {
    const start = new Date(d);
    const day = start.getDay();
    const diff = start.getDate() - day; // adjust when day is sunday
    return new Date(start.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-8" id="enhanced-timetable-dashboard">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-4 md:right-8 z-50 max-w-md bg-white dark:bg-gray-900 border-2 border-indigo-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-500">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Timetable Assistant</h4>
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">{notification.message}</p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {notification.entry && (
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    handleStartFocus(notification.entry!);
                    setNotification(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5" /> Start Focus Session
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Module Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-cyan-500/10 rounded-2xl text-cyan-500">
              <CalendarIcon className="w-8 h-8" />
            </span>
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Universal Timetable
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 max-w-2xl">
            Streamline classes, revisions, and personal milestones. Map slots into active study hours, sync tasks, and focus instantly.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowRecommendationModal(true)}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/15 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Recommend Study Times
          </button>
          
          <button 
            onClick={() => {
              setEditingEntry(null);
              setFormFields({
                title: "",
                description: "",
                type: TimetableType.WEEKLY,
                date: selectedDateStr,
                startTime: "09:00",
                endTime: "10:00",
                specifyTime: true,
                color: "bg-indigo-500",
                category: "Study Session",
                priority: "medium",
                location: "",
                notes: "",
                recurring: "none",
                reminderMinutes: 15,
                subjectId: "",
                attachments: []
              });
              setShowAddModal(true);
            }} 
            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Block
          </button>
        </div>
      </div>

      {/* Primary Toolbar & Navigation Tabs */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-[2rem] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
        
        {/* Navigation Arrows & Current Label */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl border border-gray-150/40 dark:border-gray-700/30">
            <button 
              onClick={() => {
                if (viewTab === "day") adjustDate(-1);
                else if (viewTab === "week") adjustDate(-7);
                else adjustMonth(-1);
              }}
              className="p-2.5 text-gray-500 hover:text-indigo-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-4 font-black text-xs uppercase tracking-widest text-gray-800 dark:text-gray-200 min-w-[150px] text-center">
              {viewTab === "day" && new Date(selectedDateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {viewTab === "week" && `Wk: ${startOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              {(viewTab === "month" || viewTab === "agenda") && currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            
            <button 
              onClick={() => {
                if (viewTab === "day") adjustDate(1);
                else if (viewTab === "week") adjustDate(7);
                else adjustMonth(1);
              }}
              className="p-2.5 text-gray-500 hover:text-indigo-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jump to Today */}
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDateStr(new Date().toISOString().split("T")[0]);
            }}
            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-150/40 dark:border-gray-700/30 hover:border-indigo-400 dark:hover:border-indigo-600 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* View Selection Buttons */}
        <div className="flex bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-150/40 dark:border-gray-700/30 w-full sm:w-auto">
          {[
            { id: "week", label: "Weekly View" },
            { id: "day", label: "Daily View" },
            { id: "month", label: "Monthly View" },
            { id: "agenda", label: "Agenda List" }
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setViewTab(v.id as any)}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                viewTab === v.id 
                  ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm font-black border border-gray-100 dark:border-gray-650" 
                  : "text-gray-500 dark:text-gray-400 hover:text-indigo-600"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Workspace Area (Grid structure) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* LEFT BAR: Search, Filters, Saved Filters, Unscheduled Tasks */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Advanced Search & Filtering Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2rem] shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-gray-850">
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" /> Filter Engine
              </h3>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterCategory("All");
                  setFilterPriority("All");
                  setFilterSubject("All");
                  setFilterCompletion("All");
                }}
                className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wide cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Title Search */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Search Block Titles</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g., Exam Prep, Class..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-xs font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
              >
                <option value="All">All Categories</option>
                <option value="Class">🏫 Classes</option>
                <option value="Study Session">🧠 Study Sessions</option>
                <option value="Personal Event">👤 Personal Events</option>
                <option value="Meeting">👥 Meetings</option>
                <option value="Task">📋 Tasks</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Priority Level</label>
              <div className="grid grid-cols-2 gap-2">
                {["All", "urgent", "high", "medium", "low"].map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={cn(
                      "py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                      filterPriority === p
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
                        : "bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-gray-850"
                    )}
                  >
                    {p === "All" ? "All Levels" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Selector */}
            {courses.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Connected Subject</label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-xs font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
                >
                  <option value="All">All Subjects</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Saved Filters Trigger */}
            <div className="pt-3 border-t border-gray-50 dark:border-gray-850 space-y-3">
              <button
                onClick={() => setShowSaveFilterModal(true)}
                className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 border border-dashed border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Save Active Filters
              </button>

              {/* Saved Filters List */}
              {savedFilters.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Your Quick Filters</div>
                  <div className="flex flex-wrap gap-1.5">
                    {savedFilters.map(sf => (
                      <div 
                        key={sf.id}
                        onClick={() => handleApplySavedFilter(sf)}
                        className="group flex items-center gap-1 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-100/30 dark:hover:bg-indigo-950/40 rounded-lg text-[9px] font-extrabold text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-850 cursor-pointer select-none transition-all"
                      >
                        <span>{sf.name}</span>
                        <X 
                          onClick={(e) => handleDeleteSavedFilter(e, sf.id)}
                          className="w-2.5 h-2.5 text-gray-400 hover:text-red-500 cursor-pointer ml-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* UNSCHEDULED TO-DO TASKS INTEGRATION PANEL */}
          {tasks.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2rem] shadow-sm space-y-4">
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-500" /> Unscheduled Tasks
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                Drag cards from this pile onto the calendar/timeline to schedule them instantly!
              </p>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {tasks.filter(t => !t.completed).slice(0, 8).map(task => {
                  let badgeColor = "bg-gray-100 text-gray-600 dark:bg-gray-850 dark:text-gray-400";
                  if (task.quadrant === "UI") badgeColor = "bg-red-500/10 text-red-600 dark:text-red-400";
                  else if (task.quadrant === "NUI") badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400";

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="p-3 bg-gray-50/50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-850 rounded-2xl flex flex-col gap-1.5 cursor-grab hover:shadow-sm transition-all hover:border-cyan-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-[11px] text-gray-900 dark:text-gray-100 line-clamp-2">{task.title}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0", badgeColor)}>
                          {task.quadrant || "Tasks"}
                        </span>
                      </div>
                      
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span>Due: {task.dueDate}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {tasks.filter(t => !t.completed).length === 0 && (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-[10px] font-bold">
                    All clear! No unscheduled tasks.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT WORKSPACE: Views Canvas */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* 1. WEEK VIEW - DEFAULT */}
          {viewTab === "week" && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6 overflow-x-auto">
              <div className="min-w-[800px] grid grid-cols-7 gap-4">
                
                {/* Column Headers */}
                {weekDays.map((day, idx) => {
                  const dayStr = day.toISOString().split("T")[0];
                  const isToday = dayStr === new Date().toISOString().split("T")[0];
                  const dayEvents = getFilteredEntries(dayStr);

                  return (
                    <div 
                      key={idx} 
                      className="space-y-4 flex flex-col h-[650px] min-h-[500px]"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnDay(e, dayStr)}
                    >
                      {/* Day Title Block */}
                      <div className={cn(
                        "text-center py-3.5 px-2 rounded-2xl border transition-all flex flex-col gap-1 select-none",
                        isToday 
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/15 font-black" 
                          : "bg-gray-50/50 dark:bg-gray-950/40 border-gray-100 dark:border-gray-850"
                      )}>
                        <span className={cn(
                          "text-[9px] uppercase font-black tracking-widest",
                          isToday ? "text-white/80" : "text-gray-400"
                        )}>
                          {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                        <span className="text-sm font-black tracking-tight">{day.getDate()}</span>
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-block self-center mt-1 uppercase",
                          isToday 
                            ? "bg-white/20 text-white" 
                            : dayEvents.length > 0 
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" 
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                        )}>
                          {dayEvents.length} {dayEvents.length === 1 ? "Slot" : "Slots"}
                        </span>
                      </div>

                      {/* Drop target card shelf */}
                      <div className="flex-1 bg-gray-50/20 dark:bg-gray-950/10 border border-dashed border-gray-150 dark:border-gray-800/60 rounded-2xl p-2.5 space-y-3 overflow-y-auto">
                        
                        {/* Goal deadlines as milestone tags inside days */}
                        {goals.filter(g => g.targetDate === dayStr).map(goal => (
                          <div key={goal.id} className="p-2 bg-purple-500/5 dark:bg-purple-500/10 border-2 border-purple-500/20 rounded-xl flex items-center gap-1.5 text-[9px] font-black text-purple-600 dark:text-purple-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span className="truncate">🎯 Goal Target: {goal.title}</span>
                          </div>
                        ))}

                        {/* Event list */}
                        {dayEvents.sort((a,b) => {
                          if (!a.startTime) return -1;
                          if (!b.startTime) return 1;
                          return a.startTime.localeCompare(b.startTime);
                        }).map(entry => {
                          const duration = entry.startTime && entry.endTime ? (
                            entry.startTime.localeCompare(entry.endTime) !== 0 ? `${entry.startTime} - ${entry.endTime}` : "All Day"
                          ) : "All Day";

                          return (
                            <div
                              key={entry.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, entry.id)}
                              onClick={(e) => handleEditClick(e, entry)}
                              className={cn(
                                "group p-3 rounded-xl border relative transition-all duration-200 select-none cursor-pointer flex flex-col gap-2 hover:shadow-md",
                                entry.completed
                                  ? "bg-gray-50 dark:bg-gray-950 border-gray-100 dark:border-gray-850 opacity-60 text-gray-400"
                                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600"
                              )}
                            >
                              {/* Left category highlight bar */}
                              <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", entry.color || "bg-indigo-500")} />

                              <div className="flex flex-col gap-1 pl-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={cn(
                                    "font-extrabold text-[11px] leading-tight line-clamp-2",
                                    entry.completed ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    {entry.title}
                                  </span>
                                  
                                  {/* Recurrence Indicator */}
                                  {entry.recurring && entry.recurring !== "none" && (
                                    <RefreshCw className="w-3 h-3 text-indigo-500 shrink-0" title={`Recurs: ${entry.recurring}`} />
                                  )}
                                </div>

                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-300" />
                                  <span>{duration}</span>
                                </span>
                              </div>

                              {/* Integrations Buttons Bar / Details */}
                              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-50 dark:border-gray-850 text-[9px] font-bold">
                                
                                {/* Quick complete */}
                                <button
                                  onClick={(e) => handleToggleCompleted(e, entry)}
                                  className="text-gray-400 hover:text-green-500 transition-colors"
                                  title="Mark as Done"
                                >
                                  {entry.completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <div className="flex items-center gap-1.5">
                                  {/* Focus Trigger */}
                                  {!entry.completed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartFocus(entry);
                                      }}
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                      title="Launch Focus Session"
                                    >
                                      <Brain className="w-3 h-3" /> Focus
                                    </button>
                                  )}

                                  {/* Study session sync */}
                                  {entry.subjectId && !entry.completed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConvertToStudySession(entry);
                                      }}
                                      className="text-amber-500 hover:underline flex items-center gap-0.5"
                                      title="Log Study Hours"
                                    >
                                      <BookOpen className="w-3 h-3" /> Log
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {dayEvents.length === 0 && (
                          <div className="text-center py-12 text-gray-300 dark:text-gray-700 text-[10px] font-bold">
                            Free Slot
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. DAY VIEW */}
          {viewTab === "day" && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
              
              {/* Day Header */}
              <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-850 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg">Single Day Roadmap</span>
                  <h3 className="text-xl font-black text-gray-950 dark:text-white tracking-tight mt-2.5">
                    {new Date(selectedDateStr).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </h3>
                </div>
                
                <div className="flex gap-2 text-xs font-bold text-gray-500">
                  <span className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-3 py-1.5 rounded-xl">
                    {getFilteredEntries(selectedDateStr).length} Scheduled Blocks
                  </span>
                </div>
              </div>

              {/* Day Timeline Layout */}
              <div className="space-y-4">
                {getFilteredEntries(selectedDateStr).sort((a,b) => {
                  if (!a.startTime) return -1;
                  if (!b.startTime) return 1;
                  return a.startTime.localeCompare(b.startTime);
                }).map(entry => {
                  let duration = "All Day";
                  if (entry.startTime && entry.endTime) {
                    const [sh, sm] = entry.startTime.split(":").map(Number);
                    const [eh, em] = entry.endTime.split(":").map(Number);
                    let diff = (eh * 60 + em) - (sh * 60 + sm);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    duration = `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`;
                  }

                  return (
                    <div 
                      key={entry.id}
                      className={cn(
                        "p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative overflow-hidden",
                        entry.completed 
                          ? "bg-gray-50 dark:bg-gray-950 border-gray-100 dark:border-gray-850 opacity-60 text-gray-400"
                          : "bg-gray-50/50 dark:bg-gray-950/30 border-gray-100 dark:border-gray-800"
                      )}
                    >
                      {/* Left highlights color bar */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", entry.color)} />

                      <div className="flex items-start gap-3.5 pl-2">
                        <div className="p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm shrink-0">
                          <Clock className="w-5 h-5 text-indigo-500" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn(
                              "text-sm font-extrabold text-gray-950 dark:text-white",
                              entry.completed && "line-through"
                            )}>
                              {entry.title}
                            </h4>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                              {entry.category || "Study Block"}
                            </span>
                            {entry.priority && (
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                entry.priority === "urgent" ? "bg-red-500/15 text-red-600" :
                                entry.priority === "high" ? "bg-amber-500/15 text-amber-600" : "bg-gray-100 text-gray-500"
                              )}>
                                {entry.priority}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 font-bold">
                            <span>{entry.startTime ? `${entry.startTime} - ${entry.endTime}` : "All Day"}</span>
                            {duration !== "All Day" && <span className="text-gray-400">({duration})</span>}
                            {entry.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" /> {entry.location}
                              </span>
                            )}
                          </div>

                          {entry.notes && <p className="text-xs text-gray-400 dark:text-gray-500 italic pt-1">{entry.notes}</p>}
                        </div>
                      </div>

                      {/* Quick Integration Operations */}
                      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-850">
                        {/* Start Focus Session */}
                        {!entry.completed && (
                          <button
                            onClick={() => handleStartFocus(entry)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/15 active:scale-95 cursor-pointer"
                          >
                            <Brain className="w-3.5 h-3.5" /> Focus
                          </button>
                        )}

                        {/* Convert study block */}
                        {entry.subjectId && !entry.completed && (
                          <button
                            onClick={() => handleConvertToStudySession(entry)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Log Study
                          </button>
                        )}

                        {/* Toggle complete */}
                        <button
                          onClick={(e) => handleToggleCompleted(e, entry)}
                          className={cn(
                            "p-2.5 rounded-xl transition-all border cursor-pointer",
                            entry.completed 
                              ? "bg-green-500/10 border-green-500/20 text-green-500" 
                              : "bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-750 text-gray-400 hover:text-green-500 hover:border-green-300"
                          )}
                          title={entry.completed ? "Mark Incomplete" : "Mark Done"}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        {/* Edit block */}
                        <button
                          onClick={(e) => handleEditClick(e, entry)}
                          className="p-2.5 bg-white dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-150 dark:border-gray-750 text-gray-400 hover:text-indigo-500 rounded-xl transition-all cursor-pointer"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>

                        {/* Trash */}
                        <button
                          onClick={() => {
                            onDelete(entry.id);
                            setEntries(entries.filter(item => item.id !== entry.id));
                          }}
                          className="p-2.5 bg-white dark:bg-gray-850 hover:bg-red-50 dark:hover:bg-red-950/20 border border-gray-150 dark:border-gray-750 text-gray-400 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}

                {getFilteredEntries(selectedDateStr).length === 0 && (
                  <div className="text-center py-20 bg-gray-50/20 dark:bg-gray-950/20 border-2 border-dashed border-gray-150 dark:border-gray-800 rounded-3xl">
                    <CalendarDays className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">No Scheduled Roadmap Blocks</h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                      This date is wide open. Connect classes, tasks, or studies to kickstart peak productivity.
                    </p>
                    <button 
                      onClick={() => {
                        setEditingEntry(null);
                        setShowAddModal(true);
                      }}
                      className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      + Create First Block
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 3. MONTH VIEW (LARGE MONTH GRID) */}
          {viewTab === "month" && (
            <div className="space-y-6">
              <LargeMonthGrid 
                currentDate={currentDate}
                adjustMonth={adjustMonth}
                selectedDate={selectedDateStr}
                onDayClick={setSelectedDateStr}
                getEventsForDate={getFilteredEntries}
                onAddClick={(date) => {
                  setSelectedDateStr(date);
                  setEditingEntry(null);
                  setShowAddModal(true);
                }}
              />
            </div>
          )}

          {/* 4. AGENDA LIST VIEW */}
          {viewTab === "agenda" && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="pb-4 border-b border-gray-50 dark:border-gray-850">
                <span className="text-[10px] uppercase font-black text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1.5 rounded-lg">Linear Agenda</span>
                <h3 className="text-xl font-black text-gray-950 dark:text-white mt-2.5">30-Day Chronological Timeline</h3>
              </div>

              <div className="space-y-6 pl-4 border-l-2 border-gray-100 dark:border-gray-800/80">
                {getFilteredEntries().sort((a,b) => {
                  const dateCompare = a.date.localeCompare(b.date);
                  if (dateCompare !== 0) return dateCompare;
                  if (!a.startTime) return -1;
                  if (!b.startTime) return 1;
                  return a.startTime.localeCompare(b.startTime);
                }).map((entry, index) => {
                  const entryDate = new Date(entry.date);
                  const formattedDay = entryDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

                  return (
                    <div key={entry.id} className="relative group pl-6">
                      
                      {/* Timeline Sphere Node */}
                      <div className={cn(
                        "absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm transition-transform group-hover:scale-125 z-10",
                        entry.color || "bg-indigo-500"
                      )} />

                      <div className="bg-gray-50/40 dark:bg-gray-950/20 hover:bg-gray-50 dark:hover:bg-gray-950/40 p-4 border border-gray-100 dark:border-gray-850 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{formattedDay}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-sm font-extrabold text-gray-900 dark:text-white", entry.completed && "line-through")}>
                              {entry.title}
                            </span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded uppercase">
                              {entry.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                            <Clock className="w-3.5 h-3.5 text-gray-300" />
                            <span>{entry.startTime ? `${entry.startTime} - ${entry.endTime}` : "All Day"}</span>
                            {entry.location && <span>| {entry.location}</span>}
                          </div>
                        </div>

                        {/* Operations */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Start Focus Session */}
                          {!entry.completed && (
                            <button
                              onClick={() => handleStartFocus(entry)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                            >
                              <Brain className="w-3 h-3" /> Focus
                            </button>
                          )}

                          {/* Quick delete */}
                          <button
                            onClick={() => {
                              onDelete(entry.id);
                              setEntries(entries.filter(item => item.id !== entry.id));
                            }}
                            className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg border border-gray-100 dark:border-gray-750 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {getFilteredEntries().length === 0 && (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs font-bold">
                    No active timeline entries over the next 30 days. Click "+ Add Block" to schedule.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CREATE / EDIT BLOCK FORM MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 border-2 border-indigo-500 w-full max-w-2xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative space-y-6"
            >
              
              {/* Modal Close */}
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="border-b border-gray-50 dark:border-gray-850 pb-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <span>{editingEntry ? "Edit Scheduled Block" : "Specify Time-to-Time Block"}</span>
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Connect your subjects, specify study sessions, priorities, and custom recurrence.
                </p>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[60vh] overflow-y-auto pr-1">
                
                {/* Event Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Event / Schedule Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Deep Work: Software Engineering, Lecture, Test Practice"
                    value={formFields.title}
                    onChange={e => setFormFields({ ...formFields, title: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>

                {/* Road Map / Scope Class */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Milestone Class</label>
                  <select
                    value={formFields.type}
                    onChange={e => setFormFields({ ...formFields, type: e.target.value as TimetableType })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  >
                    <option value={TimetableType.WEEKLY}>Weekly Routine Block</option>
                    <option value={TimetableType.MONTHLY}>Monthly Focus Target</option>
                    <option value={TimetableType.YEARLY}>Yearly Milestone Block</option>
                  </select>
                </div>

                {/* Calendar Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Category Type</label>
                  <select
                    value={formFields.category}
                    onChange={e => setFormFields({ ...formFields, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  >
                    <option value="Class">🏫 Class / Lecture</option>
                    <option value="Study Session">🧠 Study Session</option>
                    <option value="Personal Event">👤 Personal Event</option>
                    <option value="Meeting">👥 Meeting</option>
                    <option value="Task">📋 To-Do / Task</option>
                  </select>
                </div>

                {/* Priority Level */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Priority Weight</label>
                  <select
                    value={formFields.priority}
                    onChange={e => setFormFields({ ...formFields, priority: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  >
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="high">🟠 High Priority</option>
                    <option value="urgent">🔴 Urgent Deadline</option>
                  </select>
                </div>

                {/* Subject Link (Integration) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Connect to Study Course</label>
                  <select
                    value={formFields.subjectId}
                    onChange={e => setFormFields({ ...formFields, subjectId: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  >
                    <option value="">-- No Connection --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Block Start Date</label>
                  <input
                    type="date"
                    value={formFields.date}
                    onChange={e => setFormFields({ ...formFields, date: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Recurring Schedule Rules */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Recurrence Pattern</label>
                  <select
                    value={formFields.recurring}
                    onChange={e => setFormFields({ ...formFields, recurring: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  >
                    <option value="none">One-time / No Recurrence</option>
                    <option value="daily">🔁 Every Single Day</option>
                    <option value="weekly">🔁 Weekly (Every week on this day)</option>
                    <option value="monthly">🔁 Monthly (On this day-of-month)</option>
                    <option value="alternate">🔁 Alternate Weeks (Every 2 weeks)</option>
                  </select>
                </div>

                {/* Time Specific Inputs */}
                <div className="space-y-1.5 md:col-span-2 flex items-center justify-between py-2 border-y border-gray-50 dark:border-gray-850">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">Allow Specific Time-to-Time Slot</span>
                  <input
                    type="checkbox"
                    checked={formFields.specifyTime}
                    onChange={e => setFormFields({ ...formFields, specifyTime: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>

                {formFields.specifyTime && (
                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Start Time</label>
                      <input
                        type="time"
                        value={formFields.startTime}
                        onChange={e => setFormFields({ ...formFields, startTime: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">End Time</label>
                      <input
                        type="time"
                        value={formFields.endTime}
                        onChange={e => setFormFields({ ...formFields, endTime: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                )}

                {/* Location Input */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Location / Meeting Room</label>
                  <input
                    type="text"
                    placeholder="e.g., Room 402, Zoom, Library..."
                    value={formFields.location}
                    onChange={e => setFormFields({ ...formFields, location: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Reminder Setting */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">In-App Study Alert</label>
                  <select
                    value={formFields.reminderMinutes}
                    onChange={e => setFormFields({ ...formFields, reminderMinutes: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none"
                  >
                    <option value="5">5 Minutes Before</option>
                    <option value="15">15 Minutes Before</option>
                    <option value="30">30 Minutes Before</option>
                    <option value="60">1 Hour Before</option>
                    <option value="0">No Reminders</option>
                  </select>
                </div>

                {/* Custom Notes */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Custom Notes / Goal Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide context, references, key targets, or syllabus segments for this block..."
                    value={formFields.notes}
                    onChange={e => setFormFields({ ...formFields, notes: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-3 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 resize-none"
                  />
                </div>

                {/* Color Selection Palette */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Highlights Canvas Color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { value: "bg-cyan-500", name: "Cyan" },
                      { value: "bg-indigo-500", name: "Indigo" },
                      { value: "bg-rose-500", name: "Rose" },
                      { value: "bg-emerald-500", name: "Emerald" },
                      { value: "bg-amber-500", name: "Amber" },
                      { value: "bg-purple-500", name: "Purple" },
                      { value: "bg-pink-500", name: "Pink" }
                    ].map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormFields({ ...formFields, color: c.value })}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                          c.value,
                          formFields.color === c.value ? "border-indigo-600 scale-105 ring-2 ring-indigo-300 dark:ring-indigo-900" : "border-transparent"
                        )}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-50 dark:border-gray-850">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEntry}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer"
                >
                  {editingEntry ? "Update Block" : "Schedule Block"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVISION RECOMMENDATIONS / SMART SCHEDULER MODAL */}
      <AnimatePresence>
        {showRecommendationModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 border-2 border-indigo-500 w-full max-w-lg rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setShowRecommendationModal(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2 text-center pb-4 border-b border-gray-50 dark:border-gray-850">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white">Smart Revision Scheduler</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
                  Our system scans your calendar for unbooked, high-energy focus slots to recommend revision segments.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-950/60 rounded-2xl border border-gray-100 dark:border-gray-850 space-y-2.5">
                  <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Study Optimization Engine
                  </h4>
                  <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5 pl-4 list-disc font-semibold">
                    <li>Discovers conflict-free 2-hour slots in mornings & evenings.</li>
                    <li>Rhythmically distributes revision across all active courses.</li>
                    <li>Avoids weekends or pre-filled focus blocks seamlessly.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRecommendationModal(false)}
                  className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleAutoRecommendSlots}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider px-8 py-3.5 rounded-2xl transition-all shadow-lg"
                >
                  Generate Slots
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SAVE FILTER MODAL */}
      <AnimatePresence>
        {showSaveFilterModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 border-2 border-indigo-500 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4"
            >
              <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-1.5">
                <Save className="w-4 h-4 text-indigo-500" /> Save Active Filter Combination
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400">Filter Name</label>
                <input
                  type="text"
                  placeholder="e.g., Weekly Calculus Prep, Critical Lectures"
                  value={newFilterName}
                  onChange={e => setNewFilterName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSaveFilterModal(false)}
                  className="px-4 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFilter}
                  disabled={!newFilterName}
                  className="px-5 py-2 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Save Filter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// LARGE MONTH GRID REBUILT EXACTLY AND ENHANCED WITH RECURRING OCCURRENCES
function LargeMonthGrid({
  currentDate,
  adjustMonth,
  selectedDate,
  onDayClick,
  getEventsForDate,
  onAddClick
}: {
  currentDate: Date;
  adjustMonth: (m: number) => void;
  selectedDate: string;
  onDayClick: (d: string) => void;
  getEventsForDate: (d: string) => TimetableEntry[];
  onAddClick: (d: string) => void;
}) {
  const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-150 dark:border-gray-800 shadow-sm p-6 overflow-x-auto">
      <div className="min-w-[700px]">
        
        {/* Navigation month banner */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            <span className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">
              {MONTH_NAMES[month]} {year}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => adjustMonth(-1)}
              className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all border border-gray-100 dark:border-gray-750 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => adjustMonth(1)}
              className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-indigo-500 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all border border-gray-100 dark:border-gray-750 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center mb-4">
          {WEEKDAY_NAMES.map(d => <span key={d}>{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {blanks.map(b => (
            <div key={`b-${b}`} className="aspect-square bg-gray-50/20 dark:bg-gray-950/10 rounded-2xl border border-transparent" />
          ))}
          
          {daysArray.map(day => {
            const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = selectedDate === dayStr;
            const dayEntries = getEventsForDate(dayStr).sort((a,b) => {
              if (!a.startTime) return -1;
              if (!b.startTime) return 1;
              return a.startTime.localeCompare(b.startTime);
            });
            const hasEntries = dayEntries.length > 0;

            return (
              <div
                key={day}
                onClick={() => onDayClick(dayStr)}
                onDoubleClick={() => onAddClick(dayStr)}
                className={cn(
                  "aspect-square p-2.5 rounded-[1.5rem] border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] select-none min-h-[90px]",
                  isSelected 
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/20" 
                    : "bg-gray-50/40 dark:bg-gray-950/40 text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-950"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-xs font-black w-6 h-6 rounded-full flex items-center justify-center",
                    isSelected ? "bg-white/25 text-white" : ""
                  )}>
                    {day}
                  </span>
                  
                  {hasEntries && (
                    <span className="flex gap-1">
                      {dayEntries.slice(0, 3).map((e, idx) => (
                        <span key={idx} className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm", e.color)} />
                      ))}
                    </span>
                  )}
                </div>

                {/* Day entries list mini tags */}
                <div className="flex flex-col gap-1 overflow-hidden mt-1.5 max-h-[65%]">
                  {dayEntries.slice(0, 2).map((entry, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-black truncate leading-tight flex items-center gap-1",
                        isSelected 
                          ? "bg-white/20 text-white" 
                          : "bg-cyan-550/10 text-cyan-600 dark:text-cyan-400"
                      )}
                    >
                      <span className={cn("w-1 h-1 rounded-full shrink-0", isSelected ? "bg-white" : entry.color)} />
                      <span>{entry.startTime ? `${entry.startTime} ` : ""}{entry.title}</span>
                    </div>
                  ))}
                  
                  {dayEntries.length > 2 && (
                    <div className={cn(
                      "text-[8px] font-black text-right pr-1 uppercase tracking-tight",
                      isSelected ? "text-white/80" : "text-gray-400 dark:text-gray-500"
                    )}>
                      +{dayEntries.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
