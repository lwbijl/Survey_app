# RLS Policy Debugging Session Summary
**Date:** January 13, 2026
**Issue:** Survey submissions with invitation links fail with RLS policy error in browser, but work in SQL

---

## The Problem

When anonymous users try to submit survey responses using invitation links, they get:
```
401 (Unauthorized)
{"code":"42501","details":null,"hint":null,"message":"new row violates row-level security policy for table \"survey_responses\""}
```

**However:** The EXACT same insert works perfectly when run as SQL with `SET ROLE anon`.

---

## Current State

### Environment Variables (FIXED ✅)
- **Issue Found:** The JWT token in Vercel had an invalid signature
- **Solution:** Updated `REACT_APP_SUPABASE_ANON_KEY` in Vercel with correct anon key from Supabase
- **Status:** JWT now shows "Signature Verified" at https://jwt.io
- **Verification:**
  - Go to deployed app, run `window.ENV.REACT_APP_SUPABASE_ANON_KEY` in console
  - Paste token into jwt.io - should show green "Signature Verified"

### Database Permissions (VERIFIED ✅)
All verified working:
- `anon` role has INSERT privilege on `survey_responses` table
- `anon` role has SELECT privilege on `survey_invitations` table
- RLS policies apply to `{public}` role (which includes `anon`)
- No restrictive policies blocking inserts
- No triggers interfering with inserts
- Both tables are in `public` schema
- PostgREST is configured correctly (exposed schemas includes PUBLIC)

### SQL Tests (ALL PASS ✅)
These all work perfectly:

```sql
-- Test 1: Simple anon insert
SET ROLE anon;
INSERT INTO survey_responses (
  respondent_id, respondent_name, country_code, role,
  answers, timestamp, survey_id, invitation_id, user_id
) VALUES (
  'test', 'Test', 'SE', 'Test',
  '{"133": 4}'::jsonb, NOW(), 7, 7, NULL
);
RESET ROLE;
-- ✅ WORKS

-- Test 2: With JWT claims
SET ROLE anon;
SET request.jwt.claims TO '{"role": "anon"}';
INSERT INTO survey_responses (...) VALUES (...);
RESET ROLE;
-- ✅ WORKS

-- Test 3: EXISTS check
SET ROLE anon;
SELECT EXISTS (
  SELECT 1 FROM survey_invitations
  WHERE id = 7 AND survey_id = 7
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses)
) as result;
RESET ROLE;
-- ✅ Returns TRUE
```

### Browser/PostgREST Tests (ALL FAIL ❌)

```javascript
// Direct fetch test (run in browser console)
fetch('https://fbdobtduwmnscmkpntfx.supabase.co/rest/v1/survey_responses', {
  method: 'POST',
  headers: {
    'apikey': window.ENV.REACT_APP_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${window.ENV.REACT_APP_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    respondent_id: 'test',
    respondent_name: 'Test',
    country_code: 'SE',
    role: 'Test',
    answers: {"133": 4},
    timestamp: new Date().toISOString(),
    survey_id: 7,
    invitation_id: 7,
    user_id: null
  })
})
.then(r => r.json())
.then(console.log);
```
**Result:** ❌ `401 (Unauthorized)` with RLS policy error

### Critical Discovery

**When RLS is DISABLED:**
```sql
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
```
Then the browser fetch test **SUCCEEDS** ✅

This proves:
- Authentication/JWT is working
- PostgREST is working
- Data payload is correct
- **The RLS policy evaluation is the problem**

---

## Current RLS Policy Status

### Policy Command Codes
- `'r'` = SELECT
- `'a'` = INSERT (confusingly, 'a' stands for 'append')
- `'w'` = UPDATE
- `'d'` = DELETE
- `'*'` = ALL

### Check Current Policies
```sql
SELECT
  polname,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy
WHERE polrelid = 'survey_responses'::regclass
ORDER BY polname;
```

