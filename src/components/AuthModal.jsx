import React, { useState } from 'react';
import { signIn, signUp } from '../utils/supabase';
import './AuthModal.css';

const AuthModal = ({ onClose, onAuthenticated }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        await signUp(email, password);
        setSuccessMessage('Account created! Please sign in with your credentials.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        await signIn(email, password);
        setSuccessMessage('Successfully signed in!');
        setTimeout(() => {
          onAuthenticated();
          onClose();
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <h2>{isSignUp ? 'Create Admin Account' : 'Admin Sign In'}</h2>

        {error && <div className="auth-error">{error}</div>}
        {successMessage && <div className="auth-success">{successMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button onClick={() => setIsSignUp(false)} className="link-btn">
                Sign In
              </button>
            </>
          ) : (
            <>
              Need an account?{' '}
              <button onClick={() => setIsSignUp(true)} className="link-btn">
                Sign Up
              </button>
            </>
          )}
        </div>

        <div className="auth-note">
          <strong>Note:</strong> After creating an account, you'll need to run this
          SQL command in Supabase to grant admin privileges:
          <code>SELECT make_user_admin('your-email@example.com');</code>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
