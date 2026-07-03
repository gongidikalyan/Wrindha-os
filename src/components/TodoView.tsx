import React, { useState, useMemo } from "react";
import {
  ListTodo,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Search,
  SlidersHorizontal,
  Calendar,
  Clock,
  Tag,
  AlertTriangle,
  Folder,
  ArrowRight,
  Sparkles,
  Archive,
  RotateCcw,
  Check,
  X,
  FileText,
  Paperclip,
  Bookmark,
  Info,
  Lock,
  ArrowUpDown,
  TrendingUp,
  BarChart2
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { cn } from "../lib/utils";
import { Task, StudyCourse, TimetableEntry, StudySession } from "../types";

interface TodoViewProps {
  tasks: Task[];
  setTasks: (tasks: React.SetStateAction<Task[]>) => void;
  courses: StudyCourse[];
  timetableEntries: TimetableEntry[];
  studySessions: StudySession[];
  theme: "light" | "dark";
  setActiveTab: (tab: string) => void;
  subscriptionTier: string;
}

export function TodoView({
  tasks,
  setTasks,
  theme,
  setActiveTab,
  subscriptionTier
}: TodoViewProps) {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "priority" | "completed">("tasks");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<"all" | "low" | "medium" | "high" | "urgent">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedDueDateFilter, setSelectedDueDateFilter] = useState<"all" | "today" | "thisWeek" | "overdue" | "noDate">("all");
  
  // Sorting state
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title" | "timeEstimate">("dueDate");

  // Expanded task details list (IDs)
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);

  // Saved Filters State
  const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; filters: any }[]>(() => {
    const saved = localStorage.getItem("wrindha_saved_todo_filters");
    return saved ? JSON.parse(saved) : [
      { id: "f-1", name: "High Focus study items", filters: { priority: "high", category: "Study" } },
      { id: "f-2", name: "Due Today", filters: { dueDateFilter: "today" } }
    ];
  });
  const [newFilterName, setNewFilterName] = useState("");
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);

  // Bulk Actions Selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  // Modals / Adding & Editing forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // AI analysis state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Task Form State
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    category: "General",
    dueDate: "",
    tagsInput: "",
    timeEstimate: 30,
    recurring: "none" as "none" | "daily" | "weekly" | "monthly",
    notes: "",
    dependenciesInput: [] as string[],
    subtasksInput: [] as { id: string; title: string; completed: boolean }[],
    subjectId: "",
    projectId: ""
  });
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [mockAttachmentName, setMockAttachmentName] = useState("");

  // Extracted unique values for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [tasks]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach(t => {
      t.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [tasks]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter & Sort logic for Active Tasks list
  const filteredTasks = useMemo(() => {
    const activeList = tasks.filter(t => !t.archived && !t.completed);
    
    const filtered = activeList.filter(t => {
      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(query);
        const descMatch = t.description?.toLowerCase().includes(query) || false;
        const notesMatch = t.notes?.toLowerCase().includes(query) || false;
        const tagMatch = t.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
        if (!titleMatch && !descMatch && !notesMatch && !tagMatch) return false;
      }

      // Priority Filter
      if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;

      // Category Filter
      if (selectedCategory !== "all" && t.category !== selectedCategory) return false;

      // Tag Filter
      if (selectedTag !== "all" && !t.tags?.includes(selectedTag)) return false;

      // Due Date Filter
      if (selectedDueDateFilter !== "all") {
        if (!t.dueDate) {
          if (selectedDueDateFilter !== "noDate") return false;
        } else {
          if (selectedDueDateFilter === "noDate") return false;
          if (selectedDueDateFilter === "today" && t.dueDate !== todayStr) return false;
          if (selectedDueDateFilter === "overdue" && t.dueDate >= todayStr) return false;
          if (selectedDueDateFilter === "thisWeek") {
            const today = new Date();
            const endOfWeek = new Date();
            endOfWeek.setDate(today.getDate() + 7);
            const taskDate = new Date(t.dueDate);
            if (taskDate < today || taskDate > endOfWeek) return false;
          }
        }
      }

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === "priority") {
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
        const wa = priorityWeight[a.priority || "medium"] || 2;
        const wb = priorityWeight[b.priority || "medium"] || 2;
        return wb - wa;
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "timeEstimate") {
        return (b.timeEstimate || 0) - (a.timeEstimate || 0);
      }
      return 0;
    });
  }, [
    tasks,
    searchQuery,
    selectedPriority,
    selectedCategory,
    selectedTag,
    selectedDueDateFilter,
    sortBy,
    todayStr
  ]);

  // Priority badge styling helper
  const getPriorityBadgeStyles = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40";
      case "high":
        return "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40";
      case "medium":
        return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40";
      case "low":
        return "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40";
      default:
        return "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800";
    }
  };

  // Toggle Details Expansion
  const toggleExpandTask = (id: string) => {
    setExpandedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  // Toggle Task Completion
  const toggleTaskCompletion = (t: Task) => {
    if (!t.completed && t.dependencies && t.dependencies.length > 0) {
      const incompleteDeps = tasks.filter(p => t.dependencies?.includes(p.id) && !p.completed);
      if (incompleteDeps.length > 0) {
        alert(
          `🔒 Blocked: This task depends on other incomplete tasks:\n\n` +
          incompleteDeps.map(d => `• ${d.title}`).join("\n") +
          `\n\nPlease complete those parent milestones first to unlock this task.`
        );
        return;
      }
    }

    setTasks(prev => {
      return prev.map(item => {
        if (item.id === t.id) {
          return {
            ...item,
            completed: !item.completed,
            kanbanStatus: !item.completed ? "completed" : "todo"
          };
        }
        return item;
      });
    });
  };

  // Form helpers
  const resetForm = () => {
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      category: "General",
      dueDate: "",
      tagsInput: "",
      timeEstimate: 30,
      recurring: "none",
      notes: "",
      dependenciesInput: [],
      subtasksInput: [],
      subjectId: "",
      projectId: ""
    });
    setNewSubtaskText("");
    setMockAttachmentName("");
  };

  // Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      alert("Task title is required.");
      return;
    }

    const newTask: Task = {
      id: "task-" + Math.random().toString(36).substr(2, 9),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      completed: false,
      quadrant: "UI" as any, // fallback
      dueDate: taskForm.dueDate || undefined,
      tags: taskForm.tagsInput.split(",").map(t => t.trim()).filter(t => t !== ""),
      priority: taskForm.priority,
      category: taskForm.category || "General",
      timeEstimate: taskForm.timeEstimate,
      recurring: taskForm.recurring,
      notes: taskForm.notes.trim(),
      dependencies: taskForm.dependenciesInput,
      subtasks: taskForm.subtasksInput,
      kanbanStatus: "todo",
      subjectId: taskForm.subjectId || undefined,
      projectId: taskForm.projectId || undefined,
      attachments: []
    };

    setTasks(prev => [newTask, ...prev]);
    setShowAddModal(false);
    resetForm();
  };

  // Edit Task Loader
  const startEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority || "medium",
      category: t.category || "General",
      dueDate: t.dueDate || "",
      tagsInput: t.tags?.join(", ") || "",
      timeEstimate: t.timeEstimate || 30,
      recurring: t.recurring || "none",
      notes: t.notes || "",
      dependenciesInput: t.dependencies || [],
      subtasksInput: t.subtasks || [],
      subjectId: t.subjectId || "",
      projectId: t.projectId || ""
    });
    setShowEditModal(true);
  };

  // Save Edit Task
  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    setTasks(prev => {
      return prev.map(t => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            dueDate: taskForm.dueDate || undefined,
            priority: taskForm.priority,
            category: taskForm.category || "General",
            tags: taskForm.tagsInput.split(",").map(tg => tg.trim()).filter(tg => tg !== ""),
            timeEstimate: taskForm.timeEstimate,
            recurring: taskForm.recurring,
            notes: taskForm.notes.trim(),
            dependencies: taskForm.dependenciesInput,
            subtasks: taskForm.subtasksInput,
            subjectId: taskForm.subjectId || undefined,
            projectId: taskForm.projectId || undefined
          };
        }
        return t;
      });
    });

    setShowEditModal(false);
    setEditingTask(null);
    resetForm();
  };

  // Delete Task
  const deleteTask = (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
      setSelectedTaskIds(prev => prev.filter(tid => tid !== id));
    }
  };

  // Permanent Delete
  const permanentDeleteTask = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this task?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  // Archive Task
  const archiveTask = (id: string) => {
    setTasks(prev => {
      return prev.map(t => {
        if (t.id === id) {
          return { ...t, archived: true };
        }
        return t;
      });
    });
  };

  // Unarchive Task
  const restoreFromArchive = (id: string) => {
    setTasks(prev => {
      return prev.map(t => {
        if (t.id === id) {
          return { ...t, archived: false };
        }
        return t;
      });
    });
  };

  // Subtasks dynamic builder
  const addFormSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const sub = {
      id: "sub-" + Math.random().toString(36).substr(2, 9),
      title: newSubtaskText.trim(),
      completed: false
    };
    setTaskForm(prev => ({
      ...prev,
      subtasksInput: [...prev.subtasksInput, sub]
    }));
    setNewSubtaskText("");
  };

  const toggleFormSubtask = (id: string) => {
    setTaskForm(prev => ({
      ...prev,
      subtasksInput: prev.subtasksInput.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    }));
  };

  const removeFormSubtask = (id: string) => {
    setTaskForm(prev => ({
      ...prev,
      subtasksInput: prev.subtasksInput.filter(s => s.id !== id)
    }));
  };

  // Inline checklist completions
  const toggleTaskSubtaskInline = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    }));
  };

  // Mock Attachments
  const addFormAttachment = () => {
    if (!mockAttachmentName.trim()) return;
    const attachment = {
      id: "at-" + Math.random().toString(36).substr(2, 9),
      name: mockAttachmentName.trim(),
      url: "#",
      size: "1.2 MB"
    };

    if (editingTask) {
      setTasks(prev => {
        return prev.map(t => {
          if (t.id === editingTask.id) {
            return {
              ...t,
              attachments: [...(t.attachments || []), attachment]
            };
          }
          return t;
        });
      });
      setEditingTask(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attachments: [...(prev.attachments || []), attachment]
        };
      });
    } else {
      setTaskForm(prev => ({
        ...prev,
        attachmentsInput: [...((prev as any).attachmentsInput || []), attachment]
      } as any));
      alert(`Attached "${mockAttachmentName.trim()}" successfully to draft.`);
    }
    setMockAttachmentName("");
  };

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleSelectTask = (id: string) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(tid => tid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const bulkComplete = () => {
    setTasks(prev => {
      return prev.map(t => {
        if (selectedTaskIds.includes(t.id)) {
          return { ...t, completed: true, kanbanStatus: "completed" };
        }
        return t;
      });
    });
    setSelectedTaskIds([]);
  };

  const bulkDelete = () => {
    if (confirm(`Are you sure you want to delete the ${selectedTaskIds.length} selected tasks?`)) {
      setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      setSelectedTaskIds([]);
    }
  };

  const bulkSetPriority = (priority: "low" | "medium" | "high" | "urgent") => {
    setTasks(prev => {
      return prev.map(t => {
        if (selectedTaskIds.includes(t.id)) {
          return { ...t, priority };
        }
        return t;
      });
    });
    setSelectedTaskIds([]);
  };

  // AI recommendations
  const generateAiSuggestions = () => {
    setAiAnalyzing(true);
    setAiSuggestions([]);
    
    setTimeout(() => {
      const activeList = tasks.filter(t => !t.completed && !t.archived);
      const urgentPending = activeList.filter(t => t.priority === "urgent" || t.priority === "high");
      const blockedTasks = activeList.filter(t => t.dependencies && t.dependencies.length > 0);
      const output: string[] = [];

      if (urgentPending.length > 0) {
        output.push(`🎯 Priority Focus: Execute "${urgentPending[0].title}" immediately. It is flagged as high-priority and bottlenecking other tasks.`);
      } else {
        output.push("🌱 Calm Horizon: All immediate high-priority tasks are logged. Good work staying ahead of deadlines!");
      }

      if (blockedTasks.length > 0) {
        const depNames = blockedTasks.map(t => {
          const parent = tasks.find(p => t.dependencies?.includes(p.id));
          return `"${t.title}" (waiting on "${parent?.title || "incomplete dependencies"}")`;
        });
        output.push(`⚠️ Dependency Alerts: ${depNames.slice(0, 2).join(", ")} is currently locked. Complete the parent tasks first.`);
      }

      const studyTasks = activeList.filter(t => t.category === "Study");
      if (studyTasks.length > 0) {
        output.push(`📚 Intelligent Spacing: Book a 45-minute Focus Session for "${studyTasks[0].title}" today between 2:00 PM and 4:00 PM when cognitive reserve is high.`);
      }

      setAiSuggestions(output);
      setAiAnalyzing(false);
    }, 1200);
  };

  // Save Filter Profile
  const handleSaveFilterProfile = () => {
    if (!newFilterName.trim()) return;
    const profile = {
      id: "f-" + Math.random().toString(36).substr(2, 9),
      name: newFilterName.trim(),
      filters: {
        priority: selectedPriority,
        category: selectedCategory,
        tag: selectedTag,
        dueDateFilter: selectedDueDateFilter
      }
    };
    const updated = [...savedFilters, profile];
    setSavedFilters(updated);
    localStorage.setItem("wrindha_saved_todo_filters", JSON.stringify(updated));
    setNewFilterName("");
    setShowSaveFilterModal(false);
    alert(`Filter preset "${profile.name}" saved!`);
  };

  const applyFilterProfile = (profile: any) => {
    if (profile.priority) setSelectedPriority(profile.priority);
    if (profile.category) setSelectedCategory(profile.category);
    if (profile.tag) setSelectedTag(profile.tag);
    if (profile.dueDateFilter) setSelectedDueDateFilter(profile.dueDateFilter);
  };

  const deleteFilterProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem("wrindha_saved_todo_filters", JSON.stringify(updated));
  };

  // Completion Stats computations
  const analyticsData = useMemo(() => {
    const activeAndDone = tasks.filter(t => !t.archived);
    const total = activeAndDone.length;
    const completed = activeAndDone.filter(t => t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Category breakdown of completed tasks
    const categoryCounts: { [cat: string]: number } = {};
    activeAndDone.forEach(t => {
      const cat = t.category || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + (t.completed ? 1 : 0);
    });

    const categoryChart = Object.keys(categoryCounts).map(cat => ({
      name: cat,
      value: categoryCounts[cat]
    })).filter(item => item.value > 0);

    // Priority breakdown
    const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };
    activeAndDone.forEach(t => {
      if (t.priority && t.priority in priorityCounts) {
        priorityCounts[t.priority as keyof typeof priorityCounts] += t.completed ? 1 : 0;
      }
    });

    const priorityChart = [
      { name: "Urgent", value: priorityCounts.urgent, color: "#EF4444" },
      { name: "High", value: priorityCounts.high, color: "#F97316" },
      { name: "Medium", value: priorityCounts.medium, color: "#F59E0B" },
      { name: "Low", value: priorityCounts.low, color: "#3B82F6" }
    ].filter(item => item.value > 0);

    return {
      total,
      completed,
      completionRate,
      categoryChart,
      priorityChart
    };
  }, [tasks]);

  return (
    <div id="todo-hub-container" className={cn(
      "space-y-6 w-full p-4 md:p-8 rounded-[2.5rem] border transition-all animate-fade-in",
      theme === "dark" 
        ? "bg-gray-950 border-gray-900 text-white" 
        : "bg-white border-gray-100 text-gray-900 shadow-sm"
    )}>
      {/* HEADER SECTION */}
      <div id="todo-header" className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 dark:border-gray-900 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-indigo-500" />
            <span>To-Do Hub</span>
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Manage your personal milestones, due dates, subtask checklists, and smart priority advice.
          </p>
        </div>

        {/* Sub Tabs Selector */}
        <div id="todo-sub-navigation" className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shrink-0">
          {[
            { id: "tasks", label: "My Tasks" },
            { id: "priority", label: "Priority Focus" },
            { id: "completed", label: "History & Analytics" }
          ].map(tab => (
            <button
              id={`tab-btn-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                activeSubTab === tab.id
                  ? "bg-white dark:bg-gray-850 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MY TASKS SUB-TAB */}
      {/* ======================================================== */}
      {activeSubTab === "tasks" && (
        <div id="active-tasks-view" className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col xl:flex-row justify-between gap-4 items-stretch xl:items-center">
            
            {/* Search + Sorting + Presets */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tasks, details, notes, or tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900/40 px-10 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Sorting option select */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-3 py-2 border border-gray-100 dark:border-gray-800 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase text-gray-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                >
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority Level</option>
                  <option value="title">Alphabetical</option>
                  <option value="timeEstimate">Estimated Duration</option>
                </select>
              </div>

              {/* Save Filter Profile button */}
              <button
                onClick={() => setShowSaveFilterModal(true)}
                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all text-gray-600 dark:text-gray-300"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                <span>Save Preset</span>
              </button>
            </div>

            {/* Main Create Action Button */}
            <div className="flex gap-2.5 shrink-0">
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="bg-indigo-600 hover:bg-indigo-550 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Task</span>
              </button>
            </div>
          </div>

          {/* Quick filter selection rows */}
          <div className="flex flex-col gap-3 pb-3 border-b border-gray-50 dark:border-gray-900">
            {/* Priority row */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider w-16">Priority:</span>
              {["all", "low", "medium", "high", "urgent"].map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p as any)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase border transition-all",
                    selectedPriority === p
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Timeline Row */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider w-16">Timeline:</span>
              {["all", "today", "thisWeek", "overdue", "noDate"].map(dt => (
                <button
                  key={dt}
                  onClick={() => setSelectedDueDateFilter(dt as any)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase border transition-all",
                    selectedDueDateFilter === dt
                      ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                      : "bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200"
                  )}
                >
                  {dt === "thisWeek" ? "Next 7 Days" : dt}
                </button>
              ))}
            </div>

            {/* Category / Tags combined filters row */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Category selector */}
              {uniqueCategories.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-900 text-xs font-bold border border-gray-100 dark:border-gray-800 rounded-lg p-1 text-gray-700 dark:text-gray-300 outline-none"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tag selector */}
              {uniqueTags.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Tag:</span>
                  <select
                    value={selectedTag}
                    onChange={e => setSelectedTag(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-900 text-xs font-bold border border-gray-100 dark:border-gray-800 rounded-lg p-1 text-gray-700 dark:text-gray-300 outline-none"
                  >
                    <option value="all">All Tags</option>
                    {uniqueTags.map(tg => (
                      <option key={tg} value={tg}>{tg}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Filters button */}
              {(selectedPriority !== "all" || selectedCategory !== "all" || selectedTag !== "all" || selectedDueDateFilter !== "all" || searchQuery !== "") && (
                <button
                  onClick={() => {
                    setSelectedPriority("all");
                    setSelectedCategory("all");
                    setSelectedTag("all");
                    setSelectedDueDateFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Saved presets row */}
          {savedFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center bg-gray-50/50 dark:bg-gray-900/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-900">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Filter Presets:</span>
              </span>
              {savedFilters.map(sf => (
                <div
                  key={sf.id}
                  onClick={() => applyFilterProfile(sf.filters)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-850 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 border border-gray-100 dark:border-gray-800 rounded-lg cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 transition-all group"
                >
                  <span>{sf.name}</span>
                  <button
                    onClick={(e) => deleteFilterProfile(sf.id, e)}
                    className="opacity-40 group-hover:opacity-100 p-0.5 hover:bg-red-50 hover:text-red-500 rounded transition-all"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bulk Update Controls */}
          {selectedTaskIds.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl animate-pulse">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                Selected {selectedTaskIds.length} tasks:
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={bulkComplete}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:opacity-90"
                >
                  Mark Completed
                </button>
                <button
                  onClick={bulkDelete}
                  className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm hover:opacity-90"
                >
                  Delete Selected
                </button>
                <div className="flex gap-1 items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Set:</span>
                  {(["low", "medium", "high", "urgent"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => bulkSetPriority(p)}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold rounded border uppercase bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-indigo-500"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedTaskIds([])}
                  className="px-2.5 py-1 border border-gray-200 dark:border-gray-700 text-[10px] font-bold rounded-lg bg-white dark:bg-gray-900"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Task List container */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-black uppercase text-gray-400 tracking-wider px-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-indigo-600 w-4 h-4 focus:ring-0 cursor-pointer"
                />
                <span>Active Tasks ({filteredTasks.length})</span>
              </div>
              <span>Click item to expand details</span>
            </div>

            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredTasks.map(t => {
                const hasIncompleteDependencies = t.dependencies?.some(
                  depId => !tasks.find(pt => pt.id === depId)?.completed
                );
                const isOverdue = t.dueDate && t.dueDate < todayStr;
                const isExpanded = expandedTaskIds.includes(t.id);

                // Subtask checklist statistics
                const subCount = t.subtasks?.length || 0;
                const completedSub = t.subtasks?.filter(s => s.completed).length || 0;
                const subPercent = subCount > 0 ? Math.round((completedSub / subCount) * 100) : 0;

                return (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-2xl border transition-all flex flex-col group",
                      isOverdue
                        ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30"
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                    )}
                  >
                    {/* Primary Row */}
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Selector and check button */}
                        <div className="flex items-center gap-3 pt-0.5">
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.includes(t.id)}
                            onChange={() => handleSelectTask(t.id)}
                            className="rounded border-gray-300 text-indigo-600 w-4 h-4 focus:ring-0 cursor-pointer"
                          />
                          <button
                            onClick={() => toggleTaskCompletion(t)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Circle className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Title and Category */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpandTask(t.id)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm tracking-tight text-gray-900 dark:text-white truncate">
                              {t.title}
                            </h4>

                            {t.category && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 text-gray-400">
                                {t.category}
                              </span>
                            )}

                            {hasIncompleteDependencies && (
                              <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Blocked</span>
                              </span>
                            )}

                            {isOverdue && (
                              <span className="flex items-center gap-1 text-[9px] font-bold bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded uppercase animate-pulse">
                                Overdue
                              </span>
                            )}
                          </div>

                          {t.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-1">{t.description}</p>
                          )}

                          {/* Subtask micro progress indicator */}
                          {subCount > 0 && (
                            <div className="flex items-center gap-2 pt-1.5">
                              <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${subPercent}%` }} />
                              </div>
                              <span className="text-[9px] text-gray-400 font-bold">{completedSub}/{subCount} checklists</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right-hand side indicators & action buttons */}
                      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-50 dark:border-gray-850">
                        <div className="flex flex-col items-start md:items-end gap-1 font-mono text-[10px]">
                          {t.dueDate && (
                            <span className={cn("flex items-center gap-1 font-bold", isOverdue ? "text-rose-500" : "text-gray-400")}>
                              <Calendar className="w-3 h-3" />
                              <span>{t.dueDate}</span>
                            </span>
                          )}
                          {t.timeEstimate && (
                            <span className="text-gray-400 flex items-center gap-1 font-bold">
                              <Clock className="w-3 h-3 text-cyan-500" />
                              <span>{t.timeEstimate}m</span>
                            </span>
                          )}
                        </div>

                        {/* Priority Badge */}
                        <span className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-wide rounded-lg border shrink-0", getPriorityBadgeStyles(t.priority))}>
                          {t.priority || "medium"}
                        </span>

                        {/* Inline Actions */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEditTask(t)}
                            className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-850 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => archiveTask(t.id)}
                            className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-850 rounded-lg text-gray-400 hover:text-indigo-500"
                            title="Archive Task"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-850 rounded-lg text-gray-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Panel details */}
                    {isExpanded && (
                      <div className="px-11 pb-4 pt-1 border-t border-gray-50 dark:border-gray-850 space-y-3 animate-fade-in bg-gray-50/30 dark:bg-gray-900/10 rounded-b-2xl">
                        {/* Notes section */}
                        {t.notes && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Additional Notes</span>
                            <p className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 whitespace-pre-line leading-relaxed">
                              {t.notes}
                            </p>
                          </div>
                        )}

                        {/* Subtasks checklists */}
                        {t.subtasks && t.subtasks.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Subtask Checklist ({subPercent}% completed)</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-gray-950 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                              {t.subtasks.map(sub => (
                                <div
                                  key={sub.id}
                                  onClick={() => toggleTaskSubtaskInline(t.id, sub.id)}
                                  className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg cursor-pointer transition-colors"
                                >
                                  {sub.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-350" />
                                  )}
                                  <span className={cn("text-xs font-bold", sub.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-250")}>
                                    {sub.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attachments list */}
                        {t.attachments && t.attachments.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Linked Attachments</span>
                            <div className="flex flex-wrap gap-2">
                              {t.attachments.map(at => (
                                <a
                                  key={at.id}
                                  href={at.url}
                                  onClick={e => e.preventDefault()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-850 hover:border-cyan-500 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-300"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-cyan-500" />
                                  <span>{at.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tag Chips inside detail */}
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {t.tags.map(tg => (
                              <span key={tg} className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-indigo-500" />
                                <span>{tg}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Dependencies list */}
                        {t.dependencies && t.dependencies.length > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Depends on completion of: </span>
                            <span className="font-black italic">
                              {t.dependencies.map(id => tasks.find(pt => pt.id === id)?.title || "Unknown Task").join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Recurring interval indicator */}
                        {t.recurring && t.recurring !== "none" && (
                          <div className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                            <span>Auto-recurring task cycle: </span>
                            <span className="font-black uppercase">{t.recurring}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="p-12 text-center text-xs text-gray-400 italic border border-dashed border-gray-150 dark:border-gray-900 rounded-2xl">
                  No active tasks found matching the selected presets. Create a new task above!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PRIORITY FOCUS SUB-TAB */}
      {/* ======================================================== */}
      {activeSubTab === "priority" && (
        <div id="priority-view" className="space-y-6">
          
          {/* AI Advice Panel */}
          <div className="p-6 bg-gradient-to-br from-indigo-50 via-indigo-100/20 to-transparent dark:from-indigo-950/20 dark:to-transparent border border-indigo-100/40 dark:border-indigo-900/30 rounded-[2rem] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="font-black text-sm tracking-tight text-indigo-900 dark:text-indigo-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Priority Planner Recommendations</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Let our intelligent system scan your deadlines, estimated times, and dependencies to offer optimized next actions.
              </p>
            </div>

            <button
              onClick={generateAiSuggestions}
              disabled={aiAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-550 text-white px-5 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all shrink-0 disabled:opacity-50"
            >
              {aiAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scanning queue...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Scan Priority Suggestions</span>
                </>
              )}
            </button>
          </div>

          {/* AI outputs output section */}
          {aiSuggestions.length > 0 && (
            <div className="p-5 bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 rounded-3xl space-y-3 animate-fade-in">
              <h5 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Priority Recommendations Output:</h5>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs font-bold p-3 bg-gray-50 dark:bg-gray-850 rounded-xl text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800">
                    <span className="text-amber-500">⚡</span>
                    <p>{suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats: Today's High priority + Overdue Detection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Today's High or Urgent Tasks */}
            <div className="bg-orange-50/10 dark:bg-orange-950/5 border border-orange-100 dark:border-orange-900/20 p-5 rounded-3xl space-y-3">
              <h4 className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>Today's Critical Targets ({tasks.filter(t => !t.completed && !t.archived && t.dueDate === todayStr && (t.priority === "urgent" || t.priority === "high")).length})</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.filter(t => !t.completed && !t.archived && t.dueDate === todayStr && (t.priority === "urgent" || t.priority === "high")).map(t => (
                  <div key={t.id} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-orange-100/50 dark:border-orange-900/10 flex justify-between items-center text-xs font-bold">
                    <span className="truncate">{t.title}</span>
                    <button onClick={() => toggleTaskCompletion(t)} className="text-xs text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">✓ Complete</button>
                  </div>
                ))}
                {tasks.filter(t => !t.completed && !t.archived && t.dueDate === todayStr && (t.priority === "urgent" || t.priority === "high")).length === 0 && (
                  <p className="text-[10px] text-gray-400 italic text-center py-6">No high-priority items due today.</p>
                )}
              </div>
            </div>

            {/* Overdue deadliner list */}
            <div className="bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-900/20 p-5 rounded-3xl space-y-3">
              <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Overdue Detection Alert ({tasks.filter(t => !t.completed && !t.archived && t.dueDate && t.dueDate < todayStr).length})</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.filter(t => !t.completed && !t.archived && t.dueDate && t.dueDate < todayStr).map(t => (
                  <div key={t.id} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-rose-100/50 dark:border-rose-900/10 flex justify-between items-center text-xs font-bold">
                    <span className="truncate text-rose-600 dark:text-rose-400">{t.title}</span>
                    <span className="text-[9px] font-mono text-rose-500 font-bold">Due: {t.dueDate}</span>
                  </div>
                ))}
                {tasks.filter(t => !t.completed && !t.archived && t.dueDate && t.dueDate < todayStr).length === 0 && (
                  <p className="text-[10px] text-gray-400 italic text-center py-6">Brilliant! Clean slate, zero overdue items.</p>
                )}
              </div>
            </div>
          </div>

          {/* Simple Lists Grouped by Priority Level (low, medium, high, urgent) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Task Lists Grouped by Priority Level</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Urgent Priority */}
              <div className="bg-gray-50/40 dark:bg-gray-900/10 p-4 border border-rose-100/50 dark:border-rose-950/30 rounded-2xl flex flex-col space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-black text-xs uppercase tracking-wider text-rose-500">🔥 Urgent</span>
                  <span className="text-[10px] bg-white dark:bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full border">
                    {tasks.filter(t => !t.completed && !t.archived && t.priority === "urgent").length}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto flex-1">
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "urgent").map(t => (
                    <div key={t.id} className="p-3 bg-white dark:bg-gray-950 border rounded-xl flex justify-between items-center text-xs font-bold">
                      <span className="truncate flex-1 pr-1">{t.title}</span>
                      <button onClick={() => toggleTaskCompletion(t)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-900 text-emerald-500">✓</button>
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "urgent").length === 0 && (
                    <p className="text-[10px] text-gray-400 italic text-center py-4">No urgent tasks.</p>
                  )}
                </div>
              </div>

              {/* High Priority */}
              <div className="bg-gray-50/40 dark:bg-gray-900/10 p-4 border border-orange-100/50 dark:border-orange-950/30 rounded-2xl flex flex-col space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-black text-xs uppercase tracking-wider text-orange-500">⚡ High Priority</span>
                  <span className="text-[10px] bg-white dark:bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full border">
                    {tasks.filter(t => !t.completed && !t.archived && t.priority === "high").length}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto flex-1">
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "high").map(t => (
                    <div key={t.id} className="p-3 bg-white dark:bg-gray-950 border rounded-xl flex justify-between items-center text-xs font-bold">
                      <span className="truncate flex-1 pr-1">{t.title}</span>
                      <button onClick={() => toggleTaskCompletion(t)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-900 text-emerald-500">✓</button>
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "high").length === 0 && (
                    <p className="text-[10px] text-gray-400 italic text-center py-4">No high priority tasks.</p>
                  )}
                </div>
              </div>

              {/* Medium Priority */}
              <div className="bg-gray-50/40 dark:bg-gray-900/10 p-4 border border-amber-100/50 dark:border-amber-950/30 rounded-2xl flex flex-col space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-black text-xs uppercase tracking-wider text-amber-500">⚡ Medium Priority</span>
                  <span className="text-[10px] bg-white dark:bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full border">
                    {tasks.filter(t => !t.completed && !t.archived && t.priority === "medium").length}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto flex-1">
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "medium").map(t => (
                    <div key={t.id} className="p-3 bg-white dark:bg-gray-950 border rounded-xl flex justify-between items-center text-xs font-bold">
                      <span className="truncate flex-1 pr-1">{t.title}</span>
                      <button onClick={() => toggleTaskCompletion(t)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-900 text-emerald-500">✓</button>
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "medium").length === 0 && (
                    <p className="text-[10px] text-gray-400 italic text-center py-4">No medium priority tasks.</p>
                  )}
                </div>
              </div>

              {/* Low Priority */}
              <div className="bg-gray-50/40 dark:bg-gray-900/10 p-4 border border-blue-100/50 dark:border-blue-950/30 rounded-2xl flex flex-col space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-black text-xs uppercase tracking-wider text-blue-500">📋 Low Priority</span>
                  <span className="text-[10px] bg-white dark:bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full border">
                    {tasks.filter(t => !t.completed && !t.archived && t.priority === "low").length}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto flex-1">
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "low").map(t => (
                    <div key={t.id} className="p-3 bg-white dark:bg-gray-950 border rounded-xl flex justify-between items-center text-xs font-bold">
                      <span className="truncate flex-1 pr-1">{t.title}</span>
                      <button onClick={() => toggleTaskCompletion(t)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-900 text-emerald-500">✓</button>
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed && !t.archived && t.priority === "low").length === 0 && (
                    <p className="text-[10px] text-gray-400 italic text-center py-4">No low priority tasks.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. HISTORY & ANALYTICS SUB-TAB */}
      {/* ======================================================== */}
      {activeSubTab === "completed" && (
        <div id="analytics-and-history-view" className="space-y-6">
          
          {/* Top completion metrics widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-3xl space-y-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Overall Completion Rate</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{analyticsData.completionRate}%</span>
                <span className="text-xs text-gray-400 font-bold">({analyticsData.completed}/{analyticsData.total} logged)</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500" style={{ width: `${analyticsData.completionRate}%` }} />
              </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-gray-900/20 p-5 rounded-3xl space-y-1.5 border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                <span>Productivity Streak</span>
              </span>
              <div className="text-3xl font-black text-gray-900 dark:text-white">7 Days Active</div>
              <p className="text-[10px] text-gray-400 font-bold">Consistently scheduling and hitting daily project targets.</p>
            </div>

            <div className="bg-gray-50/50 dark:bg-gray-900/20 p-5 rounded-3xl space-y-1.5 border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>Pending Workload</span>
              </span>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {tasks.filter(t => !t.completed && !t.archived).length} Tasks
              </div>
              <p className="text-[10px] text-gray-400 font-bold">Uncompleted items active in the general workspace.</p>
            </div>
          </div>

          {/* Simple Recharts distribution boards if data exists */}
          {analyticsData.completed > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/30 dark:bg-gray-900/10 p-6 rounded-3xl border border-gray-100 dark:border-gray-850">
              {/* Category distribution */}
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-gray-400 text-center">Completed Tasks by Category</h5>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.categoryChart}>
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} />
                      <YAxis stroke="#9CA3AF" fontSize={9} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Priority distribution */}
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-gray-400 text-center">Completed Tasks by Priority</h5>
                <div className="h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.priorityChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {analyticsData.priorityChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend list */}
                  <div className="flex flex-col gap-1.5 text-[10px] font-bold">
                    {analyticsData.priorityChart.map((item: any, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-400">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-layout: Completed Tasks list + Archive list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Completed history with restore & permanent delete */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Completed Tasks History</h4>
              
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {tasks.filter(t => t.completed && !t.archived).map(t => (
                  <div key={t.id} className="p-3 bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-950/20 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="line-through text-gray-400 dark:text-gray-500 truncate">{t.title}</span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {/* Restore */}
                      <button
                        onClick={() => toggleTaskCompletion(t)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500 rounded-lg"
                        title="Restore Task to Active"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {/* Permanent Delete */}
                      <button
                        onClick={() => permanentDeleteTask(t.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-rose-500 rounded-lg"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.completed && !t.archived).length === 0 && (
                  <p className="text-xs text-gray-400 italic py-6 text-center">No completed tasks logged.</p>
                )}
              </div>
            </div>

            {/* Archive list with restore & delete */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Archived Tasks Panel</h4>
              
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {tasks.filter(t => t.archived).map(t => (
                  <div key={t.id} className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Archive className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 truncate">{t.title}</span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {/* Restore */}
                      <button
                        onClick={() => restoreFromArchive(t.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-500 rounded-lg"
                        title="Restore Task to Active"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {/* Permanent Delete */}
                      <button
                        onClick={() => permanentDeleteTask(t.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-rose-500 rounded-lg"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.filter(t => t.archived).length === 0 && (
                  <p className="text-xs text-gray-400 italic py-6 text-center">No archived tasks in record.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK/ADVANCED TASK ADD FORM MODAL */}
      {/* ======================================================== */}
      {showAddModal && (
        <div id="add-task-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={cn(
            "w-full max-w-lg rounded-[2.5rem] p-6 space-y-4 border shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-up",
            theme === "dark" ? "bg-gray-950 border-gray-900 text-white" : "bg-white border-gray-100 text-gray-900"
          )}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-900">
              <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Create New Task</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Finalize math preparation notes"
                  value={taskForm.title}
                  onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Short Subtitle / Description</label>
                <input
                  type="text"
                  placeholder="e.g., Cover sections 4.1 to 4.4 and review syllabus"
                  value={taskForm.description}
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                  >
                    <option value="urgent">🔥 Urgent</option>
                    <option value="high">⚡ High</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="low">📋 Low</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Study, Fitness, Work"
                    value={taskForm.category}
                    onChange={e => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., algebra, midterms"
                    value={taskForm.tagsInput}
                    onChange={e => setTaskForm(prev => ({ ...prev, tagsInput: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Duration Estimate (mins)</label>
                  <input
                    type="number"
                    value={taskForm.timeEstimate}
                    onChange={e => setTaskForm(prev => ({ ...prev, timeEstimate: Number(e.target.value) || 30 }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Auto-Recurring Cycle</label>
                  <select
                    value={taskForm.recurring}
                    onChange={e => setTaskForm(prev => ({ ...prev, recurring: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                  >
                    <option value="none">No Cycle</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Task Dependencies */}
              {tasks.filter(t => !t.completed).length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Task Blockers (Dependencies)</label>
                  <div className="max-h-24 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl p-2 space-y-1 bg-gray-50/50 dark:bg-gray-900/30">
                    {tasks.filter(t => !t.completed).map(pt => {
                      const isSelected = taskForm.dependenciesInput.includes(pt.id);
                      return (
                        <div
                          key={pt.id}
                          onClick={() => {
                            setTaskForm(prev => {
                              const list = prev.dependenciesInput.includes(pt.id)
                                ? prev.dependenciesInput.filter(id => id !== pt.id)
                                : [...prev.dependenciesInput, pt.id];
                              return { ...prev, dependenciesInput: list };
                            });
                          }}
                          className="flex items-center justify-between text-xs font-bold p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <span className="truncate">{pt.title}</span>
                          <span className={cn("px-1.5 py-0.5 text-[8px] font-black uppercase rounded", isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")}>
                            {isSelected ? "Blocker" : "No Blocker"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detailed Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Detailed Notes</label>
                <textarea
                  placeholder="Insert links, references, or instructions..."
                  value={taskForm.notes}
                  onChange={e => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-16 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Subtask checklist builder */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Subtask Checklists</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add step to do (e.g., proofread page)"
                    value={newSubtaskText}
                    onChange={e => setNewSubtaskText(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFormSubtask}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-black"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {taskForm.subtasksInput.map(sub => (
                    <div key={sub.id} className="flex justify-between items-center text-xs font-bold p-1 bg-white dark:bg-gray-950 rounded border">
                      <span>{sub.title}</span>
                      <button type="button" onClick={() => removeFormSubtask(sub.id)} className="text-[9px] text-rose-500 font-bold hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT TASK MODAL */}
      {/* ======================================================== */}
      {showEditModal && editingTask && (
        <div id="edit-task-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={cn(
            "w-full max-w-lg rounded-[2.5rem] p-6 space-y-4 border shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-up",
            theme === "dark" ? "bg-gray-950 border-gray-900 text-white" : "bg-white border-gray-100 text-gray-900"
          )}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-900">
              <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-500" />
                <span>Modify Task Details</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingTask(null); }}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Finalize math preparation notes"
                  value={taskForm.title}
                  onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Short Subtitle / Description</label>
                <input
                  type="text"
                  placeholder="e.g., Cover sections 4.1 to 4.4 and review syllabus"
                  value={taskForm.description}
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  >
                    <option value="urgent">🔥 Urgent</option>
                    <option value="high">⚡ High</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="low">📋 Low</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Study, Fitness"
                    value={taskForm.category}
                    onChange={e => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., algebra, midterms"
                    value={taskForm.tagsInput}
                    onChange={e => setTaskForm(prev => ({ ...prev, tagsInput: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Duration Estimate (mins)</label>
                  <input
                    type="number"
                    value={taskForm.timeEstimate}
                    onChange={e => setTaskForm(prev => ({ ...prev, timeEstimate: Number(e.target.value) || 30 }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Auto-Recurring Cycle</label>
                  <select
                    value={taskForm.recurring}
                    onChange={e => setTaskForm(prev => ({ ...prev, recurring: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  >
                    <option value="none">No Cycle</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Task Blockers */}
              {tasks.filter(t => t.id !== editingTask.id && !t.completed).length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Task Blockers (Dependencies)</label>
                  <div className="max-h-24 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl p-2 space-y-1 bg-gray-50/50 dark:bg-gray-900/30">
                    {tasks.filter(t => t.id !== editingTask.id && !t.completed).map(pt => {
                      const isSelected = taskForm.dependenciesInput.includes(pt.id);
                      return (
                        <div
                          key={pt.id}
                          onClick={() => {
                            setTaskForm(prev => {
                              const list = prev.dependenciesInput.includes(pt.id)
                                ? prev.dependenciesInput.filter(id => id !== pt.id)
                                : [...prev.dependenciesInput, pt.id];
                              return { ...prev, dependenciesInput: list };
                            });
                          }}
                          className="flex items-center justify-between text-xs font-bold p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <span className="truncate">{pt.title}</span>
                          <span className={cn("px-1.5 py-0.5 text-[8px] font-black uppercase rounded", isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")}>
                            {isSelected ? "Blocker" : "No Blocker"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detailed Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Detailed Notes</label>
                <textarea
                  placeholder="Insert links, references, or instructions..."
                  value={taskForm.notes}
                  onChange={e => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-16 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Subtask checklists */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Subtask Checklists</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add step to do (e.g., proofread page)"
                    value={newSubtaskText}
                    onChange={e => setNewSubtaskText(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFormSubtask}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-black"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {taskForm.subtasksInput.map(sub => (
                    <div key={sub.id} className="flex justify-between items-center text-xs font-bold p-1.5 bg-gray-50 dark:bg-gray-900 rounded border">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => toggleFormSubtask(sub.id)}>
                          {sub.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-gray-450" />}
                        </button>
                        <span className={sub.completed ? "line-through text-gray-400" : ""}>{sub.title}</span>
                      </div>
                      <button type="button" onClick={() => removeFormSubtask(sub.id)} className="text-[9px] text-rose-500 font-bold hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Attachments Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Linked Attachments</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Attachment file name (e.g., document.pdf)"
                    value={mockAttachmentName}
                    onChange={e => setMockAttachmentName(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs font-bold rounded-xl border border-gray-100 dark:border-gray-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addFormAttachment}
                    className="bg-cyan-600 hover:bg-cyan-550 text-white px-3 py-2 rounded-xl text-xs font-bold"
                  >
                    Attach
                  </button>
                </div>

                {editingTask.attachments && editingTask.attachments.length > 0 && (
                  <div className="space-y-1 bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-xl border border-gray-100 dark:border-gray-800 max-h-24 overflow-y-auto">
                    {editingTask.attachments.map(at => (
                      <div key={at.id} className="flex justify-between items-center text-[10px] font-bold p-1 bg-white dark:bg-gray-900 rounded border">
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-cyan-500" />
                          <span>{at.name}</span>
                        </span>
                        <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded uppercase">Linked</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SAVE FILTER PRESET MODAL */}
      {/* ======================================================== */}
      {showSaveFilterModal && (
        <div id="save-filter-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={cn(
            "w-full max-w-sm rounded-[2rem] p-6 space-y-4 border shadow-2xl relative animate-scale-up",
            theme === "dark" ? "bg-gray-950 border-gray-900 text-white" : "bg-white border-gray-100 text-gray-900"
          )}>
            <h3 className="font-black text-sm uppercase tracking-tight">Save Filter Preset</h3>
            <p className="text-xs text-gray-400">Save current filter settings for one-click access later.</p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Preset Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Study Tasks due today"
                value={newFilterName}
                onChange={e => setNewFilterName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 px-4 py-2 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveFilterProfile}
                className="flex-1 bg-indigo-600 text-white py-2 text-xs font-black uppercase rounded-xl hover:opacity-90 active:scale-95 transition-all"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSaveFilterModal(false)}
                className="flex-1 border border-gray-100 dark:border-gray-800 text-gray-500 py-2 text-xs font-black uppercase rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
