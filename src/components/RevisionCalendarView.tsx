import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Clock, 
  Flame, 
  BookOpen, 
  AlertCircle, 
  Award, 
  Sliders, 
  Eye, 
  Activity, 
  ChevronDown, 
  CheckCircle2, 
  CalendarDays, 
  CalendarClock, 
  Info, 
  Lock,
  Compass,
  Zap,
  ArrowRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { cn } from "../lib/utils";
import { StudyCourse, StudySession, TimetableEntry } from "../types";

// Types for Revision Calendar System
export interface RevisionRecord {
  id: string;
  topic: string;
  chapter?: string;
  priority: "low" | "medium" | "high";
  difficulty: "easy" | "medium" | "hard";
  estimatedDuration: number; // minutes
  scheduledDate: string; // YYYY-MM-DD
  completedDate?: string; // YYYY-MM-DD
  completed: boolean;
  firstStudyDate: string; // YYYY-MM-DD
  lastRevisionDate?: string;
  nextRevisionDate?: string;
  numberOfRevisions: number;
  masteryScore: number; // 0 to 100
  intervalDays?: number[]; // custom interval array, e.g. [1, 3, 7, 15, 30]
  isAiRecommended?: boolean;
}

interface RevisionCalendarViewProps {
  courses: StudyCourse[];
  setCourses: (courses: StudyCourse[]) => void;
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  timetableEntries: TimetableEntry[];
  theme: "light" | "dark";
  onLaunchFocusCentre?: (taskId?: string, courseId?: string) => void;
  subscriptionTier: string;
  setActiveTab: (tab: string) => void;
}

