import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Flame, 
  CheckCircle2, 
  GraduationCap, 
  Target, 
  Wallet,
  Calendar,
  Filter,
  Percent,
  CheckCircle,
  FileCheck
} from "lucide-react";
import { Task, EisenhowerQuadrant, Habit, Expense, Goal, GoalType, StudyCourse } from "../types";
import { cn } from "../lib/utils";

interface AnalyticsViewProps {
  expenses: Expense[];
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
  courses: StudyCourse[];
  currency: 'USD' | 'INR';
}

const COLORS = [
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#06B6D4"  // Cyan
];

export default function AnalyticsView({
  expenses,
  habits,
  tasks,
  goals,
  courses,
  currency
}: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  const formatVal = (val: number) => {
    return currency === "USD" ? `$${val.toFixed(2)}` : `₹${val.toFixed(2)}`;
  };

  // --- TIME-BASED FILTER HELPER ---
  const filteredData = (() => {
    const now = new Date();
    let startDate = new Date();

    if (timeframe === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= now;
    });

    return {
      expenses: filteredExpenses,
      startDate
    };
  })();

  // ================= EXPENSES CALCULATIONS =================
  const totalExpenseAmount = filteredData.expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Group by Category
  const expenseByCategory = (() => {
    const map: Record<string, number> = {};
    filteredData.expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Expenses Trend
  const expensesTrend = (() => {
    const map: Record<string, number> = {};
    
    if (timeframe === 'week') {
      // Group by Day of the Week
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = weekdays[d.getDay()];
        const key = d.toISOString().split('T')[0];
        map[dayName] = 0;
        
        expenses.forEach(e => {
          if (e.date.split('T')[0] === key) {
            map[dayName] += e.amount;
          }
        });
      }
    } else if (timeframe === 'month') {
      // Group by Week of Month (Last 4 weeks)
      for (let i = 3; i >= 0; i--) {
        const dEnd = new Date();
        dEnd.setDate(dEnd.getDate() - (i * 7));
        const dStart = new Date();
        dStart.setDate(dStart.getDate() - ((i + 1) * 7));
        
        const label = i === 0 ? "This Week" : `${i + 1} Weeks Ago`;
        map[label] = 0;

        expenses.forEach(e => {
          const ed = new Date(e.date);
          if (ed >= dStart && ed <= dEnd) {
            map[label] += e.amount;
          }
        });
      }
    } else {
      // Group by Month of Year (Last 12 Months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
        map[label] = 0;

        expenses.forEach(e => {
          const ed = new Date(e.date);
          if (ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()) {
            map[label] += e.amount;
          }
        });
      }
    }

    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  })();

  // ================= HABITS CALCULATIONS =================
  const totalHabitsCount = habits.length;
  
  // Calculate completion percentage for each habit within timeframe
  const habitCompletionRate = habits.map(h => {
    if (!h.completedAt || h.completedAt.length === 0) {
      return { name: h.name, rate: 0, streak: h.streak };
    }
    
    // Filter completions based on standard timeframe limit days
    let daysDiff = 30;
    if (timeframe === 'week') daysDiff = 7;
    if (timeframe === 'year') daysDiff = 365;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysDiff);

    const validCompletions = h.completedAt.filter(dateStr => {
      const d = new Date(dateStr);
      return d >= limitDate;
    }).length;

    // Estimate expected (simplified: 1 per day/week depending on frequency)
    const expected = h.frequency === 'daily' ? daysDiff : Math.ceil(daysDiff / 7);
    const rate = Math.min(100, Math.round((validCompletions / expected) * 100));

    return {
      name: h.name,
      rate,
      streak: h.streak
    };
  });

  // Heatmap: Day of weed habit frequency
  const habitWeekdayCounts = (() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    habits.forEach(h => {
      h.completedAt?.forEach(dateStr => {
        const d = new Date(dateStr);
        counts[d.getDay()] += 1;
      });
    });

    return weekdays.map((name, idx) => ({
      name,
      Completions: counts[idx]
    }));
  })();

  // ================= TASKS CALCULATIONS =================
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const taskCompletionRate = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0;

  // Eisenhower quadrants count
  const quadrantDistribution = (() => {
    const qLabels: Record<string, string> = {
      [EisenhowerQuadrant.URGENT_IMPORTANT]: 'Urgent & Important',
      [EisenhowerQuadrant.NOT_URGENT_IMPORTANT]: 'Important (Not Urgent)',
      [EisenhowerQuadrant.URGENT_NOT_IMPORTANT]: 'Urgent (Not Important)',
      [EisenhowerQuadrant.NOT_URGENT_NOT_IMPORTANT]: 'Not Urgent / Important'
    };

    const counts: Record<string, number> = {
      'Urgent & Important': 0,
      'Important (Not Urgent)': 0,
      'Urgent (Not Important)': 0,
      'Not Urgent / Important': 0
    };

    tasks.forEach(t => {
      let label = 'Not Urgent / Important';
      if (t.quadrant === EisenhowerQuadrant.URGENT_IMPORTANT) label = 'Urgent & Important';
      else if (t.quadrant === EisenhowerQuadrant.NOT_URGENT_IMPORTANT) label = 'Important (Not Urgent)';
      else if (t.quadrant === EisenhowerQuadrant.URGENT_NOT_IMPORTANT) label = 'Urgent (Not Important)';
      
      counts[label] += 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // ================= STUDY PLANNER CALCULATIONS =================
  const totalCourses = courses.length;
  const avgCourseProgress = totalCourses > 0
    ? Math.round(courses.reduce((acc, curr) => acc + curr.progress, 0) / totalCourses)
    : 0;

  const examsCount = courses.reduce((acc, curr) => acc + (curr.exams?.length || 0), 0);
  
  // Materials progress
  const materialStats = (() => {
    let completed = 0;
    let total = 0;
    courses.forEach(c => {
      c.materials?.forEach(m => {
        total++;
        if (m.completed) completed++;
      });
    });
    return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  })();

  const studyCoursesOverview = courses.map(c => ({
    name: c.name,
    Progress: c.progress,
    Milestones: c.exams?.length || 0,
    Materials: c.materials?.length || 0
  }));

  // ================= GOALS CALCULATIONS =================
  const totalGoals = goals.length;
  const achievedGoalsCount = goals.filter(g => g.progress === 100).length;
  const avgGoalProgressByTerm = (() => {
    const types = [GoalType.SHORT, GoalType.MEDIUM, GoalType.LONG];
    return types.map(type => {
      const filtered = goals.filter(g => g.type === type);
      const avg = filtered.length > 0 
        ? Math.round(filtered.reduce((acc, curr) => acc + curr.progress, 0) / filtered.length)
        : 0;
      return {
        name: type,
        'Avg Progress': avg,
        Count: filtered.length
      };
    });
  })();

  const overallAvgGoalProgress = totalGoals > 0
    ? Math.round(goals.reduce((acc, curr) => acc + curr.progress, 0) / totalGoals)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
            Performance & Analytics
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Visual metrics mapping your finances, habits, milestones, and daily schedule orchestration.
          </p>
        </div>

        {/* TIMEFRAME SELECTOR */}
        <div className="flex bg-gray-150 dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700/60 max-w-sm shrink-0">
          {(['week', 'month', 'year'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTimeframe(type)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all capitalize",
                timeframe === type
                  ? "bg-black dark:bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              )}
            >
              {type === 'week' ? 'Week' : type === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* OVERALL METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Expenses Metric */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
              <Wallet className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">Spent</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black font-mono tracking-tight dark:text-white">{formatVal(totalExpenseAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">Expenses in this {timeframe}</p>
          </div>
        </div>

        {/* Habits Completion Metric */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-2xl">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md">Habits</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black font-mono tracking-tight dark:text-white">
              {habits.reduce((acc, c) => Math.max(acc, c.streak), 0)} Day
            </p>
            <p className="text-xs text-gray-400 mt-1">Highest active streak</p>
          </div>
        </div>

        {/* Tasks Metric */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-md">Tasks</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black font-mono tracking-tight dark:text-white">{taskCompletionRate}%</p>
            <p className="text-xs text-gray-400 mt-1">{completedTasksCount} of {totalTasksCount} done</p>
          </div>
        </div>

        {/* Goals Metric */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-2xl">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-md">Goals</span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black font-mono tracking-tight dark:text-white">{overallAvgGoalProgress}%</p>
            <p className="text-xs text-gray-400 mt-1">{achievedGoalsCount} of {totalGoals} reached 100%</p>
          </div>
        </div>
      </div>

      {/* DETAILED STATS SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ================= 1. FINANCIAL FLOW & SPENDING TRENDS ================= */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500 animate-pulse" />
                Expenses Trend ({timeframe})
              </h3>
              <span className="text-xs font-mono font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
                Total: {formatVal(totalExpenseAmount)}
              </span>
            </div>
            {expensesTrend.length === 0 || totalExpenseAmount === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">No expense entries found for this {timeframe}.</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesTrend}>
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} unit={currency === "USD" ? "$" : "₹"} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }}
                      labelStyle={{ color: '#F3F4F6', fontWeight: 'bold' }}
                      itemStyle={{ color: '#10B981' }}
                    />
                    <Bar dataKey="amount" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown (Piechart) */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-indigo-500" />
              Spending by Category
            </h3>
            {expenseByCategory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">Add items in expenses to analyze categories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                <div className="h-60 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }}
                        itemStyle={{ color: '#FFF' }}
                        formatter={(val: number) => [formatVal(val), 'Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Total</p>
                    <p className="text-lg font-black font-mono dark:text-white leading-none mt-1">{formatVal(totalExpenseAmount)}</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {expenseByCategory.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800/55 pb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300 capitalize truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-bold font-mono dark:text-white">{formatVal(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. HABIT CONSISTENCY & CALENDAR RHYTHM ================= */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
              Habit Success Rate ({timeframe === 'week' ? 'Past Week' : timeframe === 'month' ? 'Past 30 Days' : 'Past Year'})
            </h3>
            {habitCompletionRate.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">No habits registered yet.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {habitCompletionRate.map((hab, idx) => (
                  <div key={hab.name} className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-sm dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {hab.name}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
                        <span>Streak: <span className="text-orange-500 font-black">{hab.streak}d</span></span>
                        <span>{hab.rate}% Completed</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-700" 
                        style={{ width: `${hab.rate}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Habit Completion heatmap over day of week */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Habit Completion Frequency by Day of Week
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={habitWeekdayCounts}>
                  <defs>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" dark-stroke="#374151" className="opacity-40" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Area type="monotone" dataKey="Completions" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorCompletions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= 3. EISENHOWER TASK PRIORITY & MATRIX DISTRIBUTION ================= */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Task Execution Rate
            </h3>
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: completedTasksCount },
                        { name: 'Pending', value: Math.max(0, totalTasksCount - completedTasksCount) }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#E5E7EB" className="dark:fill-gray-800" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="text-2xl font-black font-mono dark:text-white">{taskCompletionRate}%</span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Finished</p>
                </div>
              </div>
              <div className="flex gap-8 mt-6">
                <div className="text-center">
                  <span className="text-xs text-gray-400 block">Total Configured</span>
                  <span className="text-lg font-black dark:text-white">{totalTasksCount}</span>
                </div>
                <div className="border-r border-gray-100 dark:border-gray-800 h-8 self-center"></div>
                <div className="text-center">
                  <span className="text-xs text-gray-400 block">Completed</span>
                  <span className="text-lg font-black text-green-500">{completedTasksCount}</span>
                </div>
                <div className="border-r border-gray-100 dark:border-gray-800 h-8 self-center"></div>
                <div className="text-center">
                  <span className="text-xs text-gray-400 block">Pending</span>
                  <span className="text-lg font-black text-rose-500">{totalTasksCount - completedTasksCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quadrant dispersion */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-500" />
              Tasks Priority Dispersion (Eisenhower)
            </h3>
            {totalTasksCount === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">Add tasks in Eisenhower quadrant to analyze priorities.</p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quadrantDistribution} layout="vertical">
                    <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={130} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }}
                      itemStyle={{ color: '#6366F1' }}
                    />
                    <Bar dataKey="value" fill="#6366F1" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ================= 4. STUDY PLANNER MASTERIES ================= */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500 animate-pulse" />
              Course Progress & Mastery Dashboard
            </h3>
            {totalCourses === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">Register first semester course to display study analytics.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 mb-4">
                  <div>
                    <span className="text-xs text-gray-400 block font-semibold">Average Studying Mastery</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{avgCourseProgress}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block font-semibold">Scheduled Midterms/Exams</span>
                    <span className="text-2xl font-black dark:text-white">{examsCount}</span>
                  </div>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studyCoursesOverview}>
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }}
                        labelStyle={{ color: '#FFF' }}
                      />
                      <Bar dataKey="Progress" fill="#6366F1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Study Materials stats */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              Reading Materials Mastery
            </h3>
            {totalCourses === 0 || materialStats.total === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">Add class courses and review materials to populate stats.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed Material', value: materialStats.completed },
                          { name: 'Pending Material', value: materialStats.total - materialStats.completed }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        <Cell fill="#6366F1" />
                        <Cell fill="#E5E7EB" className="dark:fill-gray-800" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-2xl font-black font-mono dark:text-white">{materialStats.rate}%</span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Learnt</p>
                  </div>
                </div>
                <p className="text-sm font-semibold dark:text-gray-300 mt-6 text-center">
                  {materialStats.completed} of {materialStats.total} reading tasks achieved successfully
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ================= 5. GOALS PERFORMANCE GAUGE ================= */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex flex-col justify-between min-h-[420px] lg:col-span-2">
          <div>
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500 animate-pulse" />
              Strategic Goals Average Progress & Volume
            </h3>
            {totalGoals === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                <p className="text-sm italic">Generate long-term or short-term goals to analyze milestone performance.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={avgGoalProgressByTerm}>
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', borderRadius: '12px', border: 'none' }}
                        itemStyle={{ color: '#8B5CF6' }}
                      />
                      <Bar dataKey="Avg Progress" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/60 text-center">
                    <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider">Overall Goal Completion</span>
                    <span className="text-4xl font-mono font-black text-purple-500">{overallAvgGoalProgress}%</span>
                    <p className="text-xs text-gray-400 mt-2">Weighted average progress of all tracked goals</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {avgGoalProgressByTerm.map(g => (
                      <div key={g.name} className="p-2 border border-gray-100 dark:border-gray-800/60 rounded-xl">
                        <span className="text-gray-400 block font-semibold capitalize">{g.name.split('-')[0]}</span>
                        <span className="font-bold dark:text-white block mt-1">{g.Count} goals</span>
                        <span className="text-purple-500 font-bold block">{g['Avg Progress']}% avg</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
