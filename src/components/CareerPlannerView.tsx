import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, 
  Target, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  Compass, 
  Award, 
  Plus, 
  Trash2, 
  Zap, 
  Check, 
  Layers, 
  ArrowRight, 
  Bookmark,
  Activity,
  Edit2
} from "lucide-react";
import { Habit, Task, Goal, GoalType, StudyCourse, EisenhowerQuadrant } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface CareerPath {
  id: string;
  current_position: string;
  target_position: string;
  target_year: number;
  category: string;
  vision_statement: string;
  progress_percentage: number;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string;
  completed: boolean;
}

interface CareerSkill {
  id: string;
  skill_name: string;
  completed: boolean;
}

interface PlanData {
  roadmap: Array<{ stage: string; title: string; description: string }>;
  certifications: string[];
  experience_requirements: string;
  books_and_resources: string[];
  projects_to_complete: string[];
  monthly_learning_targets: string[];
  gap_analysis: {
    current_state: string;
    desired_state: string;
    missing_experience: string;
    suggested_actions: string[];
  };
}

interface CareerPlannerViewProps {
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  studyCourses: StudyCourse[];
  setStudyCourses: React.Dispatch<React.SetStateAction<StudyCourse[]>>;
}

const CAREER_CATEGORIES = [
  "Technology",
  "Government Jobs",
  "UPSC",
  "Business & Entrepreneurship",
  "Finance",
  "Healthcare",
  "Design",
  "Education",
  "Other"
];

