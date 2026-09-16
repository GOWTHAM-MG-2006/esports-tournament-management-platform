import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendOtpRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyPage() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email] = useState<string>(
    (location.state as { email?: string } | null)?.email ??
      localStorage.getItem('pending_verification_email') ??
      '',
  );
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await verifyOtp(email, code.trim());
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr.response?.data?.message ?? axiosErr.message ?? 'Verification failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const res = await resendOtpRequest(email);
      setInfo(res.message ?? 'A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      const timer = window.setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr.response?.data?.message ?? axiosErr.message ?? 'Could not resend code';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="alert alert-warning" role="alert">
            No pending registration found. Please{' '}
            <Link to="/register">register</Link> first.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <h2 className="mb-3">Verify Email</h2>
        <p className="text-muted">
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below
          to activate your account.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {info && (
          <div className="alert alert-success" role="alert">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="otp-code" className="form-label">
              Verification Code
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="form-control"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={submitting}
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-link w-100 mt-2"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : resending
              ? 'Sending…'
              : "Didn't get the code? Resend"}
        </button>
      </div>
    </div>
  );
}
