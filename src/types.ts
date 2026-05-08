/**
 * Unified types for the Wrindha OS Productivity ecosystem.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    darkMode: boolean;
    onboardingComplete: boolean;
  };
}

// 1. Habit Tracker
export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completedAt: string[]; // ISO dates
  color: string;
}

// 3. Study Planner
export interface Exam {
  id: string;
  title: string;
  date: string;
}

export interface Material {
  id: string;
  title: string;
  completed: boolean;
}

export interface StudyCourse {
  id: string;
  name: string;
  progress: number;
  color: string;
  exams: Exam[];
  materials: Material[];
}

// 4. Eisenhower Matrix & 5. To-Do List
export enum EisenhowerQuadrant {
  URGENT_IMPORTANT = 'UI',
  NOT_URGENT_IMPORTANT = 'NUI',
  URGENT_NOT_IMPORTANT = 'UNI',
  NOT_URGENT_NOT_IMPORTANT = 'NUNI'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  quadrant: EisenhowerQuadrant;
  dueDate?: string;
  tags: string[];
}

// 6. Goal Setting
export enum GoalType {
  SHORT = 'Short-term',
  MEDIUM = 'Medium-term',
  LONG = 'Long-term'
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  progress: number; // 0-100
  targetDate: string;
}

// 7. Expense Tracker
export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
}

// 8. Timetable
export enum TimetableType {
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly'
}

export interface TimetableEntry {
  id: string;
  type: TimetableType;
  title: string;
  date: string;
  color: string;
}
