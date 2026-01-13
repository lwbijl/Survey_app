-- ============================================================================
-- SETUP SUPABASE STORAGE FOR SURVEY IMAGES
-- ============================================================================
-- This script creates a public storage bucket for survey banner images.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: You may need to create this via Supabase Dashboard if SQL doesn't work
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-images', 'survey-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 2: Create policy to allow public read access
CREATE POLICY "Public read access for survey images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'survey-images');

-- Step 3: Create policy to allow service role to upload
-- (The backend uses service_role key, which bypasses RLS anyway)
CREATE POLICY "Service role can upload survey images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'survey-images');

-- Step 4: Create policy to allow service role to update/delete
CREATE POLICY "Service role can manage survey images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'survey-images');

-- ============================================================================
-- ALTERNATIVE: Create bucket via Supabase Dashboard
-- ============================================================================
-- If the SQL above doesn't work, create the bucket manually:
--
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: survey-images
-- 4. Check "Public bucket" (allows anyone to view images)
-- 5. Click "Create bucket"
--
-- The policies above should still be run to ensure proper access control.
-- ============================================================================

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'survey-images';
