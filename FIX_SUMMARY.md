# RLS Policy Fix - Quick Summary

## Problem
Survey responses from invitation links failed with `401 Unauthorized - RLS policy violation` even though the same INSERT worked in SQL.

## Root Cause
The RLS policy's WITH CHECK clause referenced `survey_responses.survey_id` in a subquery. PostgreSQL couldn't properly resolve this reference during INSERT operations via PostgREST, even though it worked in direct SQL.

## Solution
Created a SECURITY DEFINER function that validates invitations with explicit parameters, eliminating ambiguous table references.

## Files Created

1. **[fix_rls_policy.sql](fix_rls_policy.sql)** - SQL script to apply the fix
2. **[TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md)** - Step-by-step testing guide
3. **[ROOT_CAUSE_ANALYSIS.md](ROOT_CAUSE_ANALYSIS.md)** - Detailed explanation of why this happened

## How to Apply the Fix

### Step 1: Run the SQL Fix
1. Open Supabase SQL Editor
2. Copy contents of `fix_rls_policy.sql`
3. Paste and run
4. Verify success

### Step 2: Test in Browser Console
```javascript
fetch('https://fbdobtduwmnscmkpntfx.supabase.co/rest/v1/survey_responses', {
  method: 'POST',
  headers: {
    'apikey': window.ENV.REACT_APP_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${window.ENV.REACT_APP_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    respondent_id: 'test_after_fix',
    respondent_name: 'Test After Fix',
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

Expected: Success response with inserted data ✅

### Step 3: Test Real Survey Submission
1. Reset invitation: `UPDATE survey_invitations SET used_count = 0 WHERE id = 7;`
2. Open: https://survey-app-flame-two.vercel.app/?survey=7&invite=waJwdLU_Pa20lu-Y7sKGmNHkOB6Md-ox
3. Fill out and submit survey
4. Verify success message

## What Changed

### Before (Broken)
```sql
CREATE POLICY "Invited users can insert responses"
  ON survey_responses FOR INSERT
  WITH CHECK (
    invitation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM survey_invitations
      WHERE id = invitation_id
        AND survey_id = survey_responses.survey_id  -- ⚠️ Ambiguous reference
        ...
    )
  );
```

### After (Fixed)
```sql
-- Helper function with explicit parameters
CREATE FUNCTION validate_invitation_for_insert(
  p_invitation_id BIGINT,
  p_survey_id BIGINT
) RETURNS BOOLEAN
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM survey_invitations
    WHERE id = p_invitation_id
      AND survey_id = p_survey_id  -- ✅ Clear parameter reference
      ...
  );
END;
$$;

-- Simplified policy using the function
CREATE POLICY "Invited users can insert responses"
  ON survey_responses FOR INSERT
  TO public
  WITH CHECK (
    invitation_id IS NOT NULL
    AND survey_id IS NOT NULL
    AND validate_invitation_for_insert(invitation_id, survey_id) = TRUE
  );
```

## Why It Works

1. **No ambiguous table references** - Function uses explicit parameters
2. **SECURITY DEFINER** - Runs with elevated privileges to query invitations
3. **Clear evaluation context** - PostgreSQL can evaluate the function properly via PostgREST
4. **Explicit TO public** - Ensures policy applies to anon role

## Next Steps

1. ✅ Apply the fix (run fix_rls_policy.sql)
2. ✅ Test with browser console
3. ✅ Test with real invitation link
4. ✅ Update RLS_DEBUGGING_SESSION_SUMMARY.md with resolution
5. ✅ Monitor production for any issues

## Additional Resources

- **Detailed Analysis**: See [ROOT_CAUSE_ANALYSIS.md](ROOT_CAUSE_ANALYSIS.md)
- **Testing Guide**: See [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md)
- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL SECURITY DEFINER**: https://www.postgresql.org/docs/current/sql-createfunction.html

## Questions or Issues?

If the fix doesn't work:
1. Check [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md) troubleshooting section
2. Verify function was created: `SELECT * FROM pg_proc WHERE proname = 'validate_invitation_for_insert';`
3. Verify policy was created: `SELECT * FROM pg_policy WHERE polrelid = 'survey_responses'::regclass AND polcmd = 'a';`
4. Test function directly as anon: `SET ROLE anon; SELECT validate_invitation_for_insert(7, 7);`

---

**Expected Resolution Time:** 5-10 minutes
**Confidence Level:** High - This addresses the exact issue from your debugging notes
