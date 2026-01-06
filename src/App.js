import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from './utils/supabase';
import ConfigScreen from './components/ConfigScreen';
import AdminView from './components/AdminView';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';

// Force rebuild with environment variables
function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState('survey');

  useEffect(() => {
    // Debug: log environment variables
    console.log('window.ENV:', window.ENV);
    console.log('process.env.REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
    console.log('isSupabaseConfigured:', isSupabaseConfigured());
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const handleConfigured = () => {
    setIsConfigured(true);
  };

  if (!isConfigured) {
    return <ConfigScreen onConfigured={handleConfigured} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setActiveTab('survey')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'survey'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Survey
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'results'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Results
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="py-6">
        {activeTab === 'admin' && <AdminView />}
        {activeTab === 'survey' && <SurveyView />}
        {activeTab === 'results' && <ResultsView />}
      </main>
    </div>
  );
}

export default App;
