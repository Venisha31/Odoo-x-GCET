'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { FiArrowLeft } from 'react-icons/fi';

/* ---------------- ICONS ---------------- */
const FiLoader = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
  </svg>
);

const FiAlertCircle = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/* ---------------- LOGIN PAGE ---------------- */
export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({
        email: formData.email,
        password: formData.password
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #d4e9f7 100%)',
        position: 'relative'
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
        @media (max-width: 968px) {
          .login-container { flex-direction: column !important; }
          .left-section { display: none !important; }
        }
      `}</style>

      {/* 🔙 Back to Home */}
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#475569',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        <FiArrowLeft size={18} />
        Back to Home
      </Link>

      <div
        className="login-container"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px',
          gap: '60px'
        }}
      >
        {/* LEFT DOODLE */}
        <div className="left-section" style={{ flex: 1 }}>
          <img
            src="/login-illustration.png"
            alt="Login Illustration"
            style={{ width: '100%', maxWidth: '550px' }}
          />
        </div>

        {/* RIGHT LOGIN CARD */}
        <div style={{ flex: '0 0 480px' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '50px 45px',
              boxShadow: '0 20px 60px rgba(94,146,243,0.15)'
            }}
          >
            <h1 style={{ fontSize: '36px', fontWeight: 700 }}>Login</h1>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Welcome back! Please login to your account
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '12px',
                  background: '#fef2f2',
                  borderRadius: '10px',
                  color: '#dc2626',
                  marginBottom: '20px'
                }}
              >
                <FiAlertCircle />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <input
                type="text"
                placeholder="Login ID / Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                style={{ width: '100%', padding: '14px', marginBottom: '16px' }}
              />

              {/* Password */}
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                style={{ width: '100%', padding: '14px', marginBottom: '24px' }}
              />

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: '#5e92f3',
                  color: 'white',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? (
                  <>
                    <FiLoader className="spinner" /> Signing in...
                  </>
                ) : (
                  'LOGIN'
                )}
              </button>
            </form>

            {/* Links */}
            <p
              style={{
                textAlign: 'center',
                marginTop: '24px',
                color: '#64748b',
                fontSize: '14px'
              }}
            >
              Don’t have an account?{' '}
              <Link
                href="/auth/register"
                style={{
                  color: '#5e92f3',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Sign Up
              </Link>
            </p>

            <p
              style={{
                textAlign: 'center',
                marginTop: '8px',
                fontSize: '13px'
              }}
            >
              <Link
                href="/auth/forgot-password"
                style={{ color: '#64748b', textDecoration: 'none' }}
              >
                Forgot Password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
