import React, { useState, useEffect, useRef } from "react";
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Check,
  LayoutDashboard, 
  ListTodo, 
  Target, 
  Wallet, 
  FileText, 
  GraduationCap,
  Settings,
  Bell,
  Menu,
  X,
  Plus,
  Flame,
  Brain,
  BookOpen,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Shield,
  Users,
  Activity,
  LogIn,
  LogOut,
  Database,
  Settings2,
  ExternalLink,
  Lock,
  Unlock,
  Trash2,
  Mail,
  RefreshCcw,
  Clock,
  Info,
  Heart,
  MessageCircle,
  Scale,
  Handshake,
  CreditCard,
  Award,
  ShieldAlert,
  Timer,
  Play,
  Zap,
  QrCode,
  Smartphone,
  Tag,
  Ban,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, getStorage, setStorage } from "@/src/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Task, EisenhowerQuadrant, Habit, Expense, Goal, GoalType, TimetableEntry, TimetableType, StudyCourse, Blog, PricingPlan, UserSubscription } from "./types";
import { supabase, isSupabaseConfigured, getSupabaseError, supabaseUrl } from "./lib/supabase";
import AnalyticsView from "./components/AnalyticsView";
import PomodoroTimer from "./components/PomodoroTimer";
import TaskNotesEditor from "./components/TaskNotesEditor";
import CareerPlannerView from "./components/CareerPlannerView";

// Modules
const modules = [
  { id: 'dashboard', name: 'Overview', icon: LayoutDashboard, color: 'text-blue-500' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, color: 'text-pink-500' },
  { id: 'habits', name: 'Habit Tracker', icon: Flame, color: 'text-orange-500' },
  { id: 'tasks', name: 'Tasks & Matrix', icon: CheckCircle2, color: 'text-green-500' },
  { id: 'goals', name: 'Goal System', icon: Target, color: 'text-purple-500' },
  { id: 'study', name: 'Study Planner', icon: GraduationCap, color: 'text-indigo-500' },
  { id: 'finance', name: 'Expenses', icon: Wallet, color: 'text-emerald-500' },
  { id: 'timetable', name: 'Timetable', icon: Calendar, color: 'text-cyan-500' },
  { id: 'blogs', name: 'Blogs & Guides', icon: FileText, color: 'text-rose-500' },
  { id: 'pricing', name: 'Plans & Pricing', icon: CreditCard, color: 'text-amber-500' },
];

