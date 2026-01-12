-- ============================================================================
-- SURVEY APP SECURITY MIGRATION
-- ============================================================================
-- This migration adds:
-- 1. Row Level Security (RLS) policies to secure the database
-- 2. Survey invitations table for unique invite links
-- 3. Admin role management
-- 4. Proper authentication and authorization
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Row Level Security on all tables
-- ============================================================================

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create survey_invitations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_invitations (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- Unique token for the invite link
  email TEXT, -- Optional: email of the invitee
  invitee_name TEXT, -- Optional: name of the invitee
  max_uses INTEGER DEFAULT 1, -- How many times this invite can be used
  used_count INTEGER DEFAULT 0, -- How many times it has been used
  expires_at TIMESTAMP, -- Optional: expiration date
  created_by UUID REFERENCES auth.users(id), -- Admin who created the invite
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE -- Can be deactivated
);

-- Add index for fast token lookups
CREATE INDEX idx_survey_invitations_token ON survey_invitations(token);
CREATE INDEX idx_survey_invitations_survey_id ON survey_invitations(survey_id);

-- Enable RLS on invitations table
ALTER TABLE survey_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Add admin role tracking
-- ============================================================================

-- Create a profiles table to track admin roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Add invitation tracking to responses
-- ============================================================================

-- Add column to track which invitation was used for each response
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS invitation_id BIGINT REFERENCES survey_invitations(id);

ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_survey_responses_invitation_id ON survey_responses(invitation_id);
CREATE INDEX idx_survey_responses_user_id ON survey_responses(user_id);

-- ============================================================================
-- STEP 5: Helper function to check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Helper function to validate invitation token
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_invitation_token(token_value TEXT, survey_id_value BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  invitation RECORD;
BEGIN
  SELECT * INTO invitation
  FROM survey_invitations
  WHERE token = token_value
    AND survey_id = survey_id_value
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: RLS POLICIES FOR SURVEYS TABLE
-- ============================================================================

-- Policy 1: Admins can do everything with surveys
CREATE POLICY "Admins have full access to surveys"
  ON surveys
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 2: Anyone with a valid invitation can read the survey
CREATE POLICY "Invited users can read surveys"
  ON surveys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_invitations
      WHERE survey_id = surveys.id
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR used_count < max_uses)
    )
  );

-- ============================================================================
-- STEP 8: RLS POLICIES FOR SURVEY_QUESTIONS TABLE
-- ============================================================================

-- Policy 1: Admins can do everything with questions
CREATE POLICY "Admins have full access to questions"
  ON survey_questions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 2: Anyone with a valid invitation can read questions
CREATE POLICY "Invited users can read questions"
  ON survey_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_invitations
      WHERE survey_id = survey_questions.survey_id
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR used_count < max_uses)
    )
  );

-- ============================================================================
-- STEP 9: RLS POLICIES FOR SURVEY_RESPONSES TABLE
-- ============================================================================

-- Policy 1: Admins can read all responses
CREATE POLICY "Admins can read all responses"
  ON survey_responses
  FOR SELECT
  USING (is_admin());

-- Policy 2: Admins can delete responses
CREATE POLICY "Admins can delete responses"
  ON survey_responses
  FOR DELETE
  USING (is_admin());

-- Policy 3: Users can read their own responses
CREATE POLICY "Users can read own responses"
  ON survey_responses
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 4: Users with valid invitation can insert responses
CREATE POLICY "Invited users can insert responses"
  ON survey_responses
  FOR INSERT
  WITH CHECK (
    invitation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM survey_invitations
      WHERE id = invitation_id
        AND survey_id = survey_responses.survey_id
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR used_count < max_uses)
    )
  );

-- Policy 5: Users can update their own responses
CREATE POLICY "Users can update own responses"
  ON survey_responses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 10: RLS POLICIES FOR SURVEY_INVITATIONS TABLE
-- ============================================================================

-- Policy 1: Admins can do everything with invitations
CREATE POLICY "Admins have full access to invitations"
  ON survey_invitations
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 2: Anyone can read active invitations by token (for validation)
CREATE POLICY "Public can validate invitation tokens"
  ON survey_invitations
  FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- ============================================================================
-- STEP 11: RLS POLICIES FOR USER_PROFILES TABLE
-- ============================================================================

-- Policy 1: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  USING (is_admin());

-- Policy 2: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 3: Admins can update profiles
CREATE POLICY "Admins can update profiles"
  ON user_profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 4: Auto-create profile on signup
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 12: Trigger to auto-create user profile on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, FALSE)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- ============================================================================
-- STEP 13: Function to increment invitation used_count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_invitation_usage(invitation_id_value BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE survey_invitations
  SET used_count = used_count + 1
  WHERE id = invitation_id_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 14: Helper function to generate unique token
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 32-character alphanumeric token
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    token := replace(token, '=', '');

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM survey_invitations WHERE survey_invitations.token = token) INTO token_exists;

    -- If token doesn't exist, we can use it
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 15: Function to create invitation (for admins)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_survey_invitation(
  p_survey_id BIGINT,
  p_email TEXT DEFAULT NULL,
  p_invitee_name TEXT DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  token TEXT,
  survey_id BIGINT,
  email TEXT,
  invitee_name TEXT,
  max_uses INTEGER,
  expires_at TIMESTAMP
) AS $$
DECLARE
  v_token TEXT;
  v_id BIGINT;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;

  -- Generate unique token
  v_token := generate_invitation_token();

  -- Insert invitation
  INSERT INTO survey_invitations (
    survey_id,
    token,
    email,
    invitee_name,
    max_uses,
    expires_at,
    created_by
  ) VALUES (
    p_survey_id,
    v_token,
    p_email,
    p_invitee_name,
    p_max_uses,
    p_expires_at,
    auth.uid()
  )
  RETURNING survey_invitations.id INTO v_id;

  -- Return the created invitation
  RETURN QUERY
  SELECT
    v_id,
    v_token,
    p_survey_id,
    p_email,
    p_invitee_name,
    p_max_uses,
    p_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 16: Create first admin user function (run this manually)
-- ============================================================================

-- After running this migration, use this function to make a user an admin:
-- SELECT make_user_admin('user@example.com');

CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;

  -- Update or insert profile
  INSERT INTO user_profiles (id, email, is_admin)
  VALUES (user_id, user_email, TRUE)
  ON CONFLICT (id)
  DO UPDATE SET is_admin = TRUE, updated_at = NOW();

  RAISE NOTICE 'User % is now an admin', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Run this migration in your Supabase SQL editor
-- 2. Create an admin user in Supabase Auth (via Dashboard or API)
-- 3. Run: SELECT make_user_admin('your-admin@example.com');
-- 4. Update your frontend code to use the new authentication system
-- 5. Test the invitation flow

-- ============================================================================
-- TESTING QUERIES (for development)
-- ============================================================================

-- Check if RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- View all policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Create a test invitation:
-- SELECT * FROM create_survey_invitation(1, 'test@example.com', 'Test User', 1, NOW() + INTERVAL '7 days');

-- Check user's admin status:
-- SELECT is_admin();
