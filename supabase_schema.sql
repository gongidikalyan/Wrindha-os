-- WRINDHA OS DATABASE SCHEMA

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    budget DECIMAL DEFAULT 5000,
    currency TEXT DEFAULT 'INR',
    subscription_tier TEXT DEFAULT 'Free',
    max_habits INTEGER DEFAULT 5,
    custom_features JSONB DEFAULT '{"ai_chat": true, "advanced_analytics": true}',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- HABITS
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
    streak INTEGER DEFAULT 0,
    completed_at TEXT[] DEFAULT '{}',
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    quadrant TEXT DEFAULT 'UI' CHECK (quadrant IN ('UI', 'NUI', 'UNI', 'NUNI')),
    due_date TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- GOALS
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT,
    progress INTEGER DEFAULT 0,
    target_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- TIMETABLE
CREATE TABLE IF NOT EXISTS public.timetable (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STUDY COURSES
CREATE TABLE IF NOT EXISTS public.study_courses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    color TEXT,
    exams JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PRICING PLANS
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    period TEXT DEFAULT 'month',
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id TEXT REFERENCES public.pricing_plans(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method TEXT DEFAULT 'stripe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- BLOGS
CREATE TABLE IF NOT EXISTS public.blogs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT DEFAULT 'Admin',
    image_url TEXT,
    category TEXT DEFAULT 'Productivity',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL NOT NULL CHECK (discount_value >= 0),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- COUPON USAGE
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    coupon_code TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    discount_applied DECIMAL NOT NULL,
    paid_amount DECIMAL NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CAREER PLANS
CREATE TABLE IF NOT EXISTS public.career_plans (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    active_path JSONB,
    milestones JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    plan_data JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
