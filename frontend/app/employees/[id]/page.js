'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { format } from 'date-fns';
import {
    FiUser, FiMail, FiPhone, FiBriefcase, FiCalendar, FiArrowLeft,
    FiDollarSign, FiClock, FiZap, FiLock, FiFileText, FiEdit2, FiSave,
    FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';

export default function EmployeeDetailPage() {
    const { user, loading: authLoading, isAdmin, company } = useAuth();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resume');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Form States - only use fields that exist in the database
    const [formData, setFormData] = useState({
        about: '',
        interests: '',
        skills: '',

        phone: '',
        address: '',
        position: '',
        role: 'EMPLOYEE'
    });

    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (!authLoading && !isAdmin) {
            router.push('/dashboard');
        } else if (user && params.id) {
            fetchEmployee();
        }
    }, [user, authLoading, params.id]);

    const fetchEmployee = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/employees/${params.id}/profile`);
            const emp = response.data.employee;
            setEmployee(emp);
            setFormData({
                about: emp.about || '',
                interests: emp.interests || '',
                skills: emp.skills || '',
                phone: emp.phone || '',
                address: emp.address || '',
                position: emp.position || '',
                role: emp.user?.role || 'EMPLOYEE'
            });
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load employee');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await api.put(`/employees/${params.id}`, formData);
            setSuccess('Employee updated successfully');
            setIsEditing(false);
            fetchEmployee();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <FiAlertCircle size={48} style={{ color: 'var(--error)' }} />
                <h2>Employee not found</h2>
                <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
            </div>
        );
    }

    const payroll = employee?.payroll?.[0];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="header">
                <div className="container header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                        <Link href="/dashboard" className="logo">
                            <div className="logo-icon">
                                <FiZap size={20} />
                            </div>
                            <span className="text-gradient">
                                {company?.name || 'Dayflow'}
                            </span>
                        </Link>

                        <nav style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <Link href="/dashboard" className="btn btn-primary">Employees</Link>
                            <Link href="/attendance" className="btn btn-ghost">
                                <FiClock /> Attendance
                            </Link>
                            <Link href="/leave" className="btn btn-ghost">
                                <FiCalendar /> Time Off
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main style={{ padding: 'var(--space-xl)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* Back Button */}
                    <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: 'var(--space-lg)' }}>
                        <FiArrowLeft /> Back to Employees
                    </Link>

                    {/* Alerts */}
                    {success && (
                        <div className="alert alert-success" style={{ marginBottom: 'var(--space-lg)' }}>
                            <FiCheckCircle /> {success}
                        </div>
                    )}
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>
                            <FiAlertCircle /> {error}
                        </div>
                    )}

                    {/* Profile Header Card */}
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
                        <div className="avatar avatar-xl">
                            {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ marginBottom: 'var(--space-xs)' }}>
                                {employee?.firstName} {employee?.lastName}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                                Login ID: {employee?.employeeId}
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
                                {employee?.department && (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FiBriefcase size={14} /> {employee.department}
                                    </span>
                                )}
                                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FiMail size={14} /> {employee?.email}
                                </span>
                                {employee?.phone && (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FiPhone size={14} /> {employee.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                        {isAdmin && !isEditing && (
                            <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                                <FiEdit2 size={16} /> Edit
                            </button>
                        )}
                        {isAdmin && isEditing && (
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary" onClick={() => { setIsEditing(false); fetchEmployee(); }}>
                                    Cancel
                                </button>
                                <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                                    <FiSave /> {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-xs)',
                        marginBottom: 'var(--space-xl)',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: 'var(--space-md)'
                    }}>
                        <button
                            onClick={() => setActiveTab('resume')}
                            className={`btn ${activeTab === 'resume' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <FiFileText size={16} /> Resume
                        </button>
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`btn ${activeTab === 'personal' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            <FiUser size={16} /> Personal Info
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('salary')}
                                className={`btn ${activeTab === 'salary' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <FiDollarSign size={16} /> Salary Info
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="card">
                        {/* Resume Tab */}
                        {activeTab === 'resume' && (
                            <div>
                                <h3 style={{ marginBottom: 'var(--space-xl)' }}>About</h3>
                                <div className="form-group">
                                    {isEditing ? (
                                        <textarea
                                            className="form-input form-textarea"
                                            value={formData.about}
                                            onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                                            placeholder="Brief description about the employee..."
                                            rows={4}
                                        />
                                    ) : (
                                        <p style={{ color: employee?.about ? 'var(--text-primary)' : 'var(--text-muted)', padding: 'var(--space-md) 0' }}>
                                            {employee?.about || 'No information provided'}
                                        </p>
                                    )}
                                </div>

                                <h3 style={{ marginBottom: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>Interests & Hobbies</h3>
                                <div className="form-group">
                                    {isEditing ? (
                                        <textarea
                                            className="form-input form-textarea"
                                            value={formData.interests}
                                            onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                                            placeholder="Interests and hobbies..."
                                            rows={3}
                                        />
                                    ) : (
                                        <p style={{ color: employee?.interests ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {employee?.interests || 'No information provided'}
                                        </p>
                                    )}
                                </div>

                                <h3 style={{ marginBottom: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>Skills</h3>
                                <div className="form-group">
                                    {isEditing ? (
                                        <textarea
                                            className="form-input form-textarea"
                                            value={formData.skills}
                                            onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                                            placeholder="Skills and certifications..."
                                            rows={3}
                                        />
                                    ) : (
                                        <p style={{ color: employee?.skills ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                            {employee?.skills || 'No information provided'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Personal Info Tab */}
                        {activeTab === 'personal' && (
                            <div>
                                <h3 style={{ marginBottom: 'var(--space-xl)' }}>Personal Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                                    <div className="form-group">
                                        <label className="form-label"><FiPhone size={14} style={{ marginRight: '8px' }} /> Phone</label>
                                        {isEditing ? (
                                            <input
                                                type="tel"
                                                className="form-input"
                                                value={formData.phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="Enter phone number"
                                            />
                                        ) : (
                                            <p>{employee?.phone || 'Not provided'}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label"><FiMail size={14} style={{ marginRight: '8px' }} /> Email</label>
                                        <p>{employee?.email}</p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label"><FiBriefcase size={14} style={{ marginRight: '8px' }} /> Department</label>
                                        <p>{employee?.department || 'Not set'}</p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label"><FiUser size={14} style={{ marginRight: '8px' }} /> Position</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.position}
                                                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                                                placeholder="Job Position"
                                            />
                                        ) : (
                                            <p>{employee?.position || 'Not set'}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label"><FiCalendar size={14} style={{ marginRight: '8px' }} /> Date of Joining</label>
                                        <p>{employee?.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM yyyy') : 'Not set'}</p>
                                    </div>

                                    {isAdmin && (
                                        <div className="form-group">
                                            <label className="form-label"><FiLock size={14} style={{ marginRight: '8px' }} /> System Role</label>
                                            {isEditing ? (
                                                <select
                                                    className="form-input form-select"
                                                    value={formData.role}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                                >
                                                    <option value="EMPLOYEE">Employee</option>
                                                    <option value="ADMIN">Admin</option>
                                                </select>
                                            ) : (
                                                <span className={`badge ${employee?.user?.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>
                                                    {employee?.user?.role || 'EMPLOYEE'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Salary Info Tab (Admin Only) */}
                        {activeTab === 'salary' && isAdmin && (
                            <div>
                                <h3 style={{ marginBottom: 'var(--space-xl)' }}>Salary Information</h3>

                                {payroll ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                                        <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Basic Wage</p>
                                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>₹{payroll.basicWage?.toLocaleString() || 0}</p>
                                        </div>
                                        <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Monthly Wage</p>
                                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>₹{payroll.monthlyWage?.toLocaleString() || payroll.netSalary?.toLocaleString() || 0}</p>
                                        </div>
                                        <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Net Salary</p>
                                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>₹{payroll.netSalary?.toLocaleString() || 0}</p>
                                        </div>
                                        <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>Working Days/Month</p>
                                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{payroll.workingDays || 22}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                        <FiDollarSign size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }} />
                                        <h4 style={{ marginBottom: 'var(--space-sm)' }}>No salary information</h4>
                                        <p style={{ color: 'var(--text-secondary)' }}>Set up payroll in the Payroll section</p>
                                        <Link href="/payroll" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
                                            Go to Payroll
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
