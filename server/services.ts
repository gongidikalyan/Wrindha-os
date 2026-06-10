import { dbQuery, supabase } from "./db.ts";
import crypto from "crypto";
import Razorpay from "razorpay";

// =========================================================================
// 1. AUTHENTICATION & PROFILE CREATION SERVICE
// =========================================================================

export async function createProfileAndTrial(userId: string, email: string, fullName: string | null) {
  const now = new Date();
  const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 Days onwards

  // 1. Check if profile already exists
  const existingProfileRes = await dbQuery<any>("profiles", "select", { match: { id: userId } });
  if (existingProfileRes.data && Array.isArray(existingProfileRes.data) && existingProfileRes.data.length > 0) {
    const existingProfile = existingProfileRes.data[0];
    
    // Update last active
    await dbQuery("profiles", "update", {
      match: { id: userId },
      data: {
        last_active: now.toISOString(),
        last_login_at: now.toISOString()
      }
    });

    // Check for existing subscription
    const existingSubRes = await dbQuery<any>("subscriptions", "select", { match: { user_id: userId } });
    const existingSub = existingSubRes.data && Array.isArray(existingSubRes.data) && existingSubRes.data.length > 0
      ? existingSubRes.data[0]
      : null;

    return { profile: existingProfile, subscription: existingSub };
  }

  // 2. Insert Profile (New User)
  const profilePayload = {
    id: userId,
    email: email,
    full_name: fullName || "Valued Customer",
    last_active: now.toISOString(),
    updated_at: now.toISOString(),
    subscription_tier: "trial",
    max_habits: 999,
    custom_features: { ai_chat: true, advanced_analytics: true },
    budget: 0,
    currency: "INR",
    trial_start_date: now.toISOString(),
    trial_end_date: trialEndDate.toISOString(),
    is_trial_activated: true,
    has_paid: false,
    role: "user",
    account_status: "trial",
    last_login_at: now.toISOString()
  };

  const profileRes = await dbQuery("profiles", "insert", { data: profilePayload });
  if (profileRes.error) {
    throw new Error(`Profile creation failed: ${profileRes.error.message || profileRes.error}`);
  }

  // 3. Insert Trial Subscription Record
  const subscriptionPayload = {
    id: crypto.randomUUID(),
    user_id: userId,
    plan: "trial",
    status: "active",
    trial_start_at: now.toISOString(),
    trial_end_at: trialEndDate.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEndDate.toISOString(),
    created_at: now.toISOString()
  };

  const subRes = await dbQuery("subscriptions", "insert", { data: subscriptionPayload });
  if (subRes.error) {
    console.error("Warning: Subscription record insertion bypassed or failed. Proceeding.", subRes.error.message || subRes.error);
  }

  return { profile: profilePayload, subscription: subscriptionPayload };
}


// =========================================================================
// 2. SUBSCRIPTION VERIFICATION SERVICE
// =========================================================================

export async function checkSubscriptionStatus(userId: string): Promise<{
  canModify: boolean;
  plan: string;
  status: string;
}> {
  // 1. Check user profile role/status
  const profileRes = await dbQuery<any>("profiles", "select", { match: { id: userId } });
  if (!profileRes.data || !Array.isArray(profileRes.data) || profileRes.data.length === 0) {
    return { canModify: true, plan: "trial", status: "active" }; // Safe diagnostic default
  }

  const profile = profileRes.data[0];

  // Admins bypass all restriction blockages
  if (profile.role === "admin") {
    return { canModify: true, plan: "premium", status: "active" };
  }

  // Fetch current active subscription record
  const subRes = await dbQuery<any>("subscriptions", "select", { match: { user_id: userId } });
  
  let subscription = subRes.data && Array.isArray(subRes.data) && subRes.data.length > 0 
    ? subRes.data[0] 
    : null;

  const now = new Date();

  // If subscription is premium and active (not expired)
  if (profile.subscription_tier === "premium" || (subscription && subscription.plan === "premium" && subscription.status === "active")) {
    return { canModify: true, plan: "premium", status: "active" };
  }

  // Check trial timelines
  const endLimit = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
  const isTrialActive = endLimit && endLimit.getTime() > now.getTime();

  if (profile.account_status === "trial" && isTrialActive) {
    return { canModify: true, plan: "trial", status: "active" };
  }

  // If trial has expired
  if (profile.account_status === "expired" || !isTrialActive) {
    // Automatically flag as expired in the database profiles log for next-log persistence
    if (profile.account_status !== "expired") {
      await dbQuery("profiles", "update", {
        match: { id: userId },
        data: { account_status: "expired" }
      });
    }
    return { canModify: false, plan: "trial", status: "expired" };
  }

  return { canModify: true, plan: "trial", status: "active" };
}


// =========================================================================
// 3. LifeOS TASK MODULE SERVICE
// =========================================================================

