/**
 * Supabase API helper functions
 */

// Get Supabase configuration from environment variables or localStorage
export const getSupabaseConfig = () => {
  // First, check if runtime environment variables are set (from runtime-config.js)
  if (window.ENV?.REACT_APP_SUPABASE_URL &&
      window.ENV?.REACT_APP_SUPABASE_ANON_KEY &&
      window.ENV.REACT_APP_SUPABASE_URL.length > 0) {
    return {
      projectUrl: window.ENV.REACT_APP_SUPABASE_URL,
      apiKey: window.ENV.REACT_APP_SUPABASE_ANON_KEY
    };
  }

  // Second, check if build-time environment variables are set (for production deployment)
  if (process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY) {
    return {
      projectUrl: process.env.REACT_APP_SUPABASE_URL,
      apiKey: process.env.REACT_APP_SUPABASE_ANON_KEY
    };
  }

  // Fall back to localStorage (for local development)
  const config = localStorage.getItem('supabase_config');
  return config ? JSON.parse(config) : null;
};

// Save Supabase configuration to localStorage
export const saveSupabaseConfig = (projectUrl, apiKey) => {
  const config = { projectUrl, apiKey };
  localStorage.setItem('supabase_config', JSON.stringify(config));
};

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!getSupabaseConfig();
};

// ===== AUTHENTICATION API =====

// Get current session from localStorage
export const getSession = () => {
  const sessionData = localStorage.getItem('supabase_session');
  return sessionData ? JSON.parse(sessionData) : null;
};

// Save session to localStorage
const saveSession = (session) => {
  if (session) {
    localStorage.setItem('supabase_session', JSON.stringify(session));
  } else {
    localStorage.removeItem('supabase_session');
  }
};

