-- === DATABASE SCHEMA FOR WRINDHA OS ===
-- Description: Standardizes camelCase to snake_case for Supabase compatibility.

-- [OPTIONAL] CLEAN START: Uncomment these lines if you want to wipe existing tables and start fresh.
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.habits CASCADE;
-- DROP TABLE IF EXISTS public.tasks CASCADE;
-- DROP TABLE IF EXISTS public.expenses CASCADE;
-- DROP TABLE IF EXISTS public.goals CASCADE;
-- DROP TABLE IF EXISTS public.timetable CASCADE;
-- DROP TABLE IF EXISTS public.study_courses CASCADE;

-- 1. Profiles Table (User Metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    budget DECIMAL DEFAULT 5000,
    currency TEXT DEFAULT 'INR',
    subscription_tier TEXT DEFAULT 'Free',
    max_habits INTEGER DEFAULT 5,
    custom_features JSONB DEFAULT '{"ai_chat": true, "advanced_analytics": true}',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    trial_start_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    is_trial_activated BOOLEAN DEFAULT false,
    has_paid BOOLEAN DEFAULT false
);

-- 2. Habits Table
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly')),
    streak INTEGER DEFAULT 0,
    completed_at TEXT[] DEFAULT '{}',
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    quadrant TEXT CHECK (quadrant IN ('UI', 'NUI', 'UNI', 'NUNI')),
    due_date TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT,
    progress INTEGER DEFAULT 0,
    target_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Timetable Table
CREATE TABLE IF NOT EXISTS public.timetable (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    type TEXT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Study Courses Table
CREATE TABLE IF NOT EXISTS public.study_courses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    color TEXT,
    exams JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- --- SECURITY SETUP (RLS) ---
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_courses ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profile count" ON public.profiles FOR SELECT USING (true); 
-- Allow system to insert via trigger, but we also allow user to upsert if needed (though trigger is better)
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for Habits
CREATE POLICY "Users can manage their own habits" ON public.habits
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Tasks
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Expenses
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Goals
CREATE POLICY "Users can manage their own goals" ON public.goals
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Timetable
CREATE POLICY "Users can manage their own timetable" ON public.timetable
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Study Courses
CREATE POLICY "Users can manage their own study courses" ON public.study_courses
    FOR ALL USING (auth.uid() = user_id);

-- --- AUTOMATIC PROFILE CREATION ---
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  signup_time TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  june_1_2026 TIMESTAMP WITH TIME ZONE := '2026-06-01 00:00:00+00'::TIMESTAMPTZ;
BEGIN
  IF signup_time < june_1_2026 THEN
    -- Existing Users: account created before June 1, 2026.
    -- One-time 5-day free trial on their first login after June 1, 2026.
    -- So we do not activate the trial on raw creation.
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      trial_start_date, 
      trial_end_date, 
      is_trial_activated, 
      has_paid
    )
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName'),
      NULL,
      NULL,
      false,
      false
    );
  ELSE
    -- New Users: account created on or after June 1, 2026.
    -- Receive a one-time 7-day free trial starting from signup time itself.
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      trial_start_date, 
      trial_end_date, 
      is_trial_activated, 
      has_paid
    )
    VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName'),
      signup_time,
      signup_time + INTERVAL '7 days',
      true,
      false
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Ensure auth creation doesn't fail if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Blogs Table (Admin Feature)
CREATE TABLE IF NOT EXISTS public.blogs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT DEFAULT 'Admin',
    image_url TEXT,
    category TEXT DEFAULT 'Productivity',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read blogs
CREATE POLICY "Anyone can view blogs" ON public.blogs
    FOR SELECT USING (true);

-- Allow admin to insert/modify blogs
CREATE POLICY "Admin can manage blogs" ON public.blogs
    FOR ALL USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');

-- 9. Add subscription_tier and features to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'Free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_habits INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_features JSONB DEFAULT '{"ai_chat": true, "advanced_analytics": true}';

-- Enable Admin access to all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');

CREATE POLICY "Admin can update any profile tier" ON public.profiles
    FOR UPDATE USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');

-- 10. Pricing Plans Table (where admin defines the tiers and features)
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    period TEXT DEFAULT 'month',
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pricing plans" ON public.pricing_plans
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage pricing plans" ON public.pricing_plans
    FOR ALL USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');


-- 11. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    plan_id TEXT REFERENCES public.pricing_plans ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method TEXT DEFAULT 'stripe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for Orders
CREATE POLICY "Users can manage their own orders" ON public.orders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all orders" ON public.orders
    FOR ALL USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');


-- 12. Migration columns for existing database profiles & Security Triggers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trial_activated BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT false;

