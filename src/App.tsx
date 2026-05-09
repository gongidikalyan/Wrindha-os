import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  LayoutDashboard, 
  ListTodo, 
  Target, 
  Wallet, 
  FileText, 
  GraduationCap,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Plus,
  Flame,
  Brain,
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
  Handshake
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, getStorage, setStorage } from "@/src/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Task, EisenhowerQuadrant, Habit, Expense, Goal, GoalType, TimetableEntry, TimetableType, StudyCourse } from "./types";
import { supabase, isSupabaseConfigured, getSupabaseError, supabaseUrl } from "./lib/supabase";
import { gemini } from "./services/geminiService";

// Modules
const modules = [
  { id: 'dashboard', name: 'Overview', icon: LayoutDashboard, color: 'text-blue-500' },
  { id: 'habits', name: 'Habit Tracker', icon: Flame, color: 'text-orange-500' },
  { id: 'tasks', name: 'Tasks & Matrix', icon: CheckCircle2, color: 'text-green-500' },
  { id: 'goals', name: 'Goal System', icon: Target, color: 'text-purple-500' },
  { id: 'study', name: 'Study Planner', icon: GraduationCap, color: 'text-indigo-500' },
  { id: 'finance', name: 'Expenses', icon: Wallet, color: 'text-emerald-500' },
  { id: 'timetable', name: 'Timetable', icon: Calendar, color: 'text-cyan-500' },
];