// Get current user
export const getCurrentUser = () => {
  const session = getSession();
  return session?.user || null;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const session = getSession();
  if (!session) return false;

  // Check if token is expired
  const expiresAt = session.expires_at;
  if (expiresAt && new Date(expiresAt * 1000) < new Date()) {
    saveSession(null);
    return false;
  }

  return true;
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const config = getSupabaseConfig();
    if (!config) {
      throw new Error('Supabase not configured');
    }

    const response = await fetch(`${config.projectUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to sign in');
    }

    const data = await response.json();
    saveSession(data);
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUp = async (email, password) => {
  try {
    const config = getSupabaseConfig();
    if (!config) {
      throw new Error('Supabase not configured');
    }

    const response = await fetch(`${config.projectUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to sign up');
    }

    const data = await response.json();
    // For email confirmation flows, session might not be immediately available
    if (data.access_token) {
      saveSession(data);
    }
    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    const config = getSupabaseConfig();
    const session = getSession();

    if (config && session?.access_token) {
      // Call the sign out endpoint
      await fetch(`${config.projectUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    // Clear local session regardless
    saveSession(null);
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    // Clear local session even if API call fails
    saveSession(null);
    throw error;
  }
};

// Check if current user is admin
export const isAdmin = async () => {
  try {
    if (!isAuthenticated()) return false;

    const response = await fetch(`${getBaseUrl()}/user_profiles?id=eq.${getCurrentUser().id}&select=is_admin`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.length > 0 && data[0].is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Get headers for Supabase API requests
const getHeaders = () => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase not configured');
  }

  // Check if there's an authenticated user session
  const session = getSession();
  const token = session?.access_token || config.apiKey;

  return {
    'apikey': config.apiKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

// Get base URL for Supabase API
const getBaseUrl = () => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase not configured');
  }
  return `${config.projectUrl}/rest/v1`;
};

// Convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

// Convert camelCase to snake_case
const toSnakeCase = (obj, preserveKeys = []) => {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item, preserveKeys));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      // Don't convert nested objects for keys that should be preserved (like 'answers')
      if (preserveKeys.includes(key)) {
        result[snakeKey] = obj[key];
      } else {
        result[snakeKey] = toSnakeCase(obj[key], preserveKeys);
      }
      return result;
    }, {});
  }
  return obj;
};

// ===== QUESTIONS API =====

// Get all questions for a survey
export const getQuestions = async (surveyId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_questions?survey_id=eq.${surveyId}&select=*&order=question_order.asc,id.asc`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data);
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

// Save questions for a survey (delete all and insert new)
export const saveQuestions = async (surveyId, questions) => {
  try {
    // Delete all existing questions for this survey
    await fetch(`${getBaseUrl()}/survey_questions?survey_id=eq.${surveyId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    // Insert new questions
    if (questions.length > 0) {
      // Normalize all questions to have consistent structure
      // Remove database-generated fields and temporary IDs
      const questionsWithSurveyId = questions.map((q, index) => {
        const { id, surveyId: oldSurveyId, createdAt, questionOrder: oldOrder, ...questionData } = q;

        // Ensure all questions have the same fields, even if null
        return {
          text: questionData.text,
          type: questionData.type,
          options: questionData.options || null,
          scaleMin: questionData.scaleMin || null,
          scaleMax: questionData.scaleMax || null,
          multipleSelect: questionData.multipleSelect || null,
          percentageMax: questionData.percentageMax || null,
          surveyId,
          questionOrder: index
        };
      });
      const snakeCaseQuestions = toSnakeCase(questionsWithSurveyId, ['options']);

      console.log('Questions prepared for database:', snakeCaseQuestions);

      const response = await fetch(`${getBaseUrl()}/survey_questions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(snakeCaseQuestions)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save questions error response:', errorText);
        console.error('Save questions error status:', response.status, response.statusText);
        throw new Error(`Failed to save questions: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Questions saved successfully:', data);
      return toCamelCase(data);
    }

    console.log('No questions to save (empty array)');
    return [];
  } catch (error) {
    console.error('Error saving questions:', error);
    throw error;
  }
};

// Delete a single question
export const deleteQuestion = async (id) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_questions?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete question: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

// ===== SURVEYS API =====

// Get all surveys
export const getSurveys = async () => {
  try {
    const response = await fetch(`${getBaseUrl()}/surveys?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch surveys: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    throw error;
  }
};

// Get a single survey by ID
export const getSurvey = async (surveyId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/surveys?id=eq.${surveyId}&select=*`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch survey: ${response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0 ? toCamelCase(data[0]) : null;
  } catch (error) {
    console.error('Error fetching survey:', error);
    throw error;
  }
};

// Create a new survey
export const createSurvey = async (survey) => {
  try {
    const snakeCaseSurvey = toSnakeCase(survey);

    const response = await fetch(`${getBaseUrl()}/surveys`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(snakeCaseSurvey)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create survey error:', errorText);
      throw new Error(`Failed to create survey: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data[0]);
  } catch (error) {
    console.error('Error creating survey:', error);
    throw error;
  }
};

// Update an existing survey
export const updateSurvey = async (surveyId, updates) => {
  try {
    const snakeCaseUpdates = toSnakeCase(updates);

    const response = await fetch(`${getBaseUrl()}/surveys?id=eq.${surveyId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(snakeCaseUpdates)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update survey error:', errorText);
      throw new Error(`Failed to update survey: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data[0]);
  } catch (error) {
    console.error('Error updating survey:', error);
    throw error;
  }
};

// Delete a survey (and all associated questions/responses due to CASCADE)
export const deleteSurvey = async (surveyId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/surveys?id=eq.${surveyId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete survey: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
};

// ===== RESPONSES API =====

// Get all responses for a survey
export const getResponses = async (surveyId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_responses?survey_id=eq.${surveyId}&select=*&order=timestamp.desc`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch responses: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data);
  } catch (error) {
    console.error('Error fetching responses:', error);
    throw error;
  }
};

// Save a new response
export const saveResponse = async (surveyId, response, invitationId = null) => {
  try {
    // Preserve the 'answers' object as-is (don't convert its keys)
    const responseData = {
      ...response,
      surveyId,
      invitationId,
      userId: getCurrentUser()?.id || null
    };
    const snakeCaseResponse = toSnakeCase(responseData, ['answers']);

    // Remove id field if it exists (database will auto-generate it)
    const { id, ...responseWithoutId } = snakeCaseResponse;

    console.log('Saving response:', responseWithoutId);

    const result = await fetch(`${getBaseUrl()}/survey_responses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(responseWithoutId)
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error('Save response error:', errorText);
      throw new Error(`Failed to save response: ${result.statusText} - ${errorText}`);
    }

    const data = await result.json();
    console.log('Response saved successfully:', data);

    // Increment invitation usage if invitation was used
    if (invitationId) {
      try {
        await incrementInvitationUsage(invitationId);
      } catch (error) {
        console.error('Failed to increment invitation usage:', error);
        // Don't fail the whole operation if this fails
      }
    }

    return toCamelCase(data);
  } catch (error) {
    console.error('Error saving response:', error);
    throw error;
  }
};

// Delete a single response
export const deleteResponse = async (responseId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_responses?id=eq.${responseId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete response: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting response:', error);
    throw error;
  }
};

// Delete multiple responses
export const deleteResponses = async (responseIds) => {
  try {
    const deletePromises = responseIds.map(id => deleteResponse(id));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error deleting responses:', error);
    throw error;
  }
};

// ===== INVITATIONS API =====

// Get all invitations for a survey
export const getInvitations = async (surveyId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_invitations?survey_id=eq.${surveyId}&select=*&order=created_at.desc`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invitations: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    throw error;
  }
};

// Create a new invitation using the database function
export const createInvitation = async (surveyId, options = {}) => {
  try {
    const { email = null, inviteeName = null, maxUses = 1, expiresAt = null } = options;

    const response = await fetch(`${getBaseUrl()}/rpc/create_survey_invitation_v2`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        p_survey_id: surveyId,
        p_email: email,
        p_invitee_name: inviteeName,
        p_max_uses: maxUses,
        p_expires_at: expiresAt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create invitation error:', errorText);
      throw new Error(`Failed to create invitation: ${response.statusText}`);
    }

    const data = await response.json();
    // Handle JSON response (single object, not array)
    const rawInvitation = data;
    return toCamelCase(rawInvitation);
  } catch (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }
};

// Normalize invitation response to handle both old and new database function formats
const normalizeInvitationResponse = (rawInvitation) => {
  if (!rawInvitation) return null;

  // If the response uses the new column names (invitation_id, invitation_token, etc.)
  // normalize them to the expected format
  if (rawInvitation.invitation_id) {
    return {
      id: rawInvitation.invitation_id,
      token: rawInvitation.invitation_token,
      surveyId: rawInvitation.invitation_survey_id,
      email: rawInvitation.invitation_email,
      inviteeName: rawInvitation.invitation_invitee_name,
      maxUses: rawInvitation.invitation_max_uses,
      expiresAt: rawInvitation.invitation_expires_at
    };
  }

  // Otherwise use the standard camelCase conversion
  return toCamelCase(rawInvitation);
};

// Validate an invitation token
export const validateInvitation = async (token, surveyId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_invitations?token=eq.${token}&survey_id=eq.${surveyId}&is_active=eq.true&select=*`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.length === 0) {
      return null;
    }

    const invitation = toCamelCase(data[0]);

    // Check expiration
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return null;
    }

    // Check usage limit
    if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
      return null;
    }

    return invitation;
  } catch (error) {
    console.error('Error validating invitation:', error);
    return null;
  }
};

// Increment invitation usage count
export const incrementInvitationUsage = async (invitationId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/rpc/increment_invitation_usage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        invitation_id_value: invitationId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to increment invitation usage: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error incrementing invitation usage:', error);
    throw error;
  }
};

// Delete an invitation
export const deleteInvitation = async (invitationId) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_invitations?id=eq.${invitationId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete invitation: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting invitation:', error);
    throw error;
  }
};

// Toggle invitation active status
export const toggleInvitation = async (invitationId, isActive) => {
  try {
    const response = await fetch(`${getBaseUrl()}/survey_invitations?id=eq.${invitationId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ is_active: isActive })
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle invitation: ${response.statusText}`);
    }

    const data = await response.json();
    return toCamelCase(data[0]);
  } catch (error) {
    console.error('Error toggling invitation:', error);
    throw error;
  }
};
