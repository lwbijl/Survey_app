import { useState, useEffect } from 'react';
import { getSurveys, getQuestions, getResponses, deleteResponse, deleteResponses } from '../utils/supabase';
import { renderFormattedText } from '../utils/formatText';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultsView = () => {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [filterCountry, setFilterCountry] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [selectedResponses, setSelectedResponses] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load surveys on mount
  useEffect(() => {
    loadSurveys();
  }, []);

  // Load questions and responses when survey is selected
  useEffect(() => {
    if (selectedSurveyId) {
      loadData();
    }
  }, [selectedSurveyId]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await getSurveys();
      setSurveys(data);

      // Select first survey by default
      if (data.length > 0 && !selectedSurveyId) {
        setSelectedSurveyId(data[0].id);
      }
    } catch (err) {
      setError('Failed to load surveys: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!selectedSurveyId) return;

    try {
      setLoading(true);
      const [questionsData, responsesData] = await Promise.all([
        getQuestions(selectedSurveyId),
        getResponses(selectedSurveyId)
      ]);
      setQuestions(questionsData);
      setResponses(responsesData);
      setSelectedResponses(new Set()); // Clear selection when changing surveys
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId) => {
    if (!window.confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await deleteResponse(responseId);
      setSuccess('Response deleted successfully!');
      await loadData();
    } catch (err) {
      setError('Failed to delete response: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedResponses.size === 0) {
      setError('No responses selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedResponses.size} response(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await deleteResponses(Array.from(selectedResponses));
      setSuccess(`${selectedResponses.size} response(s) deleted successfully!`);
      setSelectedResponses(new Set());
      await loadData();
    } catch (err) {
      setError('Failed to delete responses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleResponseSelection = (responseId) => {
    const newSelected = new Set(selectedResponses);
    if (newSelected.has(responseId)) {
      newSelected.delete(responseId);
    } else {
      newSelected.add(responseId);
    }
    setSelectedResponses(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedResponses.size === filteredResponses.length) {
      setSelectedResponses(new Set());
    } else {
      setSelectedResponses(new Set(filteredResponses.map(r => r.id)));
    }
  };

  // Get unique country codes and roles
  const countryCodes = ['All', ...new Set(responses.map(r => r.countryCode))];
  const roles = ['All', ...new Set(responses.map(r => r.role))];

  // Filter responses
  const filteredResponses = responses.filter(response => {
    const matchCountry = filterCountry === 'All' || response.countryCode === filterCountry;
    const matchRole = filterRole === 'All' || response.role === filterRole;
    return matchCountry && matchRole;
  });

  // Calculate aggregate data for each question
  const getQuestionData = (question) => {
    const questionId = question.id.toString();
    const answers = filteredResponses
      .map(r => r.answers[questionId])
      .filter(a => a !== undefined && a !== null && a !== '');

    if (question.type === 'scale') {
      const counts = {};
      for (let i = question.scaleMin; i <= question.scaleMax; i++) {
        counts[i] = 0;
      }
      answers.forEach(answer => {
        if (counts[answer] !== undefined) {
          counts[answer]++;
        }
      });

      return Object.entries(counts).map(([value, count]) => ({
        name: value,
        count
      }));
    }

    if (question.type === 'select') {
      const counts = {};
      question.options.forEach(option => {
        counts[option] = 0;
      });

      answers.forEach(answer => {
        if (Array.isArray(answer)) {
          answer.forEach(option => {
            if (counts[option] !== undefined) {
              counts[option]++;
            }
          });
        } else {
          if (counts[answer] !== undefined) {
            counts[answer]++;
          }
        }
      });

      return Object.entries(counts).map(([option, count]) => ({
        name: option.length > 20 ? option.substring(0, 20) + '...' : option,
        count
      }));
    }

    if (question.type === 'percentage') {
      const numericAnswers = answers.map(a => parseFloat(a)).filter(a => !isNaN(a));
      const average = numericAnswers.length > 0
        ? numericAnswers.reduce((sum, val) => sum + val, 0) / numericAnswers.length
        : 0;

      return [
        {
          name: 'Average',
          value: parseFloat(average.toFixed(2))
        }
      ];
    }

    return null;
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) {
      alert('No responses to export');
      return;
    }

    const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
    const headers = ['Name', 'Country', 'Role', 'Timestamp'];
    questions.forEach((_, i) => {
      headers.push(`Q${i + 1}`);
    });

    const rows = filteredResponses.map(response => {
      const row = [
        response.respondentName,
        response.countryCode,
        response.role,
        new Date(response.timestamp).toLocaleString()
      ];

      questions.forEach(question => {
        const answer = response.answers[question.id.toString()];
        if (Array.isArray(answer)) {
          row.push(answer.join('; '));
        } else {
          row.push(answer || '');
        }
      });

      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedSurvey?.title || 'survey'}_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);

  if (loading && surveys.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-gray-500 text-center py-8">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Survey Results</h1>
        <button
          onClick={handleExportCSV}
          disabled={filteredResponses.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export to CSV
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
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Survey</h2>

        {surveys.length === 0 ? (
          <p className="text-gray-500">No surveys available. Create a survey in the Admin panel first.</p>
        ) : (
          <select
            value={selectedSurveyId || ''}
            onChange={(e) => setSelectedSurveyId(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {surveys.map(survey => (
              <option key={survey.id} value={survey.id}>
                {survey.title} ({survey.isActive ? 'Active' : 'Archived'}) - {new Date(survey.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedSurvey && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country/Workshop
                </label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {countryCodes.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg w-full">
                  <span className="font-semibold">{filteredResponses.length}</span> responses
                </div>
              </div>
            </div>

            {selectedResponses.size > 0 && (
              <div className="mt-4 flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-900 font-medium">
                  {selectedResponses.size} response(s) selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedResponses(new Set())}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {filteredResponses.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              No responses found for the selected filters.
            </div>
          ) : (
            <>
              {/* Aggregate Results */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Aggregate Results</h2>
                <div className="space-y-6">
                  {questions.map((question, index) => {
                    const chartData = getQuestionData(question);

                    return (
                      <div key={question.id} className="bg-white rounded-lg shadow-lg p-6">
                        <div className="mb-4">
                          <span className="text-xs font-semibold text-gray-500">Question {index + 1}</span>
                          <div
                            className="text-gray-900 mt-1 font-medium"
                            dangerouslySetInnerHTML={{ __html: renderFormattedText(question.text) }}
                          />
                        </div>

                        {question.type === 'text' ? (
                          <div className="space-y-3">
                            {filteredResponses.map((response, idx) => {
                              const answer = response.answers[question.id.toString()];
                              if (!answer) return null;
                              return (
                                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50">
                                  <p className="text-gray-900">{answer}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    - {response.respondentName} ({response.countryCode}, {response.role})
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : chartData && chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar
                                dataKey={question.type === 'percentage' ? 'value' : 'count'}
                                fill="#3B82F6"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-gray-500 italic">No data available</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Responses */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Individual Responses</h2>
                  <button
                    onClick={toggleSelectAll}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {selectedResponses.size === filteredResponses.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-4">
                  {filteredResponses.map((response, idx) => (
                    <div
                      key={idx}
                      className={`bg-white rounded-lg shadow-lg p-6 transition-all ${
                        selectedResponses.has(response.id) ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedResponses.has(response.id)}
                            onChange={() => toggleResponseSelection(response.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {response.respondentName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {response.countryCode} | {response.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">
                            {new Date(response.timestamp).toLocaleString()}
                          </p>
                          <button
                            onClick={() => handleDeleteResponse(response.id)}
                            className="text-red-600 hover:text-red-800 ml-4"
                            title="Delete this response"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {questions.map((question, qIdx) => {
                          const answer = response.answers[question.id.toString()];
                          if (!answer && answer !== 0) return null;

                          return (
                            <div key={question.id}>
                              <p className="text-sm text-gray-600 mb-1">Q{qIdx + 1}</p>
                              <div
                                className="text-sm text-gray-500 mb-1"
                                dangerouslySetInnerHTML={{ __html: renderFormattedText(question.text) }}
                              />
                              <p className="text-gray-900 font-medium">
                                {Array.isArray(answer) ? answer.join(', ') : answer}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsView;
