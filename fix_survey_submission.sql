-- ============================================================================
-- FIX SURVEY SUBMISSION - COMPLETE SOLUTION
-- ============================================================================
-- This script creates an RPC function that bypasses RLS issues by using
-- SECURITY DEFINER. The function validates the invitation and inserts
-- the response in a single atomic operation.
--
-- Run this entire script in Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the RPC function for survey submission
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_survey_response(
  p_respondent_id TEXT,
  p_respondent_name TEXT,
  p_country_code TEXT,
  p_role TEXT,
  p_answers JSONB,
  p_survey_id BIGINT,
  p_invitation_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with owner privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_result survey_responses;
BEGIN
  -- Step 1: Validate the invitation exists and is valid
  SELECT *
  INTO v_invitation
  FROM survey_invitations
  WHERE id = p_invitation_id
    AND survey_id = p_survey_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation: invitation not found or not active for this survey'
      USING ERRCODE = 'P0001';
  END IF;

  -- Step 2: Check expiration
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invalid invitation: invitation has expired'
      USING ERRCODE = 'P0002';
  END IF;

  -- Step 3: Check usage limit
  IF v_invitation.max_uses IS NOT NULL AND v_invitation.used_count >= v_invitation.max_uses THEN
    RAISE EXCEPTION 'Invalid invitation: invitation has reached its usage limit'
      USING ERRCODE = 'P0003';
  END IF;

  -- Step 4: Insert the survey response
  INSERT INTO survey_responses (
    respondent_id,
    respondent_name,
    country_code,
    role,
    answers,
    timestamp,
    survey_id,
    invitation_id,
    user_id
  ) VALUES (
    p_respondent_id,
    p_respondent_name,
    p_country_code,
    p_role,
    p_answers,
    NOW(),
    p_survey_id,
    p_invitation_id,
    NULL  -- Anonymous submission, no user_id
  )
  RETURNING * INTO v_result;

  -- Step 5: Increment the invitation usage count
  UPDATE survey_invitations
  SET used_count = used_count + 1
  WHERE id = p_invitation_id;

  -- Step 6: Return the created response as JSON
  RETURN jsonb_build_object(
    'id', v_result.id,
    'respondent_id', v_result.respondent_id,
    'respondent_name', v_result.respondent_name,
    'country_code', v_result.country_code,
    'role', v_result.role,
    'answers', v_result.answers,
    'timestamp', v_result.timestamp,
    'survey_id', v_result.survey_id,
    'invitation_id', v_result.invitation_id,
    'success', true
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with more context
    RAISE;
END;
$$;

-- ============================================================================
-- STEP 2: Grant execute permission to anon role (critical!)
-- ============================================================================

-- Grant to anon specifically (this is the role used by unauthenticated requests)
GRANT EXECUTE ON FUNCTION submit_survey_response(TEXT, TEXT, TEXT, TEXT, JSONB, BIGINT, BIGINT) TO anon;

-- Also grant to authenticated for completeness
GRANT EXECUTE ON FUNCTION submit_survey_response(TEXT, TEXT, TEXT, TEXT, JSONB, BIGINT, BIGINT) TO authenticated;

-- ============================================================================
-- STEP 3: Verify the function was created
-- ============================================================================

SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'submit_survey_response'
  AND routine_schema = 'public';

-- ============================================================================
-- STEP 4: Test the function (optional - run manually)
-- ============================================================================

-- First, reset a test invitation:
-- UPDATE survey_invitations SET used_count = 0 WHERE id = 7;

-- Then test the function:
-- SELECT submit_survey_response(
--   'test_rpc',
--   'Test RPC User',
--   'SE',
--   'Tester',
--   '{"133": 5}'::jsonb,
--   7,
--   7
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This function:
-- 1. Uses SECURITY DEFINER to run with elevated privileges
-- 2. Validates the invitation before inserting
-- 3. Atomically inserts the response and increments usage count
-- 4. Returns the created response as JSON
-- 5. Has proper error handling with specific error codes
--
-- The frontend should call this via:
--   supabase.rpc('submit_survey_response', { ... })
-- or directly:
--   fetch(`${baseUrl}/rpc/submit_survey_response`, { ... })
--
-- ============================================================================
