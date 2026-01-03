'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
    FiUsers,
    FiClock,
    FiCalendar,
    FiDollarSign,
    FiTrendingUp,
    FiPieChart,
    FiBarChart2,
    FiZap,
    FiArrowLeft
} from 'react-icons/fi';

export default function AnalyticsPage() {
    const { user, loading: authLoading, isAdmin, company } = useAuth();
    const [overview, setOverview] = useState(null);
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [leaveSummary, setLeaveSummary] = useState(null);
    const [payrollSummary, setPayrollSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (!authLoading && !isAdmin) {
            router.push('/dashboard');
        } else if (user && isAdmin) {
            fetchAnalytics();
        }
    }, [user, authLoading, isAdmin]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const [overviewRes, trendRes, deptRes, leaveRes, payrollRes] = await Promise.all([
                api.get('/analytics/overview'),
                api.get('/analytics/attendance-trend'),
                api.get('/analytics/department-distribution'),
                api.get('/analytics/leave-summary'),
                api.get('/analytics/payroll-summary')
            ]);

            setOverview(overviewRes.data);
            setAttendanceTrend(trendRes.data.trend || []);
            setDepartments(deptRes.data.distribution || []);
            setLeaveSummary(leaveRes.data.summary);
            setPayrollSummary(payrollRes.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!user || !isAdmin) return null;

    const maxTrend = Math.max(...attendanceTrend.map(t => t.present), 1);
    const totalDeptEmployees = departments.reduce((sum, d) => sum + d.count, 0) || 1;

    // Color palette for departments
    const colors = ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

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

                        <nav style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <Link href="/dashboard" className="btn btn-ghost">
                                <FiUsers size={16} /> Employees
                            </Link>
                            <Link href="/attendance" className="btn btn-ghost">
                                <FiClock size={16} /> Attendance
                            </Link>
                            <button className="btn btn-primary">
                                <FiTrendingUp size={16} /> Analytics
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="container" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
                {/* Page Title */}
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)' }}>
                        <FiArrowLeft /> Back to Dashboard
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <FiTrendingUp size={28} /> Analytics Dashboard
                    </h1>
                </div>

                {/* Summary Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-lg)',
                    marginBottom: 'var(--space-2xl)'
                }}>
                    <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                        <FiUsers size={32} style={{ color: 'var(--primary)', marginBottom: 'var(--space-sm)' }} />
                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{overview?.totalEmployees || 0}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Total Employees</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                        <FiClock size={32} style={{ color: 'var(--success)', marginBottom: 'var(--space-sm)' }} />
                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--success)' }}>{overview?.presentToday || 0}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Present Today</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                        <FiCalendar size={32} style={{ color: 'var(--warning)', marginBottom: 'var(--space-sm)' }} />
                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--warning)' }}>{overview?.pendingLeaves || 0}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Pending Leaves</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                        <FiDollarSign size={32} style={{ color: 'var(--info)', marginBottom: 'var(--space-sm)' }} />
                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>₹{(overview?.monthlyPayroll || 0).toLocaleString()}</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Monthly Payroll</p>
                    </div>
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-xl)' }}>
                    {/* Attendance Trend Chart */}
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FiBarChart2 size={20} /> Attendance Trend
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)', height: '200px', paddingTop: 'var(--space-lg)' }}>
                            {attendanceTrend.map((item, idx) => (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div
                                        style={{
                                            width: '100%',
                                            maxWidth: '40px',
                                            height: `${(item.present / maxTrend) * 150}px`,
                                            background: 'linear-gradient(to top, var(--primary), var(--secondary))',
                                            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                                            minHeight: '8px',
                                            transition: 'height 0.3s ease'
                                        }}
                                        title={`${item.present} present`}
                                    />
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
                                        {item.month}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                <span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--primary)', borderRadius: 2, marginRight: 4 }}></span>
                                Present
                            </span>
                        </div>
                    </div>

                    {/* Department Distribution */}
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FiPieChart size={20} /> Department Distribution
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {departments.map((dept, idx) => {
                                const percentage = ((dept.count / totalDeptEmployees) * 100).toFixed(0);
                                return (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{dept.department}</span>
                                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{dept.count} ({percentage}%)</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${percentage}%`,
                                                    background: colors[idx % colors.length],
                                                    transition: 'width 0.5s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {departments.length === 0 && (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                                    No department data available
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Leave & Payroll Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-xl)', marginTop: 'var(--space-xl)' }}>
                    {/* Leave Summary */}
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Leave Summary (This Year)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--info)' }}>{leaveSummary?.paidLeaves || 0}</p>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Paid</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--warning)' }}>{leaveSummary?.sickLeaves || 0}</p>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Sick</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{leaveSummary?.unpaidLeaves || 0}</p>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Unpaid</p>
                            </div>
                        </div>
                    </div>

                    {/* Payroll Summary */}
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Payroll Summary (This Year)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--success)' }}>₹{(payrollSummary?.yearTotal || 0).toLocaleString()}</p>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Year Total</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>₹{(payrollSummary?.averageMonthly || 0).toLocaleString()}</p>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Avg Monthly</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