**Last known state:** There was an INSERT policy (`polcmd = 'a'`) named "Invited users can insert responses" with `WITH CHECK (true)` for testing purposes.

**HOWEVER:** Even with `WITH CHECK (true)` (which should always pass), the browser fetch still fails! This is the core mystery.

---

## What We've Tried

### Attempt 1: Fix JWT Token ✅
- **Action:** Updated Vercel environment variable with correct anon key
- **Result:** JWT signature now valid, but insert still fails

### Attempt 2: Simplify RLS Policy
```sql
CREATE POLICY "Invited users can insert responses"
  ON survey_responses FOR INSERT
  WITH CHECK (true);  -- Always allow
```
- **Result:** ❌ Still fails (this should be impossible!)

### Attempt 3: Security Definer Function
```sql
CREATE OR REPLACE FUNCTION validate_invitation_for_response(
  p_invitation_id BIGINT, p_survey_id BIGINT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM survey_invitations
    WHERE id = p_invitation_id AND survey_id = p_survey_id
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR used_count < max_uses)
  );
END;
$$;

CREATE POLICY "..." WITH CHECK (
  invitation_id IS NOT NULL
  AND validate_invitation_for_response(invitation_id, survey_id)
);
```
- **Result:** ❌ Still fails

### Attempt 4: Explicit TO public Clause
```sql
CREATE POLICY "..." FOR INSERT TO public WITH CHECK (...);
```
- **Result:** ❌ Still fails

### Attempt 5: Disable RLS (for testing)
```sql
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
```
- **Result:** ✅ INSERT works! (This proves the issue is RLS evaluation)

---

## The Paradox

We have an impossible situation:
1. SQL with `SET ROLE anon` → INSERT works ✅
2. Browser with valid anon JWT → INSERT fails ❌
3. RLS disabled → Browser INSERT works ✅
4. RLS enabled with `WITH CHECK (true)` → Browser INSERT fails ❌

Point #4 is theoretically impossible - `WITH CHECK (true)` should ALWAYS pass, but it doesn't when called via PostgREST.

---

## Theories to Investigate

### Theory 1: PostgREST Context Issue
PostgREST might evaluate RLS policies in a different transaction/schema context than direct SQL, causing the policy to fail even though the logic is identical.

### Theory 2: Supabase Configuration
There might be a project-level setting in Supabase that's blocking anonymous inserts despite RLS policies allowing them.

**Check in Supabase Dashboard:**
- Settings → API → Any restrictions on anonymous access?
- Authentication → Settings → Any blocks on unauthenticated requests?
- Settings → Database → Any RLS enforcement settings?

### Theory 3: Multiple Policies Conflict
There might be another policy (not showing in our queries) that's blocking the insert.

**Verify:**
```sql
-- Check ALL policies on the table
SELECT * FROM pg_policy
WHERE polrelid = 'survey_responses'::regclass;

-- Check for any restrictive policies
SELECT * FROM pg_policies
WHERE tablename = 'survey_responses'
AND permissive = 'RESTRICTIVE';
```

### Theory 4: Anonymous Sign-In Setting
In Supabase docs, there's a distinction between:
- **Anon API key** - Uses `anon` Postgres role, no user created
- **Anonymous sign-in** - Creates temporary user account

We're using the anon API key (correct for our use case), but check if "Anonymous sign-in" setting in Supabase Auth affects this.

---

## Next Steps to Try

### Step 1: Verify Current Policy State
```sql
SELECT
  polname,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy
WHERE polrelid = 'survey_responses'::regclass
ORDER BY polname;
```

Confirm the INSERT policy with `WITH CHECK (true)` is there.

### Step 2: Test with Simple Policy
If the policy with `WITH CHECK (true)` is there, test the browser fetch:

