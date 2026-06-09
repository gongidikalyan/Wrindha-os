import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://lbthopvezqjcynkfpcnn.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidGhvcHZlenFqY3lua2ZwY25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTg4NDgsImV4cCI6MjA5Mzc5NDg0OH0.-fCSsMSyk1Ay_dDb0juQWhCObfKtzo6L01NhqueY7J8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Robust Sandboxed Fallback Memory Cache
 * Standard in-memory table ledger to serve as state falls for offline/sandbox fallback.
 */
class SanboxDB {
  profiles: Map<string, any> = new Map();
  tasks: Map<string, any> = new Map();
  goals: Map<string, any> = new Map();
  goal_milestones: Map<string, any> = new Map();
  habits: Map<string, any> = new Map();
  habit_logs: Map<string, any> = new Map();
  study_courses: Map<string, any> = new Map();
  study_sessions: Map<string, any> = new Map();
  career_plans: Map<string, any> = new Map();
  career_roadmaps: Map<string, any> = new Map();
  skills: Map<string, any> = new Map();
  budgetList: Map<string, any> = new Map(); // budgets
  expenses: Map<string, any> = new Map();
  timetable: Map<string, any> = new Map();
  timetable_entries: Map<string, any> = new Map();
  subscriptions: Map<string, any> = new Map();
  payments: Map<string, any> = new Map();
  snapshots: Map<string, any> = new Map(); // analytics_snapshots
  tickets: Map<string, any> = new Map(); // support_tickets
  requests: Map<string, any> = new Map(); // feature_requests
  announcements: Map<string, any> = new Map();
  adminLogs: Map<string, any> = new Map();
  systemSettings: Map<string, any> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Seed system settings
    this.systemSettings.set("pricing_standard", {
      setting_key: "pricing_standard",
      setting_value: { price: 49, currency: "INR", trial_days: 7 },
      description: "Standard plan definitions",
      updated_at: new Date().toISOString()
    });

