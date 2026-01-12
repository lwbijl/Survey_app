# Survey App Security Setup Guide

This guide will walk you through setting up Row Level Security (RLS) policies and the invitation system for your Survey App.

## Overview

The security implementation adds:

1. **Row Level Security (RLS)** - Database-level security to control who can read/write data
2. **Admin Authentication** - Supabase Auth for admin users
3. **Survey Invitations** - Unique invite links for respondents
4. **Role-Based Access** - Admin vs. Respondent permissions

## Prerequisites

- Existing Supabase project with the Survey App database
- Access to Supabase SQL Editor
- Admin access to your Supabase dashboard

---

## Step 1: Run the Database Migration

### 1.1 Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 1.2 Execute the Migration

1. Open the file `supabase_migration.sql` in this repository
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

The migration will:
- Enable RLS on all tables
- Create `survey_invitations` table
- Create `user_profiles` table
- Add invitation tracking columns to responses
- Set up all RLS policies
- Create helper functions for invitation management

### 1.3 Verify Migration Success

Run this query to check if RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

---

## Step 2: Create Your First Admin User

### 2.1 Sign Up Through the App

1. Start your application
2. Click on the **Admin** or **Results** tab (they will show a lock icon 🔒)
3. Click **Sign In** button
4. Click **Sign Up** to create a new account
5. Enter your email and password (minimum 6 characters)
6. Click **Sign Up**

**Note:** You'll need to sign in after signing up.

### 2.2 Grant Admin Privileges

After creating your account, you need to grant it admin privileges:

1. Go back to Supabase SQL Editor
2. Run this command (replace with your email):

```sql
SELECT make_user_admin('your-email@example.com');
```

3. You should see a success message: "User your-email@example.com is now an admin"

### 2.3 Verify Admin Access

1. Go back to your app
2. Sign in with your credentials
3. You should now see "Admin" badge next to your sign out button
4. You can access Admin and Results tabs

---

## Step 3: Understanding the Security Model

### RLS Policies Overview

#### **Surveys Table**
- **Admins**: Full access (create, read, update, delete)
- **Invited Users**: Can read surveys they have valid invitations for
- **Public**: No access

#### **Survey Questions Table**
- **Admins**: Full access
- **Invited Users**: Can read questions for surveys they're invited to
- **Public**: No access

#### **Survey Responses Table**
- **Admins**: Can read and delete all responses
- **Respondents**: Can read and update their own responses only
- **Invited Users**: Can insert responses (with valid invitation)
- **Public**: No access

#### **Survey Invitations Table**
- **Admins**: Full access
- **Public**: Can validate invitation tokens (read-only for active invitations)

#### **User Profiles Table**
- **Admins**: Can read all profiles and update admin status
- **Users**: Can read their own profile
- **Public**: No access

---

## Step 4: Using the Invitation System

### 4.1 Create an Invitation

1. Sign in as an admin
2. Go to the **Admin** tab
3. Select a survey from the dropdown
4. Scroll down to the **Survey Invitations** section
5. Click **+ Create Invitation**
6. Fill in the form:
   - **Invitee Name** (optional): Who you're inviting
   - **Email** (optional): For your reference
   - **Max Uses**: How many times this link can be used (default: 1)
   - **Expires In (Days)**: When the link expires (default: 7 days)
7. Click **Create Invitation**

### 4.2 Share the Invitation Link

1. The invitation will appear in the list
2. Click the **📋 Copy** button to copy the unique invitation URL
3. Share this URL with your respondent via email, Slack, etc.

**Example invitation URL:**
```
https://your-app.com/?survey=1&invite=abc123xyz789
```

### 4.3 Respondent Experience

When a respondent clicks the invitation link:

1. They are taken directly to the survey (no login required)
2. The invitation is validated automatically
3. If the invitation has a name, it's pre-filled in the form
4. They complete and submit the survey
5. The invitation usage count is incremented
6. If the invitation reaches max uses, it becomes inactive

### 4.4 Manage Invitations

From the Admin panel, you can:

