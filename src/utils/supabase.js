/**
 * Supabase API helper functions
 */

// Get Supabase configuration from localStorage
export const getSupabaseConfig = () => {
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

// Get headers for Supabase API requests
const getHeaders = () => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase not configured');
  }

  return {
    'apikey': config.apiKey,
    'Authorization': `Bearer ${config.apiKey}`,
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
export const saveResponse = async (surveyId, response) => {
  try {
    // Preserve the 'answers' object as-is (don't convert its keys)
    const responseWithSurveyId = { ...response, surveyId };
    const snakeCaseResponse = toSnakeCase(responseWithSurveyId, ['answers']);

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
