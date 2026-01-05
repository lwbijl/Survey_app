# Migration Guide: Single Survey → Multi-Survey System

## Overview
This guide helps you migrate from the single-survey system to the new multi-survey system that supports:
- Creating and managing multiple surveys
- Survey-specific invitations
- Per-survey results viewing
- Response management (delete individual or bulk responses)

## Database Changes

### New Schema
The old `survey_config` table is replaced with a new `surveys` table, and `survey_questions` and `survey_responses` now reference specific surveys.

### Migration SQL

```sql
-- Step 1: Create the new surveys table
CREATE TABLE surveys (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: If you have existing data in survey_config, migrate it
-- Insert a default survey based on old config (if exists)
INSERT INTO surveys (title, description, created_at)
SELECT
  COALESCE(title, 'Default Survey'),
  description,
  NOW()
FROM survey_config
LIMIT 1;

-- Step 3: Backup your existing data (IMPORTANT!)
CREATE TABLE survey_questions_backup AS SELECT * FROM survey_questions;
CREATE TABLE survey_responses_backup AS SELECT * FROM survey_responses;

-- Step 4: Drop old tables
DROP TABLE IF EXISTS survey_config;
DROP TABLE IF EXISTS survey_responses;
DROP TABLE IF EXISTS survey_questions;

-- Step 5: Create new tables with foreign keys
CREATE TABLE survey_questions (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  scale_min INT,
  scale_max INT,
  multiple_select BOOLEAN,
  percentage_max INT,
  question_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE survey_responses (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_id TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  role TEXT NOT NULL,
  answers JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 6: Restore data with survey_id from the newly created survey
-- Get the ID of the survey we just created
DO $$
DECLARE
  survey_id_var BIGINT;
BEGIN
  SELECT id INTO survey_id_var FROM surveys LIMIT 1;

  -- Restore questions
  INSERT INTO survey_questions (survey_id, text, type, options, scale_min, scale_max, multiple_select, percentage_max, question_order, created_at)
  SELECT
    survey_id_var,
    text,
    type,
    options,
    scale_min,
    scale_max,
    multiple_select,
    percentage_max,
    0,
    created_at
  FROM survey_questions_backup;

  -- Restore responses
  INSERT INTO survey_responses (survey_id, respondent_id, respondent_name, country_code, role, answers, timestamp, created_at)
  SELECT
    survey_id_var,
    respondent_id,
    respondent_name,
    country_code,
    role,
    answers,
    timestamp,
    created_at
  FROM survey_responses_backup;
END $$;

-- Step 7: Clean up backup tables (optional, only after verifying data)
-- DROP TABLE survey_questions_backup;
-- DROP TABLE survey_responses_backup;
```

### Fresh Installation SQL
If you're starting fresh (no existing data):

```sql
CREATE TABLE surveys (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE survey_questions (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  scale_min INT,
  scale_max INT,
  multiple_select BOOLEAN,
  percentage_max INT,
  question_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE survey_responses (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_id TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  role TEXT NOT NULL,
  answers JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Application Changes

### Key Changes
1. **Admin View**: Now shows a survey selector and "Create New Survey" button
2. **Survey View**: Users can access surveys via URL parameter (e.g., `?survey=123`)
3. **Results View**: Includes survey selector to view results for specific surveys
4. **Response Management**: Delete individual responses or select multiple for bulk deletion

### URL Structure
- Survey Page: `http://localhost:3000?survey=<survey_id>`
- Admin configures which survey to edit via dropdown
- Results filtered by selected survey

### Workflow
1. **Admin creates a new survey**
   - Click "Create New Survey" in Admin panel
   - Enter title and description
   - Create questions for that survey

2. **Share survey with participants**
   - Copy the survey link with the specific survey ID
   - Participants use that link to submit responses

3. **View and manage results**
   - Select survey from dropdown in Results view
   - View aggregate and individual responses
   - Delete unwanted responses

## Benefits
- ✅ Support multiple surveys simultaneously
- ✅ Clear separation between different workshops/events
- ✅ Better data organization
- ✅ Easy cleanup of test/invalid responses
- ✅ Archive old surveys while keeping data
- ✅ Survey-specific invitation links

## Notes
- The `ON DELETE CASCADE` ensures that deleting a survey removes all associated questions and responses
- Survey `is_active` flag can be used to archive surveys without deleting them
- Question order is now explicitly tracked for consistent display