- **View all invitations** for the selected survey
- **Copy invitation links** with one click
- **Toggle Active/Inactive** status
- **Delete invitations** that are no longer needed
- **See usage statistics**:
  - How many times used
  - Expiration date
  - Creation date
  - Current status (active, expired, maxed out)

---

## Step 5: Testing the Security

### 5.1 Test Anonymous Access (Should Fail)

1. Open an incognito/private browser window
2. Try to access: `https://your-app.com/?survey=1`
3. You should see: "This survey requires an invitation"
4. Without a valid invite token, the survey cannot be accessed

### 5.2 Test With Invalid Invitation (Should Fail)

1. Try accessing: `https://your-app.com/?survey=1&invite=invalid123`
2. You should see: "Invalid or expired invitation link"

### 5.3 Test With Valid Invitation (Should Work)

1. Create a valid invitation in the Admin panel
2. Copy the invitation link
3. Open it in an incognito window
4. The survey should load successfully
5. Submit a response
6. Verify in the Results tab that the response was saved

### 5.4 Test Invitation Expiration

1. Create an invitation that expires in 1 day
2. Manually update the expiration in the database:
   ```sql
   UPDATE survey_invitations
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE id = <invitation_id>;
   ```
3. Try using the invitation link
4. It should be rejected as expired

### 5.5 Test Max Uses

1. Create an invitation with max_uses = 1
2. Use it to submit a survey response
3. Try using the same link again
4. It should be rejected (max uses reached)

---

## Step 6: Common Operations

### Add More Admin Users

```sql
SELECT make_user_admin('newadmin@example.com');
```

### Remove Admin Privileges

```sql
UPDATE user_profiles
SET is_admin = FALSE
WHERE email = 'user@example.com';
```

### View All Admins

```sql
SELECT email, is_admin, created_at
FROM user_profiles
WHERE is_admin = TRUE;
```

### View All Active Invitations for a Survey

```sql
SELECT * FROM survey_invitations
WHERE survey_id = 1
  AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;
```

### Check Invitation Usage Statistics

```sql
SELECT
  survey_id,
  COUNT(*) as total_invitations,
  SUM(used_count) as total_uses,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_count
FROM survey_invitations
GROUP BY survey_id;
```

### Manually Deactivate an Invitation

```sql
UPDATE survey_invitations
SET is_active = FALSE
WHERE token = 'abc123xyz789';
```

### Extend Invitation Expiration

```sql
UPDATE survey_invitations
SET expires_at = NOW() + INTERVAL '7 days'
WHERE id = <invitation_id>;
```

---

## Step 7: Troubleshooting

### Problem: "Only admins can create invitations" Error

**Cause:** Your user doesn't have admin privileges

**Solution:**
```sql
-- Check if you're an admin
SELECT is_admin FROM user_profiles WHERE id = auth.uid();

-- If FALSE, grant admin privileges
SELECT make_user_admin('your-email@example.com');
```

### Problem: Can't See Admin/Results Tabs

**Cause:** Not signed in

**Solution:**
1. Click on the locked tab
2. Click "Sign In"
3. Enter your credentials
4. Make sure your account has admin privileges (see above)

### Problem: "Failed to save response" Error

**Cause:** RLS policies are blocking the insert

**Solution:**
```sql
-- Check if invitation is valid
SELECT * FROM survey_invitations
WHERE token = 'your-token'
  AND survey_id = 1
  AND is_active = TRUE;

-- If invitation exists but response fails, check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'survey_responses';
```

### Problem: Invitation Shows as Valid But Doesn't Work

**Cause:** May be expired or maxed out

**Solution:**
```sql
-- Check invitation details
SELECT
  token,
  is_active,
  used_count,
  max_uses,
  expires_at,
  CASE
    WHEN NOT is_active THEN 'Inactive'
    WHEN expires_at < NOW() THEN 'Expired'
    WHEN used_count >= max_uses THEN 'Max uses reached'
    ELSE 'Valid'
  END as status
FROM survey_invitations
WHERE token = 'your-token';
```

### Problem: Authentication Not Working

**Cause:** Supabase auth configuration or network issues