const infoModules = [
  { id: 'about', name: 'About Us', icon: Info },
  { id: 'contact', name: 'Contact Us', icon: MessageCircle },
  { id: 'privacy', name: 'Privacy Policy', icon: ShieldCheck },
  { id: 'terms', name: 'Terms of Use', icon: Scale },
  { id: 'refund', name: 'Refund Policy', icon: RotateCcw },
  { id: 'cancellation', name: 'Cancellation Policy', icon: Ban },
  { id: 'disclaimer', name: 'Disclaimer', icon: AlertCircle },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const isFetchingRef = useRef(false);
  const [currency, setCurrency] = useState<'USD' | 'INR'>(() => (localStorage.getItem('wrindha_currency') as 'USD' | 'INR') || 'INR');
  const [userName, setUserName] = useState(() => localStorage.getItem('wrindha_user_name') || "Felix");
  const [userBudget, setUserBudget] = useState<number>(() => {
    const saved = localStorage.getItem('wrindha_budget');
    return saved ? parseFloat(saved) : 0;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('wrindha_theme') as 'light' | 'dark') || 'light');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        showProfileMenu &&
        profileContainerRef.current &&
        !profileContainerRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showProfileMenu]);

  const [session, setSession] = useState<any>(null);
  const isAdmin = session?.user?.email === 'gongidikalyan08@gmail.com';
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [isPasswordRecoveryActive, setIsPasswordRecoveryActive] = useState(false);
  const [bypassConfig, setBypassConfig] = useState(() => {
    const saved = localStorage.getItem('wrindha_bypass_config');
    if (saved !== null) return saved === 'true';
    return !isSupabaseConfigured();
  });

  const [orders, setOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem('wrindha_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessionOnly, setSessionOnly] = useState(() => {
    return localStorage.getItem('wrindha_session_only') === 'true';
  });

  const [subscriptionTier, setSubscriptionTier] = useState<string>(() => localStorage.getItem('wrindha_subscription_tier') || 'Free');
  const [maxHabits, setMaxHabits] = useState<number>(() => {
    const saved = localStorage.getItem('wrindha_max_habits');
    return saved ? parseInt(saved) : 9999;
  });

  const [serverTimeMs, setServerTimeMs] = useState<number | null>(null);
  const [bootPerfTime] = useState<number>(() => performance.now());
  const [secTicker, setSecTicker] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const fetchTime = async (retryCount = 0) => {
      try {
        const res = await fetch('/api/server-time');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (active && data.serverTime) {
          setServerTimeMs(new Date(data.serverTime).getTime());
        }
      } catch (err) {
        console.warn(`Failed to fetch server time (attempt ${retryCount + 1}):`, err);
        if (active && retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => fetchTime(retryCount + 1), delay);
        }
      }
    };
    fetchTime();
    const timer = setInterval(() => fetchTime(0), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentSecureTime = () => {
    if (serverTimeMs !== null) {
      return serverTimeMs + (performance.now() - bootPerfTime);
    }
    return Date.now();
  };

  const nowSecure = getCurrentSecureTime();

  const [trialStartDateStr, setTrialStartDateStr] = useState<string>(() => {
    return localStorage.getItem('wrindha_trial_start_date') || new Date().toISOString();
  });
  const [trialEndDateStr, setTrialEndDateStr] = useState<string>(() => {
    return localStorage.getItem('wrindha_trial_end_date') || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  });
  const [isTrialActivated, setIsTrialActivated] = useState<boolean>(() => {
    return localStorage.getItem('wrindha_is_trial_activated') === 'true';
  });
  const [hasPaid, setHasPaid] = useState<boolean>(() => {
    return localStorage.getItem('wrindha_has_paid') === 'true';
  });

  useEffect(() => {
    if (!isSupabaseConfigured() || bypassConfig) {
      if (!isTrialActivated) {
        const secureNow = getCurrentSecureTime();
        const start = new Date(secureNow).toISOString();
        const end = new Date(secureNow + 5 * 24 * 60 * 60 * 1000).toISOString();
        setTrialStartDateStr(start);
        setTrialEndDateStr(end);
        setIsTrialActivated(true);
        localStorage.setItem('wrindha_trial_start_date', start);
        localStorage.setItem('wrindha_trial_end_date', end);
        localStorage.setItem('wrindha_is_trial_activated', 'true');
      }
    }
  }, [isTrialActivated, bypassConfig]);

  const trialStartDate = new Date(trialStartDateStr);
  const trialEndDate = new Date(trialEndDateStr);
  const msLeft = Math.max(0, trialEndDate.getTime() - nowSecure);
  
  // Calculate trialDaysLeft based on exact elapsed hours from server-synced time:
  const elapsedMs = Math.max(0, nowSecure - trialStartDate.getTime());
  const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const trialDaysLeft = Math.max(0, 5 - daysElapsed);
  const isTrialActive = msLeft > 0;

  const formatRemainingTimeText = (ms: number) => {
    if (ms <= 0) return "0d 0h 0m";
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor((seconds % 3600) / 60);
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const d = Math.floor(seconds / (3600 * 24));
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
  };

  const trialTimeLeftText = formatRemainingTimeText(msLeft);

  const cancellationInfo = (() => {
    if (!subscriptionTier || !subscriptionTier.includes('Cancelled:')) {
      return { isCancelled: false, expiryDate: null };
    }
    try {
      const parts = subscriptionTier.split('Cancelled:');
      const expiryStr = parts[1];
      return { isCancelled: true, expiryDate: new Date(expiryStr) };
    } catch (e) {
      return { isCancelled: true, expiryDate: new Date(0) };
    }
  })();

  const isBillingPeriodActive = cancellationInfo.isCancelled && cancellationInfo.expiryDate
    ? cancellationInfo.expiryDate.getTime() > Date.now()
    : false;

  const parsedCleanTier = subscriptionTier.includes('Cancelled:') 
    ? 'premium' 
    : subscriptionTier.toLowerCase();

  const isPremiumPaid = (() => {
    if (isAdmin) return true;
    const isBasePremium = parsedCleanTier === 'premium' || 
                          parsedCleanTier === 'pro space' || 
                          parsedCleanTier === 'ultimate matrix' || 
                          parsedCleanTier === 'active' || 
                          hasPaid;
    
    if (cancellationInfo.isCancelled) {
      return isBillingPeriodActive;
    }
    return isBasePremium;
  })();

  const hasActiveAccess = isAdmin || isPremiumPaid || isTrialActive;

  const [userPlans, setUserPlans] = useState<PricingPlan[]>(() => {
    return [
      {
        id: "premium-plan-49",
        name: "Premium",
        price: "₹49",
        period: "month",
        features: [
          "5-day free trial (no credit card upfront)",
          "No artificial limitations",
          "Unlimited habit trackers & custom daily streaks",
          "Unlimited Priority Eisenhower quadrant tasks",
          "Full financial accounts, expense ledgers, & budgets",
          "Smart academic planner with exam custom Reminders",
          "Advanced interactive multi-tier daily timetables",
          "In-depth visual analytics and performance reports"
        ],
        isActive: true
      }
    ];
  });
  const [allUserProfiles, setAllUserProfiles] = useState<UserSubscription[]>([]);

  useEffect(() => {
    localStorage.setItem('wrindha_subscription_tier', subscriptionTier);
  }, [subscriptionTier]);

  useEffect(() => {
    localStorage.setItem('wrindha_max_habits', maxHabits.toString());
  }, [maxHabits]);

  useEffect(() => {
    localStorage.setItem('wrindha_user_plans', JSON.stringify(userPlans));
  }, [userPlans]);


  useEffect(() => {
    localStorage.setItem('wrindha_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('wrindha_bypass_config', bypassConfig.toString());
  }, [bypassConfig]);

  useEffect(() => {
    // Detect password recovery in URL hash or search params proactively on mount or reload
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const isRecovery = hash.includes("type=recovery") || 
                       search.includes("type=recovery") || 
                       (hash.includes("access_token") && hash.includes("recovery")) ||
                       hash.includes("recovery") ||
                       search.includes("recovery");
                       
    if (isRecovery) {
      setIsPasswordRecoveryActive(true);
    }
  }, []);

  useEffect(() => {
    setIsInitializing(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        if (session.user?.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name);
        }
        const isBypassed = () => {
          const saved = localStorage.getItem('wrindha_bypass_config');
          return saved === 'true';
        };
        if (!isBypassed()) {
          const uName = session.user.user_metadata?.full_name || localStorage.getItem('wrindha_user_name') || "Felix";
          supabase.from('profiles').select('id').eq('id', session.user.id).single().then(({ data }) => {
            if (data) {
              supabase.from('profiles').update({ 
                last_active: new Date().toISOString() 
              }).eq('id', session.user.id).then();
            } else {
              const secureNow = getCurrentSecureTime();
              const signupTime = session.user.created_at ? new Date(session.user.created_at).getTime() : secureNow;
              const startVal = (secureNow - signupTime > 5 * 24 * 60 * 60 * 1000) ? secureNow : signupTime;
              const startStr = new Date(startVal).toISOString();
              const endStr = new Date(startVal + 5 * 24 * 60 * 60 * 1000).toISOString();
              supabase.from('profiles').insert({ 
                id: session.user.id, 
                email: session.user.email,
                full_name: uName,
                last_active: new Date().toISOString(),
                budget: userBudget,
                currency: currency,
                is_trial_activated: true,
                trial_start_date: startStr,
                trial_end_date: endStr,
                has_paid: false
              }).then();
            }
          });
        }
      } else {
        isFetchingRef.current = false;
        setIsInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        if (event === 'PASSWORD_RECOVERY') {
          setShowResetPasswordModal(true);
          setIsPasswordRecoveryActive(true);
        }
        if (session.user?.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name);
        }
        const isBypassed = () => {
          const saved = localStorage.getItem('wrindha_bypass_config');
          return saved === 'true';
        };
        if (!isBypassed()) {
          const uName = session.user.user_metadata?.full_name || localStorage.getItem('wrindha_user_name') || "Felix";
          supabase.from('profiles').select('id').eq('id', session.user.id).single().then(({ data }) => {
            if (data) {
              supabase.from('profiles').update({ 
                last_active: new Date().toISOString() 
              }).eq('id', session.user.id).then();
            } else {
              const secureNow = getCurrentSecureTime();
              const signupTime = session.user.created_at ? new Date(session.user.created_at).getTime() : secureNow;
              const startVal = (secureNow - signupTime > 5 * 24 * 60 * 60 * 1000) ? secureNow : signupTime;
              const startStr = new Date(startVal).toISOString();
              const endStr = new Date(startVal + 5 * 24 * 60 * 60 * 1000).toISOString();
              supabase.from('profiles').insert({ 
                id: session.user.id, 
                email: session.user.email,
                full_name: uName,
                last_active: new Date().toISOString(),
                budget: userBudget,
                currency: currency,
                is_trial_activated: true,
                trial_start_date: startStr,
                trial_end_date: endStr,
                has_paid: false
              }).then();
            }
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        
        // Logout occurred: Clear personal data arrays and settings/tiers
        setHabits([]);
        setTasks([]);
        setExpenses([]);
        setGoals([]);
        setTimetable([]);
        setStudyCourses([]);
        setUserName("Felix");
        if (localStorage.getItem('wrindha_budget_updated') !== 'true') {
          setUserBudget(5000);
        }
        setCurrency("INR");
        setSubscriptionTier("Free");
        setMaxHabits(5);
        
        // Reset local trial values
        setTrialStartDateStr(new Date().toISOString());
        setTrialEndDateStr(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());
        setIsTrialActivated(false);
        setHasPaid(false);
        
        // Clear all personal data and configuration settings from localStorage
        const keys = [
          'wrindha_habits', 'wrindha_tasks', 'wrindha_expenses', 
          'wrindha_goals', 'wrindha_timetable', 'wrindha_study',
          'wrindha_user_name', 'wrindha_currency',
          'wrindha_subscription_tier', 'wrindha_max_habits',
          'wrindha_trial_start_date', 'wrindha_trial_end_date',
          'wrindha_is_trial_activated', 'wrindha_has_paid',
          'wrindha_active_career_path', 'wrindha_career_milestones',
          'wrindha_career_skills', 'wrindha_career_plan_data_manual'
        ];
        if (localStorage.getItem('wrindha_budget_updated') !== 'true') {
          keys.push('wrindha_budget');
        }
        keys.forEach(k => localStorage.removeItem(k));

        isFetchingRef.current = false;
        setIsInitializing(false);
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('wrindha_user_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('wrindha_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // States with Persistence
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('wrindha_habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('wrindha_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('wrindha_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('wrindha_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => {
    const saved = localStorage.getItem('wrindha_timetable');
    return saved ? JSON.parse(saved) : [];
  });

  const [studyCourses, setStudyCourses] = useState<StudyCourse[]>(() => {
    const saved = localStorage.getItem('wrindha_study');
    return saved ? JSON.parse(saved) : [];
  });

  const [blogs, setBlogs] = useState<Blog[]>(() => {
    const saved = localStorage.getItem('wrindha_blogs');
    const defaultBlogs: Blog[] = [
      {
        id: "f-habits",
        title: "The Wrindha OS Habit Tracker: How to Build Unshakeable Daily Rituals",
        content: `Developing healthy habits is the foundation of long-term personal success. Think of habits as compound interest for your self-improvement—small investments daily that yield massive returns over time.

🌟 WHAT IS ITS USE?
The Habit Tracker inside Wrindha OS is designed to remove the friction from daily progress. Instead of relying on random motivation, the tracker keeps you accountable by visualizing consistency, habit streaks, and comprehensive calendars.

It solves the three biggest habit-building hurdles:
1. Short-term forgetfulness
2. Missing incremental progress
3. Breaking consistency chains

🚀 HOW TO USE IT:
Step 1: Add your Habit
Go to the "Habit Tracker" tab and click "Add Habit". Enter a clear, action-oriented title (e.g., "30 Mins Coding" or "Read 10 Pages"). Pick the frequency and click "Create".

Step 2: Log Daily Progress
As you complete your habit each day, simply click the checkbox next to it. Doing so instantly awards you active completion points, triggers status changes, and fires up your habit streak counter!

Step 3: Analyze the Consistency Matrix
Scroll down to view your monthly completion heatmap. This visual calendar highlights days of high density in vivid indicators, showcasing exactly when you are most productive.

💡 PRO TIP: Habit-Stacking
Anchor your new habit to a current automated one. For instance, "Right after I grind my morning coffee (automated), I will read 10 book pages (new habit)." Write this statement in the description of your habit to keep it front of mind!`,
        author: "Admin",
        category: "Habits",
        createdAt: "2026-05-31T00:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "f-tasks",
        title: "The Eisenhower Matrix: Prioritizing Your Daily Tasks for High Impact",
        content: `Are you busy, or are you productive? There is a profound difference. Often, we exhaust our days answering urgent but ultimately unimportant emails, completely ignoring the major goals that actually advance our lives.

🌟 WHAT IS ITS USE?
The Wrindha OS Task System uses the legendary Eisenhower Matrix (engineered by US President Dwight D. Eisenhower). It organizes tasks along two axes: Urgency and Importance.

This divides your focus into 4 clear, actionable quadrants:
1. Do First (Urgent & Important) — High-impact crises and deadlines. Action: Do immediately.
2. Schedule (Important but Not Urgent) — Growth, studying, habits, relationship-building. Action: Schedule a specific time slot.
3. Delegate (Urgent but Not Important) — Interruptions, scheduling, minor requests. Action: Delegate or automate.
4. Eliminate (Neither Urgent nor Important) — Time sinks, distractions, endless feeds. Action: Eliminate ruthlessly.

🚀 HOW TO USE IT:
Step 1: Open the Task & Matrix Tab
Navigate to the "Tasks & Matrix" section. You will see a quadrant board dividing your tasks visually.

Step 2: Create and Categorize your Tasks
Click "Add Task". Input your task name, set a description, and select the Quadrant. Wrindha OS will automatically distribute it into the correct grid space.

Step 3: Execute in Order of Priority
1. Deal with Quadrant 1 (Do First) immediately.
2. Spend the majority of your deliberate planning time on Quadrant 2 (Schedule) to prevent future crises.
3. Delegate or automate Quadrant 3.
4. Eliminate Quadrant 4 tasks.

Check off completed tasks to archive them and move your overall daily productivity score higher!`,
        author: "Admin",
        category: "Productivity",
        createdAt: "2026-05-31T01:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1540350394557-8d14678e7f91?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "f-finance",
        title: "Mastering Personal Finances: Budgeting & Expense Tracking with Wrindha OS",
        content: `Managing your money is about freedom, not restriction. Tracking where every single rupee goes provides you with the data needed to make informed life adjustments.

🌟 WHAT IS ITS USE?
The Expenses module in Wrindha OS helps you monitor both your income and outgoings through intuitive category clusters and direct visual indicators.

By comparing total expenses to a set monthly budget limit, it helps prevent overspending before it happens and provides historical insights into spending patterns.

🚀 HOW TO USE IT:
Step 1: Set Your Overall Budget
First, input your maximum monthly spending budget in the budget field at the top of the "Expenses" pane. This serves as your threshold.

Step 2: Log Your Transactions
Whenever you spend money or receive an income, open the form and input:
1. The numeric amount.
2. The transaction type (Expense or Income).
3. The exact Category (e.g., Food, Travel, Subscriptions, Entertainment).
4. Date and brief notes.

Step 3: Monitor Thresholds & Distribution
Look at your budget progress bar. Green indicates you are safely in budget, amber reminds you to be cautious, and red warns you of threshold breach. Use the analytics breakdown to see exactly which category is eating most of your revenue!`,
        author: "Admin",
        category: "Finance",
        createdAt: "2026-05-31T02:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "f-study",
        title: "Optimizing the Study Planner: Managing Syllabus and Pomodoro Timers",
        content: `Traditional cramming doesn't work. True retention comes from distributed practice, continuous tracking, and highly focused learning cycles.

🌟 WHAT IS ITS USE?
The Study Planner is designed to organize your active academic or professional courses. It features live timers, checklist breakdowns for course syllabus items, and a robust bookmarks tray to keep learning materials close.

It turns overwhelming subjects into structured daily lessons.

🚀 HOW TO USE IT:
Step 1: Create a Course
Go to the "Study Planner" tab, click "Add Course", and select a category.

Step 2: Outline Your Syllabus
Under the active course, write down key syllabus topics or milestones as individual checkpoints (e.g., "Lecture 1: Basic Syntaxes" or "Chapter 4: Advanced Database Queries"). You can check these off as you attend lessons to automatically update the course completion percentage!

Step 3: Run the Pomodoro Study Timer
Click on the Study Timer. Use the structured 25-minute study intervals followed by a 5-minute break. This keeps your mind fresh and prevents burn-out.

Step 4: Save Study Materials
Paste custom URLs, textbook chapter numbers, or reference slides under the "Materials & Bookmarks" input box to never lose track of resources.`,
        author: "Admin",
        category: "Study",
        createdAt: "2026-05-31T03:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "f-goals",
        title: "The Wrindha OS Goal System: Translating Vision into Milestones",
        content: `A goal without a plan is just a wish. High-achievers don't just dream of the destination; they blueprint the track to get there.

🌟 WHAT IS ITS USE?
The Goal module forces structural planning, breaking down abstract intentions into actionable concrete steps. It prevents overwhelm by tracking specific metrics and milestone sequences, and calculates overall progress automatically.

🚀 HOW TO USE IT:
Step 1: Set Your Long-term Goal
Open the "Goal System" tab. Click "Create Goal", write a highly motivating title, select its target category, and choose a firm deadline.

Step 2: Add Milestone Key Steps
Under your newly listed goal, add specific sub-tasks or milestones (e.g., "Develop MVP", "Conduct 10 User Tests", "Draft Launch Plan").

Step 3: Progress and Celebrate
Each time you tick a milestone, the dynamic goal circle updates itself automatically. Watching that circle fill up activates dopamine paths in your brain, reinforcing momentum to complete the remaining steps!`,
        author: "Admin",
        category: "Goals",
        createdAt: "2026-05-31T04:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "f-timetable",
        title: "Designing a Structured Weekly Timetable for Balanced Focus",
        content: `If you don't schedule your day, someone else will. Timeblocking is the most effective approach to taking back control of your 24 hours.

🌟 WHAT IS ITS USE?
The Timetable module provides a weekly planning board to lock down specific high-priority blocks (e.g., study time, gym sessions, work sprints). Visually scheduling your week creates clear mental boundaries and shields your time from distractions.

🚀 HOW TO USE IT:
Step 1: Open the Timetable Tab
Navigate to the "Timetable" module. You will see a sleek weekly overview grid spanning Monday to Sunday.

Step 2: Add Your Time Block Slots
Click "Add Slot". Choose your targeting Day, set the Start time & End time. Fill in the specific Activity Name and select a Category tag (Study, Habit, Recreation, Work, Personal).

Step 3: Color-Coded Execution
Wrindha OS maps these slots onto your calendar with beautiful category-driven colors. Use this grid every morning to see what your focus area is for the hour! Keep your schedule balanced so you avoid mental fatigue.`,
        author: "Admin",
        category: "Productivity",
        createdAt: "2026-05-31T05:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "1",
        title: "Productivity Hacks for Students & Professionals",
        content: "To stay ahead in your daily routines, categorize your tasks using the Eisenhower Matrix. Tackle the 'Do First' quadrant immediately to free up brain energy. Break down study loads into blocks of 25-minute Pomodoro intervals to reinforce focus and retention.",
        author: "Admin",
        category: "Productivity",
        createdAt: "2026-05-13T12:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&auto=format&fit=crop"
      },
      {
        id: "2",
        title: "Building Habits That Stick for Good",
        content: "Consistency beats intensity. Focus on establishing repetitive progress over grand, sporadic gestures. Habit-stacking is an excellent strategy: anchor a new habit to an existing automated routine (e.g., 'Right after making my morning coffee, I will write down 3 priority desk goals'). Maintain streak counters to visualize incremental progression and build positive feedback loops.",
        author: "Admin",
        category: "Habits",
        createdAt: "2026-05-15T10:00:00Z",
        imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=600&auto=format&fit=crop"
      }
    ];

    if (!saved) return defaultBlogs;
    try {
      const parsed: Blog[] = JSON.parse(saved);
      const merged = [...parsed];
      for (const df of defaultBlogs) {
        if (!merged.some(item => item.id === df.id)) {
          merged.push(df);
        }
      }
      return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (e) {
      return defaultBlogs;
    }
  });

  const [isInitializing, setIsInitializing] = useState(true);

  // Persistence
  useEffect(() => {
    localStorage.setItem('wrindha_budget', userBudget.toString());
    if (!isInitializing && !isFetchingRef.current && session?.user?.id && !bypassConfig) {
      supabase.from('profiles').update({ budget: userBudget }).eq('id', session.user.id).then();
    }
  }, [userBudget, isInitializing, session, bypassConfig]);

  useEffect(() => {
    localStorage.setItem('wrindha_currency', currency);
    if (!isInitializing && !isFetchingRef.current && session?.user?.id && !bypassConfig) {
      supabase.from('profiles').update({ currency: currency }).eq('id', session.user.id).then();
    }
  }, [currency, isInitializing, session, bypassConfig]);

  useEffect(() => {
    localStorage.setItem('wrindha_user_name', userName);
    if (!isInitializing && !isFetchingRef.current && session?.user?.id && !bypassConfig) {
      supabase.from('profiles').update({ full_name: userName }).eq('id', session.user.id).then();
    }
  }, [userName, isInitializing, session, bypassConfig]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (window.innerWidth > 768 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Initial Fetch from Supabase
  useEffect(() => {
    async function fetchData(isBackground = false) {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (!isBackground) {
        setIsInitializing(true);
      }
      
      if (!isSupabaseConfigured() || !session?.user?.id) {
        setIsInitializing(false);
        isFetchingRef.current = false;
        return;
      }

      const userId = session.user.id;

      try {
        // Query everything in parallel to eliminate RTT latency and database fetch delay
        const [
          profileRes,
          habitsRes,
          tasksRes,
          expensesRes,
          goalsRes,
          timetableRes,
          studyRes,
          blogsRes,
          ordersRes
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('habits').select('*').eq('user_id', userId),
          supabase.from('tasks').select('*').eq('user_id', userId),
          supabase.from('expenses').select('*').eq('user_id', userId),
          supabase.from('goals').select('*').eq('user_id', userId),
          supabase.from('timetable').select('*').eq('user_id', userId),
          supabase.from('study_courses').select('*').eq('user_id', userId),
          supabase.from('blogs').select('*').order('created_at', { ascending: false }),
          supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        ]);

        let profileData = profileRes.data;

        if (!profileData) {
          // If the profile row doesn't exist yet, seamlessly bootstrap it to prevent any platform race states
          const defaultName = session.user.user_metadata?.full_name || localStorage.getItem('wrindha_user_name') || "Felix";
          const secureNow = getCurrentSecureTime();
          const signupTime = session.user.created_at ? new Date(session.user.created_at).getTime() : secureNow;
          const startVal = (secureNow - signupTime > 5 * 24 * 60 * 60 * 1000) ? secureNow : signupTime;
          const startStr = new Date(startVal).toISOString();
          const endStr = new Date(startVal + 5 * 24 * 60 * 60 * 1000).toISOString();
          
          const { data: newProfile } = await supabase.from('profiles').upsert({
            id: userId,
            email: session.user.email,
            full_name: defaultName,
            last_active: new Date().toISOString(),
            budget: userBudget,
            currency: currency,
            is_trial_activated: true,
            trial_start_date: startStr,
            trial_end_date: endStr,
            has_paid: false
          }).select().maybeSingle();

          if (newProfile) {
            profileData = newProfile;
          }
        }

        if (profileData) {
          const userHasSetBudget = localStorage.getItem('wrindha_budget_updated') === 'true';
          const localBudgetStr = localStorage.getItem('wrindha_budget');
          const localBudget = localBudgetStr ? parseFloat(localBudgetStr) : null;

          if (userHasSetBudget && localBudget !== null) {
            setUserBudget(localBudget);
            await supabase.from('profiles').update({ budget: localBudget }).eq('id', userId);
          } else {
            if (profileData.budget !== undefined && profileData.budget !== null) {
              setUserBudget(profileData.budget);
            }
          }
          if (profileData.currency) setCurrency(profileData.currency as 'USD' | 'INR');
          if (profileData.full_name) setUserName(profileData.full_name);
          if (profileData.subscription_tier) setSubscriptionTier(profileData.subscription_tier);
          if (profileData.max_habits) setMaxHabits(profileData.max_habits);

          // Support robust trial system synced live from DB
          const dbIsTrialActivated = !!profileData.is_trial_activated;
          const dbHasPaid = !!profileData.has_paid;

          if (dbIsTrialActivated) {
            const secureNow = getCurrentSecureTime();
            let startStr = profileData.trial_start_date;
            let endStr = profileData.trial_end_date;
            let needDbUpdate = false;

            if (!startStr) {
              const signupTime = session.user.created_at ? new Date(session.user.created_at).getTime() : secureNow;
              const startVal = (secureNow - signupTime > 5 * 24 * 60 * 60 * 1000) ? secureNow : signupTime;
              startStr = new Date(startVal).toISOString();
              needDbUpdate = true;
            }

            if (!endStr) {
              endStr = new Date(new Date(startStr).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
              needDbUpdate = true;
            }

            if (needDbUpdate) {
              await supabase.from('profiles').update({
                trial_start_date: startStr,
                trial_end_date: endStr
              }).eq('id', userId);
            }

            setTrialStartDateStr(startStr);
            setTrialEndDateStr(endStr);
            setIsTrialActivated(true);
            setHasPaid(dbHasPaid);

            localStorage.setItem('wrindha_trial_start_date', startStr);
            localStorage.setItem('wrindha_trial_end_date', endStr);
            localStorage.setItem('wrindha_is_trial_activated', 'true');
            localStorage.setItem('wrindha_has_paid', dbHasPaid ? 'true' : 'false');
          } else {
            // First time login activation flow (requirement 2 & 5)
            const secureNow = getCurrentSecureTime();
            const signupTime = session.user.created_at ? new Date(session.user.created_at).getTime() : secureNow;
            const startVal = (secureNow - signupTime > 5 * 24 * 60 * 60 * 1000) ? secureNow : signupTime;
            const startStr = new Date(startVal).toISOString();
            const endStr = new Date(startVal + 5 * 24 * 60 * 60 * 1000).toISOString();

            await supabase.from('profiles').update({
              is_trial_activated: true,
              trial_start_date: startStr,
              trial_end_date: endStr,
              has_paid: false
            }).eq('id', userId);

            setTrialStartDateStr(startStr);
            setTrialEndDateStr(endStr);
            setIsTrialActivated(true);
            setHasPaid(false);

            localStorage.setItem('wrindha_trial_start_date', startStr);
            localStorage.setItem('wrindha_trial_end_date', endStr);
            localStorage.setItem('wrindha_is_trial_activated', 'true');
            localStorage.setItem('wrindha_has_paid', 'false');
          }
        }

        // Bypassed database pricing plan query to keep standard premium OS ₹49 rate custom-configured
        setUserPlans([
          {
            id: "premium-plan-49",
            name: "Premium",
            price: "₹49",
            period: "month",
            features: [
              "5-day free trial (no credit card upfront)",
              "No artificial limitations",
              "Unlimited habit trackers & custom daily streaks",
              "Unlimited Priority Eisenhower quadrant tasks",
              "Full financial accounts, expense ledgers, & budgets",
              "Smart academic planner with exam custom Reminders",
              "Advanced interactive multi-tier daily timetables",
              "In-depth visual analytics and performance reports"
            ],
            isActive: true
          }
        ]);

        if (session?.user?.id && session?.user?.email === 'gongidikalyan08@gmail.com') {
          try {
            const { data: allProfiles } = await supabase.from('profiles').select('*');
            if (allProfiles) {
              setAllUserProfiles(allProfiles.map(p => ({
                userId: p.id,
                email: p.email,
                fullName: p.full_name || 'Anonymous User',
                subscriptionTier: p.subscription_tier || 'Free',
                maxHabits: p.max_habits || 5
              })));
            }
          } catch (profileErr) {
            console.warn("Could not query profiles:", profileErr);
          }
        }

        const mappedHabits = habitsRes.data && habitsRes.data.length > 0 ? habitsRes.data.map((h: any) => ({
          ...h,
          completedAt: h.completed_at || h.completedAt || []
        })) : [];
        setHabits(mappedHabits);

        const mappedTasks = tasksRes.data && tasksRes.data.length > 0 ? tasksRes.data.map((t: any) => ({
          ...t,
          dueDate: t.due_date || t.dueDate
        })) : [];
        setTasks(mappedTasks);

        const mappedExpenses = expensesRes.data && expensesRes.data.length > 0 ? expensesRes.data : [];
        setExpenses(mappedExpenses);

        const mappedGoals = goalsRes.data && goalsRes.data.length > 0 ? goalsRes.data.map((g: any) => ({
          ...g,
          targetDate: g.target_date || g.targetDate
        })) : [];
        setGoals(mappedGoals);

        const mappedTimetable = timetableRes.data && timetableRes.data.length > 0 ? timetableRes.data : [];
        setTimetable(mappedTimetable);

        const mappedStudy = studyRes.data && studyRes.data.length > 0 ? studyRes.data : [];
        setStudyCourses(mappedStudy);

        // Globally load blogs (any user can view them)
        try {
          const blogsData = blogsRes.data;
          const defaultBlogsList: Blog[] = [
            {
              id: "f-habits",
              title: "The Wrindha OS Habit Tracker: How to Build Unshakeable Daily Rituals",
              content: `Developing healthy habits is the foundation of long-term personal success. Think of habits as compound interest for your self-improvement—small investments daily that yield massive returns over time.

🌟 WHAT IS ITS USE?
The Habit Tracker inside Wrindha OS is designed to remove the friction from daily progress. Instead of relying on random motivation, the tracker keeps you accountable by visualizing consistency, habit streaks, and comprehensive calendars.

It solves the three biggest habit-building hurdles:
1. Short-term forgetfulness
2. Missing incremental progress
3. Breaking consistency chains

🚀 HOW TO USE IT:
Step 1: Add your Habit
Go to the "Habit Tracker" tab and click "Add Habit". Enter a clear, action-oriented title (e.g., "30 Mins Coding" or "Read 10 Pages"). Pick the frequency and click "Create".

Step 2: Log Daily Progress
As you complete your habit each day, simply click the checkbox next to it. Doing so instantly awards you active completion points, triggers status changes, and fires up your habit streak counter!

Step 3: Analyze the Consistency Matrix
Scroll down to view your monthly completion heatmap. This visual calendar highlights days of high density in vivid indicators, showcasing exactly when you are most productive.

💡 PRO TIP: Habit-Stacking
Anchor your new habit to a current automated one. For instance, "Right after I grind my morning coffee (automated), I will read 10 book pages (new habit)." Write this statement in the description of your habit to keep it front of mind!`,
              author: "Admin",
              category: "Habits",
              createdAt: "2026-05-31T00:00:00Z",
              imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop"
            },
            {
              id: "f-tasks",
              title: "The Eisenhower Matrix: Prioritizing Your Daily Tasks for High Impact",
              content: `Are you busy, or are you productive? There is a profound difference. Often, we exhaust our days answering urgent but ultimately unimportant emails, completely ignoring the major goals that actually advance our lives.

🌟 WHAT IS ITS USE?
The Wrindha OS Task System uses the legendary Eisenhower Matrix (engineered by US President Dwight D. Eisenhower). It organizes tasks along two axes: Urgency and Importance.

This divides your focus into 4 clear, actionable quadrants:
1. Do First (Urgent & Important) — High-impact crises and deadlines. Action: Do immediately.
2. Schedule (Important but Not Urgent) — Growth, studying, habits, relationship-building. Action: Schedule a specific time slot.
3. Delegate (Urgent but Not Important) — Interruptions, scheduling, minor requests. Action: Delegate or automate.
4. Eliminate (Neither Urgent nor Important) — Time sinks, distractions, endless feeds. Action: Eliminate ruthlessly.

🚀 HOW TO USE IT:
Step 1: Open the Task & Matrix Tab
Navigate to the "Tasks & Matrix" section. You will see a quadrant board dividing your tasks visually.

Step 2: Create and Categorize your Tasks
Click "Add Task". Input your task name, set a description, and select the Quadrant. Wrindha OS will automatically distribute it into the correct grid space.

Step 3: Execute in Order of Priority
1. Deal with Quadrant 1 (Do First) immediately.
2. Spend the majority of your deliberate planning time on Quadrant 2 (Schedule) to prevent future crises.
3. Delegate or automate Quadrant 3.
4. Eliminate Quadrant 4 tasks.

Check off completed tasks to archive them and move your overall daily productivity score higher!`,
              author: "Admin",
              category: "Productivity",
              createdAt: "2026-05-31T01:00:00Z",
              imageUrl: "https://images.unsplash.com/photo-1540350394557-8d14678e7f91?q=80&w=600&auto=format&fit=crop"
            },
            {
              id: "f-finance",
              title: "Mastering Personal Finances: Budgeting & Expense Tracking with Wrindha OS",
              content: `Managing your money is about freedom, not restriction. Tracking where every single rupee goes provides you with the data needed to make informed life adjustments.

🌟 WHAT IS ITS USE?
The Expenses module in Wrindha OS helps you monitor both your income and outgoings through intuitive category clusters and direct visual indicators.

By comparing total expenses to a set monthly budget limit, it helps prevent overspending before it happens and provides historical insights into spending patterns.

🚀 HOW TO USE IT:
Step 1: Set Your Overall Budget
First, input your maximum monthly spending budget in the budget field at the top of the "Expenses" pane. This serves as your threshold.

Step 2: Log Your Transactions
Whenever you spend money or receive an income, open the form and input:
1. The numeric amount.
2. The transaction type (Expense or Income).
3. The exact Category (e.g., Food, Travel, Subscriptions, Entertainment).
4. Date and brief notes.

Step 3: Monitor Thresholds & Distribution
Look at your budget progress bar. Green indicates you are safely in budget, amber reminds you to be cautious, and red warns you of threshold breach. Use the analytics breakdown to see exactly which category is eating most of your revenue!`,
              author: "Admin",
              category: "Finance",
              createdAt: "2026-05-31T02:00:00Z",
              imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=600&auto=format&fit=crop"
            },
            {
              id: "f-study",
              title: "Optimizing the Study Planner: Managing Syllabus and Pomodoro Timers",
              content: `Traditional cramming doesn't work. True retention comes from distributed practice, continuous tracking, and highly focused learning cycles.

🌟 WHAT IS ITS USE?
The Study Planner is designed to organize your active academic or professional courses. It features live timers, checklist breakdowns for course syllabus items, and a robust bookmarks tray to keep learning materials close.

It turns overwhelming subjects into structured daily lessons.

🚀 HOW TO USE IT:
Step 1: Create a Course
Go to the "Study Planner" tab, click "Add Course", and select a category.

Step 2: Outline Your Syllabus
Under the active course, write down key syllabus topics or milestones as individual checkpoints (e.g., "Lecture 1: Basic Syntaxes" or "Chapter 4: Advanced Database Queries"). You can check these off as you attend lessons to automatically update the course completion percentage!

Step 3: Run the Pomodoro Study Timer
Click on the Study Timer. Use the structured 25-minute study intervals followed by a 5-minute break. This keeps your mind fresh and prevents burn-out.

Step 4: Save Study Materials
Paste custom URLs, textbook chapter numbers, or reference slides under the "Materials & Bookmarks" input box to never lose track of resources.`,
              author: "Admin",
              category: "Study",
              createdAt: "2026-05-31T03:00:00Z",
              imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop"
            },
            {
              id: "f-goals",
              title: "The Wrindha OS Goal System: Translating Vision into Milestones",
              content: `A goal without a plan is just a wish. High-achievers don't just dream of the destination; they blueprint the track to get there.

🌟 WHAT IS ITS USE?
The Goal module forces structural planning, breaking down abstract intentions into actionable concrete steps. It prevents overwhelm by tracking specific metrics and milestone sequences, and calculates overall progress automatically.

🚀 HOW TO USE IT:
Step 1: Set Your Long-term Goal
Open the "Goal System" tab. Click "Create Goal", write a highly motivating title, select its target category, and choose a firm deadline.

Step 2: Add Milestone Key Steps
Under your newly listed goal, add specific sub-tasks or milestones (e.g., "Develop MVP", "Conduct 10 User Tests", "Draft Launch Plan").

Step 3: Progress and Celebrate
Each time you tick a milestone, the dynamic goal circle updates itself automatically. Watching that circle fill up activates dopamine paths in your brain, reinforcing momentum to complete the remaining steps!`,
              author: "Admin",
              category: "Goals",
              createdAt: "2026-05-31T04:00:00Z",
              imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop"
            },
            {
              id: "f-timetable",
              title: "Designing a Structured Weekly Timetable for Balanced Focus",
              content: `If you don't schedule your day, someone else will. Timeblocking is the most effective approach to taking back control of your 24 hours.

🌟 WHAT IS ITS USE?
The Timetable module provides a weekly planning board to lock down specific high-priority blocks (e.g., study time, gym sessions, work sprints). Visually scheduling your week creates clear mental boundaries and shields your time from distractions.

🚀 HOW TO USE IT:
Step 1: Open the Timetable Tab
Navigate to the "Timetable" module. You will see a sleek weekly overview grid spanning Monday to Sunday.

Step 2: Add Your Time Block Slots
Click "Add Slot". Choose your targeting Day, set the Start time & End time. Fill in the specific Activity Name and select a Category tag (Study, Habit, Recreation, Work, Personal).

Step 3: Color-Coded Execution
Wrindha OS maps these slots onto your calendar with beautiful category-driven colors. Use this grid every morning to see what your focus area is for the hour! Keep your schedule balanced so you avoid mental fatigue.`,
              author: "Admin",
              category: "Productivity",
              createdAt: "2026-05-31T05:00:00Z",
              imageUrl: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=600&auto=format&fit=crop"
            }
          ];

          if (blogsData && blogsData.length > 0) {
            const mappedBlogs = blogsData.map(b => ({
              ...b,
              imageUrl: b.image_url || b.imageUrl || undefined,
              createdAt: b.created_at || b.createdAt || new Date().toISOString()
            }));

            const merged = [...mappedBlogs];
            for (const df of defaultBlogsList) {
              if (!merged.some(item => item.id === df.id)) {
                merged.push(df);
              }
            }
            setBlogs(merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          } else {
            setBlogs(defaultBlogsList);
          }
        } catch (blogError) {
          console.warn("Table 'blogs' might not be created in Supabase yet. Using local state fallback.", blogError);
        }

        // Load order records
        try {
          const ordersData = ordersRes.data;
          if (ordersData && ordersData.length > 0) {
            setOrders(ordersData);
            localStorage.setItem('wrindha_orders', JSON.stringify(ordersData));
          }
        } catch (ordersError) {
          console.warn("Table 'orders' might not exist or be accessible yet in Supabase.", ordersError);
        }
      } catch (error) {
        console.error('Error fetching from Supabase:', error);
      } finally {
        setIsInitializing(false);
        isFetchingRef.current = false;
      }
    }

    fetchData();

    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener('focus', handleFocus);
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [session]);

  // Sync to Supabase helper
  const syncToSupabase = async (table: string, data: any) => {
    if (!isSupabaseConfigured() || !session?.user?.id || bypassConfig) return;
    if (isInitializing || isFetchingRef.current) return;
    try {
      // Add user_id to each item before upserting and map camelCase to snake_case if needed
      const mapItem = (item: any) => {
        const mapped = { ...item, user_id: session.user.id };
        // Handle common camelCase to snake_case mapping
        if (mapped.completedAt) { mapped.completed_at = mapped.completedAt; delete mapped.completedAt; }
        if (mapped.dueDate) { mapped.due_date = mapped.dueDate; delete mapped.dueDate; }
        if (mapped.targetDate) { mapped.target_date = mapped.targetDate; delete mapped.targetDate; }
        return mapped;
      };

      const dataWithUser = Array.isArray(data) 
        ? data.map(mapItem)
        : mapItem(data);
        
      await supabase.from(table).upsert(dataWithUser);
    } catch (error) {
      console.error(`Error syncing ${table} to Supabase:`, error);
    }
  };

  const deleteFromSupabase = async (table: string, id: string) => {
    if (!isSupabaseConfigured() || !session?.user?.id || bypassConfig) return;
    try {
      await supabase.from(table).delete().eq('id', id).eq('user_id', session.user.id);
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
    }
  };

  useEffect(() => {
    localStorage.setItem('wrindha_habits', JSON.stringify(habits));
    if (!isInitializing) syncToSupabase('habits', habits);
  }, [habits, isInitializing]);

  useEffect(() => {
    localStorage.setItem('wrindha_tasks', JSON.stringify(tasks));
    if (!isInitializing) syncToSupabase('tasks', tasks);
  }, [tasks, isInitializing]);

  useEffect(() => {
    localStorage.setItem('wrindha_expenses', JSON.stringify(expenses));
    if (!isInitializing) syncToSupabase('expenses', expenses);
  }, [expenses, isInitializing]);

  useEffect(() => {
    localStorage.setItem('wrindha_goals', JSON.stringify(goals));
    if (!isInitializing) syncToSupabase('goals', goals);
  }, [goals, isInitializing]);

  useEffect(() => {
    localStorage.setItem('wrindha_timetable', JSON.stringify(timetable));
    if (!isInitializing) syncToSupabase('timetable', timetable);
  }, [timetable, isInitializing]);

  useEffect(() => {
    localStorage.setItem('wrindha_study', JSON.stringify(studyCourses));
    if (!isInitializing) syncToSupabase('study_courses', studyCourses);
  }, [studyCourses, isInitializing]);

  const syncBlogsToSupabase = async (blogList: Blog[]) => {
    if (!isSupabaseConfigured() || !session?.user?.id || bypassConfig) return;
    if (session?.user?.email !== 'gongidikalyan08@gmail.com') return;
    try {
      const mapped = blogList.map(b => ({
        id: b.id,
        title: b.title,
        content: b.content,
        author: b.author,
        image_url: b.imageUrl || null,
        category: b.category,
        created_at: b.createdAt
      }));
      await supabase.from('blogs').upsert(mapped);
    } catch (error) {
      console.warn('Error syncing blogs to Supabase (blogs table may need creation):', error);
    }
  };

  const updateUserTier = async (userId: string, tier: string, habitsLimit: number, amountPaid?: string, planId?: string, paymentMethod: string = 'stripe') => {
    if (!isSupabaseConfigured() || bypassConfig) {
      // Local Fallback if offline
      if (session?.user?.id === userId || userId === "local-user") {
        setSubscriptionTier(tier);
        setMaxHabits(habitsLimit);
        setHasPaid(true);
        localStorage.setItem('wrindha_subscription_tier', tier);
        localStorage.setItem('wrindha_max_habits', habitsLimit.toString());
        localStorage.setItem('wrindha_has_paid', 'true');
      }

      // Record offline order
      if (amountPaid && planId) {
        const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);
        const orderData = {
          id: orderId,
          user_id: session?.user?.id || 'local-user',
          plan_id: planId,
          plan_name: tier,
          amount: parseFloat(amountPaid.replace(/[^0-9.]/g, '')) || 0,
          currency: amountPaid.includes('₹') || amountPaid.includes('INR') ? 'INR' : 'USD',
          status: 'completed',
          payment_method: paymentMethod,
          created_at: new Date().toISOString()
        };
        const updatedOrders = [orderData, ...orders];
        setOrders(updatedOrders);
        localStorage.setItem('wrindha_orders', JSON.stringify(updatedOrders));
      }
      return;
    }
    try {
      await supabase.from('profiles').update({ 
        subscription_tier: tier,
        max_habits: habitsLimit,
        has_paid: true
      }).eq('id', userId);
      
      if (session?.user?.id === userId) {
        setSubscriptionTier(tier);
        setMaxHabits(habitsLimit);
        setHasPaid(true);
        localStorage.setItem('wrindha_subscription_tier', tier);
        localStorage.setItem('wrindha_max_habits', habitsLimit.toString());
        localStorage.setItem('wrindha_has_paid', 'true');
      }
      
      if (session?.user?.email === 'gongidikalyan08@gmail.com') {
        setAllUserProfiles(prev => prev.map(p => p.userId === userId ? { ...p, subscriptionTier: tier, maxHabits: habitsLimit } : p));
      }

      // Record order logging
      if (amountPaid && planId) {
        const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);
        const orderData = {
          id: orderId,
          user_id: userId,
          plan_id: planId,
          plan_name: tier,
          amount: parseFloat(amountPaid.replace(/[^0-9.]/g, '')) || 0,
          currency: amountPaid.includes('₹') || amountPaid.includes('INR') ? 'INR' : 'USD',
          status: 'completed',
          payment_method: paymentMethod,
          created_at: new Date().toISOString()
        };
        
        try {
          await supabase.from('orders').insert(orderData);
        } catch (dbErr) {
          console.error("Failed to insert order to Supabase:", dbErr);
        }
        
        const updatedOrders = [orderData, ...orders];
        setOrders(updatedOrders);
        localStorage.setItem('wrindha_orders', JSON.stringify(updatedOrders));
      }
    } catch (err) {
      console.error("Error updating user tier:", err);
    }
  };

  const cancelUserSubscription = async (userId: string) => {
    const latestOrder = orders[0];
    const expiryDate = latestOrder ? new Date(latestOrder.created_at) : new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryStr = expiryDate.toISOString();
    const cancelledTierVal = `Premium-Cancelled:${expiryStr}`;

    if (!isSupabaseConfigured() || bypassConfig) {
      setSubscriptionTier(cancelledTierVal);
      setMaxHabits(9999);
      setHasPaid(true);
      setTrialEndDateStr('1970-01-01T00:00:00Z');
      localStorage.setItem('wrindha_subscription_tier', cancelledTierVal);
      localStorage.setItem('wrindha_max_habits', '9999');
      localStorage.setItem('wrindha_has_paid', 'true');
      localStorage.setItem('wrindha_trial_end_date', '1970-01-01T00:00:00Z');
      return;
    }
    try {
      await supabase.from('profiles').update({ 
        subscription_tier: cancelledTierVal,
        max_habits: 9999
      }).eq('id', userId);
      
      if (session?.user?.id === userId || userId === "local-user") {
        setSubscriptionTier(cancelledTierVal);
        setMaxHabits(9999);
        setHasPaid(true);
        setTrialEndDateStr('1970-01-01T00:00:00Z');
        localStorage.setItem('wrindha_subscription_tier', cancelledTierVal);
        localStorage.setItem('wrindha_max_habits', '9999');
        localStorage.setItem('wrindha_has_paid', 'true');
        localStorage.setItem('wrindha_trial_end_date', '1970-01-01T00:00:00Z');
      }
      
      if (session?.user?.email === 'gongidikalyan08@gmail.com') {
        setAllUserProfiles(prev => prev.map(p => p.userId === userId ? { ...p, subscriptionTier: cancelledTierVal, maxHabits: 9999 } : p));
      }
    } catch (err) {
      console.error("Error cancelling subscription in Supabase:", err);
      throw err;
    }
  };

  const updatePricingPlan = async (plan: PricingPlan) => {
    // If not config, update locally
    if (!isSupabaseConfigured() || bypassConfig || session?.user?.email !== 'gongidikalyan08@gmail.com') {
      setUserPlans(prev => {
        const index = prev.findIndex(p => p.id === plan.id);
        if (index >= 0) return prev.map(p => p.id === plan.id ? plan : p);
        return [...prev, plan];
      });
      return;
    }
    try {
      await supabase.from('pricing_plans').upsert({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        period: plan.period,
        features: plan.features,
        is_active: plan.isActive
      });
      setUserPlans(prev => {
        const index = prev.findIndex(p => p.id === plan.id);
        if (index >= 0) return prev.map(p => p.id === plan.id ? plan : p);
        return [...prev, plan];
      });
    } catch (err) {
      console.error("Error updating plan:", err);
    }
  };

  const deletePricingPlan = async (id: string) => {
    if (!isSupabaseConfigured() || bypassConfig || session?.user?.email !== 'gongidikalyan08@gmail.com') {
      setUserPlans(prev => prev.filter(p => p.id !== id));
      return;
    }
    try {
      await supabase.from('pricing_plans').delete().eq('id', id);
      setUserPlans(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error deleting plan:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem('wrindha_blogs', JSON.stringify(blogs));
    if (!isInitializing && session?.user?.email === 'gongidikalyan08@gmail.com') {
      syncBlogsToSupabase(blogs);
    }
  }, [blogs, isInitializing]);

  const configError = getSupabaseError();

  if (isPasswordRecoveryActive) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 flex items-center justify-center p-6 transition-colors font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-indigo-600 p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Brain className="w-32 h-32 text-indigo-600 animate-pulse" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black dark:text-white">Reset Password</h3>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">Secure Update Required</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              Please configure a safe, strong password to regain complete access to your Wrindha OS workspace.
            </p>

            <ResetPasswordForm onComplete={() => {
              setIsPasswordRecoveryActive(false);
              setShowResetPasswordModal(false);
              // Clean up local URL and redirect/reload to enter the re-secured session
              window.location.hash = "";
              window.location.search = "";
              window.location.href = window.location.origin;
            }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!session && isSupabaseConfigured() && !bypassConfig) {
    return <AuthView onBypass={() => setBypassConfig(true)} />;
  }

  if (!session && configError && !bypassConfig) {
    return <AuthConfigErrorView error={configError} onBypass={() => setBypassConfig(true)} />;
  }

  const hasLocalCache = localStorage.getItem('wrindha_trial_start_date') !== null;
  const isSyncingTime = serverTimeMs === null && (performance.now() - bootPerfTime < 2000);
  if ((isInitializing || isSyncingTime) && (isSupabaseConfigured() && !bypassConfig) && !hasLocalCache) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl animate-pulse">
            <BarChart3 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black leading-none uppercase tracking-wider text-white">Wrindha OS</h3>
            <p className="text-xs text-slate-400 font-medium">Synchronizing workspace metadata across devices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-gray-950 text-[#1A1A1A] dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity md:hidden animate-none"
        />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 260 : (window.innerWidth < 768 ? 0 : 80),
          x: isSidebarOpen ? 0 : (window.innerWidth < 768 ? -260 : 0)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white dark:bg-gray-900 border-r border-[#E5E7EB] dark:border-gray-800 flex flex-col z-50 shrink-0 fixed md:static inset-y-0 left-0 shadow-2xl md:shadow-none"
      >
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <div 
              onClick={() => !isSidebarOpen && setIsSidebarOpen(true)}
              className={cn(
                "w-9 h-9 bg-black dark:bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-black/5 transition-all active:scale-95",
                !isSidebarOpen && "mx-auto hover:bg-indigo-600 dark:hover:bg-indigo-500"
              )}
            >
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="font-medium text-lg tracking-tight dark:text-white leading-none whitespace-nowrap">Wrindha OS</span>
                  <span className="text-[7px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 whitespace-nowrap">Beyond Limits. Built for Future.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-auto text-gray-400 hover:text-black dark:hover:text-white shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {modules.map((m) => {
            const isLocked = !hasActiveAccess && m.id !== 'pricing' && m.id !== 'blogs';
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (isLocked) {
                    setActiveTab('pricing');
                  } else {
                    setActiveTab(m.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                  activeTab === m.id 
                    ? "bg-black dark:bg-indigo-600 text-white shadow-lg shadow-black/10" 
                    : "text-[#6B7280] dark:text-gray-500 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:text-[#1A1A1A] dark:hover:text-white",
                  isLocked && "opacity-60 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <m.icon className={cn("w-5 h-5 shrink-0", activeTab !== m.id && m.color)} />
                {isSidebarOpen && (
                  <span className="font-medium text-sm whitespace-nowrap flex items-center justify-between w-full">
                    <span>{m.name}</span>
                    {isLocked && <Lock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />}
                  </span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-16 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[60] flex items-center gap-1.5">
                    {m.name}
                    {isLocked && <Lock className="w-3 h-3 text-orange-400" />}
                  </div>
                )}
              </button>
            );
          })}

          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative mt-4",
                activeTab === 'admin' 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-indigo-400 dark:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              )}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-bold text-sm whitespace-nowrap">Admin Center</span>}
              {!isSidebarOpen && (
                <div className="absolute left-16 bg-indigo-600 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[60]">
                  Admin Center
                </div>
              )}
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB] dark:border-gray-800 space-y-1">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6B7280] dark:text-gray-500 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-all"
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm">Settings</span>}
          </button>
          {session && (
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setActiveTab('dashboard');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
            </button>
          )}
        </div>
      </motion.aside>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold dark:text-white">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X className="w-5 h-5 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Appearance</label>
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                        theme === 'light' ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500"
                      )}
                    >
                       <Target className="w-4 h-4" /> Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                        theme === 'dark' ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500"
                      )}
                    >
                       <Brain className="w-4 h-4" /> Dark
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold uppercase tracking-widest text-gray-400">System Preferences</label>
                   <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-medium dark:text-gray-300">Currency</span>
                         <select 
                           value={currency} 
                           onChange={(e) => setCurrency(e.target.value as 'USD' | 'INR')}
                           className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer dark:text-white"
                         >
                            <option value="USD">USD ($)</option>
                            <option value="INR">INR (₹)</option>
                         </select>
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                         <div className="space-y-0.5">
                            <span className="text-sm font-medium dark:text-gray-300 block">Strict Auth (No Auto-Login)</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-tight">Requires signing in on each new session</span>
                         </div>
                         <input 
                           type="checkbox"
                           checked={sessionOnly}
                           onChange={(e) => {
                             const checked = e.target.checked;
                             setSessionOnly(checked);
                             localStorage.setItem('wrindha_session_only', checked ? 'true' : 'false');
                           }}
                           className="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                         />
                      </div>
                      {session && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                          <span className="text-sm font-medium dark:text-gray-300">Account</span>
                          <button 
                            onClick={async () => {
                              await supabase.auth.signOut();
                              setShowSettings(false);
                              setActiveTab('dashboard');
                            }}
                            className="text-xs font-bold uppercase text-red-500 hover:text-white px-3 py-1.5 bg-red-50 dark:bg-red-900/10 hover:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-all flex items-center gap-2"
                          >
                            <LogOut className="w-3 h-3" /> Logout
                          </button>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-10 py-4 bg-black dark:bg-indigo-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity"
              >
                Apply Changes
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] dark:bg-gray-950 overflow-y-auto transition-colors duration-300 pb-20 md:pb-0">
        <header className="h-16 border-b border-[#E5E7EB] dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-black dark:hover:text-white shrink-0 block md:hidden"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-sm text-[#1A1A1A] dark:text-white tracking-tight uppercase block md:hidden">Wrindha OS</span>
          </div>
          <div className="flex-1 flex justify-center">
            {isTrialActive && !isPremiumPaid && (
              <button 
                onClick={() => setActiveTab('pricing')}
                className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 px-3.5 py-1.5 rounded-full text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm hover:scale-105 active:scale-95"
              >
                <span>⚡ 5-Day Free Trial: <strong className="font-extrabold text-indigo-700 dark:text-indigo-350">{trialTimeLeftText} remaining</strong></span>
                <span className="bg-indigo-600 text-white font-extrabold uppercase text-[8px] tracking-wider px-2 py-0.5 rounded-full shadow-sm">Upgrade</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!session && (
              <button 
                onClick={() => setShowSettings(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <LogIn className="w-4 h-4" /> Sign In / Sign Up
              </button>
            )}
            <div className="relative" ref={profileContainerRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white dark:border-gray-800 shadow-sm overflow-hidden flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                aria-label="Profile Menu"
              >
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl rounded-3xl p-5 z-50 space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white dark:border-gray-800 shadow-sm overflow-hidden shrink-0">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <input
                            type="text"
                            value={userName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUserName(val);
                              localStorage.setItem('wrindha_user_name', val);
                            }}
                            className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 dark:text-white outline-none w-full focus:bg-gray-50 dark:focus:bg-gray-800/50 px-1 rounded transition-colors text-left"
                            placeholder="Enter Display Name"
                          />
                          <p className="text-[10px] text-gray-400 font-medium">Click to edit name</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-left">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-gray-400 uppercase text-[10px] shrink-0">Email</span>
                          <span className="font-semibold dark:text-white text-gray-700 truncate max-w-[150px]" title={session?.user?.email || "sandbox@wrindha.com"}>
                            {session?.user?.email || "sandbox@wrindha.com"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-gray-400 uppercase text-[10px] shrink-0">Current Plan</span>
                          <span className="inline-block text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-indigo-150/30">
                            {subscriptionTier.includes('Cancelled:') ? 'Premium (Cancelled)' : subscriptionTier}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setActiveTab('pricing');
                            setShowProfileMenu(false);
                          }}
                          className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-2"
                        >
                          <Award className="w-3.5 h-3.5" /> Plans & Upgrades
                        </button>
                        {session ? (
                          <button
                            onClick={async () => {
                              await supabase.auth.signOut();
                              setShowProfileMenu(false);
                              setActiveTab('dashboard');
                            }}
                            className="w-full py-2.5 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-2"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Logout
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowSettings(true);
                              setShowProfileMenu(false);
                            }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-2"
                          >
                            <LogIn className="w-3.5 h-3.5" /> Sign In / Sign Up
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
               {activeTab === 'dashboard' && <DashboardView habits={habits} tasks={tasks} expenses={expenses} currency={currency} userName={userName} setUserName={setUserName} theme={theme} setActiveTab={setActiveTab} budget={userBudget} />}
                {activeTab === 'analytics' && <AnalyticsView expenses={expenses} habits={habits} tasks={tasks} goals={goals} courses={studyCourses} currency={currency} />}
               {activeTab === 'habits' && <HabitsView habits={habits} setHabits={setHabits} onDelete={(id) => deleteFromSupabase('habits', id)} theme={theme} subscriptionTier="Premium" setActiveTab={setActiveTab} />}
               {activeTab === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} onDelete={(id) => deleteFromSupabase('tasks', id)} subscriptionTier="Premium" setActiveTab={setActiveTab} />}
               {activeTab === 'finance' && <FinanceView expenses={expenses} setExpenses={setExpenses} onDelete={(id) => deleteFromSupabase('expenses', id)} currency={currency} setCurrency={setCurrency} theme={theme} budget={userBudget} setBudget={setUserBudget} />}
               {activeTab === 'study' && <StudyView courses={studyCourses} setCourses={setStudyCourses} onDeleteCourse={(id) => deleteFromSupabase('study_courses', id)} subscriptionTier="Premium" setActiveTab={setActiveTab} />}
               {activeTab === 'goals' && (
                 <GoalsView 
                   goals={goals} 
                   setGoals={setGoals} 
                   onDelete={(id) => deleteFromSupabase('goals', id)} 
                   subscriptionTier="Premium" 
                   setActiveTab={setActiveTab}
                   habits={habits}
                   setHabits={setHabits}
                   tasks={tasks}
                   setTasks={setTasks}
                   studyCourses={studyCourses}
                   setStudyCourses={setStudyCourses}
                 />
               )}
               {activeTab === 'timetable' && <TimetableView entries={timetable} setEntries={setTimetable} onDelete={(id) => deleteFromSupabase('timetable', id)} theme={theme} />}
               {activeTab === 'blogs' && <BlogsView blogs={blogs} setBlogs={setBlogs} isAdmin={isAdmin} />}
               {activeTab === 'pricing' && <PricingView plans={userPlans} subscriptionTier={subscriptionTier} onUpgrade={updateUserTier} onCancelSubscription={cancelUserSubscription} session={session} setActiveTab={setActiveTab} orders={orders} trialStartDateStr={trialStartDateStr} trialEndDateStr={trialEndDateStr} nowSecure={nowSecure} />}
               {activeTab === 'admin' && isAdmin && (
                 <AdminView 
                   plans={userPlans} 
                   allUsers={allUserProfiles || []} 
                   onUpdateUser={updateUserTier} 
                   onUpdatePlan={updatePricingPlan} 
                   onDeletePlan={deletePricingPlan} 
                 />
               )}
               {activeTab === 'about' && <AboutView />}
               {activeTab === 'contact' && <ContactView />}
               {activeTab === 'privacy' && <PrivacyView />}
               {activeTab === 'refund' && <RefundView />}
               {activeTab === 'cancellation' && <CancellationView />}
               {activeTab === 'disclaimer' && <DisclaimerView />}
               {activeTab === 'terms' && <TermsView />}
             </motion.div>
           </AnimatePresence>

           <Footer setActiveTab={setActiveTab} />
        </div>
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-45 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 px-3 py-2 flex justify-around items-center gap-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        {[
          { id: 'dashboard', name: 'Overview', icon: LayoutDashboard },
          { id: 'analytics', name: 'Analytics', icon: BarChart3 },
          { id: 'habits', name: 'Habits', icon: Flame },
          { id: 'tasks', name: 'Tasks', icon: ListTodo },
          { id: 'blogs', name: 'Blogs', icon: FileText },
          { id: 'pricing', name: 'Pricing', icon: Award },
        ].map((m) => {
          const isLocked = !hasActiveAccess && m.id !== 'pricing' && m.id !== 'blogs';
          return (
            <button
              key={m.id}
              onClick={() => {
                if (isLocked) {
                  setActiveTab('pricing');
                } else {
                  setActiveTab(m.id);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all",
                activeTab === m.id 
                  ? "text-indigo-600 dark:text-indigo-400 scale-105 font-bold" 
                  : "text-gray-400 hover:text-gray-600",
                isLocked && "opacity-60"
              )}
            >
              <m.icon className="w-5 h-5 shrink-0 mb-0.5" />
              <span className="text-[9px] tracking-tight flex items-center gap-0.5">
                {m.name}
                {isLocked && <Lock className="w-2.5 h-2.5 text-orange-500" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Absolute Password Reset Modal / Overlay */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-indigo-600 p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Brain className="w-24 h-24 text-indigo-600 animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black dark:text-white">Reset Password</h3>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">Secure Update Required</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                Please configure a safe, strong password to regain complete access to your Wrindha OS workspace.
              </p>

              <ResetPasswordForm onComplete={() => setShowResetPasswordModal(false)} />
            </div>
          </motion.div>
        </div>
      )}

      {/* Global Trial Expired Paywall Overlay */}
      {!hasActiveAccess && !isInitializing && activeTab !== 'pricing' && activeTab !== 'about' && activeTab !== 'contact' && activeTab !== 'privacy' && activeTab !== 'disclaimer' && activeTab !== 'terms' && (
        <div className="fixed inset-0 z-[200] bg-slate-950/65 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 border border-indigo-200/50 dark:border-gray-800 shadow-2xl text-center relative overflow-hidden space-y-6"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-indigo-600 to-purple-500"></div>
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                {subscriptionTier.toLowerCase() === 'free' || subscriptionTier.includes('Cancelled:') ? 'Membership Cancelled' : 'Trial Period Expired'}
              </span>
              <h2 className="text-3xl font-black dark:text-white">Workspace Locked</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                {subscriptionTier.toLowerCase() === 'free' || subscriptionTier.includes('Cancelled:') 
                  ? 'Your premium membership has been cancelled or has expired. To restore access and continue using Wrindha OS, please renew your subscription.' 
                  : 'Your 5-day free trial has ended. Please subscribe to continue using Wrindha OS.'}
              </p>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/35 py-3 px-4 rounded-xl mt-2">
                🚀 Subscribe to Premium for only <strong className="text-lg">₹49/month</strong> to restore unlimited tracking of habits, study matrices, goals, and priority timetables!
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setActiveTab('pricing');
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Unlock Wrindha OS Premium ✨
              </button>
              
              {session ? (
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                  className="w-full py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold rounded-2xl text-xs uppercase"
                >
                  Sign out of account
                </button>
              ) : (
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-xs uppercase"
                >
                  Sign In to existing profile
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Footer({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <footer className="mt-20 py-12 border-t border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="col-span-1 md:col-span-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-black dark:bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-medium text-xl tracking-tight dark:text-white leading-none">Wrindha OS</span>
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5 opacity-80">Beyond Limits. Built for Future.</span>
            </div>
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
            Empowering students to become more organized, productive, and focused in their daily lives through practical tech solutions.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">Product</h4>
          <ul className="space-y-4">
            {modules.slice(0, 4).map(m => (
              <li key={m.id}>
                <button onClick={() => { setActiveTab(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">Legal & Info</h4>
          <ul className="space-y-4">
            {infoModules.map(m => (
              <li key={m.id}>
                <button onClick={() => { setActiveTab(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-50 dark:border-gray-900">
        <div className="flex items-center gap-6">
           <button onClick={() => { setActiveTab('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors">Support</button>
           <button onClick={() => { setActiveTab('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors">Privacy</button>
           <div className="flex items-center gap-1">
             <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Made with</span>
             <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
             <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">by Kalyan</span>
           </div>
        </div>
      </div>
    </footer>
  );
}

// --- Reset Password helper ---

function ResetPasswordForm({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const meetsMinLength = password.length >= 8;
  const meetsUppercase = /[A-Z]/.test(password);
  const meetsLowercase = /[a-z]/.test(password);
  const meetsNumber = /[0-9]/.test(password);
  const meetsSpecial = /[^A-Za-z0-9]/.test(password);

  const isPasswordStrong = meetsMinLength && meetsUppercase && meetsLowercase && meetsNumber && meetsSpecial;

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    if (!isPasswordStrong) {
      setError("Please satisfy all password strength requirements first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An update error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-6 space-y-3">
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 animate-bounce" />
        </div>
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Password Updated Successfully!</p>
        <p className="text-xs text-gray-400">Your workspace is now re-secured.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleUpdate} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">New Password</label>
        <input 
          type="password" 
          required
          autoFocus
          className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500/50 transition-all font-medium text-sm"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Required Elements</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs">
            {meetsMinLength ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
            <span className={meetsMinLength ? "text-emerald-600 font-bold" : "text-gray-400"}>8+ characters</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {meetsUppercase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
            <span className={meetsUppercase ? "text-emerald-600 font-bold" : "text-gray-400"}>1 uppercase</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {meetsLowercase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
            <span className={meetsLowercase ? "text-emerald-600 font-bold" : "text-gray-400"}>1 lowercase</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {meetsNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
            <span className={meetsNumber ? "text-emerald-600 font-bold" : "text-gray-400"}>1 number</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs col-span-2">
            {meetsSpecial ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
            <span className={meetsSpecial ? "text-emerald-600 font-bold" : "text-gray-400"}>1 special symbol (e.g. !@#$)</span>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}

      <button 
        type="submit" 
        disabled={loading || !isPasswordStrong}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
      >
        {loading ? "Securing Account..." : "Confirm & Re-encrypt"}
      </button>
    </form>
  );
}

// --- Auth View ---

function AuthView({ onBypass }: { onBypass: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const meetsMinLength = password.length >= 8;
  const meetsUppercase = /[A-Z]/.test(password);
  const meetsLowercase = /[a-z]/.test(password);
  const meetsNumber = /[0-9]/.test(password);
  const meetsSpecial = /[^A-Za-z0-9]/.test(password);

  const isPasswordStrong = meetsMinLength && meetsUppercase && meetsLowercase && meetsNumber && meetsSpecial;

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (showForgotPassword) {
        if (!email.trim()) {
          throw new Error("Please fill in your email address.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg("Reset protocol initiated! Check your email inbox for the secure calibration link.");
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!isPasswordStrong) {
          throw new Error("Your password does not satisfy safety restrictions. Please conform to all listed criteria (8+ chars, uppercase, lowercase, special character, number).");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        
        if (data.session) {
           // Signed in immediately
        } else {
           setSuccessMsg("Space created successfully! Check your email inbox to verify your identity and authorize synchronization.");
        }
      }
    } catch (err: any) {
      console.error("Auth error details:", err);
      if (err.message === "Database error saving new user") {
        setError("System configuration issue. Please copy the SQL from `supabase_schema.sql` into your Supabase SQL Editor and run it.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 flex items-center justify-center p-6 transition-colors font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-black dark:border-indigo-600/30 p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Brain className="w-32 h-32 text-indigo-600" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-3xl tracking-tight dark:text-white leading-none">Wrindha OS</span>
            </div>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 opacity-80">Beyond Limits. Built for Future.</span>
          </div>

          <h2 className="text-3xl font-black mb-2 dark:text-white">
            {showForgotPassword 
              ? "Reset Password" 
              : isLogin 
                ? "Welcome back." 
                : "Create an account."}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium text-sm">
            {showForgotPassword 
              ? "Re-secure your synchronized credentials." 
              : isLogin 
                ? "Your optimal environment awaits." 
                : "Enter a strong password to start your journey."}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !showForgotPassword && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500/50 transition-all font-medium"
                  placeholder="Felix Wrindha"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 ml-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500/50 transition-all font-semibold"
                placeholder="felix@wrindha.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {!showForgotPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input 
                  type="password" 
                  required
                  className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500/50 transition-all font-semibold"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            )}

            {!isLogin && !showForgotPassword && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Required Password Standards</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-0.5">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {meetsMinLength ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span className={meetsMinLength ? "text-emerald-600 font-bold" : "text-gray-400"}>8+ characters</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {meetsUppercase ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span className={meetsUppercase ? "text-emerald-600 font-bold" : "text-gray-400"}>1 uppercase</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {meetsLowercase ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span className={meetsLowercase ? "text-emerald-600 font-bold" : "text-gray-400"}>1 lowercase</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {meetsNumber ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span className={meetsNumber ? "text-emerald-600 font-bold" : "text-gray-400"}>1 number</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] col-span-2">
                    {meetsSpecial ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span className={meetsSpecial ? "text-emerald-600 font-bold" : "text-gray-400"}>1 special char (e.g. !@#$)</span>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}
            {successMsg && <p className="text-emerald-500 text-xs font-bold px-2 leading-relaxed">{successMsg}</p>}

            <button 
              type="submit" 
              disabled={loading || (!isLogin && !showForgotPassword && !isPasswordStrong)}
              className="w-full bg-black dark:bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-black/10 dark:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading 
                ? "Processing..." 
                : showForgotPassword 
                  ? "Request Reset Link" 
                  : isLogin 
                    ? "Authenticate" 
                    : "Generate Account"}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-3 text-center">
            {showForgotPassword ? (
              <button 
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-sm font-black text-indigo-600 dark:text-indigo-400 hover:underline transition-all"
              >
                ← Back to Login
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-sm font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {isLogin ? "New here? Create an account →" : "Already systematic? Log in →"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AuthConfigErrorView({ error, onBypass }: { error: string; onBypass?: () => void }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-amber-500/30 p-10 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black dark:text-white">Configuration Required</h2>
        </div>
        
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400 leading-relaxed">
              {error}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">Where to find the keys:</h3>
            <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Go to your <strong>Supabase Dashboard</strong> and select your project.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Click on <strong>Project Settings</strong> (gear icon) &gt; <strong>API</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Copy the <strong>URL</strong> and the <strong>anon public key</strong> (starts with <code>eyJ...</code>).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                <span>Open <strong>Settings</strong> in AI Studio and paste them into the environment variables.</span>
              </li>
            </ol>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <button 
                onClick={onBypass}
                className="w-full bg-black dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-black/10 dark:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Continue to App (Offline Mode)
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Refresh App
              </button>
            </div>
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Cloud sync will be disabled until valid keys are provided.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface AdminViewProps {
  plans: PricingPlan[];
  allUsers: UserSubscription[];
  onUpdateUser: (userId: string, tier: string, habitsLimit: number) => Promise<void>;
  onUpdatePlan: (plan: PricingPlan) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}

function AdminView({ plans, allUsers, onUpdateUser, onUpdatePlan, onDeletePlan }: AdminViewProps) {
  const SUGGESTED_FEATURES = [
    "Unlimited Habit tracking elements",
    "Daily streak analysis & calendar highlights",
    "Unlimited Tasks & flexible list priorities",
    "Full Finance visualizer & custom budgets",
    "Smart Study courses with exam countdowns",
    "Goals milestones & percentage tracking",
    "Dynamic weekly & daily Timetable slots",
    "Admin privileges to publish custom Blogs",
    "AI-powered context insights & suggestion prompts",
    "Exclusive premium productivity badges",
    "Priority 24/7 dedicated chat support",
    "Advanced offline-first local database synchronization"
  ];

  const [userCount, setUserCount] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'plans' | 'config' | 'coupons'>('overview');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<string>('Free');

  // Coupon configuration states list
  const [coupons, setCoupons] = useState<any[]>([]);
  const [usages, setUsages] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponFormActive, setCouponFormActive] = useState(false);
  
  // New coupon form states
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'percentage' | 'fixed'>('fixed');
  const [newValue, setNewValue] = useState<string>('20');
  const [newMaxUses, setNewMaxUses] = useState<string>('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Editing coupon state
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editMaxUses, setEditMaxUses] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editEndDate, setEditEndDate] = useState('');

  const fetchCouponsData = async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons || []);
      }
      
      const statsRes = await fetch("/api/admin/coupon-stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setUsages(statsData.usages || []);
      }
    } catch (err) {
      console.error("Failed fetching coupons admin data:", err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e: any) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupon_code: newCode.trim().toUpperCase(),
          description: newDesc,
          discount_type: newType,
          discount_value: parseFloat(newValue) || 0,
          start_date: newStartDate || undefined,
          end_date: newEndDate || null,
          max_uses: newMaxUses ? parseInt(newMaxUses) : null,
          is_active: newIsActive
        })
      });
      const data = await res.json();
      if (data.success) {
        setCouponFormActive(false);
        setNewCode('');
        setNewDesc('');
        setNewType('fixed');
        setNewValue('20');
        setNewMaxUses('');
        setNewIsActive(true);
        setNewStartDate('');
        setNewEndDate('');
        fetchCouponsData();
      } else {
        alert(data.message || "Failed creating coupon.");
      }
    } catch (err) {
      console.error("Create coupon error:", err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this coupon? This is permanent.")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCouponsData();
      }
    } catch (err) {
      console.error("Delete coupon error:", err);
    }
  };

  const handleToggleActive = async (coupon: any) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active })
      });
      const data = await res.json();
      if (data.success) {
        fetchCouponsData();
      }
    } catch (err) {
      console.error("Toggle coupon state error:", err);
    }
  };

  const handleUpdateCoupon = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDesc,
          max_uses: editMaxUses ? parseInt(editMaxUses) : null,
          is_active: editIsActive,
          end_date: editEndDate || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingCouponId(null);
        fetchCouponsData();
      }
    } catch (err) {
      console.error("Update coupon error:", err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setUserCount(1);
      setUsers([{ id: '1', email: 'local@instance.com', full_name: 'Local Admin', last_active: new Date().toISOString(), subscription_tier: 'Free' }]);
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('last_active', { ascending: false });
      
      if (error) throw error;
      setUsers(profileData || []);
      setUserCount(count);
    } catch (err) {
      console.error("Admin stats error:", err);
      setUserCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCouponsData();
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black dark:text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Admin Center
          </h2>
          <p className="text-gray-500 dark:text-gray-400">System orchestration, user memberships & plans governance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              fetchStats();
              fetchCouponsData();
            }}
            className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all active:scale-95"
          >
            <RefreshCcw className={cn("w-5 h-5 dark:text-gray-300", (loading || loadingCoupons) && "animate-spin")} />
          </button>
          <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl flex flex-wrap gap-1">
            {(['overview', 'users', 'plans', 'config', 'coupons'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  adminTab === tab 
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {adminTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-8 bg-black dark:bg-indigo-600 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform"></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">System Users</span>
                </div>
                <p className="text-5xl font-black font-mono">
                  {loading ? "..." : userCount ?? "0"}
                </p>
                <div className="mt-4 flex items-center gap-2">
                   <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-3/4"></div>
                   </div>
                   <span className="text-[10px] font-bold">75% active</span>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl w-fit mb-6">
                  <Activity className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold dark:text-white">API status</h3>
                <p className="text-2xl font-black mt-2 dark:text-gray-200">Optimal</p>
                <div className="mt-4 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500">Supabase DB connected</span>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl w-fit mb-6">
                  <Database className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-bold dark:text-white">Premium Plans</h3>
                <p className="text-2xl font-black mt-2 dark:text-gray-200">{plans.length} Custom Plans</p>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">Persisted in database.</p>
              </div>

              <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl w-fit mb-6">
                  <Shield className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="font-bold dark:text-white">Security Score</h3>
                <p className="text-2xl font-black mt-2 dark:text-gray-200 text-indigo-600 dark:text-indigo-400">98/100</p>
                <div className="mt-4 flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                   <span className="text-[10px] font-bold text-gray-400">RLS Policies Enabled</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold dark:text-white">Admin Logs</h3>
                  <button className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">System logs</button>
                </div>
                <div className="space-y-4">
                  {[
                    { tag: "PRICING", msg: "Feature licensing limits loaded", time: "1m ago", status: "success" },
                    { tag: "AUTH", msg: "Email provider verification enabled", time: "2m ago", status: "success" },
                    { tag: "DB", msg: "Supabase cloud sync latency stabilized", time: "15m ago", status: "success" },
                    { tag: "UI", msg: "Dark mode color palette optimized", time: "1h ago", status: "info" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/40 rounded-[2rem] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          log.status === 'success' ? "bg-emerald-500" : log.status === 'warning' ? "bg-amber-500" : "bg-indigo-500"
                        )}></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{log.tag}</span>
                             <span className="text-sm font-bold dark:text-gray-200">{log.msg}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5">{log.time}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-300 hover:text-indigo-500 cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex-1">
                  <h3 className="text-xl font-bold mb-6 dark:text-white">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 text-left hover:shadow-md transition-all group">
                       <Mail className="w-6 h-6 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
                       <p className="font-bold text-sm dark:text-gray-200 leading-tight">Broadcast Email</p>
                       <p className="text-[10px] text-gray-400 mt-1">Notify all system users</p>
                    </button>
                    <button className="p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-left hover:shadow-md transition-all group">
                       <Database className="w-6 h-6 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
                       <p className="font-bold text-sm dark:text-gray-200 leading-tight">Sync DB Nodes</p>
                       <p className="text-[10px] text-gray-400 mt-1">Manual replication trigger</p>
                    </button>
                    <button 
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={cn(
                        "p-6 rounded-3xl border text-left hover:shadow-md transition-all group",
                        maintenanceMode 
                          ? "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20" 
                          : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                      )}
                    >
                       {maintenanceMode ? <Lock className="w-6 h-6 text-red-600 mb-4" /> : <Unlock className="w-6 h-6 text-gray-400 mb-4" />}
                       <p className="font-bold text-sm dark:text-gray-200 leading-tight">Maintenance</p>
                       <p className="text-[10px] text-gray-400 mt-1">{maintenanceMode ? "System is LOCKED" : "System is LIVE"}</p>
                    </button>
                    <button className="p-6 bg-amber-50 dark:bg-amber-500/10 rounded-3xl border border-amber-100 dark:border-amber-500/20 text-left hover:shadow-md transition-all group">
                       <Settings2 className="w-6 h-6 text-amber-600 mb-4 group-hover:rotate-45 transition-transform" />
                       <p className="font-bold text-sm dark:text-gray-200 leading-tight">Global Config</p>
                       <p className="text-[10px] text-gray-400 mt-1">System-wide variables</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {adminTab === 'users' && (
          <motion.div 
            key="users"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-xl overflow-hidden"
          >
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
               <div>
                  <h3 className="text-xl font-bold dark:text-white">User Membership Control</h3>
                  <p className="text-sm text-gray-400">Monitoring {users.length} registered accounts. Admin can assign user premium status below.</p>
               </div>
               <div className="flex gap-2"></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Pricing Tier</th>
                    <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Last Active</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-400">Loading user database...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-400">No users found. Ensure the 'profiles' table exists.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold">
                                {user.full_name || user.fullName ? (user.full_name || user.fullName)[0] : user.email[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                 <span className="font-bold dark:text-gray-100">{user.full_name || user.fullName || 'Anonymous'}</span>
                                 <span className="text-xs text-gray-400">{user.email}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={cn(
                             "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                             user.subscription_tier === 'Free' || !user.subscription_tier
                               ? "bg-gray-100 text-gray-500 dark:bg-gray-850 dark:text-gray-400" 
                               : user.subscription_tier === 'Pro Space'
                                 ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                 : "bg-amber-105 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                           )}>
                             {user.subscription_tier || 'Free'}
                           </span>
                        </td>
                        <td className="px-5 py-6">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                             new Date(user.last_active || user.lastActive).getTime() > Date.now() - 300000 
                               ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10" 
                               : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                           )}>
                             {new Date(user.last_active || user.lastActive).getTime() > Date.now() - 300000 ? 'Online' : 'Offline'}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                              <Clock className="w-3 h-3" />
                              {new Date(user.last_active || user.lastActive).toLocaleString()}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           {editingUserId === user.id ? (
                             <div className="flex items-center gap-2">
                               <select
                                 value={editingTier}
                                 onChange={(e) => setEditingTier(e.target.value)}
                                 className="bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-bold border border-gray-200 dark:border-gray-700 outline-none"
                               >
                                 <option value="Free">Free</option>
                                 {plans.map(p => (
                                    <option key={p.id} value={p.name}>{p.name} Plan</option>
                                  ))}
                                 
                               </select>
                               <button
                                 onClick={async () => {
                                   const maxH = editingTier === 'Free' ? 5 : 9999;
                                   await onUpdateUser(user.id, editingTier, maxH);
                                   setEditingUserId(null);
                                   fetchStats();
                                 }}
                                 className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                               >
                                 Save
                               </button>
                               <button
                                 onClick={() => setEditingUserId(null)}
                                 className="px-2 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-700"
                               >
                                 Cancel
                               </button>
                             </div>
                           ) : (
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => {
                                   setEditingUserId(user.id);
                                   setEditingTier(user.subscription_tier || 'Free');
                                 }}
                                 className="p-2.5 bg-gray-50 hover:bg-indigo-50 dark:bg-gray-800/40 dark:hover:bg-indigo-900/10 rounded-xl transition-colors text-gray-500 dark:text-gray-400 hover:text-indigo-600"
                                 title="Grant membership pricing feature"
                               >
                                 <Settings2 className="w-4 h-4" />
                               </button>
                             </div>
                           )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {adminTab === 'plans' && (
          <motion.div 
            key="plans"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Active Product Pricing & Plan Features</h3>
                <p className="text-sm text-gray-400">Configure tiers, monthly prices, and core limitations visible to system users.</p>
              </div>
              <button
                onClick={() => {
                  const newId = `custom-plan-${Math.random().toString(36).substr(2, 9)}`;
                  const plan: PricingPlan = {
                    id: newId,
                    name: "Custom Enterprise Edition",
                    price: "₹999",
                    period: "month",
                    features: ["All capabilities", "100% SLA Guarantee", "Dedicated Support Advisor"],
                    isActive: true
                  };
                  onUpdatePlan(plan);
                }}
                className="px-6 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Custom Plan
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800/40 pb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Plan Tier Name</span>
                        <input
                          type="text"
                          value={plan.name}
                          onChange={(e) => onUpdatePlan({ ...plan, name: e.target.value })}
                          className="bg-transparent text-lg font-bold border-none p-0 focus:ring-0 dark:text-white w-full outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Price</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={plan.price}
                            onChange={(e) => onUpdatePlan({ ...plan, price: e.target.value })}
                            className="bg-transparent text-lg font-bold text-right border-none p-0 focus:ring-0 dark:text-white w-24 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Core Features Listed</label>
                      <div className="space-y-2">
                        {plan.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                            <input
                              type="text"
                              value={feat}
                              onChange={(e) => {
                                const newFeatures = [...plan.features];
                                newFeatures[fIdx] = e.target.value;
                                onUpdatePlan({ ...plan, features: newFeatures });
                              }}
                              className="bg-transparent text-xs text-gray-600 dark:text-gray-300 border-none p-0 focus:ring-0 w-full outline-none"
                            />
                            <button
                              onClick={() => {
                                const newFeatures = plan.features.filter((_, idx) => idx !== fIdx);
                                onUpdatePlan({ ...plan, features: newFeatures });
                              }}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            onUpdatePlan({ ...plan, features: [...plan.features, "Premium service capability"] });
                          }}
                          className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline flex items-center gap-1 mt-2 outline-none"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add feature line
                        </button>
                      </div>

                      {/* Suggested Features Guidance for Admin */}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Suggested Website Features to Include:
                        </span>
                        <p className="text-[11px] text-gray-450 dark:text-gray-400 leading-snug">
                          Align your plans with actual app modules. Click any capability below to instantly append it to this plan:
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1 max-h-[140px] overflow-y-auto pr-1">
                          {SUGGESTED_FEATURES.filter(f => !plan.features.includes(f)).map((feat, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => {
                                onUpdatePlan({ ...plan, features: [...plan.features, feat] });
                              }}
                              className="px-2.5 py-1.5 bg-indigo-50/60 dark:bg-indigo-950/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all border border-transparent hover:border-indigo-500 active:scale-95"
                            >
                              + {feat}
                            </button>
                          ))}
                          {SUGGESTED_FEATURES.filter(f => !plan.features.includes(f)).length === 0 && (
                            <span className="text-[10px] text-emerald-500 font-bold italic">All suggested elements are added!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800/40 pt-4 mt-6">
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      className="px-4 py-2 bg-red-50 dark:bg-red-950/15 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Delete Plan
                    </button>
                    <span className="text-[10px] text-gray-400 italic">Updates database directly</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {adminTab === 'config' && (
          <motion.div 
            key="config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-800">
               <h3 className="text-xl font-bold mb-8 dark:text-white">Supabase Connection</h3>
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Endpoint URL</label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                       <span className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                          {supabaseUrl}
                       </span>
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Anon Public Key</label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                       <span className="text-sm font-mono text-gray-600 dark:text-gray-400">********************</span>
                       <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="pt-4">
                     <p className="text-xs text-gray-400 leading-relaxed italic">
                       Authentication and Real-time sync are active. Your API keys are strictly secured via environment variables.
                     </p>
                  </div>
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-800">
               <h3 className="text-xl font-bold mb-8 dark:text-white">System Flags</h3>
               <div className="space-y-6">
                  {[
                    { label: "New User Registration", desc: "Allow public account creation", checked: true },
                    { label: "Telemetry & Logs", desc: "Collect usage analytics anonymous data", checked: true },
                    { label: "AI Optimization", desc: "Enable Gemini-powered smart features", checked: true },
                    { label: "Dark Mode Default", desc: "Set dark theme as system preference", checked: false },
                  ].map((flag, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all">
                       <div className="flex flex-col">
                          <span className="font-bold text-sm dark:text-gray-200">{flag.label}</span>
                          <span className="text-[10px] text-gray-400">{flag.desc}</span>
                       </div>
                       <div className={cn(
                          "w-12 h-6 rounded-full relative cursor-pointer transition-all",
                          flag.checked ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                       )}>
                          <div className={cn(
                            "w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm",
                            flag.checked ? "right-1" : "left-1"
                          )}></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {adminTab === 'coupons' && (
          <motion.div
            key="coupons"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* Top Stats counters related to coupons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-[2rem] shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Discount Campaigns Run</p>
                <p className="text-3xl font-black text-gray-850 dark:text-white mt-1 font-mono">{coupons.length}</p>
                <p className="text-xs text-gray-400 mt-1">Capped & percentage campaigns</p>
              </div>
              <div className="p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-[2rem] shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Coupon Redemptions</p>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                  {coupons.reduce((sum, cp) => sum + (cp.current_uses || 0), 0) + (usages.length || 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Directly correlated checkouts</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-emerald-950/25 to-teal-900/10 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-500/20 rounded-[2rem] shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450">Remittance Revenue via Promos</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  ₹{Math.round(coupons.reduce((sum, cp) => sum + (parseFloat(cp.total_revenue_generated) || 0), 0))}
                </p>
                <p className="text-xs text-gray-550 mt-1">Verified checkout transactions</p>
              </div>
            </div>

            {/* Campaign control bar */}
            <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Active Campaigns & Secure Vouchers Pool</h3>
                <p className="text-sm text-gray-400">Create, edit, suspend, and drop secure coupon discount codes applied on active checkouts.</p>
              </div>
              <button
                onClick={() => setCouponFormActive(!couponFormActive)}
                className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
              >
                <Tag className="w-4 h-4" /> {couponFormActive ? "Close Form Panel" : "Create New Coupon Code"}
              </button>
            </div>

            {/* Creation Form block */}
            {couponFormActive && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 border border-indigo-150 dark:border-indigo-950 p-8 rounded-[2.5rem] shadow-inner space-y-6"
              >
                <h4 className="text-md font-black dark:text-white uppercase tracking-wider font-mono">Configure New Promo Code</h4>
                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-gray-400">Coupon Code / Voucher Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FIFTYOFF"
                      value={newCode}
                      onChange={e => setNewCode(e.target.value)}
                      className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-xs font-mono font-bold uppercase focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-gray-400">Campaign Description</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50% Off Wrindha OS subscription"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-gray-400">Discount Allocation Type</label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value as any)}
                      className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 dark:text-white"
                    >
                      <option value="fixed">Fixed Flat INR Amount (₹)</option>
                      <option value="percentage">Percentage Discount (%)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-gray-400">Discount Value</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 20"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-gray-400">Maximum Usage Threshold (Capped)</label>
                    <input
                      type="number"
                      placeholder="Unlimited (keep empty)"
                      value={newMaxUses}
                      onChange={e => setNewMaxUses(e.target.value)}
                      className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-xs font-mono focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wide text-gray-400">Expiry End Date (Optional)</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={e => setNewEndDate(e.target.value)}
                      className="w-full py-2.5 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-xs focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="campaign_active"
                      checked={newIsActive}
                      onChange={e => setNewIsActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="campaign_active" className="text-xs font-black uppercase tracking-wider text-gray-400 cursor-pointer">Activate Campaign Immediately</label>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setCouponFormActive(false)}
                      className="px-5 py-2.5 border border-gray-200 dark:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:shadow-md"
                    >
                      Publish Voucher
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Coupons Listing Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-800/10">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Voucher Promo Code</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Description</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Allocation Benefit</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Redemptions Status</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Campaign Period</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">suspension toggle</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCoupons ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center text-gray-400">Loading coupons database ledgers...</td>
                      </tr>
                    ) : coupons.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center text-gray-400">No promo coupons published yet. Generate your first offer above!</td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr key={coupon.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-8 py-6">
                            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl text-xs font-mono font-black tracking-wide uppercase border border-indigo-100/40 dark:border-indigo-950/40">
                              {coupon.coupon_code}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            {editingCouponId === coupon.id ? (
                              <input
                                type="text"
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                className="py-1 px-2.5 bg-gray-50 dark:bg-gray-800 text-xs font-bold border rounded-lg focus:border-indigo-500 dark:text-white outline-none w-48"
                              />
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-bold dark:text-gray-100 text-sm">{coupon.description || "Subscribers Reward Campaign"}</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">Total Revenue: ₹{Math.round(coupon.total_revenue_generated || 0)}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-6 font-mono text-xs font-black dark:text-emerald-400 text-emerald-600">
                            {coupon.discount_type === "percentage" ? `${coupon.discount_value}% Off` : `₹${coupon.discount_value} Off`}
                          </td>
                          <td className="px-8 py-6">
                            {editingCouponId === coupon.id ? (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-gray-400 font-bold">Max Uses</label>
                                <input
                                  type="number"
                                  placeholder="Unlimited"
                                  value={editMaxUses}
                                  onChange={e => setEditMaxUses(e.target.value)}
                                  className="py-1 px-2.5 bg-gray-50 dark:bg-gray-800 text-xs border rounded-lg focus:border-indigo-500 dark:text-white outline-none w-20 font-mono"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 w-24">
                                <span className="text-xs font-extrabold dark:text-gray-200">
                                  {coupon.current_uses || 0} / {coupon.max_uses ? coupon.max_uses : "∞"}
                                </span>
                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 rounded-full"
                                    style={{
                                      width: `${coupon.max_uses ? Math.min(100, ((coupon.current_uses || 0) / coupon.max_uses) * 100) : 32}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            {editingCouponId === coupon.id ? (
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-black text-gray-400 font-bold">Expiry Date</label>
                                <input
                                  type="date"
                                  value={editEndDate ? editEndDate.split('T')[0] : ''}
                                  onChange={e => setEditEndDate(e.target.value)}
                                  className="py-1 px-1.5 text-[10px] bg-gray-50 dark:bg-gray-800 text-xs border rounded-lg focus:border-indigo-500 dark:text-white outline-none"
                                />
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString(undefined, { dateStyle: 'short' }) : "Never Expires"}
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(coupon)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors",
                                coupon.is_active
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-650 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100"
                              )}
                            >
                              {coupon.is_active ? "● Active" : "○ Inactive"}
                            </button>
                          </td>
                          <td className="px-8 py-6">
                            {editingCouponId === coupon.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCoupon(coupon.id)}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase whitespace-nowrap shadow"
                                >
                                  Save Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCouponId(null)}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-805 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCouponId(coupon.id);
                                    setEditDesc(coupon.description || '');
                                    setEditMaxUses(coupon.max_uses ? String(coupon.max_uses) : '');
                                    setEditIsActive(coupon.is_active);
                                    setEditEndDate(coupon.end_date || '');
                                  }}
                                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-gray-50 dark:bg-gray-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/10 rounded-xl"
                                  title="Edit Coupon Configuration"
                                >
                                  <Settings2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCoupon(coupon.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-gray-800/40 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-xl"
                                  title="Delete Promo Coupon Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

function DashboardView({ habits, tasks, expenses, currency, userName, setUserName, theme, setActiveTab, budget }: { 
  habits: Habit[], 
  tasks: Task[], 
  expenses: Expense[], 
  currency: 'USD' | 'INR', 
  userName: string,
  setUserName: (name: string) => void,
  theme: 'light' | 'dark',
  setActiveTab: (tab: string) => void,
  budget: number
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(userName);
  
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = budget - totalSpent;
  const progressPercent = Math.max(0, Math.min(100, (remaining / budget) * 100));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleNameSave = () => {
    if (editName.trim()) {
      setUserName(editName);
      setIsEditingName(false);
    }
  };

  const formatVal = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'INR',
    }).format(val);
  };

  const priorityTasks = tasks.filter(t => t.quadrant === EisenhowerQuadrant.URGENT_IMPORTANT && !t.completed);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  className="text-3xl font-bold tracking-tight bg-gray-100 dark:bg-gray-800 dark:text-white rounded-lg px-2 outline-none border-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-indigo-600 transition-all"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                />
              </div>
            ) : (
              <h1 
                className="text-3xl font-bold tracking-tight cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white rounded-xl px-2 -ml-2 transition-colors flex items-center gap-2 group"
                onClick={() => setIsEditingName(true)}
              >
                {getGreeting()}, {userName}
                <Settings className="w-5 h-5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
          </div>
          <p className="text-[#6B7280] dark:text-gray-500 mt-1">You have {habits.length} active habits and {tasks.filter(t => !t.completed).length} pending tasks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Habit Card */}
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E5E7EB] dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">Active Streaks</span>
          </div>
          <h3 className="text-lg font-bold mb-4 dark:text-white">{habits[0]?.name || "No active habits"}</h3>
          <div className="flex gap-2 mb-4">
            {(() => {
              const current = new Date();
              const day = current.getDay();
              const diff = current.getDate() - day + (day === 0 ? -6 : 1);
              const monday = new Date(current.setDate(diff));
              const dates = [];
              for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dates.push(`${yyyy}-${mm}-${dd}`);
              }
              
              return dates.map((dateStr, i) => {
                const isCompleted = habits[0]?.completedAt?.some(d => d.startsWith(dateStr));
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 h-12 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all", 
                      isCompleted 
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20 font-black animate-pulse" 
                        : "bg-[#F3F4F6] dark:bg-gray-800 text-[#9CA3AF] dark:text-gray-600"
                    )}
                    title={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} (${dateStr})`}
                  >
                    {['M', 'Y', 'W', 'T', 'F', 'S', 'S'][i] === 'Y' ? 'T' : ['M', 'Y', 'W', 'T', 'F', 'S', 'S'][i]}
                  </div>
                );
              });
            })()}
          </div>
          <p className="text-sm text-[#6B7280] dark:text-gray-400">Streak: {habits[0]?.streak || 0} days. Keep pushing!</p>
        </div>

        {/* Eisenhower Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E5E7EB] dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-xl w-fit mb-4">
               <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-lg font-bold leading-tight dark:text-white">Priority Matrix</h3>
             <div className="mt-4 space-y-3">
               {priorityTasks.slice(0, 3).map(task => (
                 <div key={task.id} className="flex items-center gap-3 min-w-0">
                   <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                   <span className="text-sm font-medium truncate dark:text-gray-300 flex-1">{task.title}</span>
                 </div>
               ))}
               {priorityTasks.length === 0 && <p className="text-gray-400 dark:text-gray-600 text-sm">No critical tasks!</p>}
            </div>
          </div>
          <button onClick={() => setActiveTab('tasks')} className="text-xs font-bold text-[#6B7280] dark:text-gray-500 uppercase tracking-widest mt-6 hover:text-black dark:hover:text-white transition-colors w-full text-left">View Matrix →</button>
        </div>

        {/* Expenses Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-[#E5E7EB] dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl w-fit mb-4">
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold dark:text-white">Budget Health</h3>
            <div className="mt-4">
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold font-mono dark:text-white">{formatVal(remaining)}</span>
                <span className="text-xs text-[#6B7280] dark:text-gray-500 mb-1">left</span>
              </div>
              <div className="w-full bg-[#F3F4F6] dark:bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-[#6B7280] dark:text-gray-500 uppercase mt-6">Total Spent: {formatVal(totalSpent)}</p>
        </div>
      </div>
    </div>
  );
}

export function calculateStreak(completedDates: string[]): number {
  if (!completedDates || completedDates.length === 0) return 0;
  
  const dateSet = new Set(
    completedDates.map(d => d.split('T')[0])
  );
  
  let streak = 0;
  const checkDate = new Date(); // local today
  
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  const todayStr = formatDate(checkDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);
  
  let currentDate = checkDate;
  if (dateSet.has(todayStr)) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else if (dateSet.has(yesterdayStr)) {
    streak = 1;
    currentDate = yesterday;
    currentDate.setDate(currentDate.getDate() - 1);
  } else {
    return 0;
  }
  
  while (true) {
    const checkStr = formatDate(currentDate);
    if (dateSet.has(checkStr)) {
      streak += 1;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

function HabitsView({ habits, setHabits, onDelete, theme, subscriptionTier = 'Free', setActiveTab }: { habits: Habit[], setHabits: (h: Habit[]) => void, onDelete: (id: string) => void, theme: 'light' | 'dark', subscriptionTier?: string, setActiveTab?: (t: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  const weekDates = (() => {
    const current = new Date();
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  })();

  const addHabit = () => {
    if (!newName.trim()) return;
    if (subscriptionTier === 'Free' && habits.length >= 5) {
      setShowLimitModal(true);
      return;
    }
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      frequency: 'daily',
      streak: 0,
      completedAt: [],
      color: ['bg-indigo-500', 'bg-blue-500', 'bg-rose-500', 'bg-emerald-500'][Math.floor(Math.random() * 4)]
    };
    setHabits([...habits, newHabit]);
    setNewName("");
    setShowAdd(false);
  };

  const checkIn = (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const comp = h.completedAt || [];
      const index = comp.findIndex(d => d.startsWith(todayStr));
      let newComp = [...comp];
      if (index >= 0) {
        // Toggle off
        newComp.splice(index, 1);
      } else {
        // Completing today
        newComp.push(todayStr);
      }
      const newStreak = calculateStreak(newComp);
      return {
        ...h,
        completedAt: newComp,
        streak: newStreak
      };
    });
    setHabits(updated);
  };

  const getLast7DaysData = () => {
    const daysData = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = daysOfWeek[d.getDay()];
      
      let completionsCount = 0;
      habits.forEach(h => {
        const hasCompleted = h.completedAt && h.completedAt.some(dateTime => dateTime.startsWith(dateStr));
        if (hasCompleted) {
          completionsCount++;
        }
      });
      
      const completionRate = habits.length > 0 
        ? Math.round((completionsCount / habits.length) * 100) 
        : 0;
        
      daysData.push({
        name: `${dayName} (${dd}/${mm})`,
        completion: completionRate,
        count: completionsCount,
        total: habits.length
      });
    }
    
    return daysData;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Unstoppable Streaks</h2>
          <p className="text-gray-500 dark:text-gray-400">Habit completions update your graphs and streaks dynamically.</p>
        </div>
        <button 
          onClick={() => {
            if (subscriptionTier === 'Free' && habits.length >= 5) {
              setShowLimitModal(true);
            } else {
              setShowAdd(true);
            }
          }}
          className="bg-black dark:bg-indigo-600 hover:opacity-95 text-white p-3 rounded-2xl hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {subscriptionTier === 'Free' && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-4 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
            <span>You are currently managing <strong>{habits.length} of 5 daily habits</strong> under standard limit rules. Unlock infinite streaks by starting a premium space.</span>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab('pricing')} 
            className="underline font-black uppercase text-[10px] tracking-wider hover:text-indigo-900 dark:hover:text-white shrink-0"
          >
            Upgrade App Now &rarr;
          </button>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-indigo-150 dark:border-gray-800 shadow-2xl space-y-6 text-center relative"
          >
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black dark:text-white">Professional habit Limit Reached</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Your current <span className="font-extrabold text-indigo-600 dark:text-indigo-400">Free Tier</span> supports up to <span className="font-black text-gray-800 dark:text-gray-200">5 active habits</span>. Upgrade to unlock unlimited behaviors creation, in-depth predictive insights, and priority support.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setShowLimitModal(false);
                  if (setActiveTab) setActiveTab('pricing');
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                Upgrade to Pro Space ⚡
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl transition-all text-xs"
              >
                Stay on Free version
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-black dark:border-indigo-600 flex gap-4">
             <input 
              autoFocus
              className="flex-1 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 text-sm font-medium outline-none" 
              placeholder="Habit name (e.g. Morning Meditation, Read 10 Pages)..." 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
             />
             <button onClick={addHabit} className="bg-black dark:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Create</button>
             <button onClick={() => setShowAdd(false)} className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-6 py-2 rounded-xl font-bold text-sm">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {habits.map(habit => {
          const isCompletedToday = habit.completedAt && habit.completedAt.some(d => d.startsWith(todayStr));
          return (
            <motion.div 
              whileHover={{ y: -4 }}
              key={habit.id} 
              className={cn(
                "bg-white dark:bg-gray-900 p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300",
                isCompletedToday 
                  ? "border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/5" 
                  : "border-gray-100 dark:border-gray-800"
              )}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white relative", habit.color)}>
                    <Flame className="w-6 h-6" />
                    {isCompletedToday && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    {habit.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{habit.streak} day streak</p>
                  <div className="flex gap-1 mt-4">
                    {weekDates.map((dateStr, idx) => {
                      const isComp = habit.completedAt && habit.completedAt.some(d => d.startsWith(dateStr));
                      return (
                        <div 
                          key={idx} 
                          title={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx]} (${dateStr})`}
                          className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center font-mono text-[9px] font-black transition-all",
                            isComp 
                              ? "bg-orange-500 text-white shadow-sm shadow-orange-500/10" 
                              : "bg-[#F3F4F6] dark:bg-gray-800 text-[#9CA3AF] dark:text-gray-600"
                          )}
                        >
                          {['M', 'Y', 'W', 'T', 'F', 'S', 'S'][idx] === 'Y' ? 'T' : ['M', 'Y', 'W', 'T', 'F', 'S', 'S'][idx]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    onDelete(habit.id);
                    setHabits(habits.filter(h => h.id !== habit.id));
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => checkIn(habit.id)}
                className={cn(
                  "mt-6 w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 border-2",
                  isCompletedToday 
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10 hover:bg-emerald-600"
                    : "bg-gray-50 dark:bg-gray-800 text-black dark:text-white border-transparent hover:bg-black hover:text-white dark:hover:bg-indigo-600"
                )}
              >
                {isCompletedToday ? "✓ Completed Today" : "Mark Completed"}
              </button>
            </motion.div>
          );
        })}
        {habits.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8 text-center text-gray-400 font-medium">
            No habits registered yet. Keep yourself highly disciplined.
          </div>
        )}
      </div>

      {/* Habit Analytics */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-bold mb-2 dark:text-white">Active Completion Rate</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Real-time daily consistency graph calculated from your completed dates.</p>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={getLast7DaysData()}>
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
               <Tooltip cursor={{fill: theme === 'dark' ? '#1F2937' : '#F9FAFB'}} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: theme === 'dark' ? '#111827' : '#FFF', color: theme === 'dark' ? '#FFF' : '#000', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
               <Bar dataKey="completion" fill={theme === 'dark' ? '#6366F1' : '#000'} radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TasksView({ tasks, setTasks, onDelete, subscriptionTier = 'Free', setActiveTab }: { tasks: Task[], setTasks: (t: Task[]) => void, onDelete: (id: string) => void, subscriptionTier?: string, setActiveTab?: (t: string) => void }) {
  const [showAdd, setShowAdd] = useState<EisenhowerQuadrant | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const addTask = (q: EisenhowerQuadrant) => {
    if (!newTaskTitle.trim()) return;
    if (subscriptionTier === 'Free' && tasks.length >= 10) {
      setShowLimitModal(true);
      return;
    }
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      quadrant: q,
      completed: false,
      tags: []
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setShowAdd(null);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const quadrants = [
    { id: EisenhowerQuadrant.URGENT_IMPORTANT, label: 'Do First', color: 'bg-red-500', desc: 'Urgent & Important' },
    { id: EisenhowerQuadrant.NOT_URGENT_IMPORTANT, label: 'Schedule', color: 'bg-blue-500', desc: 'Important & Not Urgent' },
    { id: EisenhowerQuadrant.URGENT_NOT_IMPORTANT, label: 'Delegate', color: 'bg-orange-500', desc: 'Urgent & Not Important' },
    { id: EisenhowerQuadrant.NOT_URGENT_NOT_IMPORTANT, label: 'Eliminate', color: 'bg-gray-400', desc: 'Not Urgent & Not Important' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight dark:text-white">Task Priority Matrix</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Prioritize your tasks across Eisenhower's 4 quadrants and focus with Pomodoro cycles.
          </p>
        </div>
      </div>

      {subscriptionTier === 'Free' && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-4 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
            <span>You are currently managing <strong>{tasks.length} of 10 tasks</strong> under standard limit rules. Upgrade now to log unlimited milestones and tasks.</span>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab('pricing')} 
            className="underline font-black uppercase text-[10px] tracking-wider hover:text-indigo-900 dark:hover:text-white shrink-0"
          >
            Upgrade App &rarr;
          </button>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-indigo-150 dark:border-gray-800 shadow-2xl space-y-6 text-center relative"
          >
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black dark:text-white">Milestone Matrix Limit Reached</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Your current <span className="font-extrabold text-indigo-600 dark:text-indigo-400">Free Tier</span> supports up to <span className="font-black text-gray-800 dark:text-gray-200">10 tasks</span> in the Priority Matrix. Upgrade to a premium plan to unlock infinite task capacity, custom labels, and priority support.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setShowLimitModal(false);
                  if (setActiveTab) setActiveTab('pricing');
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                Upgrade to Pro Space ⚡
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl transition-all text-xs"
              >
                Stay on Free version
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left / Main Section: Quadrants Matrix (Grid) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {quadrants.map(q => (
            <div key={q.id} className="bg-white dark:bg-gray-900 rounded-3xl md:rounded-[2rem] border border-gray-100 dark:border-gray-800 p-5 md:p-6 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", q.color)}></div>
                  <h3 className="font-extrabold text-base dark:text-white">{q.label}</h3>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{q.desc}</span>
              </div>
              
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {tasks.filter(t => t.quadrant === q.id).map(task => (
                  <div key={task.id} className="group p-3.5 bg-gray-50/50 dark:bg-gray-800/25 rounded-2xl flex flex-col gap-1 border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all">
                    {/* Top row with details */}
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div 
                        className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTask(task.id);
                            if (activeTaskId === task.id) {
                              setActiveTaskId(null);
                            }
                          }}
                          className={cn("mt-0.5 w-5 h-5 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all", task.completed ? "bg-black dark:bg-indigo-600 border-black dark:border-indigo-600 text-white" : "border-gray-200 dark:border-gray-700 group-hover:border-black/30 dark:group-hover:border-white/30")}
                        >
                          {task.completed && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "text-xs md:text-sm font-semibold dark:text-gray-300 break-words leading-relaxed", 
                              task.completed && "text-gray-400 dark:text-gray-600 line-through font-normal"
                            )}>
                              {task.title}
                            </span>
                            {task.description && task.description.trim().length > 0 && (
                              <span className="inline-flex items-center text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-md gap-0.5" title="Has notes">
                                <FileText className="w-2.5 h-2.5" /> Notes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Expand/Collapse Chevron Triggers */}
                        <button
                          onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                          title={expandedTaskId === task.id ? "Collapse detailed notes" : "Expand detailed notes"}
                          className={cn(
                            "p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all",
                            expandedTaskId === task.id ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" : "md:opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-250", expandedTaskId === task.id ? "rotate-90 text-indigo-500" : "")} />
                        </button>

                        {!task.completed && (
                          <button
                            onClick={() => setActiveTaskId(task.id)}
                            title="Focus on this task with Pomodoro"
                            className={cn(
                              "p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 md:opacity-0 group-hover:opacity-100 transition-all duration-200",
                              activeTaskId === task.id ? "text-indigo-500 opacity-100 bg-indigo-50/85 dark:bg-indigo-950/45" : ""
                            )}
                          >
                            <Timer className="w-3.5 h-3.5 animate-pulse" />
                          </button>
                        )}
                        <X 
                          className="w-4 h-4 text-gray-300 dark:text-gray-600 md:opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500 transition-opacity" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                            setTasks(tasks.filter(t => t.id !== task.id));
                            if (activeTaskId === task.id) {
                              setActiveTaskId(null);
                            }
                            if (expandedTaskId === task.id) {
                              setExpandedTaskId(null);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Expandable Section */}
                    <AnimatePresence initial={false}>
                      {expandedTaskId === task.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden w-full"
                        >
                          <TaskNotesEditor 
                            taskId={task.id}
                            initialValue={task.description || ""}
                            onSave={(val) => {
                              setTasks(tasks.map(t => t.id === task.id ? { ...t, description: val } : t));
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {showAdd === q.id ? (
                   <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-black dark:border-indigo-600 shadow-lg z-10 sticky bottom-0">
                      <input 
                        autoFocus
                        className="w-full text-xs font-semibold mb-3 outline-none px-2 py-1 bg-transparent dark:text-white" 
                        placeholder="Task name..." 
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTask(q.id)}
                      />
                      <div className="flex gap-2">
                         <button onClick={() => addTask(q.id)} className="flex-1 bg-black dark:bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">Add</button>
                         <button onClick={() => setShowAdd(null)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-black dark:text-white py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                      </div>
                   </div>
                ) : (
                  <button 
                    onClick={() => setShowAdd(q.id)}
                    className="w-full py-4 border-2 border-dashed border-gray-100 dark:border-gray-800/80 rounded-2xl text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:border-gray-200 dark:hover:border-gray-700 transition-all flex items-center justify-center gap-2"
                  >
                     <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Section: Focus Pomodoro Widget */}
        <div className="lg:col-span-1 sticky top-6">
          <PomodoroTimer 
            tasks={tasks}
            onToggleTask={toggleTask}
            activeTaskId={activeTaskId}
            onSelectTask={setActiveTaskId}
          />
        </div>
      </div>
    </div>
  );
}

function FinanceView({ expenses, setExpenses, onDelete, currency, setCurrency, theme, budget, setBudget }: { 
  expenses: Expense[], 
  setExpenses: (e: Expense[]) => void, 
  onDelete: (id: string) => void,
  currency: 'USD' | 'INR', 
  setCurrency: (c: 'USD' | 'INR') => void,
  theme: 'light' | 'dark',
  budget: number,
  setBudget: (b: number) => void
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newExp, setNewExp] = useState({ amount: "", note: "" });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget.toString());

  const formatVal = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'INR',
    }).format(val);
  };

  const addExpense = () => {
    if (!newExp.amount || !newExp.note) return;
    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(newExp.amount),
      note: newExp.note,
      category: 'General',
      date: new Date().toISOString()
    };
    setExpenses([expense, ...expenses]);
    setNewExp({ amount: "", note: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Monthly Spending</p>
                    <h2 className="text-4xl font-bold font-mono dark:text-white">{formatVal(expenses.reduce((a, b) => a + b.amount, 0))}</h2>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
                      <button 
                        onClick={() => setCurrency('USD')}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", currency === 'USD' ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500")}
                      >
                        USD ($)
                      </button>
                      <button 
                        onClick={() => setCurrency('INR')}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", currency === 'INR' ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500")}
                      >
                        INR (₹)
                      </button>
                    </div>
                    <button onClick={() => setShowAdd(!showAdd)} className="bg-emerald-500 dark:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-emerald-500/20">
                      <Plus className="w-4 h-4" /> {showAdd ? "Close" : "Add Expense"}
                    </button>
                  </div>
               </div>
               
               <AnimatePresence>
                {showAdd && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl mb-8 border border-emerald-100 dark:border-emerald-900/30 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                      type="number" 
                      placeholder={`Amount (${currency === 'USD' ? '$' : '₹'})`} 
                      className="bg-white dark:bg-gray-900 dark:text-white rounded-xl px-4 py-2 border-none text-sm outline-none w-full"
                      value={newExp.amount}
                      onChange={e => setNewExp({...newExp, amount: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Note..." 
                      className="bg-white dark:bg-gray-900 dark:text-white rounded-xl px-4 py-2 border-none text-sm outline-none w-full"
                      value={newExp.note}
                      onChange={e => setNewExp({...newExp, note: e.target.value})}
                      onKeyDown={e => e.key === 'Enter' && addExpense()}
                    />
                    <button onClick={addExpense} className="bg-black dark:bg-indigo-600 text-white rounded-xl font-bold text-sm">Save</button>
                  </motion.div>
                )}
               </AnimatePresence>

               <div className="h-64 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={expenses.slice(0, 5).reverse()}>
                     <XAxis dataKey="note" hide />
                     <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#111827' : '#FFF', border: 'none', borderRadius: '12px', color: theme === 'dark' ? '#FFF' : '#000' }} />
                     <Bar dataKey="amount" fill="#10B981" radius={[12, 12, 12, 12]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
              <h3 className="font-bold text-lg mb-6 dark:text-white">Recent Transactions</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {expenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl group transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm dark:text-gray-200">{exp.note}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{exp.category} • {new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold font-mono text-sm dark:text-white">-{formatVal(exp.amount)}</span>
                      <X 
                        className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500" 
                        onClick={() => {
                          onDelete(exp.id);
                          setExpenses(expenses.filter(e => e.id !== exp.id));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-black dark:bg-[#0F172A] text-white p-8 rounded-[2.5rem] border border-transparent dark:border-gray-800 flex flex-col justify-between h-fit min-h-[300px]">
                <div>
                   <h3 className="text-lg font-bold">Available Capital</h3>
                   <p className="text-white/50 dark:text-gray-500 text-xs mt-1">Total budget for current period</p>
                </div>
                
                <div className="mt-8 flex flex-col items-center">
                   {isEditingBudget ? (
                     <div className="w-full space-y-4">
                       <input 
                         type="number"
                         value={tempBudget}
                         onChange={e => setTempBudget(e.target.value)}
                         className="w-full bg-white/10 dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-white text-center text-2xl font-bold font-mono outline-none"
                         autoFocus
                       />
                       <div className="flex gap-2">
                         <button 
                           onClick={() => {
                             const newB = parseFloat(tempBudget) || 0;
                             setBudget(newB);
                             localStorage.setItem('wrindha_budget_updated', 'true');
                             setIsEditingBudget(false);
                           }}
                           className="flex-1 py-2 bg-emerald-500 rounded-xl text-xs font-bold"
                         >
                           Save
                         </button>
                         <button 
                           onClick={() => setIsEditingBudget(false)}
                           className="flex-1 py-2 bg-white/10 rounded-xl text-xs font-bold"
                         >
                           Cancel
                         </button>
                       </div>
                     </div>
                   ) : (
                     <>
                       <span className="text-4xl font-bold font-mono tracking-tighter">{formatVal(budget)}</span>
                       <button 
                         onClick={() => {
                           setTempBudget(budget.toString());
                           setIsEditingBudget(true);
                         }}
                         className="mt-4 text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors"
                       >
                         Edit Budget
                       </button>
                     </>
                   )}
                </div>

                {!isEditingBudget && (
                  <div className="mt-8 flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-white/50">Spent</span>
                      <span>{formatVal(expenses.reduce((a, b) => a + b.amount, 0))}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (expenses.reduce((a, b) => a + b.amount, 0) / budget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
             </div>

             <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-6">Split by Category</h3>
                <div className="space-y-4">
                   {Array.from(new Set(expenses.map(e => e.category))).map((cat, i) => {
                     const val = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                     const colors = ['#6366F1', '#3B82F6', '#F59E0B', '#10B981', '#EF4444'];
                     return (
                       <div key={cat} className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                           <span className="text-sm font-medium dark:text-gray-300">{cat}</span>
                         </div>
                         <span className="text-sm font-mono font-bold dark:text-white">{formatVal(val)}</span>
                       </div>
                     );
                   })}
                   {expenses.length === 0 && <p className="text-xs text-gray-400 italic">No data</p>}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function StudyView({ courses, setCourses, onDeleteCourse, subscriptionTier = 'Free', setActiveTab }: { courses: StudyCourse[], setCourses: (c: StudyCourse[]) => void, onDeleteCourse: (id: string) => void, subscriptionTier?: string, setActiveTab?: (t: string) => void }) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id || null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // For adding exams and materials
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', date: '' });
  
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const addCourse = () => {
    if (!newCourseName.trim()) return;
    if (subscriptionTier === 'Free' && courses.length >= 2) {
      setShowLimitModal(true);
      return;
    }
    const newCourse: StudyCourse = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCourseName,
      progress: 0,
      color: ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][Math.floor(Math.random() * 5)],
      exams: [],
      materials: []
    };
    setCourses([...courses, newCourse]);
    setNewCourseName("");
    setShowAddCourse(false);
    setSelectedCourseId(newCourse.id);
  };

  const deleteCourse = (id: string) => {
    const nextCourses = courses.filter(c => c.id !== id);
    setCourses(nextCourses);
    if (selectedCourseId === id) {
      setSelectedCourseId(nextCourses[0]?.id || null);
    }
  };

  const addExam = (courseId: string) => {
    if (!newExam.title || !newExam.date) return;
    
    setCourses(courses.map(c => c.id === courseId ? {
      ...c,
      exams: [...c.exams, { id: Math.random().toString(36).substr(2, 9), title: newExam.title, date: newExam.date }]
    } : c));
    setNewExam({ title: '', date: '' });
    setShowAddExam(false);
  };

  const addMaterial = (courseId: string) => {
    if (!newMaterialTitle.trim()) return;
    
    setCourses(courses.map(c => c.id === courseId ? {
      ...c,
      materials: [...c.materials, { id: Math.random().toString(36).substr(2, 9), title: newMaterialTitle, completed: false }]
    } : c).map(c => {
       if (c.id !== courseId) return c;
       const progress = c.materials.length > 0 ? Math.round((c.materials.filter(m => m.completed).length / c.materials.length) * 100) : 0;
       return { ...c, progress };
    }));
    setNewMaterialTitle("");
    setShowAddMaterial(false);
  };

  const toggleMaterial = (courseId: string, materialId: string) => {
    setCourses(courses.map(c => {
      if (c.id !== courseId) return c;
      const nextMaterials = c.materials.map(m => m.id === materialId ? { ...m, completed: !m.completed } : m);
      const completedCount = nextMaterials.filter(m => m.completed).length;
      const progress = nextMaterials.length > 0 ? Math.round((completedCount / nextMaterials.length) * 100) : 0;
      return { ...c, materials: nextMaterials, progress };
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Study Command Center</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your courses, exams, and study materials manually.</p>
        </div>
        <button 
          onClick={() => {
            if (subscriptionTier === 'Free' && courses.length >= 2) {
              setShowLimitModal(true);
            } else {
              setShowAddCourse(true);
            }
          }}
          className="bg-black dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {subscriptionTier === 'Free' && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-4 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
            <span>You are currently managing <strong>{courses.length} of 2 active courses</strong> under standard limit rules. Upgrade now to track infinite courses, logs, and materials.</span>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab('pricing')} 
            className="underline font-black uppercase text-[10px] tracking-wider hover:text-indigo-900 dark:hover:text-white shrink-0"
          >
            Upgrade App &rarr;
          </button>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-indigo-150 dark:border-gray-800 shadow-2xl space-y-6 text-center relative"
          >
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black dark:text-white">Academic Course Limit Reached</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Your current <span className="font-extrabold text-indigo-600 dark:text-indigo-400">Free Tier</span> supports up to <span className="font-black text-gray-800 dark:text-gray-200">2 active study courses</span>. Upgrade to modern premium plans to manage your entire education path, logs, and milestones.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setShowLimitModal(false);
                  if (setActiveTab) setActiveTab('pricing');
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                Upgrade to Pro Space ⚡
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl transition-all text-xs"
              >
                Stay on Free version
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showAddCourse && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-black dark:border-indigo-600 flex gap-4 shadow-xl">
             <input 
              autoFocus
              className="flex-1 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 text-sm font-medium outline-none" 
              placeholder="Course name (e.g. Advanced Calculus)..." 
              value={newCourseName}
              onChange={e => setNewCourseName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCourse()}
             />
             <button onClick={addCourse} className="bg-black dark:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Create</button>
             <button onClick={() => setShowAddCourse(false)} className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-6 py-2 rounded-xl font-bold text-sm">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Course List */}
        <div className="space-y-4">
           <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">My Study Subjects</h3>
           <div className="space-y-2">
              {courses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setShowAddExam(false);
                    setShowAddMaterial(false);
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group flex justify-between items-center",
                    selectedCourseId === course.id ? "bg-white dark:bg-gray-800 border-black dark:border-indigo-600 shadow-md" : "bg-white/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", course.color)}></div>
                    <span className="font-bold text-sm dark:text-gray-200">{course.name}</span>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDeleteCourse(course.id);
                      deleteCourse(course.id); 
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {courses.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-600 italic">No courses added yet.</p>}
           </div>
        </div>

        {/* Main: Course Content */}
        {selectedCourse ? (
          <div className="lg:col-span-3 space-y-6">
             <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h3 className="font-bold text-2xl dark:text-white">{selectedCourse.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{selectedCourse.materials.length} Topics • {selectedCourse.exams.length} Milestones</p>
                   </div>
                   <div className="text-right">
                      <span className="text-3xl font-bold font-mono dark:text-white">{selectedCourse.progress}%</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Mastery</p>
                   </div>
                </div>
                
                <div className="w-full h-4 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${selectedCourse.progress}%` }}
                     className={cn("h-full rounded-full transition-all duration-500", selectedCourse.color)}
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Milestones (Exams) */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                         <Calendar className="w-5 h-5 text-indigo-500" /> Key Milestones
                      </h4>
                      <button 
                        onClick={() => setShowAddExam(!showAddExam)}
                        className={cn("p-2 rounded-xl transition-all", showAddExam ? "bg-black dark:bg-indigo-600 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white")}
                      >
                         {showAddExam ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </button>
                   </div>

                   <AnimatePresence>
                     {showAddExam && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 space-y-3 overflow-hidden">
                          <input 
                            placeholder="Milestone title..." 
                            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-3 rounded-xl text-sm font-medium outline-none"
                            value={newExam.title}
                            onChange={e => setNewExam({...newExam, title: e.target.value})}
                          />
                          <input 
                            type="date"
                            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-3 rounded-xl text-sm font-medium outline-none"
                            value={newExam.date}
                            onChange={e => setNewExam({...newExam, date: e.target.value})}
                          />
                          <button onClick={() => addExam(selectedCourse.id)} className="w-full py-3 bg-black dark:bg-indigo-600 text-white rounded-xl font-bold text-sm">Add Milestone</button>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   <div className="space-y-4">
                      {selectedCourse.exams.map(exam => (
                        <div key={exam.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl group transition-all">
                           <div>
                              <p className="font-bold text-sm dark:text-gray-200">{exam.title}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{new Date(exam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                           </div>
                           <button 
                             onClick={() => setCourses(courses.map(c => c.id === selectedCourse.id ? { ...c, exams: c.exams.filter(e => e.id !== exam.id) } : c))}
                             className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all"
                           >
                              <X className="w-4 h-4" />
                           </button>
                        </div>
                      ))}
                      {selectedCourse.exams.length === 0 && <p className="text-sm text-gray-300 dark:text-gray-600 italic text-center py-4">No milestones scheduled.</p>}
                   </div>
                </div>

                {/* Syllabus Checklist (Materials) */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                         <ListTodo className="w-5 h-5 text-emerald-500" /> Syllabus Checklist
                      </h4>
                      <button 
                        onClick={() => setShowAddMaterial(!showAddMaterial)}
                        className={cn("p-2 rounded-xl transition-all", showAddMaterial ? "bg-black dark:bg-indigo-600 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white")}
                      >
                         {showAddMaterial ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </button>
                   </div>

                   <AnimatePresence>
                     {showAddMaterial && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 space-y-3 overflow-hidden">
                          <input 
                            placeholder="Topic title..." 
                            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white p-3 rounded-xl text-sm font-medium outline-none"
                            value={newMaterialTitle}
                            onChange={e => setNewMaterialTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addMaterial(selectedCourse.id)}
                          />
                          <button onClick={() => addMaterial(selectedCourse.id)} className="w-full py-3 bg-black dark:bg-indigo-600 text-white rounded-xl font-bold text-sm">Add Topic</button>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   <div className="space-y-3">
                      {selectedCourse.materials.map(material => (
                        <div key={material.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all">
                           <div 
                             className="flex items-center gap-3 cursor-pointer flex-1"
                             onClick={() => toggleMaterial(selectedCourse.id, material.id)}
                           >
                              <div className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                material.completed ? "bg-black dark:bg-indigo-600 border-black dark:border-indigo-600 text-white" : "border-gray-200 dark:border-gray-700"
                              )}>
                                 {material.completed && <CheckCircle2 className="w-4 h-4" />}
                              </div>
                              <span className={cn("text-sm font-medium transition-colors", material.completed ? "text-gray-400 dark:text-gray-600 line-through" : "text-gray-700 dark:text-gray-300")}>{material.title}</span>
                           </div>
                           <button 
                             onClick={() => setCourses(courses.map(c => c.id === selectedCourse.id ? { ...c, materials: c.materials.filter(m => m.id !== material.id) } : c))}
                             className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all"
                           >
                              <X className="w-4 h-4" />
                           </button>
                        </div>
                      ))}
                      {selectedCourse.materials.length === 0 && <p className="text-sm text-gray-300 dark:text-gray-600 italic text-center py-4">Add your syllabus topics here.</p>}
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="lg:col-span-3 flex items-center justify-center h-[500px] border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
             <div className="text-center">
                <GraduationCap className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                <h3 className="font-bold text-gray-400 dark:text-gray-600">Select a course from the sidebar to begin managing your studies.</h3>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoalsView({ 
  goals, 
  setGoals, 
  onDelete, 
  subscriptionTier = 'Free', 
  setActiveTab,
  habits,
  setHabits,
  tasks,
  setTasks,
  studyCourses,
  setStudyCourses
}: { 
  goals: Goal[], 
  setGoals: (g: Goal[]) => void, 
  onDelete: (id: string) => void, 
  subscriptionTier?: string, 
  setActiveTab?: (t: string) => void,
  habits: Habit[],
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>,
  tasks: Task[],
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  studyCourses: StudyCourse[],
  setStudyCourses: React.Dispatch<React.SetStateAction<StudyCourse[]>>
}) {
  const [goalsTab, setGoalsTab] = useState<'board' | 'career'>('board');
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: GoalType.SHORT, date: '' });
  const [showLimitModal, setShowLimitModal] = useState(false);

  const addGoal = () => {
    if (!newGoal.title || !newGoal.date) return;
    if (subscriptionTier === 'Free' && goals.length >= 3) {
      setShowLimitModal(true);
      return;
    }
    const g: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGoal.title,
      type: newGoal.type,
      progress: 0,
      targetDate: newGoal.date
    };
    setGoals([...goals, g]);
    setNewGoal({ title: '', type: GoalType.SHORT, date: '' });
    setShowAdd(false);
  };

  const updateProgress = (id: string, delta: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, progress: Math.max(0, Math.min(100, g.progress + delta)) } : g));
  };

  return (
    <div className="space-y-8">
      {/* Visual Sub Tabs Segment Navigator for Career and Goal Board */}
      <div className="flex bg-gray-50 dark:bg-gray-950 p-1.5 rounded-2xl max-w-sm border border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setGoalsTab('board')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            goalsTab === 'board'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-150 dark:border-gray-800'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Target className="w-4 h-4 text-indigo-500" /> Goal Board
        </button>
        <button
          onClick={() => setGoalsTab('career')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative cursor-pointer ${
            goalsTab === 'career'
              ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-150 dark:border-gray-800'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-500" /> Career Trajectory
        </button>
      </div>

      {goalsTab === 'career' ? (
        <CareerPlannerView 
          habits={habits}
          setHabits={setHabits}
          tasks={tasks}
          setTasks={setTasks}
          goals={goals}
          setGoals={setGoals}
          studyCourses={studyCourses}
          setStudyCourses={setStudyCourses}
        />
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold dark:text-white">Goal Architecture</h2>
              <p className="text-gray-500 dark:text-gray-400">Manual tracking for long-term vision.</p>
            </div>
            <button 
              onClick={() => {
                if (subscriptionTier === 'Free' && goals.length >= 3) {
                  setShowLimitModal(true);
                } else {
                  setShowAdd(true);
                }
              }}
              className="bg-black dark:bg-indigo-600 text-white p-3 rounded-2xl hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

      {subscriptionTier === 'Free' && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-4 rounded-2xl border border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
            <span>You are currently managing <strong>{goals.length} of 3 active goals</strong> under standard limit rules. Upgrade now to structure infinite goals, milestones, and roadmaps.</span>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab('pricing')} 
            className="underline font-black uppercase text-[10px] tracking-wider hover:text-indigo-900 dark:hover:text-white shrink-0"
          >
            Upgrade App &rarr;
          </button>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 border border-indigo-150 dark:border-gray-800 shadow-2xl space-y-6 text-center relative"
          >
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black dark:text-white">Vision Milestone Limit Reached</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Your current <span className="font-extrabold text-indigo-600 dark:text-indigo-400">Free Tier</span> supports up to <span className="font-black text-gray-800 dark:text-gray-200">3 active vision goals</span>. Upgrade to unlock unlimited goals, progress metrics, and timeline projection analytics.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setShowLimitModal(false);
                  if (setActiveTab) setActiveTab('pricing');
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                Upgrade to Pro Space ⚡
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl transition-all text-xs"
              >
                Stay on Free version
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border-2 border-black dark:border-indigo-600 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Goal Title</label>
              <input 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm font-medium outline-none" 
                placeholder="e.g. Run a Marathon" 
                value={newGoal.title}
                onChange={e => setNewGoal({...newGoal, title: e.target.value})}
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Term</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm font-medium outline-none appearance-none"
                value={newGoal.type}
                onChange={e => setNewGoal({...newGoal, type: e.target.value as GoalType})}
              >
                <option value={GoalType.SHORT} className="bg-white dark:bg-gray-900">Short-term</option>
                <option value={GoalType.MEDIUM} className="bg-white dark:bg-gray-900">Medium-term</option>
                <option value={GoalType.LONG} className="bg-white dark:bg-gray-900">Long-term</option>
              </select>
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Target Date</label>
              <input 
                type="date"
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm font-medium outline-none"
                value={newGoal.date}
                onChange={e => setNewGoal({...newGoal, date: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={addGoal} className="bg-black dark:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Add</button>
              <button onClick={() => setShowAdd(false)} className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-6 py-2 rounded-xl font-bold text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[GoalType.SHORT, GoalType.MEDIUM, GoalType.LONG].map(type => (
          <div key={type} className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{type}</h3>
            <div className="space-y-4">
              {goals.filter(g => g.type === type).map(goal => (
                <div key={goal.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-lg leading-tight dark:text-white">{goal.title}</h4>
                    <X 
                      className="w-4 h-4 text-gray-300 dark:text-gray-600 cursor-pointer hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" 
                      onClick={() => {
                        onDelete(goal.id);
                        setGoals(goals.filter(g => g.id !== goal.id));
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                    <span className="text-sm font-mono font-bold dark:text-white">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 dark:bg-purple-600 transition-all duration-500" style={{ width: `${goal.progress}%` }}></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => updateProgress(goal.id, -10)} className="flex-1 py-1 px-2 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-gray-700">-10%</button>
                    <button onClick={() => updateProgress(goal.id, 10)} className="flex-1 py-1 px-2 bg-black dark:bg-indigo-600 text-white rounded-lg text-[10px] font-bold">+10%</button>
                  </div>
                </div>
              ))}
              {goals.filter(g => g.type === type).length === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs font-bold uppercase tracking-widest">
                   No {type} Goals
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
      )}
    </div>
  );
}

function TimetableView({ entries, setEntries, onDelete, theme }: { entries: TimetableEntry[], setEntries: (e: TimetableEntry[]) => void, onDelete: (id: string) => void, theme: 'light' | 'dark' }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', type: TimetableType.WEEKLY, date: '' });

  const addEntry = () => {
    if (!newEntry.title || !newEntry.date) return;
    const e: TimetableEntry = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEntry.title,
      type: newEntry.type,
      date: newEntry.date,
      color: ['bg-cyan-500', 'bg-indigo-500', 'bg-rose-500', 'bg-emerald-500'][Math.floor(Math.random() * 4)]
    };
    setEntries([...entries, e]);
    setNewEntry({ title: '', type: TimetableType.WEEKLY, date: '' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Life Timeline</h2>
          <p className="text-gray-500 dark:text-gray-400">Visualize your path across weeks, months, and years.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-black dark:bg-indigo-600 text-white p-3 rounded-2xl hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border-2 border-black dark:border-indigo-600 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Event/Milestone</label>
              <input 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm font-medium outline-none" 
                placeholder="e.g. Vacation, Product Launch" 
                value={newEntry.title}
                onChange={e => setNewEntry({...newEntry, title: e.target.value})}
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">View</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm font-medium outline-none appearance-none"
                value={newEntry.type}
                onChange={e => setNewEntry({...newEntry, type: e.target.value as TimetableType})}
              >
                <option value={TimetableType.WEEKLY} className="bg-white dark:bg-gray-900">Weekly</option>
                <option value={TimetableType.MONTHLY} className="bg-white dark:bg-gray-900">Monthly</option>
                <option value={TimetableType.YEARLY} className="bg-white dark:bg-gray-900">Yearly</option>
              </select>
            </div>
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Date</label>
              <input 
                type="date"
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-2 text-sm font-medium outline-none"
                value={newEntry.date}
                onChange={e => setNewEntry({...newEntry, date: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={addEntry} className="bg-black dark:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm">Schedule</button>
              <button onClick={() => setShowAdd(false)} className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-6 py-2 rounded-xl font-bold text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[TimetableType.WEEKLY, TimetableType.MONTHLY, TimetableType.YEARLY].map(type => (
          <div key={type} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 min-h-[400px]">
            <h3 className="font-bold text-xl mb-6 dark:text-white">{type} Roadmap</h3>
            <div className="space-y-4">
              {entries.filter(e => e.type === type).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(entry => (
                <div key={entry.id} className="group relative flex gap-4">
                   <div className="flex flex-col items-center">
                     <div className={cn("w-3 h-3 rounded-full mt-1.5 shrink-0", entry.color)}></div>
                     <div className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-800 group-last:hidden"></div>
                   </div>
                   <div className="pb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{new Date(entry.date).toLocaleDateString()}</span>
                        <X 
                          className="w-3 h-3 text-gray-300 dark:text-gray-600 cursor-pointer hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" 
                          onClick={() => {
                            onDelete(entry.id);
                            setEntries(entries.filter(e => e.id !== entry.id));
                          }}
                        />
                      </div>
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{entry.title}</p>
                   </div>
                </div>
              ))}
              {entries.filter(e => e.type === type).length === 0 && (
                <div className="text-center py-12">
                   <Calendar className="w-8 h-8 text-gray-100 dark:text-gray-800 mx-auto mb-3" />
                   <p className="text-xs text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest">Nothing scheduled</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div 
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-6"
      >
        <LayoutDashboard className="w-12 h-12 text-gray-400 dark:text-gray-500" />
      </motion.div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name} Center</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
        We are tailoring the optimal structure for your {name.toLowerCase()} journey. 
        This module will feature deep integration with your active habits and metrics.
      </p>
      <div className="mt-10 flex gap-4">
        <button className="bg-black dark:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity">
          Initialize Module
        </button>
        <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-black dark:text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          View Roadmap
        </button>
      </div>
      
      <div className="mt-12 grid grid-cols-3 gap-8 w-full max-w-xl opacity-20 dark:opacity-10 pointer-events-none">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
}

function AboutView() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        {/* Header Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
            <Info className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black dark:text-white tracking-tight">About WrindhaOS</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            An all-in-one productivity platform built to help students, professionals, UPSC aspirants, fitness enthusiasts, and goal-oriented individuals manage their daily lives efficiently.
          </p>
        </div>

        {/* Dynamic Grid: Mission & Bullets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] border border-gray-150 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3.5 py-1.5 rounded-full border border-indigo-100/50 dark:border-indigo-900/50">Our Mission</span>
              <h2 className="text-2xl font-bold dark:text-white pt-2">Beyond Limits. Built for Future.</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Our mission is to simplify productivity and help users achieve consistency, focus, and growth. We believe that by providing robust, seamless utilities, we can help reduce the planning friction so you can invest fully in raw action and consistency.
              </p>
            </div>
            
            {/* Founder details in card */}
            <div className="border-t border-gray-100 dark:border-gray-800/80 pt-6 mt-8 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-sm uppercase">
                KG
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Founder</p>
                <p className="text-sm font-bold dark:text-white">Kalyan Gongidi</p>
                <a href="mailto:wrindhaos@gmail.com" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">wrindhaos@gmail.com</a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] border border-gray-150 dark:border-gray-800/80 shadow-sm">
            <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">What Platform Offers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Habit Tracking', icon: Flame, color: 'text-orange-500' },
                { name: 'Expense Tracking', icon: Wallet, color: 'text-emerald-500' },
                { name: 'Goal Management', icon: Target, color: 'text-purple-500' },
                { name: 'Study Planning', icon: GraduationCap, color: 'text-indigo-500' },
                { name: 'Timetable Generation', icon: Calendar, color: 'text-cyan-500' },
                { name: 'Eisenhower Matrix', icon: Brain, color: 'text-pink-500' },
                { name: 'Weekly, Monthly & Yearly Analytics', icon: BarChart3, color: 'text-indigo-500' },
                { name: 'Productivity Blogs and Guides', icon: FileText, color: 'text-rose-500' }
              ].map(item => (
                <div key={item.name} className="flex items-center gap-3.5 p-3.5 bg-gray-50 dark:bg-gray-850/50 rounded-2xl border border-gray-100/50 dark:border-gray-800/30">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xs shrink-0 border border-gray-100 dark:border-gray-700">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-xs font-bold dark:text-gray-300 leading-tight">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ContactView() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
            <MessageCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black dark:text-white tracking-tight">Contact Us</h1>
          <h2 className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">Get in Touch with WrindhaOS</h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            We're here to help you achieve your goals and make the most of your WrindhaOS experience. Whether you have questions, feedback, feature suggestions, partnership inquiries, or need technical support, we'd love to hear from you.
          </p>
        </div>

        {/* Informational Cards Layout */}
        <div className="space-y-8">
          
          {/* Main Contact Info Callout */}
          <div className="bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-[2.5rem] border border-gray-150 dark:border-gray-800/80 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold dark:text-white text-gray-800">Contact Information</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="p-6 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:border-indigo-500/30 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Email Address</p>
                <a 
                  href="mailto:wrindhaos@gmail.com" 
                  className="text-lg font-black text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                >
                  wrindhaos@gmail.com
                </a>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800/50 hover:border-indigo-500/30 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Founder</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  Kalyan Gongidi
                </p>
              </div>
            </div>
          </div>

          {/* Grid Section for Subtopics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Technical Support */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-150 dark:border-gray-800/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base dark:text-white text-gray-800 font-sans">Support</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
                If you're experiencing any issues with your account, subscription, payments, or platform features, please contact our support team via email. We aim to respond to all inquiries as quickly as possible.
              </p>
            </div>

            {/* Feedback & Suggestions */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-150 dark:border-gray-800/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base dark:text-white text-gray-800 font-sans">Feedback & Suggestions</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
                Your feedback helps us improve WrindhaOS. If you have ideas for new features, improvements, or would like to share your experience, feel free to reach out.
              </p>
            </div>

            {/* Business Partnerships */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-150 dark:border-gray-800/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-cyan-600 dark:text-cyan-400">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base dark:text-white text-gray-800 font-sans">Business & Partnership Inquiries</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
                For collaborations, partnerships, promotional opportunities, or business-related discussions, please contact us through our official email address.
              </p>
            </div>

            {/* Response Time */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-150 dark:border-gray-800/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-base dark:text-white text-gray-800 font-sans">Response Time</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
                We strive to respond to all emails within <span className="text-indigo-600 dark:text-indigo-400 font-extrabold font-mono">24–48</span> business hours.
              </p>
            </div>

          </div>

          {/* Aesthetic Footer/Closing statement */}
          <div className="p-8 sm:p-10 bg-gradient-to-tr from-indigo-50/50 to-emerald-50/25 dark:from-indigo-950/20 dark:to-emerald-950/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-950/50 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Thank you for choosing WrindhaOS. We appreciate your trust and support as we continue building a platform that helps people manage goals, careers, productivity, and personal growth.
            </p>
            <p className="text-base font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              WrindhaOS – Organize Your Goals. Shape Your Future.
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

function PrivacyView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-150 dark:border-gray-800/85 shadow-sm space-y-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30">
            <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black dark:text-white">Privacy Policy</h1>
            <p className="text-gray-400 font-medium text-xs uppercase tracking-wider mt-1">Welcome to WrindhaOS. Your privacy is important to us.</p>
          </div>
        </div>

        {/* Section 1: Collection */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            Information We Collect
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            We may collect the following information to facilitate your productivity workflows on WrindhaOS:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
            {[
              "Name",
              "Email Address",
              "Account Information",
              "Usage Data",
              "Subscription Information",
              "Payment Details (processed securely through third-party payment providers)"
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Use */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            How We Use Your Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            We use the collected details to consistently expand, safeguard, and deliver efficient products:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
            {[
              "Provide and maintain our services",
              "Improve user experience",
              "Manage subscriptions",
              "Send important updates and notifications",
              "Respond to customer support requests"
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Security */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            Data Security
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            We implement reasonable security measures to protect user information from unauthorized access, disclosure, modify, or misuse.
          </p>
        </section>

        {/* Section 4: Third-parties */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            Third-Party Services
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            WrindhaOS may use third-party services such as payment gateways, analytics providers, and hosting services. These providers may have their own privacy policies. We encourage users to inspect external policies closely.
          </p>
        </section>

        {/* Section 5: Data Sharing */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            Data Sharing
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm col-span-2">
            We do not sell, rent, or trade your personal information to third parties under any circumstances.
          </p>
        </section>

        {/* Section 6: Changes */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            Changes to This Policy
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm text-justify">
            We may update this Privacy Policy from time to time. Changes will be posted explicitly on this page. By continuing usage, you recognize the latest posted changes.
          </p>
        </section>

        {/* Signoff / Contact information */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
          <div>
            <p className="font-bold dark:text-white">Founder: Kalyan Gongidi</p>
            <p className="text-gray-400 mt-0.5">Email: wrindhaos@gmail.com</p>
          </div>
          <a href="mailto:wrindhaos@gmail.com" className="px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl border border-gray-200 dark:border-gray-850 transition-colors">
            Contact Founder
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function DisclaimerView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50/50 dark:bg-amber-950/15 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-amber-200/50 dark:border-amber-900/30 space-y-10"
      >
        <div className="flex items-center gap-6 pb-6 border-b border-amber-200/30 dark:border-amber-900/20">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-amber-950 dark:text-amber-100">Disclaimer</h1>
            <p className="text-xs uppercase tracking-wider text-amber-800 dark:text-amber-400 font-black mt-1 font-mono">Productivity & Informational Boundaries</p>
          </div>
        </div>

        <div className="space-y-6 text-amber-900/80 dark:text-amber-200/70 leading-relaxed text-sm sm:text-base text-justify">
          <p>
            WrindhaOS provides productivity, planning, habit tracking, study management, and personal organization tools for informational and organizational purposes only.
          </p>

          <p className="font-bold border-l-4 border-amber-500 pl-4 py-1 dark:text-amber-300">
            We do not guarantee:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
            {[
              "Academic success",
              "Examination results",
              "Career outcomes",
              "Financial gains",
              "Personal achievements"
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-amber-900/90 dark:text-amber-350">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                {item}
              </li>
            ))}
          </ul>

          <p className="pt-2 text-sm">
            Results depend strictly on individual effort and circumstances. Users are solely and strictly responsible for their decisions, actions, and daily study outputs.
          </p>
        </div>

        {/* Footer info lockup */}
        <div className="pt-8 border-t border-amber-200/30 dark:border-amber-900/20 text-xs">
          <p className="font-bold text-amber-950 dark:text-amber-200">Founder: Kalyan Gongidi</p>
          <span className="text-amber-800/80 dark:text-amber-400/80">Contact Email: wrindhaos@gmail.com</span>
        </div>
      </motion.div>
    </div>
  );
}

function TermsView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-200/60 dark:border-gray-800 shadow-sm space-y-12"
      >
        <div className="text-center">
          <Scale className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-black dark:text-white tracking-tight">Terms of Use</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium uppercase tracking-widest text-[9px] font-mono">By accessing and using WrindhaOS, you agree to comply with these Terms of Use.</p>
        </div>

        <div className="space-y-6">
          {/* Item 1 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h3 className="font-extrabold text-base dark:text-white flex items-center gap-2 mb-2">
              <span className="text-indigo-600 dark:text-indigo-400">01.</span> Account Responsibilities
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">Users must strictly fulfill these commitments:</p>
            <ul className="space-y-2 pl-2">
              {[
                "Provide accurate, integral information during registration.",
                "Maintain the precise security of their account credentials.",
                "Be responsible for all activities executed under their registered account."
              ].map(bullet => (
                <li key={bullet} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-indigo-500 font-bold mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Item 2 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h3 className="font-extrabold text-base dark:text-white flex items-center gap-2 mb-2">
              <span className="text-indigo-600 dark:text-indigo-400">02.</span> Acceptable Use
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">You explicitly agree not to perform any of the following restricted actions:</p>
            <ul className="space-y-2 pl-2">
              {[
                "Violate any applicable local, national, or international laws.",
                "Attempt unauthorized access to our core database systems, user nodes, or API servers.",
                "Distribute harmful software, malware, viruses, or malicious script content.",
                "Abuse, exploit, spam, or otherwise misuse the productivity platform."
              ].map(bullet => (
                <li key={bullet} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Item 3 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h3 className="font-extrabold text-base dark:text-white flex items-center gap-2 mb-2">
              <span className="text-indigo-600 dark:text-indigo-400">03.</span> Intellectual Property
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              All content, core features, interactive designs, branding assets, logos, databases, and software algorithms associated with WrindhaOS are the exclusive property of WrindhaOS unless otherwise explicitly stated.
            </p>
          </div>

          {/* Item 4 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h3 className="font-extrabold text-base dark:text-white flex items-center gap-2 mb-2">
              <span className="text-indigo-600 dark:text-indigo-400">04.</span> Subscription Services
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Access to premium, unrestricted analytic tools and modules requires a valid, active subscription. Feature rosters and subscription benefits may change over time to align with software development improvements.
            </p>
          </div>

          {/* Item 5 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h3 className="font-extrabold text-base dark:text-white flex items-center gap-2 mb-2">
              <span className="text-indigo-600 dark:text-indigo-400">05.</span> Account Suspension
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              WrindhaOS reserves the absolute right to suspend, freeze, or terminate account nodes and subscription privileges that violate any of these established terms without delay.
            </p>
          </div>

          {/* Item 6 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h3 className="font-extrabold text-base dark:text-white flex items-center gap-2 mb-2">
              <span className="text-indigo-600 dark:text-indigo-400">06.</span> Limitation of Liability
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              WrindhaOS and its founders shall not be held liable for any indirect, incidental, or consequential damages arising from the use or inability to use our productivity suite.
            </p>
          </div>
        </div>

        {/* Founder credentials bottom signature */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
          <div>
            <p className="font-bold dark:text-white">Founder: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Kalyan Gongidi</span></p>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5">Email: <a href="mailto:wrindhaos@gmail.com" className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold font-mono">wrindhaos@gmail.com</a></p>
          </div>
          <p className="text-gray-400 dark:text-gray-500 max-w-xs text-[10px] text-right italic font-sans">
            "By continuing to access and use the app, you unconditionally pledge compliance."
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function RefundView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-200/60 dark:border-gray-800 shadow-sm space-y-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-rose-100/50 dark:border-rose-900/30">
            <RotateCcw className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black dark:text-white">Refund Policy</h1>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mt-1 font-mono">Thank you for subscribing to WrindhaOS.</p>
          </div>
        </div>

        {/* Section 1: Refund Eligibility Cases */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full animate-pulse"></div>
            Refund Eligibility
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            Refunds may be considered to restore user balances only under the following explicit criteria:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: "Duplicate Payment", desc: "Two or more charges made concurrently for the same subscription period." },
              { title: "Incorrect Billing Amount", desc: "System errors resulting in billing rates deviating from published prices." },
              { title: "Technical Issues", desc: "Severe faults preventing premium tier resource provisioning despite successful payment." }
            ].map((elig, i) => (
              <div key={i} className="p-5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 font-mono">Case {i + 1}</span>
                <h4 className="font-black dark:text-emerald-400 text-sm">{elig.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{elig.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Non Eligibility Cases */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
            Non-Refundable Cases
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            Due to digital delivery, refunds will generally not be provided for circumstances involving:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
            {[
              "Change of mind after active feature usage.",
              "Partial or localized usage of the paid subscription period.",
              "Failure to trigger the cancel action before recurring renewal dates.",
              "General user dissatisfaction not associated directly with systematic technical issues."
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Timeline & Process */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h4 className="font-extrabold text-sm dark:text-white mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Refund Request Period
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              All formal refund queries must be submitted within <span className="font-bold text-gray-900 dark:text-white">7 days</span> of the initial payment transaction date.
            </p>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <h4 className="font-extrabold text-sm dark:text-white mb-2 flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-gray-400 animate-spin-slow" /> Approved Processing
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Approved cases will be returned to the original checkout payment method within <span className="font-bold text-gray-900 dark:text-white">7–14 business days</span>.
            </p>
          </div>
        </section>

        {/* Contact info element */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
          <div>
            <p className="font-bold dark:text-white">Founder: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Kalyan Gongidi</span></p>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5">Email / Support Ticket: <a href="mailto:wrindhaos@gmail.com" className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold font-mono">wrindhaos@gmail.com</a></p>
          </div>
          <a href="mailto:wrindhaos@gmail.com" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow transition-transform active:scale-95 text-center">
            Submit Refund Request
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function CancellationView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-200/60 dark:border-gray-800 shadow-sm space-y-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-red-100/50 dark:border-red-900/30">
            <Ban className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black dark:text-white">Cancellation Policy</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider mt-1">Manage, pause, or end subscriptions at any time.</p>
          </div>
        </div>

        {/* Core Bullet Cards */}
        <div className="space-y-4">
          {[
            { title: "Cancel at Your Discretion", desc: "Users may cancel their registered subscription at any time. There are no locking periods or cancellation fees.", icon: Handshake },
            { title: "No Future Recurring Payments", desc: "Cancellation stops subsequent automated payments and cycles instantly.", icon: Ban },
            { title: "Retain Workspace Access", desc: "Access to all premium features and custom analytics remains fully active until your current active billing period ends.", icon: Clock },
            { title: "No Prorated Fees Return", desc: "No partial or prorated refunds will be issued for unused fragments of active subscription billing periods.", icon: RotateCcw },
            { title: "Post Expiry Adjustments", desc: "Following actual subscription expiry, accounts will return to standard free tier limits until a renewal is completed.", icon: ShieldAlert }
          ].map((item, index) => (
            <div key={index} className="flex gap-5 p-5 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100/50 dark:border-gray-800/20 hover:border-indigo-600/20 dark:hover:border-indigo-400/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800 select-none">
                <item.icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm dark:text-white">{item.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Founder signature info */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <p className="font-bold">Founder: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Kalyan Gongidi</span></p>
          <span className="mt-0.5 block">Email Contact: <a href="mailto:wrindhaos@gmail.com" className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold font-mono">wrindhaos@gmail.com</a></span>
        </div>
      </motion.div>
    </div>
  );
}

// --- BlogsView Component ---
function BlogsView({ blogs, setBlogs, isAdmin }: { blogs: Blog[], setBlogs: (b: Blog[]) => void, isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Productivity");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = ["All", "Productivity", "Habits", "Study", "Finance", "Goals"];
  const [activeCategory, setActiveCategory] = useState("All");

  const addBlog = () => {
    if (!isAdmin) return;
    if (!title.trim() || !content.trim()) return;
    const newBlog: Blog = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      content,
      author: "Admin",
      category,
      imageUrl: imageUrl.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    setBlogs([newBlog, ...blogs]);
    setTitle("");
    setContent("");
    setImageUrl("");
    setShowAdd(false);
  };

  const deleteBlog = (id: string) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to delete this blog post?")) {
      setBlogs(blogs.filter(b => b.id !== id));
      if (selectedBlog?.id === id) {
        setSelectedBlog(null);
      }
    }
  };

  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All" || b.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Blogs & Guides</h2>
          <p className="text-gray-500 dark:text-gray-400">Expand your mind. Master your routines.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="bg-black dark:bg-indigo-600 hover:opacity-95 text-white px-5 py-3 rounded-2xl font-bold text-sm tracking-wide shadow-lg flex items-center gap-2 transition-transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {showAdd ? "Close Writer" : "Add New Blog"}
          </button>
        )}
      </div>

      {isAdmin && showAdd && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-black dark:border-indigo-600/30 shadow-xl space-y-4"
        >
          <h3 className="text-lg font-black dark:text-white">Publish a Blog Post</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Blog Title</label>
              <input 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/50" 
                placeholder="Title..." 
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Category</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/50 grayscale-0"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Productivity">Productivity</option>
                <option value="Habits">Habits</option>
                <option value="Study">Study</option>
                <option value="Finance">Finance</option>
                <option value="Goals">Goals</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cover Image URL (Optional)</label>
            <input 
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/50 animate-none" 
              placeholder="https://images.unsplash.com/..." 
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Content</label>
            <textarea 
              rows={5}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/50 resize-none" 
              placeholder="Type your insights and knowledge here..." 
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setShowAdd(false)} 
              className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-5 py-2.5 rounded-xl font-bold text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={addBlog} 
              className="bg-black dark:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm"
            >
              Publish
            </button>
          </div>
        </motion.div>
      )}

      {/* Filter Category Row & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl font-semibold text-xs tracking-wide transition-all uppercase",
                activeCategory === cat 
                  ? "bg-black dark:bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                  : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50/50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          className="w-full md:w-64 bg-white dark:bg-gray-900 text-sm font-medium rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2.5 dark:text-white outline-none focus:ring-2 ring-indigo-500/50"
          placeholder="Search blogs..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {selectedBlog ? (
        <motion.div 
          layoutId={`blog-card-${selectedBlog.id}`} 
          className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 md:p-12 shadow-md space-y-6"
        >
          <button 
            onClick={() => setSelectedBlog(null)}
            className="text-gray-400 hover:text-black dark:hover:text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-4 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl w-fit"
          >
            ← Back to All Blogs
          </button>
          {selectedBlog.imageUrl && (
            <div className="w-full max-h-[350px] overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800">
              <img src={selectedBlog.imageUrl} alt={selectedBlog.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-4">
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full">
              {selectedBlog.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-black dark:text-white leading-tight">{selectedBlog.title}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
              <span>By {selectedBlog.author}</span>
              <span>•</span>
              <span>{new Date(selectedBlog.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed text-base pt-4 border-t border-gray-50 dark:border-gray-800">
              {selectedBlog.content}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map(blog => (
            <motion.div 
              whileHover={{ y: -4 }}
              key={blog.id} 
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div>
                {blog.imageUrl ? (
                  <div className="h-48 overflow-hidden bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 relative">
                    <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover" />
                    <span className="absolute top-4 left-4 bg-black/75 text-white font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {blog.category}
                    </span>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-indigo-500/10 to-rose-500/10 dark:from-indigo-600/20 dark:to-rose-600/10 relative border-b border-gray-100 dark:border-gray-800 flex items-center justify-center p-6">
                    <BookOpen className="w-12 h-12 text-gray-400" />
                    <span className="absolute top-4 left-4 bg-white/90 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                      {blog.category}
                    </span>
                  </div>
                )}
                <div className="p-6 space-y-3">
                  <h3 className="font-bold text-lg dark:text-white line-clamp-2 leading-snug">{blog.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">{blog.content}</p>
                </div>
              </div>
              <div className="p-6 pt-0 flex justify-between items-center border-t border-gray-50/50 dark:border-gray-800/40">
                <button 
                  onClick={() => setSelectedBlog(blog)}
                  className="font-bold text-xs uppercase tracking-widest text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Read Article →
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => deleteBlog(blog.id)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {filteredBlogs.length === 0 && (
            <div className="col-span-full bg-white dark:bg-gray-900 rounded-3xl p-12 text-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800 font-medium">
              No articles found matching the filters. Check back later!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PricingViewProps {
  plans: PricingPlan[];
  subscriptionTier: string;
  onUpgrade: (userId: string, tier: string, habitsLimit: number, amountPaid?: string, planId?: string, paymentMethod?: string) => Promise<void>;
  onCancelSubscription?: (userId: string) => Promise<void>;
  session: any;
  setActiveTab: (tab: string) => void;
  orders?: any[];
  trialStartDateStr: string;
  trialEndDateStr: string;
  nowSecure: number;
}

function PricingView({ plans, subscriptionTier, onUpgrade, onCancelSubscription, session, setActiveTab, orders = [], trialStartDateStr, trialEndDateStr, nowSecure }: PricingViewProps) {
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    setCancelling(true);
    setPaymentError(null);
    try {
      if (onCancelSubscription) {
        const userId = session?.user?.id || 'local-user';
        await onCancelSubscription(userId);
      }
      setHasPaidLocal(false);
      setShowCancelModal(false);
      setSuccessMsg("Successfully cancelled your subscription! Your active membership has been ended, and your workspace limits have been updated.");
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setPaymentError(err.message || "Failed to cancel subscription. Please contact support.");
    } finally {
      setCancelling(false);
    }
  };

  // Reactively mount Razorpay SDK script Client-Side
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // SaaS states
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [autoRenew, setAutoRenew] = useState<boolean>(() => {
    return localStorage.getItem('wrindha_autorenew') !== 'false';
  });

  const trialStart = trialStartDateStr;
  const trialEnd = trialEndDateStr;

  const [hasPaidLocal, setHasPaidLocal] = useState<boolean>(() => {
    return localStorage.getItem('wrindha_has_paid') === 'true';
  });

  const [typedCoupon, setTypedCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    setAppliedCoupon(null);
    setTypedCoupon('');
    setCouponError(null);
  }, [billingPeriod, checkoutPlan?.id]);

  const handleApplyCoupon = async () => {
    const code = typedCoupon.trim().toUpperCase();
    if (!code) {
      setCouponError("Please type a coupon code.");
      return;
    }
    if (!checkoutPlan) return;

    setValidatingCoupon(true);
    setCouponError(null);

    const rawPrice = parseFloat(checkoutPlan.price.replace(/[^\d.]/g, ''));
    const originalPrice = billingPeriod === 'yearly' 
      ? Math.floor(rawPrice * 12 * 0.8) 
      : rawPrice;

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: code,
          originalPrice
        })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data);
        setSuccessMsg(`Coupon "${data.couponCode}" successfully applied! ₹${data.discountAmount} saved.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setCouponError(data.message || "Invalid or inactive coupon code.");
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponError("Error checking coupon validation with API.");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setTypedCoupon('');
    setCouponError(null);
  };

  const trialStartDate = new Date(trialStart);
  const trialEndDate = new Date(trialEnd);
  const msLeft = Math.max(0, trialEndDate.getTime() - nowSecure);
  const elapsedMs = Math.max(0, nowSecure - trialStartDate.getTime());
  const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const trialDaysLeft = Math.max(0, 5 - daysElapsed);
  const isTrialActive = msLeft > 0;

  const trialTimeLeftText = (() => {
    if (msLeft <= 0) return "0d 0h 0m";
    const seconds = Math.floor(msLeft / 1000);
    const m = Math.floor((seconds % 3600) / 60);
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const d = Math.floor(seconds / (3600 * 24));
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
  })();

  const cancellationInfo = (() => {
    if (!subscriptionTier || !subscriptionTier.includes('Cancelled:')) {
      return { isCancelled: false, expiryDate: null };
    }
    try {
      const parts = subscriptionTier.split('Cancelled:');
      const expiryStr = parts[1];
      return { isCancelled: true, expiryDate: new Date(expiryStr) };
    } catch (e) {
      return { isCancelled: true, expiryDate: new Date(0) };
    }
  })();

  const isBillingPeriodActive = cancellationInfo.isCancelled && cancellationInfo.expiryDate
    ? cancellationInfo.expiryDate.getTime() > Date.now()
    : false;

  const parsedCleanTier = subscriptionTier.includes('Cancelled:') 
    ? 'premium' 
    : subscriptionTier.toLowerCase();

  const isAdmin = session?.user?.email === 'gongidikalyan08@gmail.com';

  const isPremiumPaid = (() => {
    if (isAdmin) return true;
    const isBasePremium = parsedCleanTier === 'premium' || 
                          parsedCleanTier === 'pro space' || 
                          parsedCleanTier === 'ultimate matrix' || 
                          parsedCleanTier === 'active' || 
                          hasPaidLocal;
    
    if (cancellationInfo.isCancelled) {
      return isBillingPeriodActive;
    }
    return isBasePremium;
  })();

  const hasActiveAccess = isAdmin || isPremiumPaid || isTrialActive;

  // Credit Card Form States
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<number>(0); // 0: details, 1: connecting, 2: processing, 3-success
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // UPI Form States
  const [payMethod, setPayMethod] = useState<'card' | 'upi'>('upi');
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'other'>('gpay');
  const [qrScanActive, setQrScanActive] = useState(false);

  const activePlan = plans.find(p => p.name.toLowerCase() === parsedCleanTier.toLowerCase());
  const effectiveTier = (subscriptionTier === 'Free' || subscriptionTier.includes('Cancelled:') || activePlan) ? (subscriptionTier.includes('Cancelled:') ? 'Premium' : subscriptionTier) : 'Free';

  // Format Card Number
  const handleCardNumberChange = (value: string) => {
    const rawVal = value.replace(/\s?/g, '').replace(/\D/g, '');
    const segments = [];
    for (let i = 0; i < rawVal.length && i < 16; i += 4) {
      segments.push(rawVal.substring(i, i + 4));
    }
    setCardNumber(segments.join(' '));
  };

  // Format Expiry Date
  const handleExpiryChange = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 2) {
      setCardExpiry(clean);
    } else {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    }
  };

  // Detect card brand
  const getCardBrand = (num: string) => {
    const raw = num.replace(/\D/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (raw.startsWith('5')) return 'MasterCard';
    if (raw.startsWith('3')) return 'American Express';
    if (raw.startsWith('6')) return 'Discover';
    return 'Generic Card';
  };

  const toggleAutoRenew = () => {
    const nextVal = !autoRenew;
    setAutoRenew(nextVal);
    localStorage.setItem('wrindha_autorenew', String(nextVal));
  };

  // Real-time Razorpay Payment Flow Gateway Linker
  const processSecureCheckout = async () => {
    if (!checkoutPlan) return;

    if (!qrScanActive && (!upiId.trim() || !upiId.includes('@'))) {
      setPaymentError('Please enter a valid UPI ID (e.g., yourname@okaxis, name@paytm, or username@ybl) to authorize payment.');
      return;
    }

    setPaymentError(null);
    setCheckoutStep(1); // Connecting to secure pay session

    try {
      // Calculate precise plan pricing
      const rawPrice = parseFloat(checkoutPlan.price.replace(/[^\d.]/g, ''));
      const calculatedPrice = billingPeriod === 'yearly' 
        ? Math.floor(rawPrice * 12 * 0.8) 
        : rawPrice;

      const finalPriceToOrder = appliedCoupon ? appliedCoupon.payableAmount : calculatedPrice;

      // 1. Call custom server endpoint to initial Razorpay order session
      const orderResponse = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: checkoutPlan.name,
          amount: calculatedPrice,
          currency: "INR",
          couponCode: appliedCoupon ? appliedCoupon.couponCode : undefined
        })
      });

      if (!orderResponse.ok) {
        throw new Error("HTTP connection error preparing Razorpay subscription order.");
      }

      const orderData = await orderResponse.json();
      if (!orderData.success) {
        throw new Error(orderData.message || "Failed to create active payment order state.");
      }

      const currentUserId = session?.user?.id || "local-user";

      // 2. Determine authentic checkout vs high-fidelity design sandbox simulator
      if (!orderData.isSandbox && (window as any).Razorpay) {
        setCheckoutStep(2); // Initializing official overlay
        
        const rzpOptions = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Wrindha OS",
          description: `Upgrading to ${checkoutPlan.name} Subscription`,
          order_id: orderData.orderId,
          handler: async function (razorpayResponse: any) {
            setCheckoutStep(2); // Performing security webhook/signature verify
            try {
              const verifyResponse = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                  razorpay_order_id: razorpayResponse.razorpay_order_id,
                  razorpay_signature: razorpayResponse.razorpay_signature,
                  isSandbox: false,
                  couponCode: appliedCoupon ? appliedCoupon.couponCode : undefined,
                  userId: currentUserId,
                  userEmail: session?.user?.email || "sandbox@wrindha.com",
                  discountApplied: appliedCoupon ? appliedCoupon.discountAmount : 0,
                  paidAmount: finalPriceToOrder
                })
              });

              const verifyData = await verifyResponse.json();
              if (verifyData.success) {
                // Perform state persistence upgrades
                setUpgradingTo(checkoutPlan.id);
                await onUpgrade(
                  currentUserId, 
                  checkoutPlan.name, 
                  9999, 
                  `${finalPriceToOrder}`, 
                  checkoutPlan.id, 
                  `Razorpay Gateway (${razorpayResponse.razorpay_payment_id})`
                );
                setUpgradingTo(null);
                setCheckoutStep(3); // Upgraded successfully
                setSuccessMsg(`Congratulations! Upgraded successfully to ${checkoutPlan.name} [Paid via Razorpay Live Gateway]! Premium functions active. ✨`);
                setTimeout(() => setSuccessMsg(null), 6000);
              } else {
                throw new Error(verifyData.message || "Security authorization signature is invalid.");
              }
            } catch (err: any) {
              setPaymentError(err.message || "Razorpay Payment verification failure. Ledger transaction rejected.");
              setCheckoutStep(0);
            }
          },
          prefill: {
            name: session?.user?.user_metadata?.full_name || "Productive Student",
            email: session?.user?.email || "sandbox@wrindha.com"
          },
          theme: {
            color: "#3399cc"
          },
          modal: {
            ondismiss: function () {
              setCheckoutStep(0);
              setPaymentError("Razorpay transaction session cancelled by host.");
            }
          }
        };

        const razorInstance = new (window as any).Razorpay(rzpOptions);
        razorInstance.open();
      } else {
        // Safe embedded beautiful simulator for local iframe testing & fallback sandbox execution
        setCheckoutStep(2); // Remitting payment through simulated core
        setTimeout(async () => {
          try {
            const verifyResponse = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 9)}`,
                razorpay_order_id: orderData.orderId,
                razorpay_signature: "mock_checksum",
                isSandbox: true,
                couponCode: appliedCoupon ? appliedCoupon.couponCode : undefined,
                userId: currentUserId,
                userEmail: session?.user?.email || "sandbox@wrindha.com",
                discountApplied: appliedCoupon ? appliedCoupon.discountAmount : 0,
                paidAmount: finalPriceToOrder
              })
            });

            const verifyData = await verifyResponse.json();
            if (!verifyData.success) {
              throw new Error("Local sandbox webhook authorization error.");
            }

            // Persistence
            setUpgradingTo(checkoutPlan.id);
            const methodLabel = qrScanActive 
              ? 'Razorpay Sandbox (UPI QR Scanner)' 
              : `Razorpay Sandbox (UPI ID: ${selectedUpiApp.toUpperCase()}: ${upiId})`;

            await onUpgrade(currentUserId, checkoutPlan.name, 9999, `${finalPriceToOrder}`, checkoutPlan.id, methodLabel);
            setUpgradingTo(null);

            setCheckoutStep(3); // Perfect
            setSuccessMsg(`Congratulations! Upgraded successfully to ${checkoutPlan.name} [Paid ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} via Razorpay Sandbox]! Premium capabilities activated. ✨`);
            setTimeout(() => setSuccessMsg(null), 6000);
          } catch (err: any) {
            setPaymentError(err.message || 'Error processing simulated billing upgrade.');
            setCheckoutStep(0);
          }
        }, 1500);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Unable to establish secure Razorpay handshake checkout.');
      setCheckoutStep(0);
    }
  };

  // Helper payment details
  const latestOrder = orders[0];
  const nextRenewalDate = (() => {
    const date = latestOrder ? new Date(latestOrder.created_at) : new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString(undefined, { dateStyle: 'long' });
  })();

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-black dark:text-white flex items-center gap-3">
          <Award className="w-8 h-8 text-amber-500 animate-pulse" />
          Subscription Plans & Pricing
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Unlock full productivity capacity, customized databases, and advanced orchestration analytics.</p>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-3xl flex items-center gap-3"
        >
          <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="font-bold text-sm">{successMsg}</span>
        </motion.div>
      )}

      {/* Current Subscription Status Panel - Professional SaaS Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden group">
          <div className="space-y-2">
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
              SaaS Credentials
            </span>
            <h3 className="text-2xl font-black dark:text-white mt-2">
              {isAdmin 
                ? "Admin Workspace • Unrestricted System Access"
                : cancellationInfo.isCancelled 
                  ? "Premium OS (Cancelled)" 
                  : isPremiumPaid 
                    ? "Premium OS Lifetime Access" 
                    : isTrialActive 
                      ? `Active 5-Day Free Trial (${trialTimeLeftText} remaining)` 
                      : "Subscription Expired"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              {isAdmin 
                ? "You are logged in as the platform administrator (gongidikalyan08@gmail.com). You have absolute, unrestricted access to all features and modules across the entire ecosystem without any active subscription or billing requirements."
                : cancellationInfo.isCancelled 
                  ? `Your subscription has been cancelled, but your premium access remains fully active until your billing period ends on ${nextRenewalDate}. After this date, your workspace will be locked unless you renew.`
                  : isPremiumPaid 
                    ? "You have fully unlocked the unconstrained Wrindha Premium OS tracking. Absolute data backup, unlimited habits, tasks, studies and timetables active." 
                    : isTrialActive 
                      ? "You are currently enjoying your 5-day active trial of full premium workspace. No artificial limits or constraints are imposed. Secure your premium billing early to keep uninterrupted access!"
                      : "Your free trial has expired. Subscribe to Wrindha Premium below for unlimited habits, tasks, budget tracking, and timetables."}
            </p>
          </div>
          
          {(isPremiumPaid || isTrialActive) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800/50 w-full">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-400">Automatic renewal billing status</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full animate-ping",
                    cancellationInfo.isCancelled ? "bg-red-500" : autoRenew ? "bg-emerald-500" : "bg-orange-500"
                  )}></span>
                  <span className="text-xs font-black dark:text-white">
                    {cancellationInfo.isCancelled ? 'CANCELLED' : autoRenew ? 'ACTIVE (Charging Enabled)' : 'PAUSED'}
                  </span>
                  {!cancellationInfo.isCancelled && (
                    <button 
                      onClick={toggleAutoRenew}
                      className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[10px] font-bold uppercase rounded text-indigo-600 dark:text-indigo-400"
                    >
                      Toggle Billing
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-400">Next Scheduled Billed Cycle / Expiration</p>
                <p className="text-xs font-extrabold dark:text-white text-gray-800">
                  {cancellationInfo.isCancelled ? `Expires on ${nextRenewalDate}` : isPremiumPaid ? nextRenewalDate : "Trial access"}
                </p>
              </div>

              {isPremiumPaid && (
                <div className="sm:col-span-2 pt-4 border-t border-gray-50 dark:border-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-rose-505">Subscription Actions</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {cancellationInfo.isCancelled 
                        ? `This subscription will terminate on ${nextRenewalDate}. You can buy a plan below at any time to renew your subscription.` 
                        : "You can cancel your active Premium OS membership at any time. This will instantly revert your account back to standard baseline limits."}
                    </p>
                  </div>
                  {!cancellationInfo.isCancelled && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all border border-rose-100 dark:border-rose-900/30 shrink-0 select-none"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Registered mock wallet billing card */}
        <div className="p-8 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[2.5rem] shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CreditCard className="w-40 h-40" />
          </div>
          <div className="space-y-1.5 z-10">
            <span className="text-[9px] bg-white/20 text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              Registered Wallet
            </span>
            <h4 className="text-base font-black pt-2">Active Card Status</h4>
            <p className="text-xs text-indigo-200 leading-relaxed font-semibold">
              {!isPremiumPaid 
                ? "No active system checkout credential registered. Authorize premium plan checkout to enable secure wallet billing."
                : `Active Payment: VISA •••• 4242. Real-time updates and invoices dynamically update in Supabase orders ledger.`}
            </p>
          </div>
          
          <div className="pt-4 flex items-center justify-between text-xs font-bold border-t border-white/10 mt-4 z-10">
            <span>Billing Method:</span>
            <span className="font-mono bg-white/15 px-2.5 py-1 rounded-md text-[10px]">RAZORPAY SECURE ENGINE</span>
          </div>
        </div>
      </div>

      {/* Switch billing cycle period */}
      <div className="flex items-center justify-center gap-4 py-4 bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl max-w-sm mx-auto border border-gray-100 dark:border-gray-800/40">
        <button 
          onClick={() => setBillingPeriod('monthly')}
          className={cn(
            "px-4 py-2 text-xs font-black rounded-lg transition-all",
            billingPeriod === 'monthly' ? "bg-black text-white dark:bg-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          )}
        >
          Bill Monthly
        </button>
        <button 
          onClick={() => setBillingPeriod('yearly')}
          className={cn(
            "px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5",
            billingPeriod === 'yearly' ? "bg-black text-white dark:bg-indigo-600" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          )}
        >
          Bill Annually
          <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-12 text-center border border-gray-100 dark:border-gray-800 space-y-6 max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold dark:text-white">No custom plans configured yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              The platform administrator has not published any custom subscription plans to the Supabase database yet. You are currently on the baseline Free Tier.
            </p>
          </div>
          {session?.user?.email === 'gongidikalyan08@gmail.com' ? (
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('admin')}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-indigo-600/20 active:scale-95"
              >
                Go to Admin to Create Plans
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Please check back later or contact the workspace administrator.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((p) => {
          const isCurrent = parsedCleanTier.toLowerCase() === p.name.toLowerCase() && !cancellationInfo.isCancelled;
          
          // Apply annual discount calculation display
          const rawPrice = parseFloat(p.price.replace(/[^\d.]/g, ''));
          const calculatedDisplayPrice = billingPeriod === 'yearly' 
            ? Math.floor(rawPrice * 12 * 0.8) 
            : rawPrice;

          return (
            <div 
              key={p.id}
              className={cn(
                "p-10 rounded-[3rem] border flex flex-col justify-between space-y-8 relative overflow-hidden transition-all duration-300",
                isCurrent 
                  ? "bg-black text-white border-black dark:bg-gray-900 dark:border-indigo-600 shadow-xl" 
                  : "bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700"
              )}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={cn("text-2xl font-black", isCurrent ? "text-white animate-pulse" : "text-gray-900 dark:text-white")}>
                      {p.name}
                    </h3>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 font-bold mt-1 uppercase tracking-widest">Premium Features Hub</p>
                  </div>
                  {isCurrent && (
                    <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-indigo-600/25 animate-bounce">
                      Your Tier
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className={cn("text-5xl font-black font-mono", isCurrent ? "text-white" : "text-gray-900 dark:text-white")}>
                    {p.price.startsWith('₹') ? '₹' : p.price.startsWith('$') ? '$' : '₹'}{calculatedDisplayPrice}
                  </span>
                  <span className="text-gray-400 text-sm font-semibold">/ {billingPeriod === 'yearly' ? 'year' : 'month'}</span>
                </div>

                <div className="h-[2px] bg-gray-100 dark:bg-gray-800/60 w-full"></div>

                <div className="space-y-4">
                  <h4 className={cn("text-xs font-black uppercase tracking-wider", isCurrent ? "text-indigo-300" : "text-gray-450 dark:text-gray-400")}>
                    Included Capabilities
                  </h4>
                  <ul className="space-y-3.5">
                    {p.features.map((feature, index) => (
                       <li key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 animate-none" />
                        <span className={cn("text-sm", isCurrent ? "text-gray-200" : "text-gray-650 dark:text-gray-300")}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setCheckoutPlan(p)}
                disabled={upgradingTo !== null || isCurrent || isAdmin}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                  isCurrent || isAdmin
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/10"
                )}
              >
                {isAdmin ? "Admin Access • Unlocked" : isCurrent ? "Active Premium Tier" : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      )}

      {/* Orders & Billing History Section */}
      <div className="pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6">
        <div>
          <h3 className="text-xl font-black dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            Billing & Transaction History
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Review your historical transactions, system logs, and invoice receipts securely recorded in the platform database.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/30 dark:bg-gray-950/20">
            <p className="text-xs font-semibold text-gray-400">No transactions recorded yet in this account profile.</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">Upgrade or modify your plan higher to log invoices.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/20 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-4 px-6">Invoice ID</th>
                    <th className="py-4 px-6">Transaction Date</th>
                    <th className="py-4 px-6">Space Plan</th>
                    <th className="py-4 px-6 text-right">Amount Paid</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-xs dark:text-gray-300 font-medium hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-gray-400">{order.id}</td>
                      <td className="py-4 px-6 text-gray-500">
                        {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-6 font-bold">{order.plan_name}</td>
                      <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-white font-mono">
                        {order.currency === 'INR' ? '₹' : '$'}{parseFloat(order.amount).toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedReceipt(order)}
                          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all"
                        >
                          Invoice Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 border-2 border-indigo-600 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Official Receipt
                  </span>
                  <h3 className="text-xl font-black mt-2 dark:text-white">Transaction details</h3>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 pt-1 pb-6 border-b border-dashed border-gray-100 dark:border-gray-800 font-mono text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Invoice Reference:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Date:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {new Date(selectedReceipt.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Product Purchased:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedReceipt.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verification Status:</span>
                  <span className="font-bold text-emerald-500 uppercase">{selectedReceipt.status}</span>
                </div>
              </div>

              {/* Invoice Value Summary */}
              <div className="py-6 flex items-baseline justify-between">
                <span className="text-sm font-black dark:text-white font-mono">Total Paid</span>
                <span className="text-3xl font-black font-mono text-gray-900 dark:text-white">
                  {selectedReceipt.currency === 'INR' ? '₹' : '$'}{parseFloat(selectedReceipt.amount).toFixed(2)}
                </span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const printContents = document.createElement("div");
                    printContents.innerHTML = `
                      <div style="font-family: monospace; padding: 40px; border: 2px solid #000; max-width: 400px; margin: 0 auto; background: #fff; color: #000;">
                        <h2 style="font-weight: 900; margin-bottom: 2px;">WRINDHA OS</h2>
                        <h4 style="text-transform: uppercase; color: #666; margin-top: 0; font-size: 11px; letter-spacing: 2px;">Receipt & Verification Details</h4>
                        <hr style="border: 1px dashed #ccc;" />
                        <p><strong>Invoice Reference:</strong> ${selectedReceipt.id}</p>
                        <p><strong>Transaction Date:</strong> ${new Date(selectedReceipt.created_at).toLocaleString()}</p>
                        <p><strong>Product:</strong> ${selectedReceipt.plan_name}</p>
                        <p><strong>Payment Method:</strong> ${selectedReceipt.payment_method.toUpperCase()}</p>
                        <p><strong>Status:</strong> ${selectedReceipt.status.toUpperCase()}</p>
                        <hr style="border: 1px dashed #ccc;" />
                        <h3 style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 20px;">
                          <span>TOTAL PAID:</span>
                          <span>${selectedReceipt.currency === 'INR' ? '₹' : '$'}${parseFloat(selectedReceipt.amount).toFixed(2)}</span>
                        </h3>
                        <p style="text-align: center; color: #888; font-size: 10px; margin-top: 40px;">Thank you for upgrading! Your system credentials has been recompiled successfully.</p>
                      </div>
                    `;
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.body.appendChild(printContents);
                      win.print();
                    }
                  }}
                  className="w-full py-4 bg-black dark:bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <FileText className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-colors"
                >
                  Dismiss Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-red-500/35 dark:border-red-900/40 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-black dark:text-white">Cancel Subscription?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                  We are sorry to see you go! If you proceed with this cancellation, your registered profile will lose its premium features and return to standard limits.
                </p>
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                  <strong className="font-extrabold block mb-1">What will change immediately:</strong>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Habit tracking limit resets back to 5.</li>
                    <li>Premium dashboard analytics are locked.</li>
                    <li>Advanced study planners become restricted.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <button
                  disabled={cancelling}
                  onClick={handleCancelConfirm}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-extrabold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md text-center"
                >
                  {cancelling ? "Processing Cancellation..." : "Yes, Cancel Membership"}
                </button>
                <button
                  disabled={cancelling}
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3.5 bg-gray-150 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-extrabold rounded-xl text-[10px] uppercase tracking-widest transition-colors text-center shadow-sm border border-gray-200 dark:border-gray-700/50"
                >
                  No, Keep Premium Access
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stripe Sandbox Checkout modal */}
      <AnimatePresence>
        {checkoutPlan && (
          <div className="fixed inset-0 z-[150] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-3xl md:rounded-[2.5rem] p-5 sm:p-8 md:p-10 border border-gray-150 dark:border-gray-800 shadow-2xl relative my-auto overflow-hidden flex flex-col lg:flex-row gap-6 md:gap-8 items-stretch"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setCheckoutPlan(null);
                  setCheckoutStep(0);
                  setPaymentError(null);
                }}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full bg-gray-100/60 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300 z-50 shadow-sm border border-gray-200/30 dark:border-gray-700/50"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Left Column: Plan Summary and Virtual Credit Card Flip */}
              <div className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-6 bg-gray-50/50 dark:bg-gray-950/40 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 dark:border-gray-800/60">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Razorpay Secure Gateway Portal</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black dark:text-white">Upgrade to {checkoutPlan.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Unlock unconstrained productivity tracking, in-depth database analytics, and customized templates via Razorpay.</p>
                  </div>

                  {/* Pricing dynamic calculation billings list */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                      <span>Pro Space Access Plan:</span>
                      <span>{checkoutPlan.price} / month</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                      <span>Billing Interval Cycle:</span>
                      <span className="capitalize">{billingPeriod}</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-450">
                        <span>Corporate Discount Active:</span>
                        <span>-20% Applied</span>
                      </div>
                    )}
                    <div className="h-[1px] bg-gray-200 dark:bg-gray-850/60 my-2"></div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-sm font-black dark:text-white">Authorized Total Paid:</span>
                      <div className="text-right">
                        {appliedCoupon ? (
                          <>
                            <span className="text-xs line-through text-gray-400 mr-2 font-mono">
                              ₹{billingPeriod === 'yearly'
                                ? Math.floor(parseFloat(checkoutPlan.price.replace(/[^\d.]/g, '')) * 12 * 0.8)
                                : parseFloat(checkoutPlan.price.replace(/[^\d.]/g, ''))}
                            </span>
                            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              ₹{appliedCoupon.payableAmount}
                            </span>
                            <p className="text-[10px] text-emerald-500 font-extrabold mt-0.5">₹{appliedCoupon.discountAmount} Coupon Saved!</p>
                          </>
                        ) : (
                          <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {checkoutPlan.price.startsWith('₹') ? '₹' : checkoutPlan.price.startsWith('$') ? '$' : '₹'}
                            {billingPeriod === 'yearly' 
                              ? Math.floor(parseFloat(checkoutPlan.price.replace(/[^\d.]/g, '')) * 12 * 0.8)
                              : parseFloat(checkoutPlan.price.replace(/[^\d.]/g, ''))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Virtual UPI Voucher Representation */}
                <div className="hidden md:flex justify-center pt-4">
                  <div className="w-80 h-44 bg-gradient-to-br from-teal-700 via-emerald-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden ring-1 ring-emerald-500/20">
                    <div className="absolute inset-0 bg-white/[0.02] pointer-events-none"></div>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[8px] tracking-widest uppercase text-emerald-200 font-extrabold">BHIM UPI DIGITAL</span>
                        <p className="text-[10px] font-bold text-emerald-400">NPCI Unified Network</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded text-emerald-100 flex items-center gap-1 align-middle">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        SECURE
                      </span>
                    </div>
                    
                    <div className="py-2 text-center">
                      <p className="text-[9px] text-emerald-200/65 uppercase tracking-widest">Active Virtual Address</p>
                      <div className="font-mono text-xs tracking-wide font-black text-emerald-300 truncate px-2 mt-0.5 bg-black/20 py-2 rounded-xl border border-white/5">
                        {upiId || 'premium@gpay'}
                      </div>
                    </div>

                    <div className="flex justify-between text-[9px] uppercase font-bold text-emerald-200 pt-1">
                      <div>
                        <div className="text-[7px] text-emerald-450 uppercase tracking-wider">Gateway</div>
                        <div>Razorpay Sandbox</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[7px] text-emerald-450 uppercase tracking-wider">Settlement</div>
                        <div>Instant Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Checkout input form and payment actions */}
              <div className="flex-1 flex flex-col justify-center space-y-4 sm:space-y-6 py-2 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800/60 pt-6 lg:pt-0 lg:pl-8">
                {checkoutStep === 0 && (
                  <div className="space-y-4">
                    {/* Razorpay Brand Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800/60">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded px-2.5 py-1 text-[9px] font-black tracking-wider uppercase shadow-sm">
                          RAZORPAY
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">SECURE CHECKOUT</span>
                      </div>
                      <span className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-1">
                        ● SECURED 256-BIT SSL
                      </span>
                    </div>

                    {paymentError && (
                      <div className="p-3 bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl text-xs font-bold animate-pulse">
                        {paymentError}
                      </div>
                    )}

                    {/* Secure Coupon Code Input Section */}
                    <div className="bg-gradient-to-r from-gray-50 to-indigo-50/20 dark:from-gray-950 dark:to-indigo-950/10 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-500" /> Apply Promo Code / Coupon
                        </span>
                        {appliedCoupon && (
                          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/25 p-2 rounded-xl">
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-wide font-mono">
                              {appliedCoupon.couponCode}
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              {appliedCoupon.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={removeCoupon}
                            className="bg-transparent hover:bg-red-500/10 p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors text-xs font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Promo / Coupon Code"
                            value={typedCoupon}
                            onChange={(e) => {
                              setTypedCoupon(e.target.value);
                              setCouponError(null);
                            }}
                            className="flex-1 py-1.5 px-3 bg-white dark:bg-gray-90% border border-gray-200 dark:border-gray-850 rounded-xl outline-none text-xs font-mono font-bold dark:text-white uppercase placeholder-gray-400 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={validatingCoupon}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                          >
                            {validatingCoupon ? "Checking..." : "Apply"}
                          </button>
                        </div>
                      )}

                      {couponError && (
                        <p className="text-[10px] text-red-500 font-bold tracking-wide animate-pulse">{couponError}</p>
                      )}
                    </div>

                    <div className="space-y-4 animate-fadeIn">
                      {/* UPI Payment selector type tab */}
                      <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-150 dark:border-gray-800/60 w-full sm:w-fit mx-auto">
                        <button
                          type="button"
                          onClick={() => setQrScanActive(false)}
                          className={cn(
                            "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                            !qrScanActive ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-850"
                          )}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          UPI ID Setup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrScanActive(true);
                            setPaymentError(null);
                          }}
                          className={cn(
                            "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                            qrScanActive ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-850"
                          )}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Dynamic QR Scanner
                        </button>
                      </div>

                      {!qrScanActive ? (
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Razorpay UPI VPA Routing</h4>
                          
                          <div className="space-y-4">
                            {/* Selection of UPI App preset */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Select Preferring UPI App Preset</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { id: 'gpay', name: 'GPay', desc: '@okaxis' },
                                  { id: 'phonepe', name: 'PhonePe', desc: '@ybl' },
                                  { id: 'paytm', name: 'Paytm', desc: '@paytm' },
                                  { id: 'bhim', name: 'BHIM', desc: '@upi' }
                                ].map((app) => (
                                  <button
                                    key={app.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedUpiApp(app.id as any);
                                      const cleanVal = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'premium';
                                      setUpiId(`${cleanVal}${app.desc}`);
                                    }}
                                    className={cn(
                                      "py-2 px-1 text-center rounded-xl border text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-0.5",
                                      selectedUpiApp === app.id
                                        ? "border-amber-500 dark:border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20"
                                        : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-90% text-gray-500 hover:bg-gray-50 hover:text-gray-850 dark:hover:text-white"
                                    )}
                                  >
                                    <span>{app.name}</span>
                                    <span className="text-[8px] font-normal text-gray-400 uppercase tracking-tight">{app.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* UPI id field input */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Virtual Private Address (UPI ID)</label>
                              <input 
                                type="text" 
                                placeholder="username@okaxis"
                                value={upiId}
                                onChange={e => setUpiId(e.target.value)}
                                className="w-full py-3 px-4 bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl outline-none text-sm font-mono focus:border-indigo-500 dark:text-white font-bold text-center"
                              />
                            </div>
                          </div>

                          <div className="pt-4 space-y-3">
                            <button 
                              onClick={processSecureCheckout}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
                            >
                              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Pay via UPI ID Securely &rarr;
                            </button>
                            <p className="text-[10px] text-center text-gray-400 leading-relaxed max-w-xs mx-auto">
                              🔓 Interfacing with Sandbox UPI Router. Verification finishes instantly without real bank transactions.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-center">
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Dynamic Scan-to-Pay QR Code</h4>
                          
                          {/* Visual QR Code Representational Box */}
                          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-inner w-52 h-52 mx-auto flex flex-col justify-between items-center relative overflow-hidden group">
                            {/* QR code matrix mockup strictly in custom design */}
                            <svg className="w-40 h-40 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                              {/* Corners */}
                              <path d="M0,0 h30 v10 h-20 v20 h-10 z" />
                              <path d="M70,0 h30 v30 h-10 v-20 h-20 z" />
                              <path d="M0,70 h10 v20 h20 v10 h-30 z" />
                              <path d="M90,70 h10 v30 h-30 v-10 h20 z" />
                              {/* Center points representation */}
                              <rect x="15" y="15" width="15" height="15" />
                              <rect x="70" y="15" width="15" height="15" />
                              <rect x="15" y="70" width="15" height="15" />
                              <rect x="40" y="40" width="20" height="20" className="text-indigo-600 animate-pulse" />
                              {/* Scatter random dots */}
                              <rect x="40" y="15" width="5" height="5" />
                              <rect x="50" y="20" width="5" height="10" />
                              <rect x="15" y="40" width="10" height="5" />
                              <rect x="25" y="50" width="5" height="5" />
                              <rect x="70" y="40" width="5" height="15" />
                              <rect x="80" y="45" width="5" height="5" />
                              <rect x="45" y="70" width="10" height="5" />
                              <rect x="55" y="80" width="5" height="5" />
                              <rect x="70" y="70" width="15" height="15" />
                            </svg>
                            
                            <div className="absolute inset-x-0 bottom-0 bg-indigo-600 text-white text-[9px] font-black uppercase text-center py-1 tracking-wider">
                              BHIM UPI SECURE
                            </div>
                          </div>

                          <div className="text-center space-y-1">
                            <p className="text-xs font-black dark:text-white">Amount to pay: ₹{
                              billingPeriod === 'yearly'
                                ? Math.floor(parseFloat(checkoutPlan.price.replace(/[^\d.]/g, '')) * 12 * 0.8)
                                : parseFloat(checkoutPlan.price.replace(/[^\d.]/g, ''))
                            }.00</p>
                            <p className="text-[10px] text-gray-400 font-semibold max-w-xs mx-auto">
                              Scan using any compatible UPI app (Google Pay, PhonePe, Paytm, BHIM, Mobikwik, WhatsApp Pay) to verify instantly.
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={processSecureCheckout}
                              className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2"
                            >
                              <QrCode className="w-4 h-4" /> Verify QR Scan & Upgrade &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transition loading screens */}
                {(checkoutStep === 1 || checkoutStep === 2) && (
                  <div className="text-center py-10 space-y-6">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black dark:text-white">
                        {checkoutStep === 1 
                          ? 'Connecting to Razorpay UPI Handshake Gateway...' 
                          : 'Verifying Razorpay UPI Remittance Receipt Ledger...'}
                      </h4>
                      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                        Validating real-time VPA endpoint token authentication. Completing premium active directory update. Please wait.
                      </p>
                    </div>
                  </div>
                )}

                {/* Success Checkout Landing screen */}
                {checkoutStep === 3 && (
                  <div className="text-center py-6 space-y-6">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black dark:text-white">Transaction Verified!</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                        The checkout transaction was logged and Supabase profiles was auto-upgraded to <span className="font-bold text-indigo-500">{checkoutPlan.name}</span>. You can now use unlimited daily habit streaks, priorities matrices, and academic planners.
                      </p>
                    </div>
                    
                    <div className="pt-4 flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          setCheckoutPlan(null);
                          setCheckoutStep(0);
                        }}
                        className="w-full py-3.5 bg-black dark:bg-indigo-600 font-bold text-white rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-all"
                      >
                        Open Workspace Dashboards &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Orders & Billing History Section */}
      <div className="pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6">
        <div>
          <h3 className="text-xl font-black dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            Billing & Transaction History
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Review your historical transactions, system logs, and invoice receipts securely recorded in the platform database.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/30 dark:bg-gray-950/20">
            <p className="text-xs font-semibold text-gray-400">No transactions recorded yet in this account profile.</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">Upgrade or modify your plan higher to log invoices.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/20 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-4 px-6">Invoice ID</th>
                    <th className="py-4 px-6">Transaction Date</th>
                    <th className="py-4 px-6">Space Plan</th>
                    <th className="py-4 px-6 text-right">Amount Paid</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-xs dark:text-gray-300 font-medium hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-gray-400">{order.id}</td>
                      <td className="py-4 px-6 text-gray-500">
                        {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-6 font-bold">{order.plan_name}</td>
                      <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-white font-mono">
                        {order.currency === 'INR' ? '₹' : '$'}{parseFloat(order.amount).toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedReceipt(order)}
                          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-all"
                        >
                          Invoice Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 border-2 border-indigo-600 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Official Receipt
                  </span>
                  <h3 className="text-xl font-black mt-2 dark:text-white">Transaction details</h3>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 pt-1 pb-6 border-b border-dashed border-gray-100 dark:border-gray-800 font-mono text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Invoice Reference:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction Date:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {new Date(selectedReceipt.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Product Purchased:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedReceipt.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{selectedReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verification Status:</span>
                  <span className="font-bold text-emerald-500 uppercase">{selectedReceipt.status}</span>
                </div>
              </div>

              {/* Invoice Value Summary */}
              <div className="py-6 flex items-baseline justify-between">
                <span className="text-sm font-black dark:text-white font-mono">Total Paid</span>
                <span className="text-3xl font-black font-mono text-gray-900 dark:text-white">
                  {selectedReceipt.currency === 'INR' ? '₹' : '$'}{parseFloat(selectedReceipt.amount).toFixed(2)}
                </span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const printContents = document.createElement("div");
                    printContents.innerHTML = `
                      <div style="font-family: monospace; padding: 40px; border: 2px solid #000; max-width: 400px; margin: 0 auto; background: #fff; color: #000;">
                        <h2 style="font-weight: 900; margin-bottom: 2px;">WRINDHA OS</h2>
                        <h4 style="text-transform: uppercase; color: #666; margin-top: 0; font-size: 11px; letter-spacing: 2px;">Receipt & Verification Details</h4>
                        <hr style="border: 1px dashed #ccc;" />
                        <p><strong>Invoice Reference:</strong> ${selectedReceipt.id}</p>
                        <p><strong>Transaction Date:</strong> ${new Date(selectedReceipt.created_at).toLocaleString()}</p>
                        <p><strong>Product:</strong> ${selectedReceipt.plan_name}</p>
                        <p><strong>Payment Method:</strong> ${selectedReceipt.payment_method.toUpperCase()}</p>
                        <p><strong>Status:</strong> ${selectedReceipt.status.toUpperCase()}</p>
                        <hr style="border: 1px dashed #ccc;" />
                        <h3 style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 20px;">
                          <span>TOTAL PAID:</span>
                          <span>${selectedReceipt.currency === 'INR' ? '₹' : '$'}${parseFloat(selectedReceipt.amount).toFixed(2)}</span>
                        </h3>
                        <p style="text-align: center; color: #888; font-size: 10px; margin-top: 40px;">Thank you for upgrading! Your system credentials has been recompiled successfully.</p>
                      </div>
                    `;
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.body.appendChild(printContents);
                      win.print();
                    }
                  }}
                  className="w-full py-4 bg-black dark:bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <FileText className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-colors"
                >
                  Dismiss Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

