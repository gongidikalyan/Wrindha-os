/**
 * WrindhaOS SaaS Version 2 Backend Type Definitions
 * Aligns perfectly with the finalized PostgreSQL & Supabase database schema.
 */

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  last_active: string;
  updated_at: string;
  subscription_tier: 'Free' | 'trial' | 'premium' | string;
  max_habits: number;
  custom_features: {
    ai_chat: boolean;
    advanced_analytics: boolean;
    [key: string]: boolean;
  };
  budget: number;
  currency: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  is_trial_activated: boolean;
  has_paid: boolean;
  role: 'user' | 'admin';
  account_status: 'trial' | 'premium' | 'expired';
  last_login_at: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  quadrant: 'UI' | 'NUI' | 'UNI' | 'NUNI';
  due_date: string | null;
  tags: string[];
  created_at: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority_level: 'mission_critical' | 'high_impact' | 'important' | 'optional' | null;
  eisenhower_quadrant: 'do_first' | 'schedule' | 'delegate' | 'eliminate' | null;
  kanban_column: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  goal_id: string | null;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  type: string | null;
  progress: number;
  target_date: string | null;
  created_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completed_at: string[]; // text[] representation of ISO dates or local days
  color: string | null;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_date: string; // date string YYYY-MM-DD
  created_at: string;
}

export interface StudyCourse {
  id: string;
  user_id: string;
  name: string;
  progress: number;
  color: string | null;
  exams: any[]; // JSON array
  materials: any[]; // JSON array
  created_at: string;
  description: string | null;
  exam_date: string | null;
  target_hours: number;
  status: 'active' | 'completed' | 'archived';
}

export interface StudySession {
  id: string;
  course_id: string;
  session_date: string; // YYYY-MM-DD
  duration_minutes: number;
  topic: string | null;
  notes: string | null;
  created_at: string;
}

export interface CareerPlan {
  user_id: string;
  active_path: any | null;
  milestones: any[];
  skills: any[];
  plan_data: any;
  updated_at: string;
  title: string | null;
  description: string | null;
  target_date: string | null;
  status: 'active' | 'completed' | 'archived';
}

export interface CareerRoadmap {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

export interface Skill {
  id: string;
  roadmap_id: string;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced';
  status: 'planned' | 'learning' | 'mastered';
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD or standard ISO
  note: string | null;
  created_at: string;
  transaction_date: string | null;
  transaction_type: 'income' | 'expense';
  notes: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string; // YYYY-MM-01
  created_at: string;
}

export interface Timetable {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  date: string;
  color: string | null;
  created_at: string;
  timetable_type: 'daily' | 'weekly';
  is_active: boolean;
  description: string | null;
}

export interface TimetableEntry {
  id: string;
  timetable_id: string;
  day_of_week: number; // 0 (Sunday) to 6 (Saturday)
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  title: string;
  description: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'trial' | 'premium';
  status: 'active' | 'expired' | 'cancelled';
  trial_start_at: string | null;
  trial_end_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'captured' | 'failed' | 'refunded';
  paid_at: string | null;
  created_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string; // YYYY-MM-DD
  tasks_completed: number;
  habits_completed: number;
  study_minutes: number;
  goals_completed: number;
  productivity_score: number;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  votes: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}
