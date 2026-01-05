-- Add image_url column to surveys table
-- This will store the DALL-E generated image URL for each survey
-- Run this in Supabase SQL Editor

ALTER TABLE surveys
ADD COLUMN image_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN surveys.image_url IS 'DALL-E generated image URL for survey banner';
