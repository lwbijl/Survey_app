import React, { useState, useEffect } from 'react';
import {
  getInvitations,
  createInvitation,
  deleteInvitation,
  toggleInvitation
} from '../utils/supabase';
import './InvitationManager.css';

const InvitationManager = ({ surveyId, surveyTitle }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  // Form state
  const [email, setEmail] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInvitations(surveyId);
      setInvitations(data);
    } catch (err) {
      setError('Failed to load invitations: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (surveyId) {
      loadInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const newInvitation = await createInvitation(surveyId, {
        email: email || null,
        inviteeName: inviteeName || null,
        maxUses: maxUses || 1,
        expiresAt
      });

      setInvitations([newInvitation, ...invitations]);
      setShowCreateForm(false);

      // Reset form
      setEmail('');
      setInviteeName('');
      setMaxUses(1);
      setExpiresInDays(7);
    } catch (err) {
      setError('Failed to create invitation: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invitationId) => {
    if (!window.confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteInvitation(invitationId);
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      setError('Failed to delete invitation: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (invitationId, currentStatus) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await toggleInvitation(invitationId, !currentStatus);
      setInvitations(
        invitations.map((inv) => (inv.id === invitationId ? updated : inv))
      );
    } catch (err) {
      setError('Failed to toggle invitation: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (token) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/?survey=${surveyId}&invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getInviteLink = (token) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?survey=${surveyId}&invite=${token}`;
  };

  const isExpired = (expiresAt) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const isMaxedOut = (invitation) => {
    return invitation.maxUses && invitation.usedCount >= invitation.maxUses;
  };

  if (!surveyId) {
    return (
      <div className="invitation-manager">
        <p className="no-survey-message">
          Select a survey to manage invitations
        </p>
      </div>
    );
  }

  return (
    <div className="invitation-manager">
      <div className="invitation-header">
        <h3>Survey Invitations</h3>
        <p className="survey-title">{surveyTitle}</p>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="create-invitation-btn"
          disabled={loading}
        >
          {showCreateForm ? 'Cancel' : '+ Create Invitation'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <form onSubmit={handleCreateInvitation} className="create-invitation-form">
          <h4>Create New Invitation</h4>

          <div className="form-group">
            <label>Invitee Name (Optional)</label>
            <input
              type="text"
              value={inviteeName}
              onChange={(e) => setInviteeName(e.target.value)}
              placeholder="John Doe"
            />
            <small>Who is this invitation for?</small>
          </div>

          <div className="form-group">
            <label>Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
            <small>For your reference only</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value))}
                min="1"
                max="1000"
                required
              />
              <small>How many times can this link be used?</small>
            </div>

            <div className="form-group">
              <label>Expires In (Days)</label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                min="1"
                max="365"
                required
              />
              <small>When should this link expire?</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              Create Invitation
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && invitations.length === 0 ? (
        <p className="loading-message">Loading invitations...</p>
      ) : invitations.length === 0 ? (
        <p className="no-invitations-message">
          No invitations yet. Create one to start inviting respondents.
        </p>
      ) : (
        <div className="invitations-list">
          {invitations.map((invitation) => {
            const expired = isExpired(invitation.expiresAt);
            const maxedOut = isMaxedOut(invitation);
            const inactive = !invitation.isActive;
            const canBeUsed = !expired && !maxedOut && invitation.isActive;

            return (
              <div
                key={invitation.id}
                className={`invitation-card ${!canBeUsed ? 'disabled' : ''}`}
              >
                <div className="invitation-info">
                  {invitation.inviteeName && (
                    <div className="invitee-name">{invitation.inviteeName}</div>
                  )}
                  {invitation.email && (
                    <div className="invitee-email">{invitation.email}</div>
                  )}

                  <div className="invitation-stats">
                    <span className="stat">
                      Used: {invitation.usedCount} / {invitation.maxUses || '∞'}
                    </span>
                    <span className="stat">
                      Expires:{' '}
                      {invitation.expiresAt
                        ? new Date(invitation.expiresAt).toLocaleDateString()
                        : 'Never'}
                    </span>
                    <span className="stat">
                      Created:{' '}
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {(expired || maxedOut || inactive) && (
                    <div className="invitation-badges">
                      {inactive && <span className="badge badge-inactive">Inactive</span>}
                      {expired && <span className="badge badge-expired">Expired</span>}
                      {maxedOut && <span className="badge badge-maxed">Max Uses Reached</span>}
                    </div>
                  )}

                  <div className="invitation-link">
                    <input
                      type="text"
                      value={getInviteLink(invitation.token)}
                      readOnly
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      onClick={() => copyInviteLink(invitation.token)}
                      className="btn-copy"
                      title="Copy invitation link"
                    >
                      {copiedToken === invitation.token ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                </div>

                <div className="invitation-actions">
                  <button
                    onClick={() => handleToggleActive(invitation.id, invitation.isActive)}
                    className={`btn-toggle ${invitation.isActive ? 'active' : ''}`}
                    disabled={loading}
                    title={invitation.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {invitation.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDelete(invitation.id)}
                    className="btn-delete"
                    disabled={loading}
                    title="Delete invitation"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvitationManager;