export default function CareerPlannerView({
  habits,
  setHabits,
  tasks,
  setTasks,
  goals,
  setGoals,
  studyCourses,
  setStudyCourses
}: CareerPlannerViewProps) {
  // Supabase Sync States
  const [session, setSession] = useState<any>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [supabaseErrorState, setSupabaseErrorState] = useState<string | null>(null);

  // Safe custom notification and confirmation states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => setSyncToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  // Local active trajectory state
  const [activePath, setActivePath] = useState<CareerPath | null>(() => {
    const saved = localStorage.getItem("wrindha_active_career_path");
    return saved ? JSON.parse(saved) : null;
  });

  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    const saved = localStorage.getItem("wrindha_career_milestones");
    return saved ? JSON.parse(saved) : [];
  });

  const [skills, setSkills] = useState<CareerSkill[]>(() => {
    const saved = localStorage.getItem("wrindha_career_skills");
    return saved ? JSON.parse(saved) : [];
  });

  const [planData, setPlanData] = useState<PlanData>(() => {
    const saved = localStorage.getItem("wrindha_career_plan_data_manual");
    if (saved) return JSON.parse(saved);
    
    return {
      roadmap: [],
      certifications: [],
      experience_requirements: "",
      books_and_resources: [],
      projects_to_complete: [],
      monthly_learning_targets: [],
      gap_analysis: {
        current_state: "",
        desired_state: "",
        missing_experience: "",
        suggested_actions: []
      }
    };
  });

  // Creation form states
  const [currentPosition, setCurrentPosition] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [targetYear, setTargetYear] = useState<number>(5);
  const [category, setCategory] = useState("Technology");
  const [visionStatement, setVisionStatement] = useState("");
  const [initialExperience, setInitialExperience] = useState("");

  // Sub-adders form states inside dashboard
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mTargetDate, setMTargetDate] = useState("");

  const [newSkillInput, setNewSkillInput] = useState("");
  const [newCertInput, setNewCertInput] = useState("");
  const [newBookInput, setNewBookInput] = useState("");
  const [newProjectInput, setNewProjectInput] = useState("");
  const [newActionInput, setNewActionInput] = useState("");
  const [newTargetInput, setNewTargetInput] = useState("");

  const [showRoadmapForm, setShowRoadmapForm] = useState(false);
  const [rStage, setRStage] = useState("");
  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");

  // Editable fields for gap analysis
  const [isEditingGaps, setIsEditingGaps] = useState(false);
  const [editCurrentState, setEditCurrentState] = useState("");
  const [editDesiredState, setEditDesiredState] = useState("");
  const [editMissingExp, setEditMissingExp] = useState("");
  const [editExpRequirements, setEditExpRequirements] = useState("");

  // Sync and Fetch from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseLoading(false);
      return;
    }
    
    const initSessionAndFetch = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession) {
          const { data, error } = await supabase.from('career_plans').select('*').eq('user_id', currentSession.user.id).maybeSingle();
          if (error) {
            if (error.code === "42P01") {
              console.warn("Career plans table not yet initialized in Supabase. Falling back to local storage.");
              setSupabaseErrorState("Table not initialized in database. Using local storage.");
            } else {
              console.error("Error fetching career plans from Supabase:", error);
            }
          } else if (data) {
            if (data.active_path) setActivePath(data.active_path);
            if (data.milestones) setMilestones(data.milestones);
            if (data.skills) setSkills(data.skills);
            if (data.plan_data) setPlanData(data.plan_data);
          }
        }
      } catch (err) {
        console.error("Unhandled error fetching career plans:", err);
      } finally {
        setSupabaseLoading(false);
      }
    };

    initSessionAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (supabaseLoading || !session || !isSupabaseConfigured() || supabaseErrorState) return;

    const syncChanges = async () => {
      try {
        await supabase.from('career_plans').upsert({
          user_id: session.user.id,
          active_path: activePath,
          milestones: milestones,
          skills: skills,
          plan_data: planData,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to sync career plan back to Supabase:", err);
      }
    };

    const handler = setTimeout(() => {
      syncChanges();
    }, 1000);

    return () => clearTimeout(handler);
  }, [activePath, milestones, skills, planData, supabaseLoading, session, supabaseErrorState]);

  // Sync states to local storage
  useEffect(() => {
    if (activePath) {
      localStorage.setItem("wrindha_active_career_path", JSON.stringify(activePath));
    } else {
      localStorage.removeItem("wrindha_active_career_path");
    }
  }, [activePath]);

  useEffect(() => {
    localStorage.setItem("wrindha_career_milestones", JSON.stringify(milestones));
  }, [milestones]);

  useEffect(() => {
    localStorage.setItem("wrindha_career_skills", JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    localStorage.setItem("wrindha_career_plan_data_manual", JSON.stringify(planData));
  }, [planData]);

  // Handle local editable states when planData or activePath changes
  useEffect(() => {
    if (planData) {
      setEditCurrentState(planData.gap_analysis.current_state);
      setEditDesiredState(planData.gap_analysis.desired_state);
      setEditMissingExp(planData.gap_analysis.missing_experience);
      setEditExpRequirements(planData.experience_requirements);
    }
  }, [planData]);

  // Logic to calculate progress
  const totalSkillsCount = skills.length;
  const completedSkillsCount = skills.filter(s => s.completed).length;
  
  const totalMilestonesCount = milestones.length;
  const completedMilestonesCount = milestones.filter(m => m.completed).length;

  const totalPossibleChecks = totalSkillsCount + totalMilestonesCount;
  const currentCompletedChecks = completedSkillsCount + completedMilestonesCount;

  const progressPct = totalPossibleChecks > 0 
    ? Math.round((currentCompletedChecks / totalPossibleChecks) * 100) 
    : 0;

  // Level Power Score index calculation
  const targetScore = totalPossibleChecks > 0
    ? Math.round(((completedSkillsCount * 3 + completedMilestonesCount * 5) / (totalSkillsCount * 3 + totalMilestonesCount * 5)) * 100)
    : 0;

  const renderDbSyncStatus = () => {
    if (!isSupabaseConfigured()) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-black uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Offline Mode
        </span>
      );
    }
    if (supabaseLoading) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Connecting Cloud...
        </span>
      );
    }
    if (supabaseErrorState) {
      return (
        <span 
          title="To enable permanent cloud sync, please execute the SQL script in your Supabase SQL editor!"
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider cursor-help border border-amber-500/20"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Local storage (Run SQL queries)
        </span>
      );
    }
    if (session) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Cloud Saved
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Log in to sync cloud
      </span>
    );
  };

  const createManualPathway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPosition.trim() || !targetPosition.trim()) return;

    const pathId = `path-${Date.now()}`;
    const newPath: CareerPath = {
      id: pathId,
      current_position: currentPosition.trim(),
      target_position: targetPosition.trim(),
      target_year: targetYear,
      category,
      vision_statement: visionStatement.trim() || "Consistently practicing and upskilling manually.",
      progress_percentage: 0,
      created_at: new Date().toISOString()
    };

    const initialPlan: PlanData = {
      roadmap: [
        { stage: "Year 1", title: "Build Structural Foundations", description: "Target core learning objectives and establish daily discipline." },
        { stage: `Year ${targetYear}`, title: `Achieve ${targetPosition.trim()}`, description: "Fully qualify for and apply to target objectives." }
      ],
      certifications: [],
      experience_requirements: initialExperience.trim() || "Demonstrated real-world project portfolios.",
      books_and_resources: [],
      projects_to_complete: [],
      monthly_learning_targets: [],
      gap_analysis: {
        current_state: `Working currently as: ${currentPosition.trim()}`,
        desired_state: `Transitioning successfully into: ${targetPosition.trim()}`,
        missing_experience: "Needs specialized training modules and hands-on case studies.",
        suggested_actions: []
      }
    };

    // Synchronize to general Goals architecture
    const autoGoal: Goal = {
      id: `goal-carrier-${Date.now()}`,
      title: `Achieve destination: ${targetPosition.trim()} (${category})`,
      type: targetYear <= 2 ? GoalType.SHORT : (targetYear <= 5 ? GoalType.MEDIUM : GoalType.LONG),
      progress: 0,
      targetDate: new Date(Date.now() + targetYear * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    setGoals((prev) => [...prev, autoGoal]);

    // Pre-populate some starter template elements based on category so user isn't fully empty, which they can manually edit/delete
    let starterSkills: string[] = [];
    let starterMilestones: Milestone[] = [];

    if (category === "Technology") {
      starterSkills = ["Algorithm Analysis", "System Design", "Git Version Control", "Testing & CI/CD"];
      starterMilestones = [
        { id: `m-1-${Date.now()}`, title: "Launch Core Portfolio", description: "Deploy a live full-stack web software concept.", target_date: "Month 4", completed: false },
        { id: `m-2-${Date.now()}`, title: "Master System Design", description: "Read standard distribution databases papers.", target_date: "Month 8", completed: false }
      ];
    } else {
      starterSkills = ["Time Management", "Deep Work Habit", "Focused Syllabus Research", "Technical Drafting"];
      starterMilestones = [
        { id: `m-1-${Date.now()}`, title: "Finish Initial Reference Set", description: "Complete study of first module and prepare notes.", target_date: "Month 3", completed: false }
      ];
    }

    const initialSkills: CareerSkill[] = starterSkills.map((s, idx) => ({
      id: `s-${idx}-${Date.now()}`,
      skill_name: s,
      completed: false
    }));

    setActivePath(newPath);
    setMilestones(starterMilestones);
    setSkills(initialSkills);
    setPlanData(initialPlan);
  };

  // Add individual custom elements
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim() || !mTargetDate.trim()) return;

    const newM: Milestone = {
      id: `m-${Date.now()}`,
      title: mTitle.trim(),
      description: mDesc.trim() || "Manual custom milestone target.",
      target_date: mTargetDate.trim(),
      completed: false
    };

    setMilestones(prev => [...prev, newM]);
    setMTitle("");
    setMDesc("");
    setMTargetDate("");
    setShowMilestoneForm(false);
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (!newSkillInput.trim()) return;

    const newSkill: CareerSkill = {
      id: `s-${Date.now()}`,
      skill_name: newSkillInput.trim(),
      completed: false
    };

    setSkills(prev => [...prev, newSkill]);
    setNewSkillInput("");
  };

  const handleAddRoadmapStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rStage.trim() || !rTitle.trim()) return;

    const newNode = {
      stage: rStage.trim(),
      title: rTitle.trim(),
      description: rDesc.trim() || "Focused development objectives."
    };

    setPlanData(prev => ({
      ...prev,
      roadmap: [...prev.roadmap, newNode].sort((a, b) => a.stage.localeCompare(b.stage))
    }));

    setRStage("");
    setRTitle("");
    setRDesc("");
    setShowRoadmapForm(false);
  };

  const handleAddCertification = () => {
    if (!newCertInput.trim()) return;
    setPlanData(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCertInput.trim()]
    }));
    setNewCertInput("");
  };

  const handleAddBookResource = () => {
    if (!newBookInput.trim()) return;
    setPlanData(prev => ({
      ...prev,
      books_and_resources: [...prev.books_and_resources, newBookInput.trim()]
    }));
    setNewBookInput("");
  };

  const handleAddProject = () => {
    if (!newProjectInput.trim()) return;
    setPlanData(prev => ({
      ...prev,
      projects_to_complete: [...prev.projects_to_complete, newProjectInput.trim()]
    }));
    setNewProjectInput("");
  };

  const handleAddSuggestedAction = () => {
    if (!newActionInput.trim()) return;
    setPlanData(prev => ({
      ...prev,
      gap_analysis: {
        ...prev.gap_analysis,
        suggested_actions: [...prev.gap_analysis.suggested_actions, newActionInput.trim()]
      }
    }));
    setNewActionInput("");
  };

  const handleAddTarget = () => {
    if (!newTargetInput.trim()) return;
    setPlanData(prev => ({
      ...prev,
      monthly_learning_targets: [...prev.monthly_learning_targets, newTargetInput.trim()]
    }));
    setNewTargetInput("");
  };

  // Toggle checks states
  const handleToggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const handleToggleMilestone = (id: string) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
  };

  // Removal operators
  const handleDeleteMilestoneLocal = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const handleDeleteSkillLocal = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteRoadmapNode = (idx: number) => {
    setPlanData(prev => ({
      ...prev,
      roadmap: prev.roadmap.filter((_, i) => i !== idx)
    }));
  };

  const handleDeleteCert = (idx: number) => {
    setPlanData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== idx)
    }));
  };

  const handleDeleteBook = (idx: number) => {
    setPlanData(prev => ({
      ...prev,
      books_and_resources: prev.books_and_resources.filter((_, i) => i !== idx)
    }));
  };

  const handleDeleteProjectLocal = (idx: number) => {
    setPlanData(prev => ({
      ...prev,
      projects_to_complete: prev.projects_to_complete.filter((_, i) => i !== idx)
    }));
  };

  const handleDeleteAction = (idx: number) => {
    setPlanData(prev => ({
      ...prev,
      gap_analysis: {
        ...prev.gap_analysis,
        suggested_actions: prev.gap_analysis.suggested_actions.filter((_, i) => i !== idx)
      }
    }));
  };

  const handleDeleteTargetLocal = (idx: number) => {
    setPlanData(prev => ({
      ...prev,
      monthly_learning_targets: prev.monthly_learning_targets.filter((_, i) => i !== idx)
    }));
  };

  // Save manual gaps edits
  const handleSaveGapsEdits = () => {
    setPlanData(prev => ({
      ...prev,
      experience_requirements: editExpRequirements.trim(),
      gap_analysis: {
        ...prev.gap_analysis,
        current_state: editCurrentState.trim(),
        desired_state: editDesiredState.trim(),
        missing_experience: editMissingExp.trim()
      }
    }));
    setIsEditingGaps(false);
  };

  const clearPlanner = () => {
    setActivePath(null);
    setMilestones([]);
    setSkills([]);
    setPlanData({
      roadmap: [],
      certifications: [],
      experience_requirements: "",
      books_and_resources: [],
      projects_to_complete: [],
      monthly_learning_targets: [],
      gap_analysis: {
        current_state: "",
        desired_state: "",
        missing_experience: "",
        suggested_actions: []
      }
    });
    setSyncToast("Career trajectory plan reset completed successfully.");
  };

  // Integrations mapping sync to other modules
  const handleAddTaskIntegration = (title: string, desc: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 11),
      title: title,
      description: desc,
      completed: false,
      quadrant: EisenhowerQuadrant.NOT_URGENT_IMPORTANT, // Not Urgent but Important (standard long-term development quadrant!)
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      tags: ["Career"]
    };
    setTasks(prev => [...prev, newTask]);
    setSyncToast(`"${title}" synchronized into your Eisenhower Matrix!`);
  };

  const handleAddHabitIntegration = (habitName: string) => {
    const newHabit: Habit = {
      id: Math.random().toString(36).substring(2, 11),
      name: habitName,
      frequency: "daily",
      streak: 0,
      completedAt: [],
      color: "bg-indigo-500"
    };
    setHabits(prev => [...prev, newHabit]);
    setSyncToast(`"${habitName}" added to daily Habits routine!`);
  };

  const handleAddStudyCourseIntegration = (courseName: string, notes: string) => {
    const newCourse: StudyCourse = {
      id: Math.random().toString(36).substring(2, 11),
      name: courseName,
      progress: 0,
      color: "bg-purple-500",
      exams: [],
      materials: [
        { id: `mat-1-${Date.now()}`, title: `Reference Study notes: ${notes.substring(0, 30)}...`, completed: false }
      ]
    };
    setStudyCourses(prev => [...prev, newCourse]);
    setSyncToast(`"${courseName}" created inside Study Planner courses successfully!`);
  };

  return (
    <div className="space-y-8 relative" id="career-planner-module">
      {/* Dynamic Custom Toast Alert */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-indigo-600 dark:bg-indigo-950 text-white px-4 py-3 rounded-2xl shadow-2xl border border-indigo-500/20 max-w-sm"
          >
            <CheckCircle className="w-4 h-4 text-emerald-450 shrink-0" />
            <span className="text-xs font-black leading-tight">{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!activePath ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 border border-indigo-50 dark:border-gray-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-6 gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest">
                  <Compass className="w-3.5 h-3.5" /> Career Architect Board
                </div>
                {renderDbSyncStatus()}
              </div>
              <h2 className="text-3xl font-black text-gray-950 dark:text-white tracking-tight">Manual Trajectory Planner</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Map out your future roles, skill arrays, milestones, and courses manually. Complete tasks to level up your Power Score indexing.
              </p>
            </div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500 shadow-inner">
              <Briefcase className="w-8 h-8" />
            </div>
          </div>

          <form onSubmit={createManualPathway} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Current Position Status</label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
                placeholder="e.g. Student, Fresher, Associate Engineer, self-employed"
                value={currentPosition}
                onChange={e => setCurrentPosition(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Desired Target Role</label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
                placeholder="e.g. Lead AI Specialist, Government Administrator, Founder"
                value={targetPosition}
                onChange={e => setTargetPosition(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Target Year range</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors appearance-none"
                value={targetYear}
                onChange={e => setTargetYear(parseInt(e.target.value))}
              >
                <option value={1}>1 Year (Short Interval)</option>
                <option value={3}>3 Years (Medium Trajectory)</option>
                <option value={5}>5 Years (Strategic Transform)</option>
                <option value={10}>10 Years (Ultimate Milestone)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Industrial Category Sector</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors appearance-none"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CAREER_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">My Vision Statement & Purpose</label>
              <textarea 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors min-h-[90px]"
                placeholder="Draft what fuels your passion, core values, and ultimate destination..."
                value={visionStatement}
                onChange={e => setVisionStatement(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Demonstrated Experience / Core Prerequisites</label>
              <input 
                type="text" 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 dark:border-gray-800 outline-none focus:border-indigo-400 transition-colors"
                placeholder="e.g. Mastered Docker fundamentals, requires 2 full-scale cloud migrations"
                value={initialExperience}
                onChange={e => setInitialExperience(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="mt-4 md:col-span-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 scale-100 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              Initialize Custom Career Architecture Board &rarr;
            </button>
          </form>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Dashboard Summary Hero */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 md:p-8 shadow-xl flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/15 text-indigo-650 dark:text-indigo-300 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  {activePath.category} Track
                </span>
                <span className="text-[11px] text-gray-700 dark:text-gray-200 flex items-center gap-1 font-extrabold bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-indigo-505" /> Target: {activePath.target_year} Year(s) Horizon
                </span>
                {renderDbSyncStatus()}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{activePath.current_position}</span> 
                <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0" /> 
                <span className="text-indigo-600 dark:text-indigo-400">{activePath.target_position}</span>
              </h2>
              <div className="border-l-4 border-indigo-400 pl-4 space-y-1.5 bg-indigo-50/20 dark:bg-indigo-950/20 py-2 pr-4 rounded-r-xl">
                <h6 className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-300 tracking-wider">My Trajectory Goal Vision</h6>
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 max-w-2xl leading-relaxed">
                  "{activePath.vision_statement}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {showResetConfirm ? (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-901/40 p-1.5 rounded-xl">
                  <span className="text-[10px] font-black text-red-650 dark:text-red-405 pl-2 uppercase">Confirm reset?</span>
                  <button
                    onClick={() => {
                      clearPlanner();
                      setShowResetConfirm(false);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-1.5 px-4 py-3 border border-red-200 dark:border-red-950/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 text-xs font-black rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Reset Trajectory
                </button>
              )}
            </div>
          </div>

          {/* Achievement Scoreboard Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-200">Manual Progression Index</span>
                <Compass className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-black text-gray-950 dark:text-white">{progressPct}%</div>
                <p className="text-[10px] text-gray-650 dark:text-gray-300 font-extrabold">Total metrics completed</p>
              </div>
              <div className="h-2 bg-gray-55 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                   className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-705"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-200">Dynamic Skills Arrays</span>
                <Award className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-gray-950 dark:text-white">
                {completedSkillsCount} <span className="text-sm font-black text-gray-500">/ {totalSkillsCount}</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black mt-1 uppercase tracking-wide">
                {totalSkillsCount - completedSkillsCount} focus skill(s) remaining
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-200">Target Milestones Achieved</span>
                <CheckCircle className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-gray-950 dark:text-white">
                {completedMilestonesCount} <span className="text-sm font-black text-gray-500">/ {totalMilestonesCount}</span>
              </div>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-black mt-1 uppercase tracking-wide">
                {totalMilestonesCount - completedMilestonesCount} target milestone(s) active
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-[2rem] shadow-sm bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/10 to-transparent">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-200">Objective Power Score</span>
                <Zap className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-indigo-650 dark:text-indigo-400">
                {targetScore} <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 block sm:inline">pts Index</span>
              </div>
              <p className="text-[10px] text-gray-650 dark:text-gray-350 font-extrabold mt-1">
                Calculated dynamically from completed checklist points. Level up skill checks to score 100!
              </p>
            </div>
          </div>

          {/* Master Timeline Node Section */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-950 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-indigo-500" /> Customize Roadmap Progression Timeline
              </h3>
              <button
                onClick={() => setShowRoadmapForm(!showRoadmapForm)}
                className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/35 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Stage Node
              </button>
            </div>

            {showRoadmapForm && (
              <motion.form 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAddRoadmapStage}
                className="p-5 bg-gray-50 dark:bg-gray-950 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Chronological Stage (e.g. Year 1, Month 6)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Year 1 Foundation" 
                    className="w-full bg-white dark:bg-gray-900 px-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-indigo-500 mt-1"
                    value={rStage}
                    onChange={e => setRStage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Focus Target Goal title</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Earn Solutions Architect Cert" 
                    className="w-full bg-white dark:bg-gray-900 px-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-indigo-500 mt-1"
                    value={rTitle}
                    onChange={e => setRTitle(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Objective Milestone Details</label>
                  <textarea 
                    placeholder="Details about training, study schedule, and hands-on deliverables..." 
                    className="w-full bg-white dark:bg-gray-900 px-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-indigo-500 mt-1 min-h-[50px]"
                    value={rDesc}
                    onChange={e => setRDesc(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowRoadmapForm(false)}
                    className="px-3 py-1.5 bg-gray-205 text-xs text-gray-500 hover:bg-gray-150 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-extrabold rounded-lg cursor-pointer"
                  >
                    Save Node Stage
                  </button>
                </div>
              </motion.form>
            )}

            {/* Timeline graphics rendering */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-3">
              {planData.roadmap.map((node, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl relative space-y-2 border border-transparent dark:border-gray-800">
                  <button 
                    onClick={() => handleDeleteRoadmapNode(index)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove roadmap stage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="inline-block px-2.5 py-0.5 bg-indigo-150 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-black rounded-lg font-mono">
                    {node.stage}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-950 dark:text-white leading-snug">{node.title}</h4>
                    <p className="text-[11.5px] text-gray-805 dark:text-gray-200 font-bold leading-relaxed mt-1">{node.description}</p>
                  </div>
                </div>
              ))}

              {planData.roadmap.length === 0 && (
                <div className="col-span-full text-center py-6 text-xs text-gray-800 dark:text-gray-200 font-black">
                  No chronological roadmap stages defined yet. Add timeline milestones manually to plan your years!
                </div>
              )}
            </div>
          </div>

          {/* Core Skills and Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Interactive milestones card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
                <h3 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle className="w-4.5 h-4.5 text-purple-500" /> Milestone Action Checklist ({milestones.length})
                </h3>
                <button
                  onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                  className="text-xs px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Milestone
                </button>
              </div>

              {showMilestoneForm && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onSubmit={handleAddMilestone}
                  className="p-4 bg-purple-50/50 dark:bg-purple-950/15 rounded-2xl space-y-3"
                >
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-500">Milestone Title</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Publish core whitepaper system layout"
                      value={mTitle}
                      onChange={e => setMTitle(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 px-3 py-1.5 text-xs rounded-lg border border-gray-200 mt-0.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-500">Ideal target achievements date (e.g. Month 3, Year 2)</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Month 6"
                      value={mTargetDate}
                      onChange={e => setMTargetDate(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 px-3 py-1.5 text-xs rounded-lg border border-gray-200 mt-0.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-500">Brief expectation outcome</label>
                    <input 
                      type="text" 
                      placeholder="Description of deliverables..."
                      value={mDesc}
                      onChange={e => setMDesc(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 px-3 py-1.5 text-xs rounded-lg border border-gray-200 mt-0.5 outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button 
                      type="button" 
                      className="text-gray-400 hover:text-gray-500" 
                      onClick={() => setShowMilestoneForm(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3 py-1 bg-purple-500 text-white font-extrabold rounded-md cursor-pointer"
                    >
                      Add Custom Milestone
                    </button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {milestones.map((milestone) => (
                  <div 
                    key={milestone.id}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer relative ${
                      milestone.completed 
                        ? "bg-purple-500/5 border-purple-500/10 text-gray-500" 
                        : "bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 shadow-sm"
                    }`}
                    onClick={() => handleToggleMilestone(milestone.id)}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMilestoneLocal(milestone.id);
                      }}
                      className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-start justify-between gap-3 mr-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                          milestone.completed 
                            ? "bg-purple-600 border-purple-600 text-white" 
                            : "border-gray-300 dark:border-gray-700 hover:border-purple-500"
                        }`}>
                          {milestone.completed && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <h4 className={`font-black text-sm ${milestone.completed ? "line-through text-gray-500" : "text-gray-950 dark:text-white"}`}>
                            {milestone.title}
                          </h4>
                          <p className={`text-xs mt-1 leading-relaxed font-bold ${milestone.completed ? "text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>{milestone.description}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                        {milestone.target_date}
                      </span>
                    </div>

                    {!milestone.completed && (
                      <div className="mt-3 pt-3 border-t border-gray-55 dark:border-gray-900/60 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTaskIntegration(milestone.title, `Milestone goal: ${milestone.description}. Targets: ${milestone.target_date}`);
                          }}
                          className="text-[10px] text-indigo-550 hover:text-indigo-600 dark:hover:text-indigo-400 font-extrabold uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Sync as active Task
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {milestones.length === 0 && (
                  <div className="text-center py-10 text-xs text-gray-800 dark:text-gray-200 font-extrabold">
                    No milestone checkpoints tracked yet. Click "+ Milestone" above to map your key hurdles!
                  </div>
                )}
              </div>
            </div>

            {/* Custom Skills board */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3">
                <Award className="w-4.5 h-4.5 text-emerald-500 inline-block mr-1.5" /> Career Focus Skill List ({skills.length})
              </h3>

              {/* Inline skill composer */}
              <div className="flex gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-2xl">
                <input 
                  type="text" 
                  placeholder="Type skill name & hit Enter or click (+)"
                  className="bg-transparent text-xs font-semibold px-3 py-2 outline-none flex-1 text-gray-800 dark:text-white"
                  value={newSkillInput}
                  onChange={e => setNewSkillInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAddSkill(e);
                  }}
                />
                <button 
                  onClick={handleAddSkill}
                  className="px-3.5 py-2 bg-emerald-550 bg-emerald-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {skills.map((skill) => (
                  <div 
                    key={skill.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      skill.completed 
                        ? "bg-emerald-500/5 border-emerald-500/10 text-gray-500" 
                        : "bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 shadow-sm"
                    }`}
                    onClick={() => handleToggleSkill(skill.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        skill.completed 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "border-gray-300 dark:border-gray-700 hover:border-emerald-500"
                      }`}>
                        {skill.completed && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm font-bold ${skill.completed ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                        {skill.skill_name}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                      {!skill.completed && (
                        <button
                          onClick={() => handleAddHabitIntegration(`Practice custom skill: ${skill.skill_name}`)}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-[10px] text-indigo-500 font-extrabold rounded-lg hover:bg-indigo-100 uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Activity className="w-3 h-3" /> Sync Habit
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteSkillLocal(skill.id)}
                        className="p-1 px-2 text-gray-350 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete skill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {skills.length === 0 && (
                  <div className="text-center py-10 text-xs italic text-gray-400">
                    No target skills specified. Register key competencies above to build your active profile!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gap Analysis Customizer */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-950 dark:text-white flex items-center gap-1.5">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500" /> Professional Gap Analysis
              </h3>
              <button 
                onClick={() => {
                  if (isEditingGaps) {
                    handleSaveGapsEdits();
                  } else {
                    setIsEditingGaps(true);
                  }
                }}
                className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  isEditingGaps ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-white"
                }`}
              >
                <Edit2 className="w-3 h-3" /> {isEditingGaps ? "Save Gaps Details" : "Edit Gaps Detail"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-950 p-5 rounded-3xl space-y-1.5">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-300">Current Competencies & Experience</h5>
                  {isEditingGaps ? (
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 px-3 py-2 text-xs rounded-xl border border-gray-200 mt-1 focus:ring-1 focus:ring-indigo-500 shrink-0"
                      value={editCurrentState}
                      onChange={e => setEditCurrentState(e.target.value)}
                    />
                  ) : (
                    <p className="text-xs text-gray-950 dark:text-white font-bold leading-relaxed">
                      {planData.gap_analysis.current_state || "Write your current experience baseline status..."}
                    </p>
                  )}
                </div>

                <div className="bg-indigo-500/5 p-5 rounded-3xl border border-indigo-500/10 space-y-1.5">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Desired Competencies target state</h5>
                  {isEditingGaps ? (
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 px-3 py-2 text-xs rounded-xl border border-gray-200 mt-1 focus:ring-1 focus:ring-indigo-500"
                      value={editDesiredState}
                      onChange={e => setEditDesiredState(e.target.value)}
                    />
                  ) : (
                    <p className="text-xs text-indigo-950 dark:text-indigo-100 font-black leading-relaxed">
                      {planData.gap_analysis.desired_state || "Describe your destination competencies goals..."}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-950 p-5 rounded-3xl space-y-2">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-300">Expected Experience Gaps</h5>
                  {isEditingGaps ? (
                    <textarea 
                      className="w-full bg-white dark:bg-gray-900 px-3 py-2 text-xs rounded-xl border border-gray-200 mt-1 focus:ring-1 focus:ring-indigo-500"
                      value={editMissingExp}
                      onChange={e => setEditMissingExp(e.target.value)}
                    />
                  ) : (
                    <p className="text-xs text-gray-950 dark:text-white font-bold leading-relaxed">
                      {planData.gap_analysis.missing_experience || "Identify credentials or portfolio works missing..."}
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-900/60 text-[11px] text-gray-400">
                    <span className="font-extrabold block uppercase text-[8px] text-indigo-600 dark:text-indigo-450 tracking-wider">Experience Gaps Prerequisites:</span>
                    {isEditingGaps ? (
                      <input 
                        type="text" 
                        value={editExpRequirements}
                        onChange={e => setEditExpRequirements(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 px-3 py-1.5 text-xs rounded-lg border border-gray-100 outline-none my-1"
                      />
                    ) : (
                      <div className="font-bold text-gray-950 dark:text-white mt-1">
                        {planData.experience_requirements || "e.g. Mastered AWS or physical certifications."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action priority checklist */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-3">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                    ● Deficit Skills focus ({skills.filter(s => !s.completed).length} custom remaining)
                  </h5>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {skills.filter(s => !s.completed).map((s) => (
                      <span 
                        key={s.id} 
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg border border-rose-100/50"
                      >
                        {s.skill_name}
                      </span>
                    ))}
                    {skills.filter(s => !s.completed).length === 0 && (
                      <span className="text-xs text-gray-400 italic">All dynamic skill gaps bridged! Great job.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Professional Action Priorities List</h5>
                  
                  <div className="flex gap-2 bg-gray-50 dark:bg-gray-950 p-1.5 rounded-xl">
                    <input 
                      type="text" 
                      placeholder="Add urgent action priority..."
                      className="bg-transparent text-xs font-semibold px-3 py-1.5 outline-none flex-1 dark:text-white text-gray-800"
                      value={newActionInput}
                      onChange={e => setNewActionInput(e.target.value)}
                    />
                    <button 
                      onClick={handleAddSuggestedAction}
                      className="p-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {planData.gap_analysis.suggested_actions.map((action, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-950 p-3 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <p className="font-extrabold text-gray-800 dark:text-gray-200 leading-relaxed">
                          {action}
                        </p>
                        <div className="flex gap-2 items-center shrink-0">
                          <button
                            onClick={() => handleAddTaskIntegration(action, "Task mapped from custom career analysis board.")}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer font-bold"
                            title="Sync as Task"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAction(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {planData.gap_analysis.suggested_actions.length === 0 && (
                      <div className="text-center py-6 text-[11px] text-gray-400 italic">
                        No custom actionable items added yet. Map tasks with prioritization keys!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Educational Books & Certifications Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Reference board books & notes */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3 flex items-center gap-1.5">
                <BookOpen className="w-4.5 h-4.5 text-yellow-500" /> Personalized Books & Learning Hub Cards
              </h3>

              <div className="flex gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-2xl">
                <input 
                  type="text" 
                  placeholder="e.g. 'Polity by Laxmikanth' or course link..."
                  className="bg-transparent text-xs font-semibold px-3 py-2 outline-none flex-1 text-gray-800 dark:text-white"
                  value={newBookInput}
                  onChange={e => setNewBookInput(e.target.value)}
                />
                <button 
                  onClick={handleAddBookResource}
                  className="px-3.5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {planData.books_and_resources.map((resItem, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3">
                      <Bookmark className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-extrabold text-gray-900 dark:text-white leading-relaxed">
                          {resItem}
                        </p>
                        <p className="text-[10px] text-gray-650 dark:text-gray-300 font-black">Reference Learning Material</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddStudyCourseIntegration(resItem.split('by')[0].trim() || resItem, resItem)}
                        className="px-2 py-1 bg-white dark:bg-gray-900 text-[10px] text-indigo-500 font-black border border-gray-150 dark:border-gray-800 rounded-lg hover:bg-indigo-50 uppercase flex items-center gap-1 cursor-pointer"
                      >
                        Add to Courses
                      </button>
                      <button 
                        onClick={() => handleDeleteBook(idx)}
                        className="p-1 px-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {planData.books_and_resources.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-850 dark:text-gray-200 font-black">
                    No learning books or courses added yet. Track your educational blueprints above!
                  </div>
                )}

                {/* Target certifications nested */}
                <div className="pt-4 border-t border-gray-55 dark:border-gray-900/60 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Target Certifications objectives</h4>
                  
                  <div className="flex gap-2 bg-gray-50 dark:bg-gray-950 p-1.5 rounded-xl">
                    <input 
                      type="text" 
                      placeholder="e.g. AWS Solutions Architect Professional"
                      className="bg-transparent text-xs font-semibold px-2 py-1 outline-none flex-1 text-gray-800 dark:text-white"
                      value={newCertInput}
                      onChange={e => setNewCertInput(e.target.value)}
                    />
                    <button 
                      onClick={handleAddCertification}
                      className="p-1 px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {planData.certifications.map((cert, idx) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-50/85 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100/50 flex items-center gap-1.5">
                        {cert}
                        <button 
                          onClick={() => handleDeleteCert(idx)}
                          className="hover:text-red-500 transition-colors shrink-0 text-[10px] ml-1 cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {planData.certifications.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No credentials mapped. Add targets above!</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Landmark Capstone Projects & checklist */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3 flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-blue-500" /> Milestone Capstone Portfolios
              </h3>

              <div className="flex gap-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-2xl">
                <input 
                  type="text" 
                  placeholder="e.g. Build distributed compiler or portfolio site..."
                  className="bg-transparent text-xs font-semibold px-3 py-2 outline-none flex-1 text-gray-800 dark:text-white"
                  value={newProjectInput}
                  onChange={e => setNewProjectInput(e.target.value)}
                />
                <button 
                  onClick={handleAddProject}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {planData.projects_to_complete.map((proj, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-indigo-50/20 dark:from-indigo-950/10 to-transparent border border-gray-50 dark:border-gray-950 rounded-2xl space-y-2 text-xs relative">
                    <button 
                      onClick={() => handleDeleteProjectLocal(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <h4 className="font-extrabold text-gray-950 dark:text-white leading-relaxed pr-6">{proj}</h4>
                      <p className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wide mt-1">Manual capstone showcase project</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleAddTaskIntegration(proj, `Capstone Project development focus: ${proj}`)}
                        className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Sync as active Task
                      </button>
                    </div>
                  </div>
                ))}                {planData.projects_to_complete.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-805 dark:text-gray-200 font-extrabold">
                    No custom portfolio projects tracked yet. Build landmark case studies to display expertise!
                  </div>
                )}

                {/* Monthly targets checklist */}
                <div className="pt-4 border-t border-gray-55 dark:border-gray-900/60 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-200 block">Monthly Practice Targets</h4>
                  
                  <div className="flex gap-2 bg-gray-50 dark:bg-gray-950 p-1.5 rounded-xl">
                    <input 
                      type="text" 
                      placeholder="e.g. Write 5 essay whitepapers with self evaluations"
                      className="bg-transparent text-xs font-semibold px-2 py-1 outline-none flex-1 text-gray-800 dark:text-white"
                      value={newTargetInput}
                      onChange={e => setNewTargetInput(e.target.value)}
                    />
                    <button 
                      onClick={handleAddTarget}
                      className="p-1 px-3 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <ul className="space-y-2 mt-2 text-xs">
                    {planData.monthly_learning_targets.map((tgt, idx) => (
                      <li key={idx} className="text-gray-850 dark:text-gray-100 font-black flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                          <span>{tgt}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteTargetLocal(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                    {planData.monthly_learning_targets.length === 0 && (
                      <li className="text-xs text-gray-805 dark:text-gray-250 font-extrabold">No monthly practice targets set. Create some above!</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
