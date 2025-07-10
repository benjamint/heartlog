-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tables for the spouse details app

-- Spouse profiles table
CREATE TABLE IF NOT EXISTS spouse_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  display_nickname BOOLEAN DEFAULT false,
  photo_url TEXT,
  birthday DATE,
  anniversary DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom fields table for storing various details
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES spouse_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'clothing', 'favorites', 'places', 'gifts', 'health'
  label TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES spouse_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'birthday', 'anniversary', 'custom'
  title TEXT NOT NULL,
  date DATE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  advance_notice_days INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE spouse_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Spouse profiles policies
CREATE POLICY "Users can view their own spouse profiles" ON spouse_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spouse profiles" ON spouse_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spouse profiles" ON spouse_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spouse profiles" ON spouse_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Custom fields policies
CREATE POLICY "Users can view their own custom fields" ON custom_fields
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom fields" ON custom_fields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom fields" ON custom_fields
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom fields" ON custom_fields
  FOR DELETE USING (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can view their own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spouse_profiles_user_id ON spouse_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON custom_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_profile_id ON custom_fields(profile_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_profile_id ON reminders(profile_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_spouse_profiles_updated_at BEFORE UPDATE ON spouse_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at BEFORE UPDATE ON custom_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();