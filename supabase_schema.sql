-- 1. Profiles Table (User Metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    "fullName" TEXT,
    "lastActive" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habits Table
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    "userId" UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly')),
    streak INTEGER DEFAULT 0,
    "completedAt" TEXT[] DEFAULT '{}',
    color TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    "userId" UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    quadrant TEXT CHECK (quadrant IN ('UI', 'NUI', 'UNI', 'NUNI')),
    "dueDate" TEXT,
    tags TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    "userId" UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    "userId" UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT,
    progress INTEGER DEFAULT 0,
    "targetDate" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Timetable Table
CREATE TABLE IF NOT EXISTS public.timetable (
    id TEXT PRIMARY KEY,
    "userId" UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    type TEXT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    color TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Study Courses Table
CREATE TABLE IF NOT EXISTS public.study_courses (
    id TEXT PRIMARY KEY,
    "userId" UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    color TEXT,
    exams JSONB DEFAULT '[]',
    materials JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
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

-- Policies for Habits
CREATE POLICY "Users can manage their own habits" ON public.habits
    FOR ALL USING (auth.uid() = "userId");

-- Policies for Tasks
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = "userId");

-- Policies for Expenses
CREATE POLICY "Users can manage their own expenses" ON public.expenses
    FOR ALL USING (auth.uid() = "userId");

-- Policies for Goals
CREATE POLICY "Users can manage their own goals" ON public.goals
    FOR ALL USING (auth.uid() = "userId");

-- Policies for Timetable
CREATE POLICY "Users can manage their own timetable" ON public.timetable
    FOR ALL USING (auth.uid() = "userId");

-- Policies for Study Courses
CREATE POLICY "Users can manage their own study courses" ON public.study_courses
    FOR ALL USING (auth.uid() = "userId");

-- --- AUTOMATIC PROFILE CREATION ---
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, "fullName")
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
