'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { format } from 'date-fns';
import RupeeIcon from '../components/RupeeIcon';
import {
    FiUser,
    FiMail,
    FiPhone,
    FiMapPin,
    FiBriefcase,
    FiCalendar,
    FiEdit2,
    FiSave,
    FiX,
    FiLoader,
    FiAlertCircle,
    FiCheckCircle,
    FiLock,
    FiClock,
    FiZap,
    FiCamera,
    FiFileText,
    FiHash,
    FiAward
} from 'react-icons/fi';

export default function ProfilePage() {
    const { user, loading: authLoading, isAdmin, company } = useAuth();
    const [profile, setProfile] = useState(null);
    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        about: '',
        interests: '',
        skills: '',
        phone: '',
        address: '',
        profilePicture: ''
    });
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (user?.employee) {
            fetchProfile();
        }
    }, [user, authLoading]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/employees/${user.employee.id}/profile`);
            setProfile(response.data.employee);
            setPayroll(response.data.employee?.payroll?.[0] || null);
            setFormData({
                about: response.data.employee.about || '',
                interests: response.data.employee.interests || '',
                skills: response.data.employee.skills || '',
                phone: response.data.employee.phone || '',
                address: response.data.employee.address || '',
                profilePicture: response.data.employee.profilePicture || ''
            });
        } catch (err) {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await api.put(`/employees/${user.employee.id}`, formData);
            setSuccess('Profile updated successfully');
            setEditing(false);
            fetchProfile();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Calculate profile completeness
    const profileCompleteness = useMemo(() => {
        if (!profile) return 0;
        const fields = [
            profile.firstName,
            profile.lastName,
            profile.email,
            profile.phone,
            profile.address,
            profile.about,
            profile.interests,
            profile.skills,
            profile.department,
            profile.position
        ];
        const filled = fields.filter(f => f && f.trim() !== '').length;
        return Math.round((filled / fields.length) * 100);
    }, [profile]);

    const getCompletenessColor = (percent) => {
        if (percent >= 80) return 'var(--success)';
        if (percent >= 50) return 'var(--warning)';
        return 'var(--error)';
    };

    const tabs = [
        { id: 'personal', label: 'Personal Details', icon: <FiUser size={16} /> },
        { id: 'job', label: 'Job Details', icon: <FiBriefcase size={16} /> },
        { id: 'documents', label: 'Documents', icon: <FiFileText size={16} /> },
        { id: 'salary', label: 'Salary', icon: <RupeeIcon size={16} /> },
    ];

    if (authLoading || loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="header">
                <div className="container header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                        <Link href="/dashboard" className="logo">
                            <Image
                                src="/imagee.png"
                                alt="Dayflow Logo"
                                width={120}
                                height={40}
                                style={{ objectFit: 'contain' }}
                            />
                        </Link>

                        <nav style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
                            <Link href="/attendance" className="btn btn-ghost">
                                <FiClock size={16} /> Attendance
                            </Link>
                            <Link href="/leave" className="btn btn-ghost">
                                <FiCalendar size={16} /> Time Off
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main style={{ padding: 'var(--space-xl)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                    {/* Alerts */}
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>
                            <FiAlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success" style={{ marginBottom: 'var(--space-lg)' }}>
                            <FiCheckCircle size={18} />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* Two Column Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-xl)' }}>

                        {/* Left Column - Profile Photo & Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                            {/* Profile Photo Card */}
                            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 'var(--space-lg)' }}>
                                    <div className="avatar" style={{
                                        width: '120px',
                                        height: '120px',
                                        fontSize: '2.5rem',
                                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'
                                    }}>
                                        {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                                    </div>
                                    {editing && (
                                        <button
                                            style={{
                                                position: 'absolute',
                                                bottom: '0',
                                                right: '0',
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: 'var(--primary)',
                                                border: '3px solid var(--bg-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: 'white'
                                            }}
                                        >
                                            <FiCamera size={16} />
                                        </button>
                                    )}
                                </div>

                                <h2 style={{ marginBottom: '4px' }}>{profile?.firstName} {profile?.lastName}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                    {profile?.position || 'Employee'}
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                                    {profile?.department || 'Department'}
                                </p>

                                {/* Edit Button */}
                                <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-lg)' }}>
                                    {!editing ? (
                                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setEditing(true)}>
                                            <FiEdit2 size={16} /> Edit Profile
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setEditing(false); fetchProfile(); }}>
                                                <FiX size={16} /> Cancel
                                            </button>
                                            <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                                                {saving ? <FiLoader className="spinner" size={16} /> : <FiSave size={16} />} Save
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Profile Completeness Badge */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                                    <FiAward size={20} style={{ color: getCompletenessColor(profileCompleteness) }} />
                                    <h4>Profile Completeness</h4>
                                </div>

                                {/* Progress Bar */}
                                <div style={{
                                    height: '8px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    marginBottom: 'var(--space-sm)'
                                }}>
                                    <div style={{
                                        width: `${profileCompleteness}%`,
                                        height: '100%',
                                        background: getCompletenessColor(profileCompleteness),
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {profileCompleteness < 80 ? 'Complete your profile!' : 'Looking great!'}
                                    </span>
                                    <span style={{
                                        fontSize: 'var(--font-size-lg)',
                                        fontWeight: 700,
                                        color: getCompletenessColor(profileCompleteness)
                                    }}>
                                        {profileCompleteness}%
                                    </span>
                                </div>
                            </div>

                            {/* Quick Info - Read Only */}
                            <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                <h4 style={{ marginBottom: 'var(--space-md)' }}>Quick Info</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiHash size={16} style={{ color: 'var(--text-muted)' }} />
                                        <div>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Employee ID</p>
                                            <p style={{ fontWeight: 500, fontFamily: 'monospace' }}>{profile?.employeeId}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiMail size={16} style={{ color: 'var(--text-muted)' }} />
                                        <div>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Email</p>
                                            <p style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{profile?.email}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiCalendar size={16} style={{ color: 'var(--text-muted)' }} />
                                        <div>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Member Since</p>
                                            <p style={{ fontWeight: 500 }}>{profile?.joiningDate ? format(new Date(profile.joiningDate), 'MMM yyyy') : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Security Link */}
                            <Link href="/auth/change-password" className="card" style={{
                                padding: 'var(--space-lg)',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-md)',
                                transition: 'transform 0.2s'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FiLock size={20} style={{ color: 'var(--primary)' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 500 }}>Change Password</p>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Update your security</p>
                                </div>
                            </Link>
                        </div>

                        {/* Right Column - Tab Content */}
                        <div>
                            {/* Page Title */}
                            <div style={{ marginBottom: 'var(--space-xl)' }}>
                                <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <FiUser size={24} /> My Profile
                                </h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Manage your personal information and settings
                                </p>
                            </div>

                            {/* Tabs */}
                            <div style={{
                                display: 'flex',
                                gap: 'var(--space-xs)',
                                marginBottom: 'var(--space-xl)',
                                borderBottom: '1px solid var(--border-color)',
                                paddingBottom: 'var(--space-md)'
                            }}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ gap: 'var(--space-xs)' }}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Personal Details Tab */}
                            {activeTab === 'personal' && (
                                <div className="card">
                                    <h3 style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiUser size={20} /> Personal Details
                                        {editing && <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>Editing</span>}
                                    </h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
                                        {/* Phone - Editable */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <FiPhone size={14} style={{ marginRight: '8px' }} />
                                                Phone Number
                                                {editing && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✎</span>}
                                            </label>
                                            {editing ? (
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="Enter phone number"
                                                />
                                            ) : (
                                                <p style={{ padding: 'var(--space-sm) 0' }}>{profile?.phone || 'Not provided'}</p>
                                            )}
                                        </div>

                                        {/* Address - Editable */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <FiMapPin size={14} style={{ marginRight: '8px' }} />
                                                Address
                                                {editing && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✎</span>}
                                            </label>
                                            {editing ? (
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                                    placeholder="Enter address"
                                                />
                                            ) : (
                                                <p style={{ padding: 'var(--space-sm) 0' }}>{profile?.address || 'Not provided'}</p>
                                            )}
                                        </div>

                                        {/* Employee ID - Read Only */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <FiHash size={14} style={{ marginRight: '8px' }} />
                                                Employee ID
                                                <FiLock size={12} style={{ marginLeft: '4px', color: 'var(--text-muted)' }} />
                                            </label>
                                            <p style={{ padding: 'var(--space-sm) 0', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                {profile?.employeeId}
                                            </p>
                                        </div>

                                        {/* Role - Read Only */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <FiBriefcase size={14} style={{ marginRight: '8px' }} />
                                                Role
                                                <FiLock size={12} style={{ marginLeft: '4px', color: 'var(--text-muted)' }} />
                                            </label>
                                            <p style={{ padding: 'var(--space-sm) 0', color: 'var(--text-secondary)' }}>
                                                {user?.role === 'ADMIN' ? 'Administrator' : 'Employee'}
                                            </p>
                                        </div>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--space-xl) 0' }} />

                                    {/* About Section */}
                                    <div className="form-group">
                                        <label className="form-label">
                                            About Me
                                            {editing && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✎</span>}
                                        </label>
                                        {editing ? (
                                            <textarea
                                                className="form-input form-textarea"
                                                value={formData.about}
                                                onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                                                placeholder="Tell us about yourself..."
                                                rows={3}
                                            />
                                        ) : (
                                            <p style={{ color: profile?.about ? 'var(--text-primary)' : 'var(--text-muted)', padding: 'var(--space-sm) 0' }}>
                                                {profile?.about || 'No information provided'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Interests & Hobbies
                                            {editing && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✎</span>}
                                        </label>
                                        {editing ? (
                                            <textarea
                                                className="form-input form-textarea"
                                                value={formData.interests}
                                                onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                                                placeholder="Your interests and hobbies..."
                                                rows={2}
                                            />
                                        ) : (
                                            <p style={{ color: profile?.interests ? 'var(--text-primary)' : 'var(--text-muted)', padding: 'var(--space-sm) 0' }}>
                                                {profile?.interests || 'No information provided'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Job Details Tab */}
                            {activeTab === 'job' && (
                                <div className="card">
                                    <h3 style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiBriefcase size={20} /> Job Details
                                    </h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Department</label>
                                            <p style={{ padding: 'var(--space-sm) 0' }}>{profile?.department || 'Not set'}</p>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Position</label>
                                            <p style={{ padding: 'var(--space-sm) 0' }}>{profile?.position || 'Not set'}</p>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Date of Joining</label>
                                            <p style={{ padding: 'var(--space-sm) 0' }}>
                                                {profile?.joiningDate ? format(new Date(profile.joiningDate), 'dd MMM yyyy') : 'Not set'}
                                            </p>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Employment Type</label>
                                            <p style={{ padding: 'var(--space-sm) 0' }}>Full-time</p>
                                        </div>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 'var(--space-xl) 0' }} />

                                    {/* Skills */}
                                    <div className="form-group">
                                        <label className="form-label">
                                            Skills & Expertise
                                            {editing && <span style={{ color: 'var(--success)', marginLeft: '4px' }}>✎</span>}
                                        </label>
                                        {editing ? (
                                            <textarea
                                                className="form-input form-textarea"
                                                value={formData.skills}
                                                onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                                                placeholder="Your skills and expertise..."
                                                rows={3}
                                            />
                                        ) : (
                                            <p style={{ color: profile?.skills ? 'var(--text-primary)' : 'var(--text-muted)', padding: 'var(--space-sm) 0' }}>
                                                {profile?.skills || 'No skills added'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Documents Tab */}
                            {activeTab === 'documents' && (
                                <div className="card">
                                    <h3 style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiFileText size={20} /> Documents
                                    </h3>

                                    <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                        <div style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto var(--space-lg)'
                                        }}>
                                            <FiFileText size={36} style={{ color: 'var(--primary)' }} />
                                        </div>
                                        <h4 style={{ marginBottom: 'var(--space-sm)' }}>No Documents Yet</h4>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                                            Your uploaded documents will appear here
                                        </p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                            Contact HR to upload ID proofs, certificates, etc.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Salary Tab - Read Only */}
                            {activeTab === 'salary' && (
                                <div className="card">
                                    <h3 style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <RupeeIcon size={20} /> Salary Information
                                        <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                                            <FiLock size={12} /> Read Only
                                        </span>
                                    </h3>

                                    {payroll ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
                                            <div style={{
                                                padding: 'var(--space-lg)',
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px solid rgba(16, 185, 129, 0.2)'
                                            }}>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Net Salary</p>
                                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--success)' }}>
                                                    ₹{payroll.netSalary?.toLocaleString() || 0}
                                                </p>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>per month</p>
                                            </div>

                                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Basic Wage</p>
                                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>₹{payroll.basicWage?.toLocaleString() || 0}</p>
                                            </div>

                                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Monthly Wage</p>
                                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>₹{payroll.monthlyWage?.toLocaleString() || 0}</p>
                                            </div>

                                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Working Days</p>
                                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{payroll.workingDays || 22}<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}> /month</span></p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '50%',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto var(--space-lg)'
                                            }}>
                                                <RupeeIcon size={36} style={{ color: 'var(--warning)' }} />
                                            </div>
                                            <h4 style={{ marginBottom: 'var(--space-sm)' }}>Salary Not Set Up</h4>
                                            <p style={{ color: 'var(--text-secondary)' }}>
                                                Contact HR to set up your salary information
                                            </p>
                                        </div>
                                    )}

                                    <div style={{
                                        marginTop: 'var(--space-xl)',
                                        padding: 'var(--space-md)',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-sm)'
                                    }}>
                                        <FiLock size={16} style={{ color: 'var(--primary)' }} />
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Salary information is managed by HR and cannot be edited by employees.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
