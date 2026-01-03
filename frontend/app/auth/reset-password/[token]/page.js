'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { FiLock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = params;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            await api.post(`/auth/reset-password/${token}`, { password });
            setStatus('success');
            setTimeout(() => router.push('/auth/login'), 3000);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Failed to reset password. Link might be expired.');
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
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Image src="/auth-bg-2.png" alt="Background" fill style={{ objectFit: 'cover', opacity: 0.4 }} priority />
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '3rem', borderRadius: '24px', backdropFilter: 'blur(20px)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h1 className="text-gradient-animate" style={{ fontSize: '2rem', fontWeight: 800 }}>Reset Password</h1>
                        <p style={{ color: '#94a3b8' }}>Create a new strong password</p>
                    </div>

                    {status === 'success' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ width: 80, height: 80, background: 'rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <FiCheckCircle size={40} color="#4ade80" />
                            </div>
                            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Success!</h3>
                            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Your password has been reset. Redirecting to login...</p>
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
                                <label>New Password</label>
                                <div className="input-wrapper">
                                    <FiLock className="input-icon" />
                                    <input
                                        type="password"
                                        className="input-modern"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group-modern">
                                <label>Confirm Password</label>
                                <div className="input-wrapper">
                                    <FiLock className="input-icon" />
                                    <input
                                        type="password"
                                        className="input-modern"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                                {status === 'loading' ? <span className="spinner"></span> : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