```javascript
// Reset invitation first (in Supabase SQL)
// UPDATE survey_invitations SET used_count = 0 WHERE id = 7;

fetch('https://fbdobtduwmnscmkpntfx.supabase.co/rest/v1/survey_responses', {
  method: 'POST',
  headers: {
    'apikey': window.ENV.REACT_APP_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${window.ENV.REACT_APP_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    respondent_id: 'final_test',
    respondent_name: 'Final Test',
    country_code: 'SE',
    role: 'Test',
    answers: {"133": 4},
    timestamp: new Date().toISOString(),
    survey_id: 7,
    invitation_id: 7,
    user_id: null
  })
}).then(r => r.json()).then(console.log);
```

### Step 3: If It Still Fails
Contact Supabase support with this information:
- RLS policy with `WITH CHECK (true)` fails via PostgREST
- Same insert works via SQL with `SET ROLE anon`
- JWT is valid
- All permissions are correct
- This appears to be a PostgREST/Supabase bug or configuration issue

### Step 4: Temporary Workaround
If we can't fix the RLS issue, consider:
1. Create a **Postgres function** with `SECURITY DEFINER` that does the validation and insert
2. Call that function via RPC instead of direct table insert
3. This bypasses the RLS policy issue

```sql
CREATE OR REPLACE FUNCTION insert_survey_response(
  p_respondent_id TEXT,
  p_respondent_name TEXT,
  p_country_code TEXT,
  p_role TEXT,
  p_answers JSONB,
  p_survey_id BIGINT,
  p_invitation_id BIGINT
)
RETURNS survey_responses
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result survey_responses;
BEGIN
  -- Validate invitation
  IF NOT EXISTS (
    SELECT 1 FROM survey_invitations
    WHERE id = p_invitation_id
      AND survey_id = p_survey_id
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR used_count < max_uses)
  ) THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Insert the response
  INSERT INTO survey_responses (
    respondent_id, respondent_name, country_code, role,
    answers, timestamp, survey_id, invitation_id, user_id
  ) VALUES (
    p_respondent_id, p_respondent_name, p_country_code, p_role,
    p_answers, NOW(), p_survey_id, p_invitation_id, NULL
  )
  RETURNING * INTO v_result;

  -- Increment invitation usage
  UPDATE survey_invitations
  SET used_count = used_count + 1
  WHERE id = p_invitation_id;

  RETURN v_result;
END;
$$;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION insert_survey_response TO anon;
```

Then update frontend to call this function instead of direct insert.

---

## Important Files

### Frontend Code
- **Main submission logic:** `src/utils/supabase.js` (lines 496-542)
- **Survey form:** `src/components/SurveyView.jsx` (lines 196-229)

### Database
- **Migration file:** `supabase_migration.sql` (contains original RLS policies)
- **RLS policies:** Lines 163-202 in migration file

### Environment Variables
- **Vercel:** Settings → Environment Variables
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY` (must match Supabase dashboard)
  - `REACT_APP_API_URL`

---

## Test Data

**Test invitation:**
- ID: 7
- Token: `waJwdLU_Pa20lu-Y7sKGmNHkOB6Md-ox`
- Survey ID: 7
- Max uses: 1
- Used count: 0 (reset for testing)

**Test URL:**
```
https://survey-app-flame-two.vercel.app/?survey=7&invite=waJwdLU_Pa20lu-Y7sKGmNHkOB6Md-ox
```

**Reset invitation for testing:**
```sql
UPDATE survey_invitations SET used_count = 0 WHERE id = 7;
```

---

## Questions Still Unanswered

1. Why does `WITH CHECK (true)` fail via PostgREST but work in SQL?
2. Is there a Supabase project setting blocking anonymous inserts?
3. Did invitation-based submissions ever work in production? (User was uncertain)
4. Is there a PostgREST version or configuration issue specific to this project?

---

## Contact Information

- **Supabase Project:** fbdobtduwmnscmkpntfx.supabase.co
- **Vercel App:** survey-app-flame-two.vercel.app
- **Railway Backend:** surveyapp-production-06e0.up.railway.app

---

**Good luck debugging! The fact that `WITH CHECK (true)` fails is the key mystery to solve.**
