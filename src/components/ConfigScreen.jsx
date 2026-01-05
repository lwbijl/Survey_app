import { useState } from 'react';
import { saveSupabaseConfig } from '../utils/supabase';

const ConfigScreen = ({ onConfigured }) => {
  const [projectUrl, setProjectUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!projectUrl || !apiKey) {
      setError('Please fill in all fields');
      return;
    }

    // Validate URL format
    try {
      new URL(projectUrl);
    } catch {
      setError('Invalid project URL format');
      return;
    }

    // Save configuration
    saveSupabaseConfig(projectUrl, apiKey);
    onConfigured();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Survey Application Setup
        </h1>
        <p className="text-gray-600 mb-6">
          Configure your Supabase connection to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="projectUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Supabase Project URL
            </label>
            <input
              type="text"
              id="projectUrl"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              Supabase Anon API Key
            </label>
            <input
              type="text"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Save Configuration
          </button>
        </form>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="font-semibold text-gray-900 mb-3">Database Setup Instructions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Before using the application, create the following tables in your Supabase database:
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Table: surveys</p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`CREATE TABLE surveys (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`}
              </pre>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Table: survey_questions</p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`CREATE TABLE survey_questions (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  scale_min INT,
  scale_max INT,
  multiple_select BOOLEAN,
  percentage_max INT,
  question_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);`}
              </pre>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Table: survey_responses</p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`CREATE TABLE survey_responses (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_id TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  role TEXT NOT NULL,
  answers JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigScreen;
