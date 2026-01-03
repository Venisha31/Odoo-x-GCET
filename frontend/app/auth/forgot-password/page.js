'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '../../lib/api';
import { FiMail, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            await api.post('/auth/forgot-password', { email });
            setStatus('success');
            setMessage('Password reset link has been sent to your email.');
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Failed to send request. Please try again.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            background: '#0f172a'
        }}>
            {/* Background Image */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Image
                    src="/auth-bg-2.png"
                    alt="Background"
                    fill
                    style={{ objectFit: 'cover', opacity: 0.4 }}
                    priority
                />
            </div>

            {/* Content */}
            <div className="container" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>

                <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '3rem', borderRadius: '24px', backdropFilter: 'blur(20px)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 className="text-gradient-animate" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Forgot Password?</h1>
                        <p style={{ color: '#94a3b8' }}>Enter your email to receive a reset link</p>
                    </div>

                    {status === 'success' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ width: 80, height: 80, background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <FiCheckCircle size={40} color="#4ade80" />
                            </div>
                            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Check your email</h3>
                            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>{message}</p>
                            <Link href="/auth/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {status === 'error' && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5' }}>
                                    <FiAlertCircle />
                                    <span style={{ fontSize: '0.9rem' }}>{message}</span>
                                </div>
                            )}

                            <div className="input-group-modern">
                                <label>Email Address</label>
                                <div className="input-wrapper">
                                    <FiMail className="input-icon" />
                                    <input
                                        type="email"
                                        className="input-modern"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? <span className="spinner"></span> : 'Send Reset Link'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <Link href="/auth/login" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                    <FiArrowLeft /> Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
