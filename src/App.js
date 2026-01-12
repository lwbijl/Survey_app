import { useState, useEffect } from 'react';
import { isSupabaseConfigured, isAuthenticated, signOut, isAdmin } from './utils/supabase';
import ConfigScreen from './components/ConfigScreen';
import AdminView from './components/AdminView';
import SurveyView from './components/SurveyView';
import ResultsView from './components/ResultsView';
import AuthModal from './components/AuthModal';

// Force rebuild with environment variables
function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState('survey');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    // Debug: log environment variables
    console.log('window.ENV:', window.ENV);
    console.log('process.env.REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
    console.log('isSupabaseConfigured:', isSupabaseConfigured());
    setIsConfigured(isSupabaseConfigured());
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = isAuthenticated();
    setAuthenticated(isAuth);
    if (isAuth) {
      const adminStatus = await isAdmin();
      setUserIsAdmin(adminStatus);
    }
  };

  const handleConfigured = () => {
    setIsConfigured(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthenticated(false);
      setUserIsAdmin(false);
      setActiveTab('survey');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleAuthSuccess = async () => {
    await checkAuth();
  };

  const handleTabClick = (tab) => {
    if ((tab === 'admin' || tab === 'results') && !authenticated) {
      setShowAuthModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  if (!isConfigured) {
    return <ConfigScreen onConfigured={handleConfigured} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              <button
                onClick={() => handleTabClick('admin')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin {!authenticated && '🔒'}
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
                onClick={() => handleTabClick('results')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'results'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Results {!authenticated && '🔒'}
              </button>
            </div>

            {authenticated && (
              <div className="flex items-center space-x-4">
                {userIsAdmin && (
                  <span className="text-sm text-green-600 font-medium">Admin</span>
                )}
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="py-6">
        {activeTab === 'admin' && authenticated && <AdminView />}
        {activeTab === 'survey' && <SurveyView />}
        {activeTab === 'results' && authenticated && <ResultsView />}
        {(activeTab === 'admin' || activeTab === 'results') && !authenticated && (
          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access this section.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Sign In
            </button>
          </div>
        )}
      </main>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export default App;
