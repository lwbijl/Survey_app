# RLS Policy Fix - Testing Instructions

## What Was The Problem?

The RLS policy for inserting survey responses had a subquery that referenced `survey_responses.survey_id` in the EXISTS clause. During an INSERT operation via PostgREST, PostgreSQL couldn't properly resolve this reference in the WITH CHECK context, causing all inserts to fail even though the same query worked in direct SQL.

## The Solution

We created a `SECURITY DEFINER` function that explicitly validates the invitation with the provided `invitation_id` and `survey_id` parameters. This function runs with elevated privileges and can properly query the `survey_invitations` table, then the RLS policy simply calls this function.

## Step 1: Apply the Fix

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project (fbdobtduwmnscmkpntfx.supabase.co)
3. Click on **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy the entire contents of `fix_rls_policy.sql`
6. Paste it into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see a success message and the verification query results showing the new policy

## Step 2: Test with Browser Console

### 2.1 Reset Test Invitation

First, reset the test invitation's usage counter:

```sql
UPDATE survey_invitations SET used_count = 0 WHERE id = 7;
```

### 2.2 Test the Insert

1. Open your deployed app: https://survey-app-flame-two.vercel.app/
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab
4. Run this test fetch:

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
.then(console.log)
.catch(console.error);
```

### Expected Result ✅

You should see a response like:

```json
[
  {
    "id": 123,
    "respondent_id": "test_after_fix",
    "respondent_name": "Test After Fix",
    "country_code": "SE",
    "role": "Test",
    "answers": {"133": 4},
    "survey_id": 7,
    "invitation_id": 7,
    ...
  }
]
```

If you see this, **the fix worked!** 🎉

### If It Still Fails ❌

If you still get a 401 error, check:

1. **Verify the function was created:**
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name = 'validate_invitation_for_insert';
   ```

2. **Verify the policy was created:**
   ```sql
   SELECT polname, pg_get_expr(polwithcheck, polrelid) as with_check
   FROM pg_policy
   WHERE polrelid = 'survey_responses'::regclass
     AND polcmd = 'a';
   ```

3. **Test the function directly:**
   ```sql
   SET ROLE anon;
   SELECT validate_invitation_for_insert(7, 7);
   RESET ROLE;
   ```
   This should return `TRUE`.

## Step 3: Test with Real Invitation Link

Once the browser console test passes:

1. **Reset invitation:**
   ```sql
   UPDATE survey_invitations SET used_count = 0 WHERE id = 7;
   ```

2. **Open invitation URL:**
   ```
   https://survey-app-flame-two.vercel.app/?survey=7&invite=waJwdLU_Pa20lu-Y7sKGmNHkOB6Md-ox
   ```

3. **Fill out the survey** with test data

4. **Submit** and verify you see a success message

5. **Check the database:**
   ```sql
   SELECT *
   FROM survey_responses
   WHERE invitation_id = 7
   ORDER BY timestamp DESC
   LIMIT 5;
   ```

## Step 4: Monitor for Issues

After deploying, monitor:

1. **Supabase Logs** (Dashboard → Logs → PostgREST)
   - Look for any 401 errors
   - Check for RLS policy violations

2. **Browser Console** (in production app)
   - Check for any errors when submitting surveys
   - Verify no 401 responses in Network tab

## Why This Fix Works

The original policy tried to reference `survey_responses.survey_id` in a subquery within the WITH CHECK clause. During INSERT, PostgreSQL evaluates the WITH CHECK clause *before* the row exists, so the table reference was ambiguous.

By using a SECURITY DEFINER function with explicit parameters (`p_invitation_id` and `p_survey_id`), we:

1. **Clearly pass the values** from the INSERT statement to the function
2. **Elevate privileges** so the function can query survey_invitations regardless of caller's role
3. **Simplify the policy** to just call the function with the provided values

This is a common pattern in PostgreSQL RLS when you need to validate against related tables.

## Additional Notes

- The `SECURITY DEFINER` function is safe because it only reads data (no modifications)
- The function is marked `STABLE` to allow PostgreSQL to optimize repeated calls
- The function is granted to `public` which includes the `anon` role
- The policy explicitly uses `TO public` to ensure it applies to anonymous users

## Rollback (If Needed)

If you need to rollback this change:

```sql
-- Remove the new policy and function
DROP POLICY IF EXISTS "Invited users can insert responses" ON survey_responses;
DROP FUNCTION IF EXISTS validate_invitation_for_insert(BIGINT, BIGINT);

-- Recreate the original policy
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
```

---

**Good luck! This should resolve the RLS violation issue.** 🚀