    // Seed generic premium announcements
    this.announcements.set("announcement-1", {
      id: "announcement-1",
      title: "Welcome to WrindhaOS Version 2!",
      message: "We have fully upgraded our SaaS engine with integrated active metrics, Eisenhower task priorities, budget analyses, and exam-readiness planners. Enjoy!",
      is_active: true,
      start_date: new Date().toISOString(),
      end_date: null,
      created_by: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

export const sandboxDBStore = new SanboxDB();

/**
 * Unified Repository Layer that intercepts Postgres errors (e.g. 42P01 - Relation does not exist)
 * and falls back seamlessly to the sandbox database cache with warning diagnostics.
 */
export async function dbQuery<T>(
  table: string,
  operation: "select" | "insert" | "update" | "delete" | "upsert",
  payload: {
    queryBuilder?: (qb: any) => any;
    data?: any;
    match?: Record<string, any>;
    idValue?: string | number;
  }
): Promise<{ data: T | T[] | null; error: any; source: "supabase" | "sandbox" }> {
  try {
    let query = supabase.from(table);
    let res: any;

    if (operation === "select") {
      let qb = query.select("*");
      if (payload.queryBuilder) {
        qb = payload.queryBuilder(qb);
      }
      res = await qb;
    } else if (operation === "insert") {
      res = await query.insert(payload.data).select();
    } else if (operation === "update") {
      let qb = query.update(payload.data);
      if (payload.match) {
        qb = qb.match(payload.match);
      } else if (payload.idValue) {
        qb = qb.eq("id", payload.idValue);
      }
      res = await qb.select();
    } else if (operation === "delete") {
      let qb = query.delete();
      if (payload.match) {
        qb = qb.match(payload.match);
      } else if (payload.idValue) {
        qb = qb.eq("id", payload.idValue);
      }
      res = await qb;
    } else if (operation === "upsert") {
      res = await query.upsert(payload.data).select();
    }

    if (res.error) {
      // Check if error is due to missing tables (code '42P01' or similar in Supabase REST)
      if (res.error.code === "PGRST116" || res.error.code === "42P01" || res.error.message?.includes("not found") || res.error.message?.includes("does not exist")) {
        console.warn(`[Supabase DB Warning] Table '${table}' does not exist or has RLS blockade. Falling back to sandbox storage gracefully.`);
        const fallbackResult = handleSandboxFallback<T>(table, operation, payload);
        return { data: fallbackResult, error: null, source: "sandbox" };
      }
      throw res.error;
    }

    return { data: res.data as T, error: null, source: "supabase" };
  } catch (err: any) {
    console.error(`[DB Query Router Exception] routing table '${table}' to sandbox fallback:`, err.message || err);
    try {
      const fallbackResult = handleSandboxFallback<T>(table, operation, payload);
      return { data: fallbackResult, error: null, source: "sandbox" };
    } catch (fallbackErr: any) {
      return { data: null, error: fallbackErr, source: "sandbox" };
    }
  }
}

function handleSandboxFallback<T>(
  table: string,
  operation: "select" | "insert" | "update" | "delete" | "upsert",
  payload: any
): T | T[] | null {
  // Map tables to DB maps
  let storeMap: Map<string, any>;
  const db = sandboxDBStore as any;

  if (table === "profiles") storeMap = db.profiles;
  else if (table === "tasks") storeMap = db.tasks;
  else if (table === "goals") storeMap = db.goals;
  else if (table === "goal_milestones") storeMap = db.goal_milestones;
  else if (table === "habits") storeMap = db.habits;
  else if (table === "habit_logs") storeMap = db.habit_logs;
  else if (table === "study_courses") storeMap = db.study_courses;
  else if (table === "study_sessions") storeMap = db.study_sessions;
  else if (table === "career_plans") storeMap = db.career_plans;
  else if (table === "career_roadmaps") storeMap = db.career_roadmaps;
  else if (table === "skills") storeMap = db.skills;
  else if (table === "budgets") storeMap = db.budgetList;
  else if (table === "expenses") storeMap = db.expenses;
  else if (table === "timetable") storeMap = db.timetable;
  else if (table === "timetable_entries") storeMap = db.timetable_entries;
  else if (table === "subscriptions") storeMap = db.subscriptions;
  else if (table === "payments") storeMap = db.payments;
  else if (table === "analytics_snapshots") storeMap = db.snapshots;
  else if (table === "support_tickets") storeMap = db.tickets;
  else if (table === "feature_requests") storeMap = db.requests;
  else if (table === "announcements") storeMap = db.announcements;
  else if (table === "admin_logs") storeMap = db.adminLogs;
  else if (table === "system_settings") storeMap = db.systemSettings;
  else {
    throw new Error(`Unmapped sandbox table: ${table}`);
  }

  const allItems = Array.from(storeMap.values());

  if (operation === "select") {
    // Filter matches
    let result = [...allItems];
    if (payload.match) {
      result = result.filter(item => {
        return Object.entries(payload.match).every(([k, v]) => item[k] === v);
      });
    }
    // Simple custom single lookups if needed
    return result as any as T[];
  }

  if (operation === "insert" || operation === "upsert") {
    const dataList = Array.isArray(payload.data) ? payload.data : [payload.data];
    const created: any[] = [];
    for (const item of dataList) {
      const copy = { ...item };
      if (!copy.id) {
        copy.id = `mock_${Math.random().toString(36).substring(2, 11)}`;
      }
      if (!copy.created_at) {
        copy.created_at = new Date().toISOString();
      }
      if (table === "career_plans" && item.user_id) {
        storeMap.set(item.user_id, copy);
      } else {
        storeMap.set(copy.id, copy);
      }
      created.push(copy);
    }
    return Array.isArray(payload.data) ? (created as any as T) : (created[0] as any as T);
  }

  if (operation === "update") {
    let targetItems: any[] = [];
    if (payload.match) {
      targetItems = allItems.filter(item => {
        return Object.entries(payload.match).every(([k, v]) => item[k] === v);
      });
    } else if (payload.idValue) {
      const item = storeMap.get(String(payload.idValue));
      if (item) targetItems.push(item);
    }

    const updated: any[] = [];
    for (const item of targetItems) {
      const key = table === "career_plans" ? item.user_id : item.id;
      const copy = { ...item, ...payload.data, updated_at: new Date().toISOString() };
      storeMap.set(key, copy);
      updated.push(copy);
    }
    return updated as any as T[];
  }

  if (operation === "delete") {
    let targetItems: any[] = [];
    if (payload.match) {
      targetItems = allItems.filter(item => {
        return Object.entries(payload.match).every(([k, v]) => item[k] === v);
      });
    } else if (payload.idValue) {
      const item = storeMap.get(String(payload.idValue));
      if (item) targetItems.push(item);
    }

    for (const item of targetItems) {
      const key = table === "career_plans" ? item.user_id : item.id;
      storeMap.delete(key);
    }
    return null;
  }

  return null;
}