**Solution:**
1. Check browser console for errors
2. Verify Supabase credentials in localStorage or env variables
3. Check that auth is enabled in Supabase dashboard:
   - Go to Authentication > Settings
   - Ensure "Enable email signups" is ON
   - Check "Site URL" is set correctly

---

## Step 8: Security Best Practices

### 1. Secure Your Supabase Keys

- **Anon Key**: Safe to expose in frontend (used for RLS-protected requests)
- **Service Role Key**: NEVER expose (bypasses RLS)
- Store service role key only in secure backend environments

### 2. Regularly Review Admin Users

```sql
SELECT email, created_at, updated_at
FROM user_profiles
WHERE is_admin = TRUE;
```

Remove admin access for users who no longer need it.

### 3. Clean Up Expired Invitations

```sql
-- View expired invitations
SELECT * FROM survey_invitations
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Delete old expired invitations
DELETE FROM survey_invitations
WHERE expires_at < NOW() - INTERVAL '30 days';
```

### 4. Monitor Unusual Activity

```sql
-- Check for invitation abuse (many uses)
SELECT token, invitee_name, email, used_count, max_uses
FROM survey_invitations
WHERE used_count > max_uses * 0.8
ORDER BY used_count DESC;

-- Check responses from same IP (requires adding ip tracking)
SELECT respondent_name, COUNT(*) as response_count
FROM survey_responses
GROUP BY respondent_name
HAVING COUNT(*) > 5
ORDER BY response_count DESC;
```

### 5. Backup Your Data

```sql
-- Export all invitations
COPY (SELECT * FROM survey_invitations)
TO '/path/to/invitations_backup.csv' CSV HEADER;

-- Export all responses
COPY (SELECT * FROM survey_responses)
TO '/path/to/responses_backup.csv' CSV HEADER;
```

---

## Step 9: Production Deployment Checklist

- [ ] Run migration on production database
- [ ] Create admin account and verify access
- [ ] Test invitation flow end-to-end
- [ ] Verify RLS policies are working (test anonymous access)
- [ ] Set up email notifications (optional, requires custom implementation)
- [ ] Configure custom domain and SSL
- [ ] Set proper CORS settings in Supabase
- [ ] Enable Supabase Auth email templates (for password reset)
- [ ] Document invitation workflow for your team
- [ ] Set up monitoring for failed authentication attempts

---

## Additional Features (Future Enhancements)

### Email Invitations

To send invitation emails automatically:

1. Set up an email service (SendGrid, Postmark, etc.)
2. Create a serverless function to send emails
3. Call this function after creating an invitation
4. Include the invitation link in the email body

### Invitation Templates

Create reusable invitation templates:

```sql
CREATE TABLE invitation_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  max_uses INTEGER DEFAULT 1,
  expires_in_days INTEGER DEFAULT 7,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Response Tracking

Track when respondents open invitation links:

```sql
ALTER TABLE survey_invitations
ADD COLUMN last_accessed_at TIMESTAMP,
ADD COLUMN access_count INTEGER DEFAULT 0;
```

### Invitation Analytics

View invitation performance:

```sql
SELECT
  s.title as survey_title,
  COUNT(i.id) as total_invitations,
  SUM(i.used_count) as total_responses,
  AVG(i.used_count::float / NULLIF(i.max_uses, 0)) as usage_rate
FROM survey_invitations i
JOIN surveys s ON s.id = i.survey_id
GROUP BY s.id, s.title
ORDER BY usage_rate DESC;
```

---

## Support

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Review browser console for JavaScript errors
3. Test RLS policies using SQL queries
4. Verify your admin status with `SELECT is_admin()`

For database issues, you can always disable RLS temporarily (NOT RECOMMENDED FOR PRODUCTION):

```sql
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
```

Then re-enable after fixing:

```sql
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
```

---

## Summary

You've now secured your Survey App with:

✅ Row Level Security on all tables
✅ Admin authentication via Supabase Auth
✅ Invitation-based survey access
✅ Granular permissions for admins vs respondents
✅ Audit trail for invitation usage

Your survey data is now protected, and only authorized users can access it!
