-- Message Board — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous access
CREATE POLICY "Anyone can read messages" ON messages
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can delete messages" ON messages
  FOR DELETE TO anon USING (true);

-- Index for efficient newest-first queries
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);
