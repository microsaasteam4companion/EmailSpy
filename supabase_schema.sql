-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table (Extending Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'trial', -- 'trial', 'pro', 'canceled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Competitors to track
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  spy_email TEXT UNIQUE NOT NULL, -- e.g., spy+morningbrew_123@yourdomain.com
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Ingested Emails
CREATE TABLE IF NOT EXISTS public.received_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_analyzed BOOLEAN DEFAULT FALSE
);

-- 4. AI Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL, -- The AI generated markdown
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies (Production Ready)
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public competitors" ON public.competitors;
DROP POLICY IF EXISTS "Public emails" ON public.received_emails;
DROP POLICY IF EXISTS "Public reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own competitors" ON public.competitors;
DROP POLICY IF EXISTS "Users can view their own competitors" ON public.competitors;
DROP POLICY IF EXISTS "Users can view emails for their competitors" ON public.received_emails;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Cloudflare can insert emails" ON public.received_emails;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own competitors" ON public.competitors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own competitors" ON public.competitors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view emails for their competitors" ON public.received_emails FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.competitors WHERE id = competitor_id AND user_id = auth.uid()));
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Cloudflare can insert emails" ON public.received_emails FOR INSERT WITH CHECK (true);