const infoModules = [
  { id: 'about', name: 'About Us', icon: Info },
  { id: 'contact', name: 'Contact Us', icon: MessageCircle },
  { id: 'privacy', name: 'Privacy Policy', icon: ShieldCheck },
  { id: 'disclaimer', name: 'Disclaimer', icon: AlertCircle },
  { id: 'terms', name: 'Terms of Use', icon: Scale },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [userName, setUserName] = useState(() => localStorage.getItem('wrindha_user_name') || "Felix");
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('wrindha_theme') as 'light' | 'dark') || 'light');
  const [showSettings, setShowSettings] = useState(false);
  const [session, setSession] = useState<any>(null);

  const isAdmin = session?.user?.email === 'gongidikalyan08@gmail.com';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name);
      }
      if (session?.user) {
        // Track profile for admin stats
        supabase.from('profiles').upsert({ 
          id: session.user.id, 
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || userName,
          lastActive: new Date().toISOString()
        }).then();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata?.full_name) {
        setUserName(session.user.user_metadata.full_name);
      }
      if (session?.user) {
        supabase.from('profiles').upsert({ 
          id: session.user.id, 
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || userName,
          lastActive: new Date().toISOString()
        }).then();
      }
    });

    return () => subscription.unsubscribe();
  }, [userName]);

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
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Morning Coding', frequency: 'daily', streak: 12, completedAt: [], color: 'bg-indigo-500' },
      { id: '2', name: '3L Hydration', frequency: 'daily', streak: 45, completedAt: [], color: 'bg-blue-500' },
    ];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('wrindha_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Finish Pitch Deck', quadrant: EisenhowerQuadrant.URGENT_IMPORTANT, completed: false, tags: ['Work'] },
      { id: '2', title: 'Buy Groceries', quadrant: EisenhowerQuadrant.URGENT_NOT_IMPORTANT, completed: false, tags: ['Personal'] },
    ];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('wrindha_expenses');
    return saved ? JSON.parse(saved) : [
      { id: '1', amount: 45.5, note: 'Grocery Run', category: 'Food', date: new Date().toISOString() },
    ];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('wrindha_goals');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Learn Modern React', type: GoalType.SHORT, progress: 65, targetDate: '2024-06-30' },
    ];
  });

  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => {
    const saved = localStorage.getItem('wrindha_timetable');
    return saved ? JSON.parse(saved) : [];
  });

  const [studyCourses, setStudyCourses] = useState<StudyCourse[]>(() => {
    const saved = localStorage.getItem('wrindha_study');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Distributed Systems', progress: 85, color: 'bg-indigo-500', exams: [], materials: [] },
      { id: '2', name: 'UX Psychology', progress: 40, color: 'bg-rose-500', exams: [], materials: [] },
      { id: '3', name: 'Microeconomics', progress: 62, color: 'bg-emerald-500', exams: [], materials: [] },
    ];
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [bypassConfig, setBypassConfig] = useState(() => localStorage.getItem('wrindha_bypass_config') === 'true');

  useEffect(() => {
    localStorage.setItem('wrindha_bypass_config', bypassConfig.toString());
  }, [bypassConfig]);

  // Initial Fetch from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured() || !session?.user?.id) {
        setIsInitializing(false);
        return;
      }

      const userId = session.user.id;

      try {
        const { data: habitsData } = await supabase.from('habits').select('*').eq('userId', userId);
        if (habitsData && habitsData.length > 0) setHabits(habitsData);

        const { data: tasksData } = await supabase.from('tasks').select('*').eq('userId', userId);
        if (tasksData && tasksData.length > 0) setTasks(tasksData);

        const { data: expensesData } = await supabase.from('expenses').select('*').eq('userId', userId);
        if (expensesData && expensesData.length > 0) setExpenses(expensesData);

        const { data: goalsData } = await supabase.from('goals').select('*').eq('userId', userId);
        if (goalsData && goalsData.length > 0) setGoals(goalsData);

        const { data: timetableData } = await supabase.from('timetable').select('*').eq('userId', userId);
        if (timetableData && timetableData.length > 0) setTimetable(timetableData);

        const { data: studyData } = await supabase.from('study_courses').select('*').eq('userId', userId);
        if (studyData && studyData.length > 0) setStudyCourses(studyData);
      } catch (error) {
        console.error('Error fetching from Supabase:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    fetchData();
  }, [session]);

  // Sync to Supabase helper
  const syncToSupabase = async (table: string, data: any) => {
    if (!isSupabaseConfigured() || !session?.user?.id) return;
    try {
      // Add userId to each item before upserting
      const dataWithUser = Array.isArray(data) 
        ? data.map(item => ({ ...item, userId: session.user.id }))
        : { ...data, userId: session.user.id };
        
      await supabase.from(table).upsert(dataWithUser);
    } catch (error) {
      console.error(`Error syncing ${table} to Supabase:`, error);
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

  const configError = getSupabaseError();

  if (!session && isSupabaseConfigured()) {
    return <AuthView />;
  }

  if (!session && configError && !bypassConfig) {
    return <AuthConfigErrorView error={configError} onBypass={() => setBypassConfig(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-gray-950 text-[#1A1A1A] dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white dark:bg-gray-900 border-r border-[#E5E7EB] dark:border-gray-800 flex flex-col z-50 shrink-0"
      >
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-opacity duration-300", !isSidebarOpen && "opacity-0")}>
            <div className="w-8 h-8 bg-black dark:bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight dark:text-white">Wrindha OS</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            {isSidebarOpen ? <Menu className="w-5 h-5 dark:text-gray-400" /> : <Menu className="mx-auto w-5 h-5 flex justify-center dark:text-gray-400" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                activeTab === m.id 
                  ? "bg-black dark:bg-indigo-600 text-white shadow-lg shadow-black/10" 
                  : "text-[#6B7280] dark:text-gray-500 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:text-[#1A1A1A] dark:hover:text-white"
              )}
            >
              <m.icon className={cn("w-5 h-5 shrink-0", activeTab !== m.id && m.color)} />
              {isSidebarOpen && <span className="font-medium text-sm whitespace-nowrap">{m.name}</span>}
              {!isSidebarOpen && (
                <div className="absolute left-16 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[60]">
                  {m.name}
                </div>
              )}
            </button>
          ))}

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

        <div className="p-4 border-t border-[#E5E7EB] dark:border-gray-800">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-gray-800 transition-all"
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm">Settings</span>}
          </button>
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
                        <span className="text-sm font-medium dark:text-gray-300">Supabase</span>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", isSupabaseConfigured() ? "bg-emerald-500" : "bg-amber-500")}></div>
                          <span className="text-xs font-bold uppercase dark:text-gray-400">
                            {isSupabaseConfigured() ? "Connected" : "Local Only"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-sm font-medium dark:text-gray-300">Account</span>
                        <button 
                          onClick={() => supabase.auth.signOut()}
                          className="text-xs font-bold uppercase text-red-500 hover:text-red-600 px-3 py-1.5 bg-red-50 dark:bg-red-900/10 rounded-lg transition-colors"
                        >
                          Logout
                        </button>
                      </div>
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
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] dark:bg-gray-950 overflow-y-auto transition-colors duration-300">
        <header className="h-16 border-b border-[#E5E7EB] dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-[#F3F4F6] dark:bg-gray-800 px-3 py-1.5 rounded-full w-full max-w-md border border-transparent focus-within:border-black/10 dark:focus-within:border-white/10 transition-all">
            <Search className="w-4 h-4 text-[#9CA3AF] dark:text-gray-500" />
            <input 
              type="text" 
              placeholder="Search across modules..." 
              className="bg-transparent border-none outline-none text-sm w-full dark:text-white dark:placeholder-gray-500"
            />
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
            <button className="p-2 text-[#6B7280] dark:text-gray-400 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white dark:border-gray-800 shadow-sm overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
               {activeTab === 'dashboard' && <DashboardView habits={habits} tasks={tasks} expenses={expenses} currency={currency} userName={userName} setUserName={setUserName} theme={theme} setActiveTab={setActiveTab} />}
               {activeTab === 'habits' && <HabitsView habits={habits} setHabits={setHabits} theme={theme} />}
               {activeTab === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} />}
               {activeTab === 'finance' && <FinanceView expenses={expenses} setExpenses={setExpenses} currency={currency} setCurrency={setCurrency} theme={theme} />}
               {activeTab === 'study' && <StudyView courses={studyCourses} setCourses={setStudyCourses} />}
               {activeTab === 'goals' && <GoalsView goals={goals} setGoals={setGoals} />}
               {activeTab === 'timetable' && <TimetableView entries={timetable} setEntries={setTimetable} theme={theme} />}
               {activeTab === 'admin' && isAdmin && <AdminView />}
               {activeTab === 'about' && <AboutView />}
               {activeTab === 'contact' && <ContactView />}
               {activeTab === 'privacy' && <PrivacyView />}
               {activeTab === 'disclaimer' && <DisclaimerView />}
               {activeTab === 'terms' && <TermsView />}
             </motion.div>
           </AnimatePresence>

           <Footer setActiveTab={setActiveTab} />
        </div>
      </main>
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
            <span className="font-bold text-xl tracking-tight dark:text-white">Wrindha OS</span>
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

// --- Auth View ---

function AuthView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        alert("Check your email for confirmation!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 flex items-center justify-center p-6 transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-black dark:border-indigo-600/30 p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Brain className="w-32 h-32 text-indigo-600" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold dark:text-white">Wrindha OS</h1>
          </div>

          <h2 className="text-3xl font-black mb-2 dark:text-white">
            {isLogin ? "Welcome back." : "Create space."}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
            {isLogin ? "Your optimal environment awaits." : "Start your systematic journey today."}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500/50 transition-all font-medium"
                placeholder="felix@wrindha.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Security Key</label>
              <input 
                type="password" 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500/50 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black dark:bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-black/10 dark:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? "Processing..." : (isLogin ? "Authenticate" : "Generate Account")}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {isLogin ? "New here? Create your space →" : "Already systematic? Log in →"}
            </button>
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

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
            <p className="text-xs text-gray-400 text-center mb-2">Or continue without cloud sync:</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={onBypass}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-all border-2 border-transparent transition-all"
              >
                Local Only
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-black dark:bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all"
              >
                Refresh App
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Admin View ---

function AdminView() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'config'>('overview');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setUserCount(1);
      setUsers([{ id: '1', email: 'local@instance.com', fullName: 'Local Admin', lastActive: new Date().toISOString() }]);
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('lastActive', { ascending: false });
      
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
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black dark:text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Admin Center
          </h2>
          <p className="text-gray-500 dark:text-gray-400">System orchestration & governance dashboard.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchStats()}
            className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all active:scale-95"
          >
            <RefreshCcw className={cn("w-5 h-5 dark:text-gray-300", loading && "animate-spin")} />
          </button>
          <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl flex">
            {(['overview', 'users', 'config'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
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
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Database Nodes</span>
                </div>
                <p className="text-5xl font-black font-mono">
                  {loading ? "..." : userCount ?? "0"}
                </p>
                <div className="mt-4 flex items-center gap-2">
                   <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-3/4"></div>
                   </div>
                   <span className="text-[10px] font-bold">75%</span>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl w-fit mb-6">
                  <Activity className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold dark:text-white">API Throughput</h3>
                <p className="text-2xl font-black mt-2 dark:text-gray-200">1.2k req/s</p>
                <div className="mt-4 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500">+12.4% from last hour</span>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl w-fit mb-6">
                  <Database className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-bold dark:text-white">Storage Usage</h3>
                <p className="text-2xl font-black mt-2 dark:text-gray-200">22.4 GB</p>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">AWS S3 integration active.</p>
              </div>

              <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl w-fit mb-6">
                  <Shield className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="font-bold dark:text-white">Security Score</h3>
                <p className="text-2xl font-black mt-2 dark:text-gray-200 text-indigo-600 dark:text-indigo-400">98/100</p>
                <div className="mt-4 flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                   <span className="text-[10px] font-bold text-gray-400">SOC2 Type II Compliant</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold dark:text-white">Recent Deployment Log</h3>
                  <button className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">View All Logs</button>
                </div>
                <div className="space-y-4">
                  {[
                    { tag: "AUTH", msg: "Email provider verification enabled", time: "2m ago", status: "success" },
                    { tag: "DB", msg: "Supabase cloud sync latency stabilized", time: "15m ago", status: "success" },
                    { tag: "UI", msg: "Dark mode color palette optimized", time: "1h ago", status: "info" },
                    { tag: "SEC", msg: "Firewall rule updated for API endpoints", time: "3h ago", status: "warning" },
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
                  <h3 className="text-xl font-bold dark:text-white">User Management</h3>
                  <p className="text-sm text-gray-400">Monitoring {users.length} registered accounts.</p>
               </div>
               <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-600 w-64"
                    />
                  </div>
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Last Active</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-gray-400">Loading user database...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-gray-400">No users found. Ensure the 'profiles' table exists.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold">
                                {user.fullName?.[0] || user.email[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                 <span className="font-bold dark:text-gray-100">{user.fullName || 'Anonymous'}</span>
                                 <span className="text-xs text-gray-400">{user.email}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                             new Date(user.lastActive).getTime() > Date.now() - 300000 
                               ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10" 
                               : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                           )}>
                             {new Date(user.lastActive).getTime() > Date.now() - 300000 ? 'Online' : 'Offline'}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                              <Clock className="w-3 h-3" />
                              {new Date(user.lastActive).toLocaleString()}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex gap-2">
                             <button className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-indigo-600">
                                <Settings2 className="w-4 h-4" />
                             </button>
                             <button className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

function DashboardView({ habits, tasks, expenses, currency, userName, setUserName, theme, setActiveTab }: { 
  habits: Habit[], 
  tasks: Task[], 
  expenses: Expense[], 
  currency: 'USD' | 'INR', 
  userName: string,
  setUserName: (name: string) => void,
  theme: 'light' | 'dark',
  setActiveTab: (tab: string) => void
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(userName);
  
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budget = currency === 'USD' ? 4000 : 300000;
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

  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  useEffect(() => {
    async function fetchTips() {
      setLoadingTips(true);
      try {
        const tips = await gemini.getAiSuggestions('Dashboard', { 
          habits: habits.length, 
          tasks: tasks.filter(t => !t.completed).length,
          userName 
        });
        setAiTips(tips);
      } catch (error) {
        console.error("Dashboard tips error:", error);
      } finally {
        setLoadingTips(false);
      }
    }
    fetchTips();
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            {[...Array(7)].map((_, i) => (
              <div key={i} className={cn("flex-1 h-12 rounded-lg flex items-center justify-center font-mono text-xs", i < (habits[0]?.streak % 7 || 0) ? "bg-orange-500 text-white" : "bg-[#F3F4F6] dark:bg-gray-800 text-[#9CA3AF] dark:text-gray-600")}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </div>
            ))}
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
                 <div key={task.id} className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-red-500"></div>
                   <span className="text-sm font-medium truncate dark:text-gray-300">{task.title}</span>
                 </div>
               ))}
               {priorityTasks.length === 0 && <p className="text-gray-400 dark:text-gray-600 text-sm">No critical tasks!</p>}
            </div>
          </div>
          <button onClick={() => setActiveTab('tasks')} className="text-xs font-bold text-[#6B7280] dark:text-gray-500 uppercase tracking-widest mt-6 hover:text-black dark:hover:text-white transition-colors w-full text-left">View Matrix →</button>
        </div>

        {/* AI Suggestions Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900 shadow-sm flex flex-col group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-20 h-20 text-indigo-600" />
          </div>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl w-fit mb-4">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold dark:text-white">AI Strategy</h3>
          <div className="mt-4 space-y-3 flex-1">
            {loadingTips ? (
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3"></div>
              </div>
            ) : aiTips.length > 0 ? (
              aiTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="w-3 h-3 mt-1 text-indigo-400 shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{tip}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Configure Gemini API key in settings for smart tips.</p>
            )}
          </div>
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

function HabitsView({ habits, setHabits, theme }: { habits: Habit[], setHabits: (h: Habit[]) => void, theme: 'light' | 'dark' }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const addHabit = () => {
    if (!newName.trim()) return;
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
    setHabits(habits.map(h => h.id === id ? { ...h, streak: h.streak + 1 } : h));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Unstoppable Streaks</h2>
          <p className="text-gray-500">Don't break the chain.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-black text-white p-3 rounded-2xl hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-black dark:border-indigo-600 flex gap-4">
             <input 
              autoFocus
              className="flex-1 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 text-sm font-medium outline-none" 
              placeholder="Habit name..." 
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
        {habits.map(habit => (
          <motion.div 
            whileHover={{ y: -4 }}
            key={habit.id} 
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white", habit.color)}>
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg dark:text-white">{habit.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{habit.streak} day streak</p>
              </div>
              <button 
                onClick={() => setHabits(habits.filter(h => h.id !== habit.id))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => checkIn(habit.id)}
              className="mt-6 w-full py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-black dark:text-white font-bold text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-600 hover:text-white transition-all"
            >
              Completed
            </button>
          </motion.div>
        ))}
      </div>

      {/* Habit Analytics */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-bold mb-6 dark:text-white">Completion Rate</h3>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={[
               { name: 'Mon', completion: 80 },
               { name: 'Tue', completion: 95 },
               { name: 'Wed', completion: 70 },
               { name: 'Thu', completion: 100 },
               { name: 'Fri', completion: 85 },
               { name: 'Sat', completion: 60 },
               { name: 'Sun', completion: 40 },
             ]}>
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

function TasksView({ tasks, setTasks }: { tasks: Task[], setTasks: (t: Task[]) => void }) {
  const [showAdd, setShowAdd] = useState<EisenhowerQuadrant | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const addTask = (q: EisenhowerQuadrant) => {
    if (!newTaskTitle.trim()) return;
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Eisenhower Matrix</h2>
          <p className="text-gray-500">Prioritize your focus across 4 quadrants.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
        {quadrants.map(q => (
          <div key={q.id} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", q.color)}></div>
                <h3 className="font-bold text-lg dark:text-white">{q.label}</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{q.desc}</span>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {tasks.filter(t => t.quadrant === q.id).map(task => (
                <div key={task.id} className="group p-4 bg-[#F9FAFB] dark:bg-gray-800/40 rounded-2xl flex items-center justify-between border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleTask(task.id)}
                      className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", task.completed ? "bg-black dark:bg-indigo-600 border-black dark:border-indigo-600 text-white" : "border-gray-200 dark:border-gray-700 group-hover:border-black/30 dark:group-hover:border-white/30")}
                    >
                      {task.completed && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <span className={cn("text-sm font-medium dark:text-gray-300", task.completed && "text-gray-400 dark:text-gray-600 line-through")}>{task.title}</span>
                  </div>
                  <X 
                    className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-500" 
                    onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                  />
                </div>
              ))}
              {showAdd === q.id ? (
                 <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-black dark:border-indigo-600 shadow-lg">
                    <input 
                      autoFocus
                      className="w-full text-sm font-medium mb-3 outline-none px-2 bg-transparent dark:text-white" 
                      placeholder="Task name..." 
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask(q.id)}
                    />
                    <div className="flex gap-2">
                       <button onClick={() => addTask(q.id)} className="flex-1 bg-black dark:bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold">Add</button>
                       <button onClick={() => setShowAdd(null)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-black dark:text-white py-2 rounded-xl text-xs font-bold">Cancel</button>
                    </div>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowAdd(q.id)}
                  className="w-full py-3 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-600 text-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all flex items-center justify-center gap-2"
                >
                   <Plus className="w-4 h-4" /> Add Task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceView({ expenses, setExpenses, currency, setCurrency, theme }: { 
  expenses: Expense[], 
  setExpenses: (e: Expense[]) => void, 
  currency: 'USD' | 'INR', 
  setCurrency: (c: 'USD' | 'INR') => void,
  theme: 'light' | 'dark'
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newExp, setNewExp] = useState({ amount: "", note: "" });

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
                      placeholder="Amount ($)" 
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
                        onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))}
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
                   <h3 className="text-lg font-bold">Goal: New Studio</h3>
                   <p className="text-white/50 dark:text-gray-500 text-xs mt-1">Saved $8,400 / $12,000</p>
                </div>
                <div className="mt-8 flex justify-center">
                   <div className="relative w-40 h-40">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={[{ value: 70 }, { value: 30 }]}
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={0}
                           dataKey="value"
                         >
                           <Cell fill="#10B981" />
                           <Cell fill={theme === 'dark' ? '#1E293B' : 'rgba(255,255,255,0.1)'} />
                         </Pie>
                       </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center group pointer-events-none">
                        <span className="text-2xl font-bold font-mono">70%</span>
                        <span className="text-[10px] uppercase font-bold text-white/40 dark:text-gray-600">Progress</span>
                     </div>
                   </div>
                </div>
                <button className="mt-8 w-full py-4 bg-white/10 dark:bg-gray-800 hover:bg-white/20 dark:hover:bg-gray-700 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">Contribute</button>
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
                         <span className="text-sm font-mono font-bold dark:text-white">${val.toFixed(2)}</span>
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

function StudyView({ courses, setCourses }: { courses: StudyCourse[], setCourses: (c: StudyCourse[]) => void }) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id || null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  
  // For adding exams and materials
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', date: '' });
  
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const addCourse = () => {
    if (!newCourseName.trim()) return;
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
          <h2 className="text-3xl font-bold">Study Command Center</h2>
          <p className="text-gray-500">Manage your courses, exams, and study materials manually.</p>
        </div>
        <button 
          onClick={() => setShowAddCourse(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

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
                    onClick={(e) => { e.stopPropagation(); deleteCourse(course.id); }}
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

function GoalsView({ goals, setGoals }: { goals: Goal[], setGoals: (g: Goal[]) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: GoalType.SHORT, date: '' });

  const addGoal = () => {
    if (!newGoal.title || !newGoal.date) return;
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Goal Architecture</h2>
          <p className="text-gray-500 dark:text-gray-400">Manual tracking for long-term vision.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-black dark:bg-indigo-600 text-white p-3 rounded-2xl hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

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
                      onClick={() => setGoals(goals.filter(g => g.id !== goal.id))}
                    />
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                    <span className="text-sm font-mono font-bold dark:text-white">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 dark:bg-purple-600 transition-all duration-500" style={{ width: `${goal.progress}%` }}></div>
                  </div>
                  <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
  );
}

function TimetableView({ entries, setEntries, theme }: { entries: TimetableEntry[], setEntries: (e: TimetableEntry[]) => void, theme: 'light' | 'dark' }) {
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
                          onClick={() => setEntries(entries.filter(e => e.id !== entry.id))}
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
    <div className="max-w-4xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Info className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-5xl font-black dark:text-white tracking-tight">About Us</h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">Empowering the next generation of focused learners.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold dark:text-white">The Mission</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                Welcome to <span className="font-bold text-indigo-600">Wrindha OS</span>. My name is <span className="font-bold dark:text-white">Kalyan</span>, and I'm a B.Tech student passionate about bridging the gap between raw potential and structured execution.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                As a student myself, I realized that the hurdles to academic success aren't just about intelligence, but about organization and consistency. This platform was born from that necessity.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl">
               <h3 className="font-bold text-indigo-600 uppercase tracking-widest text-xs mb-6">Built-in Modules</h3>
               <div className="grid grid-cols-2 gap-4">
                 {[
                   { name: 'Study Planner', icon: GraduationCap },
                   { name: 'Habit Tracker', icon: Flame },
                   { name: 'Expense Tracker', icon: Wallet },
                   { name: 'Goal Setting', icon: Target },
                   { name: 'Matrix Mode', icon: Brain },
                   { name: 'Timetable', icon: Calendar }
                 ].map(item => (
                   <div key={item.name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                     <item.icon className="w-4 h-4 text-gray-400" />
                     <span className="text-xs font-bold dark:text-gray-300">{item.name}</span>
                   </div>
                 ))}
               </div>
            </div>
        </div>

        <div className="bg-black dark:bg-indigo-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6">Our Vision</h2>
            <p className="text-lg opacity-80 leading-relaxed max-w-2xl">
              "Our mission is to help students become more organized, productive, and focused in their daily lives. We believe that by providing practical tools, we can help reduce the friction of planning and allow the focus to remain on learning."
            </p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        </div>
      </motion.div>
    </div>
  );
}

function ContactView() {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-5xl font-black dark:text-white tracking-tight">Contact Us</h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">We're here to help if you have any questions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
            <h2 className="text-2xl font-bold dark:text-white">Send a Message</h2>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                  <input type="text" className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Enter your name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                  <input type="email" className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="your@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Message</label>
                   <textarea rows={4} className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none" placeholder="How can we help?"></textarea>
              </div>
              <button type="submit" className="w-full bg-black dark:bg-indigo-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all">Send Message</button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
               <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl mb-4">
                 <Mail className="w-6 h-6 text-gray-400" />
               </div>
               <h3 className="font-bold text-sm mb-1 dark:text-white">Email Us</h3>
               <p className="text-xs text-gray-400 mb-4">For all inquiries</p>
               <a href="mailto:wrindhaos@gmail.com" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">wrindhaos@gmail.com</a>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
               <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl mb-4">
                 <Clock className="w-6 h-6 text-gray-400" />
               </div>
               <h3 className="font-bold text-sm mb-1 dark:text-white">Response Time</h3>
               <p className="text-xs text-gray-400 leading-relaxed px-4">
                 We usually respond within <span className="text-indigo-600 font-bold">24–48 hours</span>.
               </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PrivacyView() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-xl space-y-10"
      >
        <div className="flex items-center gap-6 pb-8 border-b border-gray-50 dark:border-gray-800">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black dark:text-white">Privacy Policy</h1>
            <p className="text-gray-400 font-medium">Effective Date: May 9, 2026</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            Data Collection
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            At Wrindha OS, we value your privacy. We strictly limit the data we collect to what is necessary for providing a high-quality experience. This may include:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
            {['Browser type', 'Device information', 'Cookies', 'Usage analytics'].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            Third-Party Services
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
            Third-party services such as <span className="font-bold">Google Analytics</span> and <span className="font-bold">Google AdSense</span> may use cookies to serve personalized content and advertisements. We do not sell personal information to third parties.
          </p>
        </section>

        <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 italic text-center">
            "By using our website, you agree to this privacy policy."
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function DisclaimerView() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#FFFBEB] dark:bg-amber-900/10 p-12 rounded-[3.5rem] border-2 border-amber-200 dark:border-amber-900/30 space-y-8"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 rounded-[2rem] flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-4xl font-black text-amber-900 dark:text-amber-100">Disclaimer</h1>
        </div>

        <div className="space-y-6 text-amber-900/80 dark:text-amber-100/60 leading-relaxed text-lg">
          <p>
            The tools, calculators, planners, trackers, and educational content available on this website are provided for <span className="font-bold text-amber-700 dark:text-amber-400 underline decoration-amber-300">informational and productivity purposes only</span>.
          </p>
          <p>
            While we strive for accuracy, we do not guarantee completeness or suitability for every individual situation. Users are responsible for how they use the information and tools provided on this website.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function TermsView() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-xl space-y-12"
      >
        <div className="text-center">
          <Scale className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-4xl font-black dark:text-white">Terms & Conditions</h1>
          <p className="text-gray-400 mt-2 font-medium uppercase tracking-widest text-[10px]">Your agreement with Wrindha OS</p>
        </div>

        <div className="space-y-8">
          {[
            { 
              title: "Lawful Usage", 
              desc: "Use this website only for lawful purposes in accordance with local and international regulations.",
              icon: Handshake
            },
            { 
              title: "Acceptable Use", 
              desc: "Do not attempt to misuse, copy, or disrupt our services or infrastructure.",
              icon: X
            },
            { 
              title: "Intellectual Property", 
              desc: "All content, tools, and designs belong to Wrindha OS and its creators.",
              icon: Lock
            },
            { 
              title: "Modifications", 
              desc: "We reserve the right to update or modify services and these terms without prior notice.",
              icon: RefreshCcw
            }
          ].map((term, i) => (
            <div key={i} className="flex gap-6 p-6 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[2rem] transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent group-hover:border-indigo-600/30 flex items-center justify-center shrink-0 transition-all">
                <term.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg dark:text-gray-200">{term.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{term.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-50 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400">
            "Continued use of this website means acceptance of these terms."
          </p>
        </div>
      </motion.div>
    </div>
  );
}
