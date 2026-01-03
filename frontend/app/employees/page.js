'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../lib/api';
import { format } from 'date-fns';
import {
    FiUsers,
    FiPlus,
    FiSearch,
    FiEdit2,
    FiTrash2,
    FiX,
    FiLoader,
    FiAlertCircle,
    FiCheckCircle,
    FiMail,
    FiBriefcase
} from 'react-icons/fi';

export default function EmployeesPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (!authLoading && !isAdmin) {
            router.push('/dashboard');
        } else if (user && isAdmin) {
            fetchEmployees();
        }
    }, [user, authLoading, isAdmin]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get('/employees');
            setEmployees(response.data.employees);
        } catch (err) {
            setError('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;

        try {
            await api.delete(`/employees/${id}`);
            setSuccess('Employee deleted successfully');
            fetchEmployees();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete employee');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!user || !isAdmin) return null;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">
                            <FiUsers style={{ marginRight: '12px' }} />
                            Employee Management
                        </h1>
                        <p className="page-subtitle">View and manage all employees</p>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <FiAlertCircle size={20} />
                        <span>{error}</span>
                        <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                            <FiX />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <FiCheckCircle size={20} />
                        <span>{success}</span>
                        <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                            <FiX />
                        </button>
                    </div>
                )}

                {/* Search */}
                <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div style={{ position: 'relative' }}>
                        <FiSearch
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }}
                        />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by name, email, or employee ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                </div>

                {/* Employees Grid */}
                {loading ? (
                    <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                        <div className="spinner spinner-lg"></div>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <FiUsers className="empty-icon" />
                            <h3 className="empty-title">No employees found</h3>
                            <p className="empty-text">
                                {searchTerm ? 'Try adjusting your search' : 'No employees registered yet'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--space-lg)'
                    }}>
                        {filteredEmployees.map(employee => (
                            <div key={employee.id} className="card" style={{ padding: 'var(--space-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                                    <div className="avatar avatar-lg">
                                        {employee.firstName[0]}{employee.lastName[0]}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ marginBottom: 'var(--space-xs)' }}>
                                            {employee.firstName} {employee.lastName}
                                        </h3>
                                        <span className="badge badge-primary" style={{ marginBottom: 'var(--space-sm)' }}>
                                            {employee.user?.role || 'EMPLOYEE'}
                                        </span>
                                        <p style={{
                                            color: 'var(--text-tertiary)',
                                            fontSize: 'var(--font-size-sm)',
                                            marginBottom: 'var(--space-xs)'
                                        }}>
                                            ID: {employee.employeeId}
                                        </p>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 'var(--space-lg)',
                                    padding: 'var(--space-md)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-lg)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                        <FiMail size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            {employee.email}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiBriefcase size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            {employee.department || 'No department'} • {employee.position || 'No position'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1 }}
                                        onClick={() => router.push(`/employees/${employee.id}`)}
                                    >
                                        <FiEdit2 /> Edit
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(employee.id)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
