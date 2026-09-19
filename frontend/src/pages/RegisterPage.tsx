import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { getPasswordRequirements, isStrongPassword } from '../utils/password';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (!isStrongPassword(password)) {
      setError(
        'Password is too weak. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a digit, and a special character.',
      );
      return;
    }

    setSubmitting(true);

    try {
      await register(email, username, password, passwordConfirm);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Registration failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <h2 className="mb-3">Register</h2>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <ul className="list-unstyled small mt-2 mb-0">
                {getPasswordRequirements(password).map((req) => (
                  <li
                    key={req.label}
                    className={req.met ? 'text-success' : 'text-muted'}
                  >
                    {req.met ? '✓' : '○'} {req.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="password_confirm" className="form-label">
              Confirm Password
            </label>
            <PasswordInput
              id="password_confirm"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={submitting}
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="mt-3 text-center">
          Already have an account?{' '}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
