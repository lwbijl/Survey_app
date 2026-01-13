import { useState, useEffect } from 'react';
import { getSurveys, createSurvey, updateSurvey, deleteSurvey, getQuestions, saveQuestions } from '../utils/supabase';
import { renderFormattedText } from '../utils/formatText';
import InvitationManager from './InvitationManager';

const AdminView = () => {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('scale');
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(5);
  const [options, setOptions] = useState('');
  const [multipleSelect, setMultipleSelect] = useState(false);
  const [percentageMax, setPercentageMax] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewSurveyModal, setShowNewSurveyModal] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [newSurveyDescription, setNewSurveyDescription] = useState('');
  const [showEditSurveyModal, setShowEditSurveyModal] = useState(false);
  const [editSurveyId, setEditSurveyId] = useState(null);
  const [editSurveyTitle, setEditSurveyTitle] = useState('');
  const [editSurveyDescription, setEditSurveyDescription] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Load surveys on mount
  useEffect(() => {
    loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load questions when survey is selected
  useEffect(() => {
    if (selectedSurveyId) {
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurveyId]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await getSurveys();
      setSurveys(data);

      // Select first active survey by default
      if (data.length > 0 && !selectedSurveyId) {
        const activeSurvey = data.find(s => s.isActive) || data[0];
        setSelectedSurveyId(activeSurvey.id);
      }
    } catch (err) {
      setError('Failed to load surveys: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!selectedSurveyId) return;

    try {
      setLoading(true);
      const data = await getQuestions(selectedSurveyId);
      setQuestions(data);
    } catch (err) {
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = async () => {
    if (!newSurveyTitle.trim()) {
      setError('Survey title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const newSurvey = await createSurvey({
        title: newSurveyTitle,
        description: newSurveyDescription,
        isActive: true
      });

      setSuccess('Survey created successfully!');
      setShowNewSurveyModal(false);
      setNewSurveyTitle('');
      setNewSurveyDescription('');

      await loadSurveys();
      setSelectedSurveyId(newSurvey.id);
    } catch (err) {
      setError('Failed to create survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSurveyImage = async (surveyTitle, surveyId) => {
    try {
      // Use environment variable for API URL, fallback to localhost for development
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: surveyTitle, surveyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  };

  const handleUpdateSurvey = async (updates) => {
    if (!selectedSurveyId) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // If activating the survey, generate an image first
      if (updates.isActive === true) {
        const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
        if (selectedSurvey) {
          setSuccess('Generating AI image for survey banner...');
          try {
            const imageUrl = await generateSurveyImage(selectedSurvey.title, selectedSurveyId);
            updates.imageUrl = imageUrl;
            setSuccess('AI image generated! Activating survey...');
          } catch (imgError) {
            setError('Warning: Failed to generate AI image, but activating survey anyway. Error: ' + imgError.message);
            // Continue with activation even if image generation fails
          }
        }
      }

      await updateSurvey(selectedSurveyId, updates);
      setSuccess(updates.isActive ? 'Survey activated with AI-generated banner!' : 'Survey archived successfully!');
      await loadSurveys();
    } catch (err) {
      setError('Failed to update survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!selectedSurveyId) return;

    const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
    if (!selectedSurvey) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('Regenerating AI image for survey banner...');

      const imageUrl = await generateSurveyImage(selectedSurvey.title, selectedSurveyId);
      await updateSurvey(selectedSurveyId, { imageUrl });

      setSuccess('New AI image generated and saved!');
      await loadSurveys();
    } catch (err) {
      setError('Failed to regenerate image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
    if (!window.confirm('Are you sure? This will delete the survey and ALL associated questions and responses.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await deleteSurvey(surveyId);
      setSuccess('Survey deleted successfully!');

      if (surveyId === selectedSurveyId) {
        setSelectedSurveyId(null);
        setQuestions([]);
      }

      await loadSurveys();
    } catch (err) {
      setError('Failed to delete survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateSurvey = async (surveyId) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Get the survey to duplicate
      const surveyToDuplicate = surveys.find(s => s.id === surveyId);
      if (!surveyToDuplicate) {
        setError('Survey not found');
        return;
      }

      // Get the questions for this survey
      const questionsData = await getQuestions(surveyId);

      // Create new survey with "Copy of" prefix
      const newSurvey = await createSurvey({
        title: `Copy of ${surveyToDuplicate.title}`,
        description: surveyToDuplicate.description,
        isActive: false // Start as archived so user can edit before activating
      });

      // Copy all questions to the new survey
      if (questionsData.length > 0) {
        // Remove IDs and prepare questions for new survey
        const questionsToCopy = questionsData.map(q => {
          const { id, surveyId, createdAt, ...questionData } = q;
          return questionData;
        });

        await saveQuestions(newSurvey.id, questionsToCopy);
      }

      setSuccess(`Survey duplicated successfully! "${newSurvey.title}" has been created with ${questionsData.length} question(s).`);
      await loadSurveys();
      setSelectedSurveyId(newSurvey.id);
    } catch (err) {
      setError('Failed to duplicate survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditSurvey = (survey) => {
    setEditSurveyId(survey.id);
    setEditSurveyTitle(survey.title);
    setEditSurveyDescription(survey.description || '');
    setShowEditSurveyModal(true);
  };

  const handleSaveEditSurvey = async () => {
    if (!editSurveyTitle.trim()) {
      setError('Survey title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await updateSurvey(editSurveyId, {
        title: editSurveyTitle,
        description: editSurveyDescription
      });

      setSuccess('Survey updated successfully!');
      setShowEditSurveyModal(false);
      setEditSurveyId(null);
      setEditSurveyTitle('');
      setEditSurveyDescription('');

      await loadSurveys();
    } catch (err) {
      setError('Failed to update survey: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }

    if (!selectedSurveyId) {
      setError('Please select a survey first');
      return;
    }

    const newQuestion = {
      id: Date.now(), // Temporary ID
      text: questionText,
      type: questionType,
      options: questionType === 'select' ? options.split('\n').filter(o => o.trim()) : null,
      scaleMin: questionType === 'scale' ? scaleMin : null,
      scaleMax: questionType === 'scale' ? scaleMax : null,
      multipleSelect: questionType === 'select' ? multipleSelect : null,
      percentageMax: questionType === 'percentage' ? percentageMax : null
    };

    setQuestions([...questions, newQuestion]);

    // Reset form
    setQuestionText('');
    setQuestionType('scale');
    setScaleMin(1);
    setScaleMax(5);
    setOptions('');
    setMultipleSelect(false);
    setPercentageMax(100);
    setError('');
    setSuccess('⚠️ Question added to list. Don\'t forget to click "Save All Questions" before leaving!');
  };

  const handleDeleteQuestion = async (id) => {
    setQuestions(questions.filter(q => q.id !== id));
    setSuccess('Question removed from list. Click "Save All Questions" to persist.');
  };

  const handleMoveQuestionUp = (index) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    setQuestions(newQuestions);
    setSuccess('Question moved up. Click "Save All Questions" to persist the new order.');
  };

  const handleMoveQuestionDown = (index) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    setQuestions(newQuestions);
    setSuccess('Question moved down. Click "Save All Questions" to persist the new order.');
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedQuestion);

    setQuestions(newQuestions);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setSuccess('Questions reordered. Click "Save All Questions" to persist the new order.');
  };

  const handleSaveAllQuestions = async () => {
    if (!selectedSurveyId) {
      setError('Please select a survey first');
      return;
    }

    if (questions.length === 0) {
      setError('No questions to save');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('Saving questions for survey:', selectedSurveyId);
      console.log('Questions to save:', questions);

      await saveQuestions(selectedSurveyId, questions);
      setSuccess(`✅ Successfully saved ${questions.length} question(s)!`);
      await loadQuestions();
    } catch (err) {
      console.error('Save questions error:', err);
      setError('Failed to save questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
  const surveyUrl = selectedSurveyId
    ? `${window.location.origin}/?survey=${selectedSurveyId}`
    : '';

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin - Survey Management</h1>
        <button
          onClick={() => setShowNewSurveyModal(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Survey
        </button>
      </div>

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

      {/* Survey Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Survey</h2>

        {surveys.length === 0 ? (
          <p className="text-gray-500">No surveys yet. Create your first survey to get started!</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {surveys.map(survey => (
                <div
                  key={survey.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSurveyId === survey.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSurveyId(survey.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                      {survey.description && (
                        <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          survey.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {survey.isActive ? 'Active' : 'Archived'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(survey.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSurvey(survey);
                        }}
                        className="text-gray-600 hover:text-gray-800"
                        title="Edit survey name/description"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSurvey(survey.id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Duplicate survey"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSurvey(survey.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete survey"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedSurvey && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => handleUpdateSurvey({ isActive: !selectedSurvey.isActive })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedSurvey.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedSurvey.isActive ? 'Archive Survey' : 'Activate Survey'}
                  </button>
                  <button
                    onClick={handleRegenerateImage}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Regenerate Banner Image'}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Survey Link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={surveyUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(surveyUrl);
                        setSuccess('Survey link copied to clipboard!');
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedSurveyId && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Questions for "{selectedSurvey?.title}"</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Question Creator */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Question</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Text
                    <span className="text-gray-500 text-xs ml-2">
                      (Use **bold**, *italic*, __underline__)
                    </span>
                  </label>
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your question here..."
                  />
                </div>

                {questionText && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <div
                      className="text-gray-900"
                      dangerouslySetInnerHTML={{ __html: renderFormattedText(questionText) }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="scale">Scale</option>
                    <option value="select">Select Options</option>
                    <option value="text">Free Text</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                {questionType === 'scale' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Value
                      </label>
                      <input
                        type="number"
                        value={scaleMin}
                        onChange={(e) => setScaleMin(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Value
                      </label>
                      <input
                        type="number"
                        value={scaleMax}
                        onChange={(e) => setScaleMax(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {questionType === 'select' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options (one per line)
                      </label>
                      <textarea
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="multipleSelect"
                        checked={multipleSelect}
                        onChange={(e) => setMultipleSelect(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="multipleSelect" className="ml-2 text-sm text-gray-700">
                        Allow multiple selections
                      </label>
                    </div>
                  </>
                )}

                {questionType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Value
                    </label>
                    <input
                      type="number"
                      value={percentageMax}
                      onChange={(e) => setPercentageMax(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <button
                  onClick={handleAddQuestion}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Questions List ({questions.length})
                </h2>
                {questions.length > 0 && (
                  <button
                    onClick={handleSaveAllQuestions}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {loading ? 'Saving...' : '💾 Save All Questions'}
                  </button>
                )}
              </div>

              {questions.length > 0 && (
                <>
                  <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm">
                    <p className="font-semibold">💡 Reordering Questions</p>
                    <p>Use ↑↓ arrows or drag and drop to reorder questions.</p>
                  </div>
                  <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm">
                    <p className="font-semibold">⚠️ Unsaved Changes</p>
                    <p>Click "Save All Questions" to persist these {questions.length} question(s) to the database.</p>
                  </div>
                </>
              )}

              {loading && questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Loading questions...</p>
              ) : questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No questions yet. Create your first question!</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {questions.map((q, index) => (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border border-gray-200 rounded-lg p-4 transition-all cursor-move ${
                        draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                      } hover:border-blue-300 hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Drag handle and reorder buttons */}
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <button
                            onClick={() => handleMoveQuestionUp(index)}
                            disabled={index === 0}
                            className={`text-gray-400 hover:text-gray-600 transition-colors ${
                              index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>

                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>

                          <button
                            onClick={() => handleMoveQuestionDown(index)}
                            disabled={index === questions.length - 1}
                            className={`text-gray-400 hover:text-gray-600 transition-colors ${
                              index === questions.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Question content */}
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-gray-500">Q{index + 1}</span>
                          <div
                            className="text-gray-900 mt-1"
                            dangerouslySetInnerHTML={{ __html: renderFormattedText(q.text) }}
                          />
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete question"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {q.type}
                        </span>
                        {q.type === 'scale' && (
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            {q.scaleMin} - {q.scaleMax}
                          </span>
                        )}
                        {q.type === 'select' && q.multipleSelect && (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                            Multiple
                          </span>
                        )}
                        {q.type === 'percentage' && (
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            Max: {q.percentageMax}
                          </span>
                        )}
                      </div>
                      {q.options && (
                        <div className="mt-2 text-xs text-gray-600">
                          Options: {q.options.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invitation Management Section */}
          <div className="mt-8">
            <InvitationManager
              surveyId={selectedSurveyId}
              surveyTitle={surveys.find(s => s.id === selectedSurveyId)?.title}
            />
          </div>
        </>
      )}

      {/* New Survey Modal */}
      {showNewSurveyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Survey</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Title *
                </label>
                <input
                  type="text"
                  value={newSurveyTitle}
                  onChange={(e) => setNewSurveyTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Q1 2026 Workshop Survey"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newSurveyDescription}
                  onChange={(e) => setNewSurveyDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this survey..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateSurvey}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Create Survey
                </button>
                <button
                  onClick={() => {
                    setShowNewSurveyModal(false);
                    setNewSurveyTitle('');
                    setNewSurveyDescription('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Survey Modal */}
      {showEditSurveyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Survey</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Title *
                </label>
                <input
                  type="text"
                  value={editSurveyTitle}
                  onChange={(e) => setEditSurveyTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Q1 2026 Workshop Survey"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editSurveyDescription}
                  onChange={(e) => setEditSurveyDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this survey..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEditSurvey}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditSurveyModal(false);
                    setEditSurveyId(null);
                    setEditSurveyTitle('');
                    setEditSurveyDescription('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