-- Trigger logic to validate and prevent resetting trial dates or status values
CREATE OR REPLACE FUNCTION public.protect_trial_parameters()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing is_trial_activated from true to false
  IF (OLD.is_trial_activated = true AND NEW.is_trial_activated = false) THEN
    NEW.is_trial_activated := true;
  END IF;

  -- Prevent overriding/resetting trial_start_date once set
  IF (OLD.trial_start_date IS NOT NULL AND NEW.trial_start_date IS NULL) THEN
    NEW.trial_start_date := OLD.trial_start_date;
  ELSIF (OLD.trial_start_date IS NOT NULL AND NEW.trial_start_date <> OLD.trial_start_date) THEN
    NEW.trial_start_date := OLD.trial_start_date;
  END IF;

  -- Prevent overriding/resetting trial_end_date once set
  IF (OLD.trial_end_date IS NOT NULL AND NEW.trial_end_date IS NULL) THEN
    NEW.trial_end_date := OLD.trial_end_date;
  ELSIF (OLD.trial_end_date IS NOT NULL AND NEW.trial_end_date <> OLD.trial_end_date) THEN
    NEW.trial_end_date := OLD.trial_end_date;
  END IF;

  -- Prevent resetting has_paid once marked true
  IF (OLD.has_paid = true AND NEW.has_paid = false) THEN
    NEW.has_paid := true;
  END IF;

  -- Handle transition state for first-time login activation
  IF (OLD.is_trial_activated = false OR OLD.is_trial_activated IS NULL) AND NEW.is_trial_activated = true THEN
    NEW.trial_start_date := COALESCE(NEW.trial_start_date, timezone('utc'::text, now()));
    NEW.trial_end_date := COALESCE(NEW.trial_end_date, NEW.trial_start_date + INTERVAL '7 days');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update_protect_trial ON public.profiles;

CREATE TRIGGER on_profile_update_protect_trial
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_trial_parameters();


-- 14. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL NOT NULL CHECK (discount_value >= 0),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check coupons" ON public.coupons
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage coupons" ON public.coupons
    FOR ALL USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');


-- 15. Coupon Usage Table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID REFERENCES public.coupons ON DELETE CASCADE,
    coupon_code TEXT,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    discount_applied DECIMAL NOT NULL,
    paid_amount DECIMAL NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coupon usage" ON public.coupon_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all coupon usage" ON public.coupon_usage
    FOR ALL USING (auth.jwt()->>'email' = 'gongidikalyan08@gmail.com');


-- 16. Career Plans Table
CREATE TABLE IF NOT EXISTS public.career_plans (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    active_path JSONB,
    milestones JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    plan_data JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own career plans" ON public.career_plans
    FOR ALL USING (auth.uid() = user_id);


-- 17. Backend Rule: Enforce Triggers for Task Limit based on user account status ('trial' vs 'premium')
CREATE OR REPLACE FUNCTION public.check_task_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
  v_is_trial_activated BOOLEAN;
  v_trial_end_date TIMESTAMP WITH TIME ZONE;
  v_has_paid BOOLEAN;
  v_active_count INTEGER;
  v_email TEXT;
BEGIN
  -- If this is an update or an upsert on an already existing task, bypass the insertion limit check
  IF EXISTS (SELECT 1 FROM public.tasks WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Get user subscription tier, trial status, and explicit transaction/pay confirmations
  SELECT 
    COALESCE(subscription_tier, 'Free'), 
    COALESCE(is_trial_activated, false), 
    trial_end_date, 
    COALESCE(has_paid, false),
    email
  INTO v_status, v_is_trial_activated, v_trial_end_date, v_has_paid, v_email
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- If this is the platform administrator, bypass completely
  IF v_email = 'gongidikalyan08@gmail.com' THEN
    RETURN NEW;
  END IF;

  -- Check if user is premium or has explicitly paid
  IF v_has_paid OR LOWER(v_status) = 'premium' OR LOWER(v_status) LIKE 'premium%' OR LOWER(v_status) = 'pro space' OR LOWER(v_status) = 'ultimate matrix' OR LOWER(v_status) = 'active' THEN
    RETURN NEW;
  END IF;

  -- Count existing active (incomplete) tasks
  SELECT COUNT(*) INTO v_active_count
  FROM public.tasks
  WHERE user_id = NEW.user_id AND completed = false;

  -- Support standard active trial rules (Trial active meaning trial is activated and trial_end_date hasn't expired)
  IF v_is_trial_activated AND (v_trial_end_date IS NULL OR v_trial_end_date > now()) THEN
    -- Active trial has 10 tasks limit
    IF v_active_count >= 10 THEN
      RAISE EXCEPTION 'You have reached the 10-task limit available during your Free Trial. Subscribe to WrindhaOS Premium to unlock unlimited tasks and all premium features.';
    END IF;
    RETURN NEW;
  END IF;

  -- Free Tier / Expired trial has 3 tasks limit
  IF v_active_count >= 3 THEN
    RAISE EXCEPTION 'You have reached the 3-task limit available on the Standard Free Tier. Subscribe to WrindhaOS Premium to unlock unlimited tasks and all premium features.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_task_limit ON public.tasks;

CREATE TRIGGER trg_check_task_limit
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.check_task_limit();