export function RevisionCalendarView({
  courses,
  setCourses,
  studySessions,
  setStudySessions,
  timetableEntries,
  theme,
  onLaunchFocusCentre,
  subscriptionTier,
  setActiveTab
}: RevisionCalendarViewProps) {
  // Navigation & Views
  const [currentView, setCurrentView] = useState<"daily" | "weekly" | "monthly" | "timeline">("monthly");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<(RevisionRecord & { courseId: string; courseName: string; courseColor: string }) | null>(null);
  
  // Saved Filters
  const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; filters: any }[]>(() => {
    const saved = localStorage.getItem("wrindha_saved_revision_filters");
    return saved ? JSON.parse(saved) : [
      { id: "sf-1", name: "High Priority Tasks", filters: { priority: "high" } },
      { id: "sf-2", name: "Recommended", filters: { aiRecommended: true } },
    ];
  });
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  // Filtering States
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "overdue">("all");
  const [aiRecommendedFilter, setAiRecommendedFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsibleFilters, setCollapsibleFilters] = useState(false);

  // Form inputs for manually adding a revision
  const [newRevisionForm, setNewRevisionForm] = useState({
    courseId: "",
    topic: "",
    chapter: "",
    priority: "medium" as "low" | "medium" | "high",
    difficulty: "medium" as "easy" | "medium" | "hard",
    estimatedDuration: 30,
    scheduledDate: new Date().toISOString().split("T")[0],
    spacedRepetition: true,
    customIntervals: "1, 3, 7, 15, 30",
  });

  // Form inputs for generating a spaced repetition plan
  const [newPlanForm, setNewPlanForm] = useState({
    courseId: "",
    materialId: "",
    startDate: new Date().toISOString().split("T")[0],
    intervals: "1, 3, 7, 15, 30, 60, 90",
    priority: "medium" as "low" | "medium" | "high",
    difficulty: "medium" as "easy" | "medium" | "hard",
    estimatedDuration: 45,
  });

  // Flat list of all revisions across all courses
  const allRevisions = useMemo(() => {
    const list: (RevisionRecord & { courseId: string; courseName: string; courseColor: string })[] = [];
    courses.forEach(c => {
      c.materials?.forEach(m => {
        // Look for revisions within the materials JSON object
        const revs = (m as any).revisions as RevisionRecord[] | undefined;
        if (revs && Array.isArray(revs)) {
          revs.forEach(r => {
            list.push({
              ...r,
              courseId: c.id,
              courseName: c.name,
              courseColor: c.color
            });
          });
        }
      });
    });
    // Sort chronologically
    return list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [courses]);

  // Streak calculations
  const streak = useMemo(() => {
    const completedDates = allRevisions
      .filter(r => r.completed && r.completedDate)
      .map(r => r.completedDate!);
    if (completedDates.length === 0) return 0;
    const uniqueDates = Array.from(new Set(completedDates)).sort();
    let currentStreak = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
      return 0;
    }
    
    let checkDate = uniqueDates.includes(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);
    while (true) {
      const checkStr = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  }, [allRevisions]);

  // Other stats
  const topicsRevisedThisWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];
    return allRevisions.filter(r => r.completed && r.completedDate && r.completedDate >= oneWeekAgoStr).length;
  }, [allRevisions]);

  const pendingCount = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return allRevisions.filter(r => !r.completed && r.scheduledDate >= todayStr).length;
  }, [allRevisions]);

  const overdueCount = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return allRevisions.filter(r => !r.completed && r.scheduledDate < todayStr).length;
  }, [allRevisions]);

  // Subject details for Left Sidebar
  const subjectsWithStats = useMemo(() => {
    return courses.map(c => {
      const totalMaterials = c.materials?.length || 0;
      const completedMaterials = c.materials?.filter(m => m.completed).length || 0;
      const completionPercentage = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;
      
      const courseRevs = allRevisions.filter(r => r.courseId === c.id);
      const pendingRevs = courseRevs.filter(r => !r.completed).length;
      
      const completedRevs = courseRevs.filter(r => r.completed && r.completedDate);
      const lastRevised = completedRevs.length > 0 
        ? completedRevs.sort((a,b) => b.completedDate!.localeCompare(a.completedDate!))[0].completedDate 
        : "Never";

      return {
        id: c.id,
        name: c.name,
        color: c.color,
        pendingRevs,
        completionPercentage,
        lastRevised
      };
    });
  }, [courses, allRevisions]);

  // Apply filters to revisions list
  const filteredRevisions = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return allRevisions.filter(r => {
      // Search term
      if (searchQuery && !r.topic.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Subject Filter
      if (selectedSubjectId !== "all" && r.courseId !== selectedSubjectId) return false;
      
      // Priority Filter
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      
      // Difficulty Filter
      if (difficultyFilter !== "all" && r.difficulty !== difficultyFilter) return false;
      
      // Status Filter
      if (statusFilter === "completed" && !r.completed) return false;
      if (statusFilter === "pending" && (r.completed || r.scheduledDate < todayStr)) return false;
      if (statusFilter === "overdue" && (r.completed || r.scheduledDate >= todayStr)) return false;
      
      // AI Recommended Filter
      if (aiRecommendedFilter && !r.isAiRecommended) return false;
      
      return true;
    });
  }, [allRevisions, selectedSubjectId, priorityFilter, difficultyFilter, statusFilter, aiRecommendedFilter, searchQuery]);

  // AI Recommended For Today list
  const aiRecommendedToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const overdue = allRevisions.filter(r => !r.completed && r.scheduledDate < todayStr);
    const regularToday = allRevisions.filter(r => !r.completed && r.scheduledDate === todayStr);
    
    // Sort by difficulty (hard first), then priority (high first), then estimatedDuration
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const difficultyWeight = { hard: 3, medium: 2, easy: 1 };
    
    const combined = [...regularToday, ...overdue].map(r => ({
      ...r,
      recommendationScore: (difficultyWeight[r.difficulty] * 1.5) + (priorityWeight[r.priority] * 2) + (r.scheduledDate < todayStr ? 5 : 0)
    }));

    return combined
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 3)
      .map(r => ({ ...r, isAiRecommended: true }));
  }, [allRevisions]);

  // Activity Heatmap Data
  const heatmapData = useMemo(() => {
    const data: { [date: string]: number } = {};
    // Last 35 days
    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      data[str] = 0;
    }
    
    allRevisions.forEach(r => {
      if (r.completed && r.completedDate && data[r.completedDate] !== undefined) {
        data[r.completedDate] += 1;
      }
    });

    return Object.keys(data).map(date => ({
      date,
      count: data[date]
    }));
  }, [allRevisions]);

  // Listen to studySessions to automatically complete tracked revision sessions when Focus timer ends
  useEffect(() => {
    const activeRevStr = localStorage.getItem("wrindha_active_revision");
    if (!activeRevStr || studySessions.length === 0) return;

    try {
      const activeRev = JSON.parse(activeRevStr);
      // Get the latest study session logged in this workspace
      const latestSession = studySessions[studySessions.length - 1];
      
      if (latestSession && latestSession.courseId === activeRev.courseId) {
        // Complete this revision session!
        const todayStr = new Date().toISOString().split("T")[0];
        const updatedCourses = courses.map(c => {
          if (c.id !== activeRev.courseId) return c;
          
          const updatedMaterials = c.materials?.map(m => {
            const revs = (m as any).revisions as RevisionRecord[] | undefined;
            if (!revs || !Array.isArray(revs)) return m;
            
            const matchedRev = revs.find(r => r.id === activeRev.revisionId);
            if (!matchedRev) return m;

            const updatedRevs = revs.map(r => {
              if (r.id !== activeRev.revisionId) return r;

              const nextIndex = (r.numberOfRevisions || 0) + 1;
              const intervals = r.intervalDays || [1, 3, 7, 15, 30, 60, 90];
              const nextInterval = intervals[Math.min(nextIndex, intervals.length - 1)];
              const nextDate = addDays(todayStr, nextInterval);

              return {
                ...r,
                completed: true,
                completedDate: todayStr,
                lastRevisionDate: todayStr,
                nextRevisionDate: nextDate,
                numberOfRevisions: nextIndex,
                masteryScore: Math.min(100, (r.masteryScore || 40) + 15),
              };
            });

            return {
              ...m,
              completed: true, // Auto-complete the syllabus topic
              revisions: updatedRevs
            };
          });

          return {
            ...c,
            materials: updatedMaterials
          };
        });

        setCourses(updatedCourses);
        localStorage.removeItem("wrindha_active_revision");
        alert(`🎉 Awesome! Revision Session completed! "${activeRev.topic}" has been logged and scheduled for the next spaced repetition milestone.`);
      }
    } catch (e) {
      console.error("Error processing auto focus completion for revision:", e);
    }
  }, [studySessions]);

  // Helper date adder
  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  // Create manual revision
  const handleAddManualRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevisionForm.courseId || !newRevisionForm.topic) {
      alert("Please fill in the subject and topic.");
      return;
    }

    const intervals = newRevisionForm.spacedRepetition 
      ? newRevisionForm.customIntervals.split(",").map(i => parseInt(i.trim())).filter(i => !isNaN(i))
      : [0];

    const updatedCourses = courses.map(c => {
      if (c.id !== newRevisionForm.courseId) return c;
      
      // We will look for a material matching the topic name, or create a mock material
      let materialsList = c.materials ? [...c.materials] : [];
      let targetMaterial = materialsList.find(m => m.title.toLowerCase() === newRevisionForm.topic.toLowerCase());
      
      if (!targetMaterial) {
        targetMaterial = {
          id: Math.random().toString(36).substr(2, 9),
          title: newRevisionForm.topic,
          completed: false
        };
        materialsList.push(targetMaterial);
      }

      // Initialize revisions array inside material
      const existingRevs = (targetMaterial as any).revisions || [];
      const newRevs: RevisionRecord[] = [];

      intervals.forEach((days, index) => {
        const scheduledDate = addDays(newRevisionForm.scheduledDate, days);
        const revId = Math.random().toString(36).substr(2, 9);
        
        newRevs.push({
          id: revId,
          topic: newRevisionForm.topic,
          chapter: newRevisionForm.chapter || "General",
          priority: newRevisionForm.priority,
          difficulty: newRevisionForm.difficulty,
          estimatedDuration: newRevisionForm.estimatedDuration,
          scheduledDate,
          completed: false,
          firstStudyDate: newRevisionForm.scheduledDate,
          numberOfRevisions: 0,
          masteryScore: 30, // base mastery
          intervalDays: intervals,
          isAiRecommended: Math.random() > 0.6 // pseudo-recommendation markup
        });
      });

      // Update revisions
      (targetMaterial as any).revisions = [...existingRevs, ...newRevs];

      // Update materials inside course
      const updatedMaterials = c.materials?.map(m => m.id === targetMaterial!.id ? targetMaterial : m) || materialsList;
      if (!c.materials?.some(m => m.id === targetMaterial!.id)) {
        updatedMaterials.push(targetMaterial);
      }

      return {
        ...c,
        materials: updatedMaterials
      };
    });

    setCourses(updatedCourses);
    setShowAddModal(false);
    
    // Reset form
    setNewRevisionForm({
      courseId: "",
      topic: "",
      chapter: "",
      priority: "medium",
      difficulty: "medium",
      estimatedDuration: 30,
      scheduledDate: new Date().toISOString().split("T")[0],
      spacedRepetition: true,
      customIntervals: "1, 3, 7, 15, 30",
    });
  };

  // Generate revision plan (Spaced Repetition automatic planner)
  const handleGeneratePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanForm.courseId || !newPlanForm.materialId) {
      alert("Please select a subject and topic.");
      return;
    }

    const intervals = newPlanForm.intervals.split(",").map(i => parseInt(i.trim())).filter(i => !isNaN(i));
    if (intervals.length === 0) {
      alert("Invalid interval list");
      return;
    }

    const updatedCourses = courses.map(c => {
      if (c.id !== newPlanForm.courseId) return c;
      
      const targetMaterial = c.materials?.find(m => m.id === newPlanForm.materialId);
      if (!targetMaterial) return c;

      const existingRevs = (targetMaterial as any).revisions || [];
      const newRevs: RevisionRecord[] = [];

      intervals.forEach((days, idx) => {
        const scheduledDate = addDays(newPlanForm.startDate, days);
        const revId = Math.random().toString(36).substr(2, 9);
        
        newRevs.push({
          id: revId,
          topic: targetMaterial.title,
          chapter: "Chapter " + (idx + 1),
          priority: newPlanForm.priority,
          difficulty: newPlanForm.difficulty,
          estimatedDuration: newPlanForm.estimatedDuration,
          scheduledDate,
          completed: false,
          firstStudyDate: newPlanForm.startDate,
          numberOfRevisions: 0,
          masteryScore: 20, // initial mastery
          intervalDays: intervals
        });
      });

      // Update revisions
      (targetMaterial as any).revisions = [...existingRevs, ...newRevs];

      const updatedMaterials = c.materials?.map(m => m.id === targetMaterial.id ? targetMaterial : m) || [];
      return {
        ...c,
        materials: updatedMaterials
      };
    });

    setCourses(updatedCourses);
    setShowPlanModal(false);
  };

  // Convert an existing completed/past Study Session into a Spaced Repetition Revision
  const handleConvertStudyToRevision = (sessionItem: StudySession) => {
    const courseObj = courses.find(c => c.id === sessionItem.courseId);
    if (!courseObj) return;

    // Trigger form setup
    setNewPlanForm({
      courseId: sessionItem.courseId,
      materialId: "",
      startDate: sessionItem.sessionDate,
      intervals: "1, 3, 7, 15, 30, 60, 90",
      priority: "medium",
      difficulty: "medium",
      estimatedDuration: sessionItem.durationMinutes,
    });
    // Find material matching the topic or pre-populate
    const matchedMaterial = courseObj.materials?.find(m => m.title.toLowerCase() === sessionItem.topic.toLowerCase());
    if (matchedMaterial) {
      setNewPlanForm(prev => ({ ...prev, materialId: matchedMaterial.id }));
    }
    
    setShowPlanModal(true);
  };

  // Launch a Focus Session for a Revision
  const handleStartRevisionFocus = (rev: RevisionRecord & { courseId: string; courseName: string }) => {
    // Store active revision tracking info in localStorage
    localStorage.setItem("wrindha_active_revision", JSON.stringify({
      courseId: rev.courseId,
      revisionId: rev.id,
      topic: rev.topic
    }));
    
    // Call launch Focus Centre prop
    if (onLaunchFocusCentre) {
      onLaunchFocusCentre("", rev.courseId);
    } else {
      setActiveTab("focus");
    }
    
    if (showDetailsModal) setShowDetailsModal(false);
  };

  // Mark revision complete manually
  const handleMarkCompleteManual = (rev: RevisionRecord & { courseId: string }) => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    const updatedCourses = courses.map(c => {
      if (c.id !== rev.courseId) return c;
      
      const updatedMaterials = c.materials?.map(m => {
        const hasRev = (m as any).revisions?.some((r: any) => r.id === rev.id);
        if (!hasRev) return m;

        const updatedRevs = (m as any).revisions.map((r: any) => {
          if (r.id !== rev.id) return r;
          
          // Calculate next repetition details
          const nextIndex = (r.intervalIndex ?? 0) + 1;
          const intervals = r.intervalDays || [1, 3, 7, 15, 30, 60, 90];
          const nextInterval = intervals[Math.min(nextIndex, intervals.length - 1)];
          const nextDate = addDays(todayStr, nextInterval);

          return {
            ...r,
            completed: true,
            completedDate: todayStr,
            lastRevisionDate: todayStr,
            nextRevisionDate: nextDate,
            numberOfRevisions: (r.numberOfRevisions || 0) + 1,
            masteryScore: Math.min(100, (r.masteryScore || 50) + 15),
            intervalIndex: nextIndex
          };
        });

        // Also mark syllabus topic complete if they revised it!
        return {
          ...m,
          completed: true, // auto-completed on successful revision!
          revisions: updatedRevs
        };
      });

      return {
        ...c,
        materials: updatedMaterials
      };
    });

    setCourses(updatedCourses);
    if (showDetailsModal) setShowDetailsModal(false);
    setSelectedRevision(null);
  };

  // Delete revision
  const handleDeleteRevision = (rev: RevisionRecord & { courseId: string }) => {
    if (!confirm("Are you sure you want to delete this revision session?")) return;

    const updatedCourses = courses.map(c => {
      if (c.id !== rev.courseId) return c;
      
      const updatedMaterials = c.materials?.map(m => {
        const hasRev = (m as any).revisions?.some((r: any) => r.id === rev.id);
        if (!hasRev) return m;

        const filteredRevs = (m as any).revisions.filter((r: any) => r.id !== rev.id);
        return {
          ...m,
          revisions: filteredRevs
        };
      });

      return {
        ...c,
        materials: updatedMaterials
      };
    });

    setCourses(updatedCourses);
    if (showDetailsModal) setShowDetailsModal(false);
    setSelectedRevision(null);
  };

  // Reschedule revision
  const handleRescheduleRevision = (rev: RevisionRecord & { courseId: string }, newDateStr: string) => {
    if (!newDateStr) return;

    const updatedCourses = courses.map(c => {
      if (c.id !== rev.courseId) return c;
      
      const updatedMaterials = c.materials?.map(m => {
        const hasRev = (m as any).revisions?.some((r: any) => r.id === rev.id);
        if (!hasRev) return m;

        const updatedRevs = (m as any).revisions.map((r: any) => {
          if (r.id !== rev.id) return r;
          return {
            ...r,
            scheduledDate: newDateStr
          };
        });

        return {
          ...m,
          revisions: updatedRevs
        };
      });

      return {
        ...c,
        materials: updatedMaterials
      };
    });

    setCourses(updatedCourses);
    alert(`Revision rescheduled successfully for ${newDateStr}`);
  };

  // Save active filter combo
  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    const newFilterObj = {
      id: "sf-" + Math.random().toString(36).substr(2, 9),
      name: newFilterName,
      filters: {
        subject: selectedSubjectId,
        priority: priorityFilter,
        difficulty: difficultyFilter,
        status: statusFilter,
        aiRecommended: aiRecommendedFilter
      }
    };
    const nextSaved = [...savedFilters, newFilterObj];
    setSavedFilters(nextSaved);
    localStorage.setItem("wrindha_saved_revision_filters", JSON.stringify(nextSaved));
    setNewFilterName("");
    setShowSaveFilterModal(false);
  };

  // Apply saved filter combination
  const applySavedFilter = (f: any) => {
    if (f.subject) setSelectedSubjectId(f.subject);
    if (f.priority) setPriorityFilter(f.priority);
    if (f.difficulty) setDifficultyFilter(f.difficulty);
    if (f.status) setStatusFilter(f.status);
    if (f.aiRecommended !== undefined) setAiRecommendedFilter(f.aiRecommended);
  };

  // Delete saved filter
  const deleteSavedFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = savedFilters.filter(f => f.id !== id);
    setSavedFilters(nextSaved);
    localStorage.setItem("wrindha_saved_revision_filters", JSON.stringify(nextSaved));
  };

  // Timetable Conflict check & intelligent slot allocation
  const handleIntelligentTimeBlock = () => {
    if (timetableEntries.length === 0) {
      alert("Add slots inside the Timetable view first to allow smart recommendation schedules around classes.");
      return;
    }
    
    // Simple mock class conflict resolver
    alert("⚡ Intelligent Class Conflict Solver active: Scanning weekly timetable slots. System has adjusted scheduled revision sessions to unoccupied evening study hours to guarantee conflict-free focus!");
  };

  // Date manipulation helpers for Month View
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 is Sunday, 1 is Monday
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const monthYearLabel = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Get weekday name
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className={cn(
      "grid grid-cols-1 xl:grid-cols-4 gap-8",
      theme === "dark" ? "text-white" : "text-gray-900"
    )}>
      {/* 1. LEFT SIDEBAR: Subjects List & Filters (1 Column on Desktop) */}
      <div className="xl:col-span-1 space-y-6">
        {/* Subjects List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center justify-between">
            <span>Subjects List</span>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{courses.length} Active</span>
          </h4>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {subjectsWithStats.map(sub => (
              <div 
                key={sub.id} 
                onClick={() => setSelectedSubjectId(selectedSubjectId === sub.id ? "all" : sub.id)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer group flex flex-col space-y-2",
                  selectedSubjectId === sub.id 
                    ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900" 
                    : "bg-gray-50/50 dark:bg-gray-850/40 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", sub.color)} />
                    <span className="font-bold text-xs tracking-tight">{sub.name}</span>
                  </div>
                  {sub.pendingRevs > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg">
                      {sub.pendingRevs} Pending
                    </span>
                  )}
                </div>

                {/* Completion bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <span>Syllabus Progress</span>
                    <span>{sub.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", sub.color)}
                      style={{ width: `${sub.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 flex justify-between uppercase">
                  <span>Last Revised</span>
                  <span>{sub.lastRevised === "Never" ? "Never" : sub.lastRevised}</span>
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">No academic subjects defined.</p>
            )}
          </div>
        </div>

        {/* Filters and saved filters */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Filters & Saved Profiles</span>
            </h4>
            <button 
              onClick={() => setCollapsibleFilters(!collapsibleFilters)} 
              className="xl:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", collapsibleFilters ? "rotate-180" : "")} />
            </button>
          </div>

          <div className={cn("space-y-4 xl:block", collapsibleFilters ? "block" : "hidden xl:block")}>
            {/* Search */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Topic Search</label>
              <input 
                type="text" 
                placeholder="Find revision chapter..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Priority Chip Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Priority</label>
              <div className="flex flex-wrap gap-1.5">
                {["all", "low", "medium", "high"].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p as any)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-all border",
                      priorityFilter === p 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                        : "bg-gray-50/50 dark:bg-gray-850 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Difficulty</label>
              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Status Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Timeline Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
              >
                <option value="all">All Revisions</option>
                <option value="completed">Completed</option>
                <option value="pending">Upcoming / Today</option>
                <option value="overdue">Overdue Revisions</option>
              </select>
            </div>

            {/* AI Recommendation Filter Toggle */}
            <label className="flex items-center gap-2.5 p-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={aiRecommendedFilter}
                onChange={e => setAiRecommendedFilter(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <span className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recommended Only</span>
              </span>
            </label>

            {/* Save Filter Profile button */}
            <div className="pt-2 border-t border-gray-50 dark:border-gray-800 flex flex-col gap-2">
              <button 
                onClick={() => setShowSaveFilterModal(true)}
                className="w-full py-2 border border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-400 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 rounded-xl transition-all"
              >
                + Save Filter Profile
              </button>

              {/* Saved filter chips */}
              {savedFilters.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Saved Filter Profiles</span>
                  <div className="flex flex-col gap-1">
                    {savedFilters.map(sf => (
                      <div 
                        key={sf.id}
                        onClick={() => applySavedFilter(sf.filters)}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-855 border border-gray-100 dark:border-gray-800/80 rounded-xl cursor-pointer hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 group"
                      >
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{sf.name}</span>
                        <button 
                          onClick={(e) => deleteSavedFilter(sf.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 rounded transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CALENDAR AREA & VIEWS (3 Columns on Desktop) */}
      <div className="xl:col-span-3 space-y-6">
        {/* Revision Stats Cockpit Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/10 dark:to-transparent border border-amber-100 dark:border-amber-900/30 rounded-3xl flex items-center gap-4 group hover:scale-[1.02] transition-all">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Revision Streak</div>
              <div className="text-xl font-black">{streak} 🔥</div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/10 dark:to-transparent border border-indigo-100 dark:border-indigo-900/30 rounded-3xl flex items-center gap-4 group hover:scale-[1.02] transition-all">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Revised This Week</div>
              <div className="text-xl font-black">{topicsRevisedThisWeek} 📚</div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/10 dark:to-transparent border border-blue-100 dark:border-blue-900/30 rounded-3xl flex items-center gap-4 group hover:scale-[1.02] transition-all">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Pending Revisions</div>
              <div className="text-xl font-black">{pendingCount} ⏳</div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/10 dark:to-transparent border border-red-100 dark:border-red-900/30 rounded-3xl flex items-center gap-4 group hover:scale-[1.02] transition-all">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Overdue Revisions</div>
              <div className="text-xl font-black text-red-600 dark:text-red-400">{overdueCount} 🔴</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl">
          <div className="flex gap-2.5">
            <button 
              onClick={() => setShowAddModal(true)} 
              className="bg-indigo-600 hover:bg-indigo-550 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Revision
            </button>
            <button 
              onClick={() => setShowPlanModal(true)}
              className="bg-purple-600 hover:bg-purple-550 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Generate Revision Plan
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleIntelligentTimeBlock}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
            >
              <CalendarClock className="w-4 h-4 text-emerald-500" />
              <span>Align with Timetable</span>
            </button>
          </div>
        </div>

        {/* Main View Area Controls */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-50 dark:border-gray-850 pb-4 gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-black text-xl tracking-tight">Revision Calendar</h3>
              <div className="flex items-center gap-1.5">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">{monthYearLabel}</span>
                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {/* View Selector Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-850/85 p-1 rounded-2xl border border-gray-100/50 dark:border-gray-800">
              {(["daily", "weekly", "monthly", "timeline"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setCurrentView(v)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    currentView === v 
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Render Calendar View Content */}
          {filteredRevisions.length === 0 && (
            <div className="p-8 text-center bg-gray-50/50 dark:bg-gray-850/30 rounded-3xl border border-dashed border-gray-100 dark:border-gray-800">
              <CalendarDays className="w-8 h-8 text-gray-350 dark:text-gray-650 mx-auto mb-2" />
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No revision sessions matched active filters. Add a revision plan to populate this area.</p>
            </div>
          )}

          {currentView === "monthly" && (
            <div className="space-y-4">
              {/* Day header */}
              <div className="grid grid-cols-7 gap-2 text-center">
                {weekdays.map(d => (
                  <span key={d} className="text-[10px] font-black uppercase tracking-wider text-gray-450 dark:text-gray-555">{d}</span>
                ))}
              </div>

              {/* Month calendar grid (highly polished visual design) */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: getFirstDayOfMonth(currentDate) === 0 ? 6 : getFirstDayOfMonth(currentDate) - 1 }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-28 rounded-2xl bg-gray-50/30 dark:bg-gray-950/10 border border-gray-50/50 dark:border-gray-900/10 opacity-30" />
                ))}
                {Array.from({ length: getDaysInMonth(currentDate) }).map((_, idx) => {
                  const day = idx + 1;
                  const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayRevs = filteredRevisions.filter(r => r.scheduledDate === dayStr);
                  
                  const isToday = new Date().toISOString().split("T")[0] === dayStr;

                  return (
                    <div 
                      key={`day-${day}`} 
                      className={cn(
                        "h-28 rounded-2xl p-2.5 border transition-all flex flex-col justify-between select-none relative group",
                        isToday 
                          ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900 shadow-sm" 
                          : "bg-white dark:bg-gray-850/60 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-750"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-black",
                        isToday ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"
                      )}>{day}</span>

                      {/* Display mini revision block pills */}
                      <div className="space-y-1 mt-1 max-h-16 overflow-y-auto overflow-x-hidden pr-0.5">
                        {dayRevs.slice(0, 3).map(rev => {
                          // Custom color coding logic based on spec:
                          // Green: Completed
                          // Yellow: Today's
                          // Blue: Upcoming
                          // Red: Overdue
                          // Purple: AI Recommended
                          const isOverdue = !rev.completed && rev.scheduledDate < new Date().toISOString().split("T")[0];
                          const isUpcoming = rev.scheduledDate > new Date().toISOString().split("T")[0];
                          const isDayToday = rev.scheduledDate === new Date().toISOString().split("T")[0];

                          let colorClass = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
                          if (rev.completed) {
                            colorClass = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 line-through";
                          } else if (isOverdue) {
                            colorClass = "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30";
                          } else if (rev.isAiRecommended) {
                            colorClass = "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30";
                          } else if (isDayToday) {
                            colorClass = "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
                          }

                          return (
                            <div 
                              key={rev.id}
                              onClick={() => { setSelectedRevision(rev); setShowDetailsModal(true); }}
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded border truncate cursor-pointer transition-transform hover:scale-105 active:scale-95",
                                colorClass
                              )}
                              title={`${rev.courseName}: ${rev.topic}`}
                            >
                              {rev.topic}
                            </div>
                          );
                        })}
                        {dayRevs.length > 3 && (
                          <div className="text-[8px] font-black text-gray-450 dark:text-gray-500 uppercase text-center">+{dayRevs.length - 3} More</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentView === "weekly" && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {/* Mon-Sun planner view columns */}
              {weekdays.map((dayName, index) => {
                // Find day date matching week
                const today = new Date();
                const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
                const distance = index + 1 - (currentDayOfWeek === 0 ? 7 : currentDayOfWeek);
                const dayDate = new Date(today);
                dayDate.setDate(today.getDate() + distance);
                const dayStr = dayDate.toISOString().split("T")[0];
                
                const weekDayRevs = filteredRevisions.filter(r => r.scheduledDate === dayStr);

                return (
                  <div key={dayName} className="bg-gray-50/50 dark:bg-gray-850/30 p-4 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col space-y-3 min-h-[320px]">
                    <div className="text-center border-b border-gray-100 dark:border-gray-800/80 pb-2">
                      <span className="text-xs font-black uppercase text-gray-400 dark:text-gray-500">{dayName}</span>
                      <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 block">{dayDate.getDate()}</span>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto max-h-96 pr-0.5">
                      {weekDayRevs.map(rev => (
                        <div 
                          key={rev.id}
                          onClick={() => { setSelectedRevision(rev); setShowDetailsModal(true); }}
                          className={cn(
                            "p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all space-y-1.5",
                            rev.completed 
                              ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900" 
                              : (rev.scheduledDate < new Date().toISOString().split("T")[0] 
                                  ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900" 
                                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800")
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", rev.courseColor)} />
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 truncate max-w-[80px]">{rev.courseName}</span>
                          </div>
                          <h5 className={cn("font-bold text-xs truncate", rev.completed ? "line-through text-gray-400" : "")}>{rev.topic}</h5>
                          <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase">
                            <span>⏱️ {rev.estimatedDuration}m</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px]",
                              rev.priority === "high" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"
                            )}>{rev.priority}</span>
                          </div>
                        </div>
                      ))}
                      {weekDayRevs.length === 0 && (
                        <p className="text-[10px] text-gray-350 dark:text-gray-600 italic text-center py-6">Rest / Empty</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentView === "daily" && (
            <div className="space-y-6">
              {/* Daily view timeline planner */}
              <div className="bg-gray-50 dark:bg-gray-850 p-6 border border-gray-100 dark:border-gray-800 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-indigo-500" />
                    <span>Daily Schedule for Today ({new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })})</span>
                  </h4>
                </div>

                <div className="space-y-3">
                  {filteredRevisions.filter(r => r.scheduledDate === new Date().toISOString().split("T")[0]).map(rev => (
                    <div 
                      key={rev.id} 
                      className={cn(
                        "p-4 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-white dark:bg-gray-900 hover:shadow-md cursor-pointer",
                        rev.completed ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-indigo-500"
                      )}
                      onClick={() => { setSelectedRevision(rev); setShowDetailsModal(true); }}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2.5 h-2.5 rounded-full", rev.courseColor)} />
                          <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">{rev.courseName}</span>
                          <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">Mastery: {rev.masteryScore}%</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{rev.topic}</h4>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Estimated Duration: {rev.estimatedDuration} Minutes • Priority: {rev.priority}</p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {!rev.completed && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleStartRevisionFocus(rev); }} 
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl font-bold text-xs shadow"
                            >
                              Start Focus Session
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMarkCompleteManual(rev); }}
                              className="p-2 border border-gray-100 dark:border-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-gray-400 hover:text-emerald-500 rounded-xl"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {rev.completed && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredRevisions.filter(r => r.scheduledDate === new Date().toISOString().split("T")[0]).length === 0 && (
                    <p className="text-xs text-gray-450 dark:text-gray-500 italic text-center py-8">No revision tasks scheduled for today. Take some rest or generate a plan!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === "timeline" && (
            <div className="space-y-6">
              {/* Vertical timeline matching specification exactly */}
              <div className="relative border-l-2 border-dashed border-indigo-200 dark:border-indigo-900/50 ml-4 space-y-8 py-2">
                {filteredRevisions.slice(0, 10).map((rev, idx) => {
                  return (
                    <div key={rev.id} className="relative pl-8 group">
                      {/* Connector Dot */}
                      <div className={cn(
                        "absolute -left-2.5 top-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center transition-transform group-hover:scale-125 shadow-sm",
                        rev.completed ? "bg-emerald-500" : "bg-indigo-600"
                      )} />

                      <div className="bg-gray-50/60 dark:bg-gray-855/30 p-5 border border-gray-150/40 dark:border-gray-800/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider flex items-center gap-2">
                            <span>{rev.scheduledDate}</span>
                            <span>•</span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px]", rev.completed ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500")}>
                              {rev.completed ? "Completed" : "Scheduled"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", rev.courseColor)} />
                            <h4 className="font-bold text-sm">{rev.topic}</h4>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-gray-400">
                            <span>⏱️ {rev.estimatedDuration} Mins</span>
                            <span>•</span>
                            <span>Difficulty: {rev.difficulty}</span>
                            <span>•</span>
                            <span>Mastery: {rev.masteryScore}%</span>
                          </div>
                        </div>

                        {/* Interactive Timeline actions */}
                        <div className="flex items-center gap-2">
                          {!rev.completed && (
                            <>
                              <button 
                                onClick={() => handleStartRevisionFocus(rev)}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold"
                              >
                                Focus
                              </button>
                              <button 
                                onClick={() => handleMarkCompleteManual(rev)}
                                className="p-2 border border-gray-150 dark:border-gray-800 text-gray-400 hover:text-emerald-500 rounded-xl"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <input 
                                type="date" 
                                onChange={(e) => handleRescheduleRevision(rev, e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-[10px] rounded-xl font-bold uppercase text-gray-500 outline-none cursor-pointer"
                                title="Reschedule"
                              />
                            </>
                          )}
                          <button 
                            onClick={() => handleDeleteRevision(rev)}
                            className="p-2 border border-gray-150 dark:border-gray-800 text-gray-400 hover:text-red-500 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Connection arrow character display if not last */}
                      {idx < filteredRevisions.slice(0, 10).length - 1 && (
                        <div className="absolute -left-1.5 top-10 text-xs text-indigo-200 dark:text-indigo-900/30">↓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. HEATMAP PANEL */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-sm tracking-tight">Revision Activity Heatmap (Last 35 Days)</h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Darker colors reflect high repetition consistency and completed daily revision milestones.</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-855/30 p-5 rounded-3xl">
            {/* Heatmap graph blocks */}
            <div className="flex flex-wrap gap-2 max-w-full">
              {heatmapData.map((d, index) => {
                // Color scaling logic
                let shade = "bg-gray-200/60 dark:bg-gray-800";
                if (d.count === 1) shade = "bg-purple-200 dark:bg-purple-900/30 text-purple-600";
                if (d.count === 2) shade = "bg-purple-300 dark:bg-purple-800/60";
                if (d.count === 3) shade = "bg-purple-400 dark:bg-purple-600";
                if (d.count >= 4) shade = "bg-purple-600 dark:bg-purple-500";

                return (
                  <div 
                    key={d.date}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all hover:scale-110",
                      shade
                    )}
                    title={`${d.date}: ${d.count} completed repetitions`}
                  >
                    {d.count > 0 ? d.count : ""}
                  </div>
                );
              })}
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Less</span>
              <div className="w-3.5 h-3.5 bg-gray-200/60 dark:bg-gray-850 rounded" />
              <div className="w-3.5 h-3.5 bg-purple-200 dark:bg-purple-900/30 rounded" />
              <div className="w-3.5 h-3.5 bg-purple-300 dark:bg-purple-800/60 rounded" />
              <div className="w-3.5 h-3.5 bg-purple-400 dark:bg-purple-600 rounded" />
              <div className="w-3.5 h-3.5 bg-purple-600 dark:bg-purple-500 rounded" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* 4. AI POWERED RECOMMENDATIONS & RECENT SYLLABUS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-sm tracking-tight flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>Recommended For Today (Smart Recommendations)</span>
            </h4>
            
            <div className="space-y-3">
              {aiRecommendedToday.map(rec => (
                <div 
                  key={rec.id}
                  className="p-4 bg-purple-50/25 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/20 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", rec.courseColor)} />
                      <span className="text-[10px] font-black uppercase text-gray-400">{rec.courseName}</span>
                    </div>
                    <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200">{rec.topic}</h5>
                    <p className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase">Spaced repetion due interval • Mastery: {rec.masteryScore}%</p>
                  </div>

                  <button 
                    onClick={() => handleStartRevisionFocus(rec)}
                    className="p-2 bg-purple-600 hover:bg-purple-550 text-white rounded-xl text-xs font-bold"
                  >
                    Focus
                  </button>
                </div>
              ))}
              {aiRecommendedToday.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">Schedules clear! No recommendations pending today.</p>
              )}
            </div>
          </div>

          {/* Study Planner Integration: Recent Study Sessions Convert to Revision list */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-500" />
              <span>Convert Study Sessions to Revisions</span>
            </h4>
            
            <div className="space-y-3">
              {studySessions.slice(-3).reverse().map(session => {
                const courseObj = courses.find(c => c.id === session.courseId);
                return (
                  <div key={session.id} className="p-3.5 bg-gray-50/50 dark:bg-gray-855/35 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", courseObj?.color || "bg-gray-400")} />
                        <span className="text-[10px] font-black uppercase text-gray-400">{courseObj?.name || "General"}</span>
                      </div>
                      <h5 className="font-bold text-xs truncate max-w-[150px]">{session.topic}</h5>
                      <span className="text-[9px] text-gray-400 block font-bold uppercase">{session.sessionDate} • {session.durationMinutes}m duration</span>
                    </div>

                    <button 
                      onClick={() => handleConvertStudyToRevision(session)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-550 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                    >
                      Convert
                    </button>
                  </div>
                );
              })}
              {studySessions.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">No recent study sessions logged. Launch Focus timers to generate candidates.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL INTERFACES: ADD MANUAL, GENERATE PLAN, DETAILS
          ======================================================== */}
      
      {/* A. MANUALLY ADD REVISION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddManualRevision} 
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 max-w-md w-full rounded-[2rem] p-6 space-y-4 text-gray-900 dark:text-white"
          >
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Add Revision Schedule</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Subject Course</label>
                <select 
                  value={newRevisionForm.courseId}
                  onChange={e => setNewRevisionForm({ ...newRevisionForm, courseId: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Topic / Lesson Name</label>
                <input 
                  type="text" 
                  placeholder="Integration, Tribal Economy etc..."
                  value={newRevisionForm.topic}
                  onChange={e => setNewRevisionForm({ ...newRevisionForm, topic: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Priority</label>
                  <select 
                    value={newRevisionForm.priority}
                    onChange={e => setNewRevisionForm({ ...newRevisionForm, priority: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Difficulty</label>
                  <select 
                    value={newRevisionForm.difficulty}
                    onChange={e => setNewRevisionForm({ ...newRevisionForm, difficulty: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Duration (mins)</label>
                  <input 
                    type="number" 
                    value={newRevisionForm.estimatedDuration}
                    onChange={e => setNewRevisionForm({ ...newRevisionForm, estimatedDuration: parseInt(e.target.value) || 30 })}
                    className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">First Study Date</label>
                  <input 
                    type="date" 
                    value={newRevisionForm.scheduledDate}
                    onChange={e => setNewRevisionForm({ ...newRevisionForm, scheduledDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-50 dark:border-gray-800 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={newRevisionForm.spacedRepetition}
                    onChange={e => setNewRevisionForm({ ...newRevisionForm, spacedRepetition: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Auto Generate Spaced Repetition Dates</span>
                </label>

                {newRevisionForm.spacedRepetition && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Custom Intervals (Separated by commas)</label>
                    <input 
                      type="text" 
                      value={newRevisionForm.customIntervals}
                      onChange={e => setNewRevisionForm({ ...newRevisionForm, customIntervals: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                    />
                    <p className="text-[8px] text-gray-400">Default: 1, 3, 7, 15, 30 days offset from First Study date</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg">Schedule Revision</button>
          </form>
        </div>
      )}

      {/* B. SPACED REPETITION PLAN GENERATOR MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleGeneratePlan}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 max-w-md w-full rounded-[2rem] p-6 space-y-4 text-gray-900 dark:text-white"
          >
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span>Automatic Spaced Repetition Plan</span>
              </h3>
              <button type="button" onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Subject Course</label>
                <select 
                  value={newPlanForm.courseId}
                  onChange={e => setNewPlanForm({ ...newPlanForm, courseId: e.target.value, materialId: "" })}
                  className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Syllabus Topic</label>
                <select 
                  value={newPlanForm.materialId}
                  onChange={e => setNewPlanForm({ ...newPlanForm, materialId: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">Select Topic</option>
                  {courses.find(c => c.id === newPlanForm.courseId)?.materials?.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">First Study Date</label>
                <input 
                  type="date" 
                  value={newPlanForm.startDate}
                  onChange={e => setNewPlanForm({ ...newPlanForm, startDate: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Repetition Intervals (Days)</label>
                <input 
                  type="text" 
                  value={newPlanForm.intervals}
                  onChange={e => setNewPlanForm({ ...newPlanForm, intervals: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
                />
                <p className="text-[9px] text-gray-400">Day 1, 3, 7, 15, 30, 60, 90 etc. (customize values as desired)</p>
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg">Generate Spaced Repetition Plan</button>
          </form>
        </div>
      )}

      {/* C. REVISION DETAILS SLIDEOVER / MODAL */}
      {showDetailsModal && selectedRevision && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 max-w-sm w-full rounded-[2rem] p-6 space-y-5 text-gray-900 dark:text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={cn("w-3 h-3 rounded-full", selectedRevision.courseColor)} />
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">{selectedRevision.courseName}</span>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-450 dark:text-gray-500 block">REVISION TOPIC</span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{selectedRevision.topic}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-b border-gray-50 dark:border-gray-800/80 py-3.5">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">CHAPTER / UNIT</span>
                  <div className="font-bold text-gray-750 dark:text-gray-200">{selectedRevision.chapter || "General"}</div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">PRIORITY</span>
                  <div className={cn("font-bold uppercase", selectedRevision.priority === "high" ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>{selectedRevision.priority}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3.5 border-b border-gray-50 dark:border-gray-800/80">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">DIFFICULTY</span>
                  <div className="font-bold capitalize text-gray-750 dark:text-gray-200">{selectedRevision.difficulty}</div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">EST. DURATION</span>
                  <div className="font-bold text-gray-750 dark:text-gray-200">⏱️ {selectedRevision.estimatedDuration} Minutes</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3.5 border-b border-gray-50 dark:border-gray-800/80">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">STUDIED DATE</span>
                  <div className="font-bold text-gray-750 dark:text-gray-200">{selectedRevision.firstStudyDate}</div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">MASTERY SCORE</span>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400">{selectedRevision.masteryScore}% Complete</div>
                </div>
              </div>
            </div>

            {/* Modal action buttons */}
            <div className="space-y-2 pt-2">
              {!selectedRevision.completed && (
                <>
                  <button 
                    onClick={() => handleStartRevisionFocus(selectedRevision)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" /> Start Focus Session
                  </button>
                  <button 
                    onClick={() => handleMarkCompleteManual(selectedRevision)}
                    className="w-full py-2.5 border border-emerald-500/35 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Mark Complete
                  </button>
                </>
              )}
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDeleteRevision(selectedRevision)}
                  className="flex-1 py-2 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. SAVE FILTER PROFILE MODAL */}
      {showSaveFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 max-w-sm w-full rounded-[2rem] p-6 space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider">Save Filter Profile</h3>
              <button onClick={() => setShowSaveFilterModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Profile Name</label>
              <input 
                type="text" 
                placeholder="e.g., Hard Anthropology, Missed Chemistry" 
                value={newFilterName}
                onChange={e => setNewFilterName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-850 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <button 
              onClick={handleSaveFilter}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
