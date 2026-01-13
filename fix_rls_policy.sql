-- Fix RLS Policy for Survey Responses
-- This script fixes the issue where anonymous users cannot insert survey responses
-- even with valid invitations.
--
-- The problem: The original policy had a subquery that referenced survey_responses.survey_id
-- in a way that PostgreSQL couldn't resolve during INSERT operations via PostgREST.
--
-- The solution: Use a SECURITY DEFINER function that explicitly checks the invitation
-- with the provided survey_id and invitation_id values.

-- ============================================================================
-- STEP 1: Drop the existing problematic policy
-- ============================================================================

DROP POLICY IF EXISTS "Invited users can insert responses" ON survey_responses;

-- ============================================================================
-- STEP 2: Create a helper function to validate invitation for insert
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_invitation_for_insert(
  p_invitation_id BIGINT,
  p_survey_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- This runs with the privileges of the function owner, not the caller
STABLE            -- Function doesn't modify database and returns same result for same inputs
AS $$
BEGIN
  -- Check if invitation exists and is valid
  RETURN EXISTS (
    SELECT 1
    FROM survey_invitations
    WHERE id = p_invitation_id
      AND survey_id = p_survey_id
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR used_count < max_uses)
  );
END;
$$;

-- Grant execute permission to public (includes anon role)
GRANT EXECUTE ON FUNCTION validate_invitation_for_insert(BIGINT, BIGINT) TO public;

-- ============================================================================
-- STEP 3: Create the new RLS policy using the helper function
-- ============================================================================

CREATE POLICY "Invited users can insert responses"
  ON survey_responses
  FOR INSERT
  TO public  -- Explicitly specify this applies to all roles including anon
  WITH CHECK (
    -- Require invitation_id to be provided
    invitation_id IS NOT NULL
    -- Require survey_id to be provided
    AND survey_id IS NOT NULL
    -- Validate the invitation using our helper function
    AND validate_invitation_for_insert(invitation_id, survey_id) = TRUE
  );

-- ============================================================================
-- STEP 4: Verify the policy was created
-- ============================================================================

-- This query shows all policies on survey_responses
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause,
  CASE polpermissive
    WHEN TRUE THEN 'PERMISSIVE'
    WHEN FALSE THEN 'RESTRICTIVE'
  END as policy_type
FROM pg_policy
WHERE polrelid = 'survey_responses'::regclass
  AND polcmd = 'a'  -- Show only INSERT policies
ORDER BY polname;