export async function getTasks(userId: string, filters: {
  status?: string;
  priority_level?: string;
  eisenhower_quadrant?: string;
  quadrant?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 100;
  const offset = (page - 1) * limit;

  const res = await dbQuery<any>("tasks", "select", {
    match: { user_id: userId },
    queryBuilder: (qb) => {
      let run = qb;
      if (filters.status) run = run.eq("status", filters.status);
      if (filters.priority_level) run = run.eq("priority_level", filters.priority_level);
      if (filters.eisenhower_quadrant) run = run.eq("eisenhower_quadrant", filters.eisenhower_quadrant);
      if (filters.quadrant) run = run.eq("quadrant", filters.quadrant);
      return run.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    }
  });

  return {
    tasks: res.data || [],
    page,
    limit,
    source: res.source
  };
}

export async function createTask(userId: string, taskObj: {
  title: string;
  description?: string;
  quadrant?: "UI" | "NUI" | "UNI" | "NUNI";
  due_date?: string;
  tags?: string[];
  status?: string;
  priority_level?: string;
  eisenhower_quadrant?: "do_first" | "schedule" | "delegate" | "eliminate";
  kanban_column?: string;
  goal_id?: string;
}) {
  const taskId = `task_${Math.random().toString(36).substring(2, 11)}`;
  const now = new Date().toISOString();

  const payload = {
    id: taskId,
    user_id: userId,
    title: taskObj.title,
    description: taskObj.description || null,
    completed: taskObj.status === "completed",
    quadrant: taskObj.quadrant || "UI",
    due_date: taskObj.due_date || null,
    tags: taskObj.tags || [],
    created_at: now,
    status: taskObj.status || "pending",
    priority_level: taskObj.priority_level || null,
    eisenhower_quadrant: taskObj.eisenhower_quadrant || null,
    kanban_column: taskObj.kanban_column || "todo",
    goal_id: taskObj.goal_id || null,
    completed_at: taskObj.status === "completed" ? now : null
  };

  const res = await dbQuery<any>("tasks", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function updateTask(userId: string, taskId: string, updates: any) {
  const matches = { id: taskId, user_id: userId };
  const writePayload: any = { ...updates };

  if (updates.status === "completed") {
    writePayload.completed = true;
    writePayload.completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== "completed") {
    writePayload.completed = false;
    writePayload.completed_at = null;
  }

  const res = await dbQuery<any>("tasks", "update", {
    match: matches,
    data: writePayload
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteTask(userId: string, taskId: string) {
  const res = await dbQuery("tasks", "delete", {
    match: { id: taskId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Task deleted successfully" };
}


// =========================================================================
// 4. GOAL SYSTEM DESIGN SERVICE
// =========================================================================

export async function recalculateGoalProgress(goalId: string) {
  // 1. Fetch total and completed milestones
  const milestoneRes = await dbQuery<any>("goal_milestones", "select", { match: { goal_id: goalId } });
  const milestones = milestoneRes.data || [];

  if (milestones.length === 0) return 0;

  const completed = milestones.filter((ms: any) => ms.status === "completed").length;
  const progressPercentage = Math.round((completed / milestones.length) * 100);

  // 2. Commit computed progress percentage to goal record
  await dbQuery("goals", "update", {
    match: { id: goalId },
    data: { progress: progressPercentage }
  });

  return progressPercentage;
}

export async function createGoal(userId: string, goalObj: { title: string; type?: string; target_date?: string }) {
  const goalId = `goal_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id: goalId,
    user_id: userId,
    title: goalObj.title,
    type: goalObj.type || null,
    progress: 0,
    target_date: goalObj.target_date || null,
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("goals", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function updateGoal(userId: string, goalId: string, updates: any) {
  const res = await dbQuery("goals", "update", {
    match: { id: goalId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteGoal(userId: string, goalId: string) {
  // First clean up associated milestones to ensure cascading design integrity
  await dbQuery("goal_milestones", "delete", { match: { goal_id: goalId } });
  const res = await dbQuery("goals", "delete", { match: { id: goalId, user_id: userId } });
  if (res.error) throw res.error;
  return { success: true };
}

export async function createMilestone(goalId: string, milestone: { title: string; description?: string; target_date?: string }) {
  const milestoneId = `ms_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id: milestoneId,
    goal_id: goalId,
    title: milestone.title,
    description: milestone.description || null,
    target_date: milestone.target_date || null,
    status: "pending",
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("goal_milestones", "insert", { data: payload });
  if (res.error) throw res.error;

  await recalculateGoalProgress(goalId);
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function updateMilestone(goalId: string, milestoneId: string, updates: any) {
  const res = await dbQuery("goal_milestones", "update", {
    match: { id: milestoneId, goal_id: goalId },
    data: updates
  });
  if (res.error) throw res.error;

  await recalculateGoalProgress(goalId);
  return res.data;
}

export async function deleteMilestone(goalId: string, milestoneId: string) {
  const res = await dbQuery("goal_milestones", "delete", {
    match: { id: milestoneId, goal_id: goalId }
  });
  if (res.error) throw res.error;

  await recalculateGoalProgress(goalId);
  return { success: true };
}


// =========================================================================
// 5. HABIT TRACKING SYSTEM SERVICE
// =========================================================================

export async function calculateHabitStreak(habitId: string, completedDates: string[]): Promise<number> {
  if (!completedDates || completedDates.length === 0) return 0;
  
  // Format to standard sorted dates (YYYY-MM-DD format)
  const sortedDates = [...completedDates]
    .map(d => d.split("T")[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Descending order
  
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const firstCompleted = new Date(sortedDates[0]);
  firstCompleted.setHours(0,0,0,0);

  // Check if last completion was within allowable steak limits (either today or yesterday)
  if (firstCompleted.getTime() !== today.getTime() && firstCompleted.getTime() !== yesterday.getTime()) {
    return 0; // Streak broken
  }

  let indexDate = firstCompleted;
  for (let i = 0; i < sortedDates.length; i++) {
    const compDate = new Date(sortedDates[i]);
    compDate.setHours(0,0,0,0);

    const diffDays = Math.round((indexDate.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      currentStreak++;
    } else if (diffDays === 1) {
      currentStreak++;
      indexDate = compDate;
    } else {
      break; // Gap detected
    }
  }

  return currentStreak;
}

export async function createHabit(userId: string, habit: { name: string; frequency?: "daily" | "weekly"; color?: string }) {
  const habitId = `habit_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id: habitId,
    user_id: userId,
    name: habit.name,
    frequency: habit.frequency || "daily",
    streak: 0,
    completed_at: [],
    color: habit.color || null,
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("habits", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function logHabitCompletion(userId: string, habitId: string, dateStr: string) {
  // 1. Log session inside standard logs table
  const logId = `hl_${Math.random().toString(36).substring(2, 11)}`;
  await dbQuery("habit_logs", "insert", {
    data: {
      id: logId,
      habit_id: habitId,
      completed_date: dateStr,
      created_at: new Date().toISOString()
    }
  });

  // 2. Refresh streak inside habits main document
  const habitRes = await dbQuery<any>("habits", "select", { match: { id: habitId, user_id: userId } });
  if (!habitRes.data || habitRes.data.length === 0) throw new Error("Habit not found");

  const habit = habitRes.data[0];
  const updatedCompletedList = [...(habit.completed_at || [])];
  if (!updatedCompletedList.includes(dateStr)) {
    updatedCompletedList.push(dateStr);
  }

  const computedStreak = await calculateHabitStreak(habitId, updatedCompletedList);

  await dbQuery("habits", "update", {
    match: { id: habitId, user_id: userId },
    data: {
      completed_at: updatedCompletedList,
      streak: computedStreak
    }
  });

  return { success: true, streak: computedStreak, completedList: updatedCompletedList };
}

export async function removeHabitLog(userId: string, habitId: string, dateStr: string) {
  await dbQuery("habit_logs", "delete", {
    match: { habit_id: habitId, completed_date: dateStr }
  });

  const habitRes = await dbQuery<any>("habits", "select", { match: { id: habitId, user_id: userId } });
  if (!habitRes.data || habitRes.data.length === 0) throw new Error("Habit not found");

  const habit = habitRes.data[0];
  const updatedCompletedList = (habit.completed_at || []).filter((d: string) => d !== dateStr);
  const computedStreak = await calculateHabitStreak(habitId, updatedCompletedList);

  await dbQuery("habits", "update", {
    match: { id: habitId, user_id: userId },
    data: {
      completed_at: updatedCompletedList,
      streak: computedStreak
    }
  });

  return { success: true, streak: computedStreak, completedList: updatedCompletedList };
}

export async function getHabitAnalytics(userId: string) {
  const habitRes = await dbQuery<any>("habits", "select", { match: { user_id: userId } });
  const habitList = habitRes.data || [];

  if (habitList.length === 0) return { totalHabits: 0, averageStreak: 0, CompletionScores: [] };

  const totalStreak = habitList.reduce((sum: number, h: any) => sum + (h.streak || 0), 0);
  const averageStreak = Math.round((totalStreak / habitList.length) * 10) / 10;

  const mappedAnalytics = habitList.map((h: any) => ({
    id: h.id,
    name: h.name,
    streak: h.streak || 0,
    completionsCount: (h.completed_at || []).length,
    frequency: h.frequency
  }));

  return {
    totalHabits: habitList.length,
    averageStreak,
    habitStatSummary: mappedAnalytics
  };
}


// =========================================================================
// 6. STUDY PLANNER LOGIC SERVICE
// =========================================================================

export async function createStudyCourse(userId: string, course: { name: string; target_hours?: number; description?: string; color?: string; exam_date?: string }) {
  const id = `course_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    user_id: userId,
    name: course.name,
    progress: 0,
    color: course.color || null,
    exams: JSON.stringify([]),
    materials: JSON.stringify([]),
    description: course.description || null,
    exam_date: course.exam_date || null,
    target_hours: course.target_hours || 0,
    status: "active",
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("study_courses", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function createStudySession(courseId: string, durationMinutes: number, topic: string, notes?: string) {
  const id = `session_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    course_id: courseId,
    session_date: new Date().toISOString().split("T")[0],
    duration_minutes: durationMinutes,
    topic: topic,
    notes: notes || null,
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("study_sessions", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function getStudyAnalytics(userId: string) {
  // Query study courses
  const courseRes = await dbQuery<any>("study_courses", "select", { match: { user_id: userId } });
  const courses = courseRes.data || [];

  let totalMinutes = 0;
  const sessionsCountMap: Record<string, number> = {};
  const sessionsDurationMap: Record<string, number> = {};

  for (const course of courses) {
    const sessionRes = await dbQuery<any>("study_sessions", "select", { match: { course_id: course.id } });
    const sessions = sessionRes.data || [];
    
    sessionsCountMap[course.id] = sessions.length;
    const minutes = sessions.reduce((s: number, session: any) => s + (session.duration_minutes || 0), 0);
    sessionsDurationMap[course.id] = minutes;
    totalMinutes += minutes;
  }

  const courseBreakdown = courses.map((c: any) => ({
    id: c.id,
    name: c.name,
    progress: c.progress || 0,
    sessionsRecorded: sessionsCountMap[c.id] || 0,
    totalMinutesStudied: sessionsDurationMap[c.id] || 0,
    targetHours: c.target_hours || 0
  }));

  return {
    totalCoursesCount: courses.length,
    accumulatedStudyMinutes: totalMinutes,
    courses: courseBreakdown
  };
}


// =========================================================================
// 7. CAREER PATHWAYS ROADMAP ENGINE
// =========================================================================

export async function createRoadmap(userId: string, title: string, description?: string) {
  const id = `roadmap_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    user_id: userId,
    title,
    description: description || null,
    status: "active",
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("career_roadmaps", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function createSkill(roadmapId: string, skillName: string, proficiencyLevel?: string) {
  const id = `skill_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    roadmap_id: roadmapId,
    skill_name: skillName,
    proficiency_level: proficiencyLevel || "beginner",
    status: "learning",
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("skills", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function getRoadmapProgress(roadmapId: string) {
  const skillRes = await dbQuery<any>("skills", "select", { match: { roadmap_id: roadmapId } });
  const skills = skillRes.data || [];

  if (skills.length === 0) return 0;

  const mastered = skills.filter((sk: any) => sk.status === "mastered").length;
  const learning = skills.filter((sk: any) => sk.status === "learning").length;

  // Mastered gets 100% weight, Learning gets 40% partial weight
  const score = (mastered * 100 + learning * 40) / skills.length;
  return Math.min(100, Math.round(score));
}


// =========================================================================
// 8. EXPENSE ENGINE & BUDGET CONTROLS
// =========================================================================

export async function createExpense(userId: string, expense: { amount: number; category: string; date: string; note?: string; transaction_type?: "income" | "expense" }) {
  const id = `exp_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    user_id: userId,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    note: expense.note || null,
    created_at: new Date().toISOString(),
    transaction_date: expense.date,
    transaction_type: expense.transaction_type || "expense",
    notes: expense.note || null
  };

  const res = await dbQuery("expenses", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function createBudget(userId: string, category: string, amount: number, monthStr: string) {
  const id = `budget_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    user_id: userId,
    category,
    amount,
    month: monthStr, // YYYY-MM-01
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("budgets", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function getBudgetAnalytics(userId: string, monthStr: string) {
  // Budgets set
  const budgetRes = await dbQuery<any>("budgets", "select", { match: { user_id: userId, month: monthStr } });
  const budgets = budgetRes.data || [];

  // Expenses recorded in that month category
  const expenseRes = await dbQuery<any>("expenses", "select", { match: { user_id: userId, transaction_type: "expense" } });
  const monthStart = new Date(monthStr);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const monthExpenses = (expenseRes.data || []).filter((e: any) => {
    const d = new Date(e.date);
    return d >= monthStart && d < nextMonth;
  });

  const totalsByCategory: Record<string, number> = {};
  for (const exp of monthExpenses) {
    totalsByCategory[exp.category] = (totalsByCategory[exp.category] || 0) + parseFloat(exp.amount);
  }

  const analysis = budgets.map((b: any) => {
    const spent = totalsByCategory[b.category] || 0;
    return {
      category: b.category,
      allocated: parseFloat(b.amount),
      spent,
      warningLimitExceeded: spent > parseFloat(b.amount),
      remaining: Math.max(0, parseFloat(b.amount) - spent)
    };
  });

  return {
    month: monthStr,
    totalExpensesInPeriod: monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0),
    budgetReport: analysis
  };
}


// =========================================================================
// 9. TIMETABLE SERVICES
// =========================================================================

export async function createTimetable(userId: string, title: string, type?: string) {
  const id = `tt_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    user_id: userId,
    title,
    type: type || "weekly",
    date: new Date().toISOString().split("T")[0],
    color: "#4f46e5",
    created_at: new Date().toISOString(),
    timetable_type: "weekly",
    is_active: true,
    description: null
  };

  const res = await dbQuery("timetable", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function createTimetableEntry(timetableId: string, entry: { day_of_week: number; start_time: string; end_time: string; title: string; description?: string }) {
  const id = `tte_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    timetable_id: timetableId,
    day_of_week: entry.day_of_week,
    start_time: entry.start_time,
    end_time: entry.end_time,
    title: entry.title,
    description: entry.description || null,
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("timetable_entries", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}


// =========================================================================
// 10. PRODUCTIVITY SNAPSHOT & SCORING ENGINE
// =========================================================================

export async function calculateProductivityScore(tasksComp: number, habitsComp: number, studyMin: number): Promise<number> {
  // Algorithms score weighted out of 100:
  // - 10 points per task completed (capped at 40pts)
  // - 15 points per habit logged (capped at 30pts)
  // - 0.5 points per study minute logged (capped at 30pts)
  const taskWeight = Math.min(40, tasksComp * 10);
  const habitWeight = Math.min(30, habitsComp * 15);
  const studyWeight = Math.min(30, studyMin * 0.5);

  return Math.min(100, Math.round(taskWeight + habitWeight + studyWeight));
}

export async function generateDailySnapshot(userId: string) {
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Gather counts of completed tasks, habits, study sessions today
  const [tasksRes, habitsRes, studyRes, goalsRes] = await Promise.all([
    dbQuery<any>("tasks", "select", { match: { user_id: userId, status: "completed" } }),
    dbQuery<any>("habits", "select", { match: { user_id: userId } }),
    dbQuery<any>("study_sessions", "select", {}), // Filter downstream to check course ownership
    dbQuery<any>("goals", "select", { match: { user_id: userId } })
  ]);

  // Filter tasks completed today
  const tasksCompletedToday = (tasksRes.data || []).filter((t: any) => {
    return t.completed_at && t.completed_at.startsWith(todayStr);
  }).length;

  // Filter habits completed today
  const habitsCompletedToday = (habitsRes.data || []).filter((h: any) => {
    return Array.isArray(h.completed_at) && h.completed_at.some((d: string) => d.startsWith(todayStr));
  }).length;

  // Filter study sessions completed today owned by user courses
  const courseRes = await dbQuery<any>("study_courses", "select", { match: { user_id: userId } });
  const courseIds = (courseRes.data || []).map((c: any) => c.id);
  const studyMinsToday = (studyRes.data || [])
    .filter((s: any) => courseIds.includes(s.course_id) && s.session_date === todayStr)
    .reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

  // Completed goals (progress = 100)
  const goalsCompletedCount = (goalsRes.data || []).filter((g: any) => g.progress >= 100).length;

  // Compute scorecard
  const score = await calculateProductivityScore(tasksCompletedToday, habitsCompletedToday, studyMinsToday);

  // Commit to snapshots table
  const snapshotId = `snap_${Math.random().toString(36).substring(2, 11)}`;
  const snapshotPayload = {
    id: snapshotId,
    user_id: userId,
    snapshot_date: todayStr,
    tasks_completed: tasksCompletedToday,
    habits_completed: habitsCompletedToday,
    study_minutes: studyMinsToday,
    goals_completed: goalsCompletedCount,
    productivity_score: score,
    created_at: new Date().toISOString()
  };

  const res = await dbQuery("analytics_snapshots", "insert", { data: snapshotPayload });
  if (res.error) {
    console.warn("Unable to store snaps in PostgreSQL. Sandbox fallback activated.", res.error.message || res.error);
  }

  return snapshotPayload;
}


// =========================================================================
// 11. RAZORPAY SUBSCRIPTIONS GATEWAY INTEGRATION
// =========================================================================

// Safe verification helper if signature comes in Webhook payloads
export function verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
  const calculatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return calculatedSignature === signature;
}

export async function handleRazorpayWebhookSecure(eventBody: any) {
  const { event, payload } = eventBody;
  
  console.log(`[Razorpay Webhook Resolver] Dispatching secure event: ${event}`);

  if (event === "subscription.activated" || event === "subscription.charged") {
    const subObj = payload.subscription.entity;
    const notes = subObj.notes || {};
    const userId = notes.user_id;

    if (userId) {
      // 1. Mark status premium inside User Profile
      await dbQuery("profiles", "update", {
        match: { id: userId },
        data: {
          subscription_tier: "premium",
          has_paid: true,
          account_status: "premium"
        }
      });

      // 2. Refresh Subscriptions ledger match
      const existingSub = await dbQuery<any>("subscriptions", "select", { match: { user_id: userId } });
      const trialStart = subObj.trial_start ? new Date(subObj.trial_start * 1000).toISOString() : new Date().toISOString();
      const trialEnd = subObj.trial_end ? new Date(subObj.trial_end * 1000).toISOString() : new Date().toISOString();
      
      const updateData = {
        plan: "premium",
        status: "active",
        current_period_start: new Date(subObj.current_start * 1000).toISOString(),
        current_period_end: new Date(subObj.current_end * 1000).toISOString(),
        razorpay_customer_id: subObj.customer_id || null,
        razorpay_subscription_id: subObj.id || null
      };

      if (existingSub.data && existingSub.data.length > 0) {
        await dbQuery("subscriptions", "update", {
          match: { id: existingSub.data[0].id },
          data: updateData
        });
      } else {
        await dbQuery("subscriptions", "insert", {
          data: {
            user_id: userId,
            trial_start_at: trialStart,
            trial_end_at: trialEnd,
            ...updateData
          }
        });
      }

      // 3. Log Payment receipt
      if (payload.payment) {
        const payObj = payload.payment.entity;
        await dbQuery("payments", "insert", {
          data: {
            user_id: userId,
            razorpay_payment_id: payObj.id,
            amount: payObj.amount / 100, // paise to INR decimal
            currency: payObj.currency || "INR",
            status: "captured",
            paid_at: new Date().toISOString()
          }
        });
      }
    }
  }

  if (event === "subscription.cancelled") {
    const subObj = payload.subscription.entity;
    const notes = subObj.notes || {};
    const userId = notes.user_id;

    if (userId) {
      await dbQuery("profiles", "update", {
        match: { id: userId },
        data: { subscription_tier: "Free", account_status: "expired" }
      });

      await dbQuery("subscriptions", "update", {
        match: { user_id: userId },
        data: { status: "cancelled" }
      });
    }
  }

  if (event === "payment.captured") {
    const payObj = payload.payment.entity;
    const notes = payObj.notes || {};
    const userId = notes.user_id;

    if (userId) {
      // Direct captured single check payments
      await dbQuery("payments", "upsert", {
        data: {
          user_id: userId,
          razorpay_payment_id: payObj.id,
          amount: payObj.amount / 100,
          currency: payObj.currency || "INR",
          status: "captured",
          paid_at: new Date().toISOString()
        }
      });
    }
  }

  return { success: true };
}

// Helper to instanciate Razorpay server-side in services
function getRazorpayInstance() {
  let keyId = process.env.RAZORPAY_KEY_ID;
  let keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  keyId = keyId.trim().replace(/^["']|["']$/g, "");
  keySecret = keySecret.trim().replace(/^["']|["']$/g, "");
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

// =========================================================================
// 12. ARCHITECT COMPLEMENT SERVICE EXPORTS
// =========================================================================

export async function registerUser(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  if (data.user) {
    await createProfileAndTrial(data.user.id, email, fullName);
  }
  return data;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    await dbQuery("profiles", "update", {
      match: { id: data.user.id },
      data: { last_active: new Date().toISOString(), last_login_at: new Date().toISOString() }
    });
  }
  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return { success: true };
}

export async function createProfile(userId: string, email: string, fullName: string | null) {
  const now = new Date().toISOString();
  const payload = {
    id: userId,
    email: email,
    full_name: fullName || "Valued Customer",
    last_active: now,
    updated_at: now,
    subscription_tier: "trial",
    max_habits: 999,
    custom_features: { ai_chat: true, advanced_analytics: true },
    budget: 0,
    currency: "INR",
    trial_start_date: now,
    trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_trial_activated: true,
    has_paid: false,
    role: "user",
    account_status: "trial",
    last_login_at: now
  };
  const res = await dbQuery("profiles", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data;
}

export async function createTrialSubscription(userId: string) {
  const now = new Date();
  const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    plan: "trial",
    status: "active",
    trial_start_at: now.toISOString(),
    trial_end_at: trialEndDate.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEndDate.toISOString(),
    created_at: now.toISOString()
  };
  const res = await dbQuery("subscriptions", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data;
}

export async function expireTrial(userId: string) {
  await dbQuery("profiles", "update", {
    match: { id: userId },
    data: { account_status: "expired", subscription_tier: "Free" }
  });
  await dbQuery("subscriptions", "update", {
    match: { user_id: userId },
    data: { status: "expired" }
  });
  return { success: true, message: "Trial expired successfully." };
}

export async function upgradeToPremium(userId: string) {
  const now = new Date();
  const currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await dbQuery("profiles", "update", {
    match: { id: userId },
    data: { subscription_tier: "premium", account_status: "premium", has_paid: true }
  });
  await dbQuery("subscriptions", "update", {
    match: { user_id: userId },
    data: {
      plan: "premium",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: currentEnd.toISOString()
    }
  });
  return { success: true, message: "Upgraded to Premium successfully." };
}

export async function downgradeExpiredUser(userId: string) {
  await dbQuery("profiles", "update", {
    match: { id: userId },
    data: { subscription_tier: "Free", account_status: "expired" }
  });
  await dbQuery("subscriptions", "update", {
    match: { user_id: userId },
    data: { status: "cancelled" }
  });
  return { success: true, message: "Downgraded successfully." };
}

export async function updateHabit(userId: string, habitId: string, updates: any) {
  const res = await dbQuery("habits", "update", {
    match: { id: habitId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteHabit(userId: string, habitId: string) {
  await dbQuery("habit_logs", "delete", { match: { habit_id: habitId } });
  const res = await dbQuery("habits", "delete", {
    match: { id: habitId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Habit deleted successfully." };
}

export async function updateStudyCourse(userId: string, courseId: string, updates: any) {
  const res = await dbQuery("study_courses", "update", {
    match: { id: courseId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteStudyCourse(userId: string, courseId: string) {
  await dbQuery("study_sessions", "delete", { match: { course_id: courseId } });
  const res = await dbQuery("study_courses", "delete", {
    match: { id: courseId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Course deleted successfully." };
}

export async function updateStudySession(courseId: string, sessionId: string, updates: any) {
  const res = await dbQuery("study_sessions", "update", {
    match: { id: sessionId, course_id: courseId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteStudySession(courseId: string, sessionId: string) {
  const res = await dbQuery("study_sessions", "delete", {
    match: { id: sessionId, course_id: courseId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Session deleted successfully." };
}

export async function updateRoadmap(userId: string, roadmapId: string, updates: any) {
  const res = await dbQuery("career_roadmaps", "update", {
    match: { id: roadmapId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteRoadmap(userId: string, roadmapId: string) {
  await dbQuery("skills", "delete", { match: { roadmap_id: roadmapId } });
  const res = await dbQuery("career_roadmaps", "delete", {
    match: { id: roadmapId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Roadmap deleted successfully." };
}

export async function updateSkill(roadmapId: string, skillId: string, updates: any) {
  const res = await dbQuery("skills", "update", {
    match: { id: skillId, roadmap_id: roadmapId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteSkill(roadmapId: string, skillId: string) {
  const res = await dbQuery("skills", "delete", {
    match: { id: skillId, roadmap_id: roadmapId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Skill deleted successfully." };
}

export async function updateExpense(userId: string, expenseId: string, updates: any) {
  const res = await dbQuery("expenses", "update", {
    match: { id: expenseId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteExpense(userId: string, expenseId: string) {
  const res = await dbQuery("expenses", "delete", {
    match: { id: expenseId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Expense deleted successfully." };
}

export async function updateBudget(userId: string, budgetId: string, updates: any) {
  const res = await dbQuery("budgets", "update", {
    match: { id: budgetId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteBudget(userId: string, budgetId: string) {
  const res = await dbQuery("budgets", "delete", {
    match: { id: budgetId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Budget deleted successfully." };
}

export async function updateTimetable(userId: string, timetableId: string, updates: any) {
  const res = await dbQuery("timetable", "update", {
    match: { id: timetableId, user_id: userId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteTimetable(userId: string, timetableId: string) {
  await dbQuery("timetable_entries", "delete", { match: { timetable_id: timetableId } });
  const res = await dbQuery("timetable", "delete", {
    match: { id: timetableId, user_id: userId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Timetable deleted successfully." };
}

export async function updateTimetableEntry(timetableId: string, entryId: string, updates: any) {
  const res = await dbQuery("timetable_entries", "update", {
    match: { id: entryId, timetable_id: timetableId },
    data: updates
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteTimetableEntry(timetableId: string, entryId: string) {
  const res = await dbQuery("timetable_entries", "delete", {
    match: { id: entryId, timetable_id: timetableId }
  });
  if (res.error) throw res.error;
  return { success: true, message: "Timetable entry deleted successfully." };
}

export async function getAnalytics(userId: string) {
  const snapRes = await dbQuery<any>("analytics_snapshots", "select", {
    match: { user_id: userId },
    queryBuilder: (qb) => qb.order("created_at", { ascending: false }).limit(30)
  });
  const snapshots = snapRes.data || [];
  
  const totalCompletedTasks = snapshots.reduce((sum: number, s: any) => sum + (s.tasks_completed || 0), 0);
  const totalCompletedHabits = snapshots.reduce((sum: number, s: any) => sum + (s.habits_completed || 0), 0);
  const totalStudyMinutes = snapshots.reduce((sum: number, s: any) => sum + (s.study_minutes || 0), 0);
  const totalGoalsCompleted = snapshots.reduce((sum: number, s: any) => sum + (s.goals_completed || 0), 0);
  const avgScore = snapshots.length > 0 
    ? Math.round(snapshots.reduce((sum: number, s: any) => sum + (s.productivity_score || 0), 0) / snapshots.length) 
    : 0;

  return {
    snapshots,
    aggregates: {
      totalCompletedTasks,
      totalCompletedHabits,
      totalStudyMinutes,
      totalGoalsCompleted,
      averageProductivityScore: avgScore
    }
  };
}

export async function getUsers() {
  const res = await dbQuery("profiles", "select", {});
  return res.data || [];
}

export async function getUserDetails(userId: string) {
  const profileRes = await dbQuery<any>("profiles", "select", { match: { id: userId } });
  const profile = profileRes.data && profileRes.data[0] ? profileRes.data[0] : null;
  if (!profile) throw new Error("Profile not found");
  const tasksRes = await dbQuery("tasks", "select", { match: { user_id: userId } });
  const subRes = await dbQuery("subscriptions", "select", { match: { user_id: userId } });
  return {
    profile,
    tasks_count: (tasksRes.data as any[] || []).length,
    subscription: subRes.data && (subRes.data as any[])[0] ? (subRes.data as any[])[0] : null
  };
}

export async function updateUserRole(userId: string, role: string) {
  const res = await dbQuery("profiles", "update", {
    match: { id: userId },
    data: { role, updated_at: new Date().toISOString() }
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function getSubscriptions() {
  const res = await dbQuery("subscriptions", "select", {});
  return res.data || [];
}

export async function getPayments() {
  const res = await dbQuery("payments", "select", {});
  return res.data || [];
}

export async function getRevenueAnalytics() {
  const paymentsRes = await dbQuery<any>("payments", "select", { match: { status: "captured" } });
  const payments = paymentsRes.data || [];
  const totalAmount = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
  const byCurrency: Record<string, number> = {};
  for (const p of payments) {
    byCurrency[p.currency] = (byCurrency[p.currency] || 0) + parseFloat(p.amount);
  }
  return {
    totalRevenue: totalAmount,
    byCurrency,
    transactionsCount: payments.length
  };
}

export async function createAnnouncement(annObj: { title: string; message: string; is_active?: boolean }) {
  const id = `ann_${Math.random().toString(36).substring(2, 11)}`;
  const payload = {
    id,
    title: annObj.title,
    message: annObj.message,
    is_active: annObj.is_active ?? true,
    start_date: new Date().toISOString(),
    end_date: null,
    created_by: "admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const res = await dbQuery("announcements", "insert", { data: payload });
  if (res.error) throw res.error;
  return res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : payload;
}

export async function updateAnnouncement(annId: string, updates: any) {
  const res = await dbQuery("announcements", "update", {
    match: { id: annId },
    data: { ...updates, updated_at: new Date().toISOString() }
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function deleteAnnouncement(annId: string) {
  const res = await dbQuery("announcements", "delete", { match: { id: annId } });
  if (res.error) throw res.error;
  return { success: true };
}

export async function replyToTicket(ticketId: string, adminId: string, responseText: string) {
  const res = await dbQuery("support_tickets", "update", {
    match: { id: ticketId },
    data: { admin_response: responseText, status: "in_progress", updated_at: new Date().toISOString() }
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function closeTicket(ticketId: string) {
  const res = await dbQuery("support_tickets", "update", {
    match: { id: ticketId },
    data: { status: "closed", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function getFeatureRequests() {
  const res = await dbQuery("feature_requests", "select", {});
  return res.data || [];
}

export async function createSubscription(userId: string, planId: string) {
  const rzp = getRazorpayInstance();
  if (!rzp) {
    const mockSubId = `sub_sand_${Math.random().toString(36).substring(2, 11)}`;
    return {
      success: true,
      isSandbox: true,
      subscriptionId: mockSubId,
      message: "Sandbox subscription order registered successfully."
    };
  }
  const subOptions = {
    plan_id: planId,
    customer_notify: 1,
    total_count: 12,
    notes: { user_id: userId }
  };
  const subscription: any = await rzp.subscriptions.create(subOptions as any);
  return {
    success: true,
    isSandbox: false,
    subscriptionId: subscription.id
  };
}

export async function cancelSubscription(userId: string, subscriptionId: string) {
  const rzp = getRazorpayInstance();
  if (!rzp || subscriptionId.startsWith("sub_sand_")) {
    await dbQuery("profiles", "update", {
      match: { id: userId },
      data: { subscription_tier: "Free", account_status: "expired" }
    });
    await dbQuery("subscriptions", "update", {
      match: { user_id: userId },
      data: { status: "cancelled" }
    });
    return { success: true, isSandbox: true, message: "Sandbox subscription marked cancelled." };
  }
  await rzp.subscriptions.cancel(subscriptionId);
  
  await dbQuery("profiles", "update", {
    match: { id: userId },
    data: { subscription_tier: "Free", account_status: "expired" }
  });
  await dbQuery("subscriptions", "update", {
    match: { user_id: userId },
    data: { status: "cancelled" }
  });
  return { success: true, isSandbox: false };
}

export async function verifyPayment(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("Razorpay secret not configured");
  const body = orderId + "|" + paymentId;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}
