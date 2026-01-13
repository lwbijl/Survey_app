import { useState, useEffect } from 'react';
import { getSurvey, getQuestions, saveResponse, validateInvitation } from '../utils/supabase';
import { renderFormattedText } from '../utils/formatText';
import SurveyBanner from './SurveyBanner';

const SurveyView = () => {
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [role, setRole] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [invitationValidated, setInvitationValidated] = useState(false);

  const roles = ['Claims', 'SUWS', 'HQ', 'IT', 'Investment'];

  // Get survey ID and invite token from URL parameters
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const surveyIdParam = params.get('survey');
    return {
      surveyId: surveyIdParam ? parseInt(surveyIdParam, 10) : null,
      inviteToken: params.get('invite')
    };
  };

  const validateAndLoadSurvey = async (surveyId, inviteToken) => {
    try {
      setLoading(true);

      // Validate invitation token
      const invitationData = await validateInvitation(inviteToken, surveyId);

      if (!invitationData) {
        setError('Invalid or expired invitation link. Please contact the administrator for a new link.');
        return;
      }

      setInvitation(invitationData);
      setInvitationValidated(true);

      // Pre-fill name if invitation has it
      if (invitationData.inviteeName) {
        setName(invitationData.inviteeName);
      }

      // Load survey data
      await loadSurvey(surveyId);
      await loadQuestions(surveyId);
    } catch (err) {
      setError('Failed to validate invitation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSurvey = async (surveyId) => {
    try {
      setLoading(true);
      const data = await getSurvey(surveyId);
      if (!data) {
        setError('Survey not found.');
        return;
      }
      if (!data.isActive) {
        setError('This survey is no longer active.');
        return;
      }
      setSurvey(data);
    } catch (err) {
      setError('Failed to load survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load survey and questions on mount
  useEffect(() => {
    const { surveyId, inviteToken } = getUrlParams();
    if (surveyId) {
      if (inviteToken) {
        validateAndLoadSurvey(surveyId, inviteToken);
      } else {
        setError('This survey requires an invitation. Please use the invitation link provided to you.');
      }
    } else {
      setError('No survey specified. Please use a valid survey link.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuestions = async (surveyId) => {
    try {
      setLoading(true);
      const data = await getQuestions(surveyId);
      setQuestions(data);
    } catch (err) {
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handlePercentageChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultipleSelectChange = (questionId, option, checked) => {
    const currentAnswers = answers[questionId] || [];
    let newAnswers;

    if (checked) {
      newAnswers = [...currentAnswers, option];
    } else {
      newAnswers = currentAnswers.filter(a => a !== option);
    }

    setAnswers({
      ...answers,
      [questionId]: newAnswers
    });
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (!countryCode.trim()) {
      setError('Please enter your country code');
      return false;
    }
    if (!role) {
      setError('Please select your role');
      return false;
    }

    for (const question of questions) {
      const answer = answers[question.id];

      if (answer === undefined || answer === null || answer === '') {
        setError(`Please answer question: ${question.text.substring(0, 50)}...`);
        return false;
      }

      if (question.type === 'select' && question.multipleSelect && Array.isArray(answer) && answer.length === 0) {
        setError(`Please select at least one option for: ${question.text.substring(0, 50)}...`);
        return false;
      }

      if (question.type === 'percentage') {
        const numValue = parseFloat(answer);
        if (isNaN(numValue) || numValue < 0 || numValue > question.percentageMax) {
          setError(`Percentage must be between 0 and ${question.percentageMax}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    const { surveyId } = getUrlParams();
    if (!surveyId) {
      setError('Survey ID not found');
      return;
    }

    if (!invitationValidated) {
      setError('Valid invitation required to submit survey');
      return;
    }

    try {
      setLoading(true);

      const respondentId = name.toLowerCase().replace(/\s+/g, '_');
      const timestamp = new Date().toISOString();

      const response = {
        respondentId,
        respondentName: name,
        countryCode,
        role,
        answers,
        timestamp
      };

      await saveResponse(surveyId, response, invitation.id);

      setSuccess('Survey submitted successfully! Thank you for your participation.');

      // Clear form
      setName('');
      setCountryCode('');
      setRole('');
      setAnswers({});

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Failed to submit survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !survey) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-500 text-center py-8">Loading survey...</p>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <p className="text-gray-600 mt-4 text-center">
          Please contact the administrator for a valid survey link.
        </p>
      </div>
    );
  }

  if (!survey || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          {questions.length === 0
            ? 'No questions available for this survey.'
            : 'Survey not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <SurveyBanner
        title={survey.title}
        description={survey.description || 'Please fill out all fields to submit your responses.'}
        imageUrl={survey.imageUrl}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Participant Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Participant Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-2">
                Country Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="countryCode"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., US, UK, DE"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select your role</option>
                {roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Questions */}
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <span className="text-xs font-semibold text-gray-500">Question {index + 1}</span>
              <div
                className="text-gray-900 mt-1 font-medium"
                dangerouslySetInnerHTML={{ __html: renderFormattedText(question.text) }}
              />
            </div>

            {/* Scale Question */}
            {question.type === 'scale' && (
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  { length: question.scaleMax - question.scaleMin + 1 },
                  (_, i) => question.scaleMin + i
                ).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAnswerChange(question.id, value)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      answers[question.id] === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}

            {/* Select Question (Single) */}
            {question.type === 'select' && !question.multipleSelect && (
              <div className="space-y-2">
                {question.options.map(option => (
                  <label key={option} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Select Question (Multiple) */}
            {question.type === 'select' && question.multipleSelect && (
              <div className="space-y-2">
                {question.options.map(option => (
                  <label key={option} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(answers[question.id] || []).includes(option)}
                      onChange={(e) => handleMultipleSelectChange(question.id, option, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Free Text Question */}
            {question.type === 'text' && (
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your answer..."
              />
            )}

            {/* Percentage Question */}
            {question.type === 'percentage' && (
              <div>
                <input
                  type="number"
                  min="0"
                  max={question.percentageMax}
                  step="1"
                  value={answers[question.id] ?? ''}
                  onChange={(e) => handlePercentageChange(question.id, e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter value (0-${question.percentageMax})`}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum value: {question.percentageMax}</p>
              </div>
            )}
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Survey'}
        </button>
      </form>
    </div>
  );
};

export default SurveyView;
