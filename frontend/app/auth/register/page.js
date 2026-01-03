'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { FiArrowLeft, FiUpload, FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  /* --------- LOGO HANDLER (UNCHANGED) --------- */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogo(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* --------- SUBMIT (UNCHANGED LOGIC) --------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        companyName: formData.companyName,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      await login(formData.email, formData.password);

      if (logo) {
        const uploadData = new FormData();
        uploadData.append('logo', logo);
        try {
          await api.post('/upload/logo', uploadData);
        } catch (_) {}
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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

      <style>{`
        @media (max-width: 968px) {
          .register-container { flex-direction: column !important; }
          .left-section { display: none !important; }
        }
      `}</style>

      <div
        className="register-container"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '1500px',
          margin: '0 auto',
          padding: '32px',
          gap: '40px',
          alignItems: 'center'
        }}
      >
        {/* LEFT DOODLE */}
        <div className="left-section" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/login-illustration.png"
            alt="Register Illustration"
            style={{ width: '115%', maxWidth: '720px' }}
          />
        </div>

        {/* RIGHT FORM */}
        <div style={{ flex: '0 0 500px' }}>
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '32px 36px',
              boxShadow: '0 20px 60px rgba(94,146,243,0.15)'
            }}
          >
            <h1 style={{ fontSize: '32px', fontWeight: 700 }}>Create Account</h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
              Register your company to get started
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px 12px',
                  background: '#fef2f2',
                  borderRadius: '10px',
                  color: '#dc2626',
                  marginBottom: '12px',
                  fontSize: '13px'
                }}
              >
                <FiAlertCircle />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <input style={inputStyle} placeholder="Company Name" required
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              />

              {/* LOGO UPLOAD */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <input type="file" id="logo-upload" hidden accept="image/*" onChange={handleLogoChange} />
                <label htmlFor="logo-upload" style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: logoPreview ? '#22c55e' : '#5e92f3',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  {logoPreview ? <FiCheck /> : <FiUpload />}
                </label>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Upload company logo (optional)
                </span>
              </div>

              <input style={inputStyle} placeholder="Admin Name" required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <input style={inputStyle} placeholder="Email" required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              <input style={inputStyle} placeholder="Phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
              <input style={inputStyle} type="password" placeholder="Password" required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <input style={inputStyle} type="password" placeholder="Confirm Password" required
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              />

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#5e92f3',
                  color: 'white',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 600,
                  marginTop: '8px'
                }}
              >
                {isLoading ? 'Creating Account…' : 'SIGN UP'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: '#5e92f3', fontWeight: 600 }}>
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* INPUT STYLE */
const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  marginBottom: '12px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: '14px',
  outline: 'none'
};
