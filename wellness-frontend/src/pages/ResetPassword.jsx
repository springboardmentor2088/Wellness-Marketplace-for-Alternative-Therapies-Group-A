import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import '../styles/ResetPassword.css'; // Optional styling

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Extract token from URL on mount
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const validatePasswordStrength = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('At least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('At least one special character (!@#$%^&* etc.)');
    }

    return errors;
  };

  const passwordErrors = validatePasswordStrength(newPassword);
  const isPasswordValid = passwordErrors.length === 0;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isPasswordValid) {
      setError('Password does not meet security requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(token, newPassword);
      setSuccess(response.message || 'Password reset successfully!');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h1>Create New Password</h1>
        <p className="subtitle">Choose a strong password for your account</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className={error ? 'disabled' : ''}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={loading || !token || !!error}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {newPassword && (
            <div className="password-requirements">
              <p className="requirements-title">Password Requirements:</p>
              <ul>
                <li className={/^.{8,}$/.test(newPassword) ? 'valid' : 'invalid'}>
                  ✓ At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) ? 'valid' : 'invalid'}>
                  ✓ At least one uppercase letter
                </li>
                <li className={/[a-z]/.test(newPassword) ? 'valid' : 'invalid'}>
                  ✓ At least one lowercase letter
                </li>
                <li className={/\d/.test(newPassword) ? 'valid' : 'invalid'}>
                  ✓ At least one digit
                </li>
                <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(newPassword) ? 'valid' : 'invalid'}>
                  ✓ At least one special character (!@#$%^&* etc.)
                </li>
              </ul>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading || !token || !!error}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="error-text">Passwords do not match</p>
            )}
            {passwordsMatch && (
              <p className="success-text">✓ Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !token ||
              !isPasswordValid ||
              !passwordsMatch ||
              !!error
            }
            className="btn btn-primary btn-full"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="divider"></div>

        <div className="back-to-login">
          <p>
            <a href="/login">Back to Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
