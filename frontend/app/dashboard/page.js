'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { downloadCSV } from '../lib/export';
import api from '../lib/api';
import { format, isSameDay, subDays } from 'date-fns';
import RupeeIcon from '../components/RupeeIcon';
import {
    FiUser,
    FiClock,
    FiCalendar,
    FiLogOut,
    FiUsers,
    FiSearch,
    FiLogIn,
    FiChevronDown,
    FiSettings,
    FiPlus,
    FiX,
    FiZap,
    FiTrendingUp,
    FiBarChart2,
    FiPieChart,
    FiActivity,
    FiFilter,
    FiFileText
} from 'react-icons/fi';

export default function DashboardPage() {
    const { user, loading, isAdmin, logout, mustChangePass, company } = useAuth();

    // Admin Analytics State
    const [overview, setOverview] = useState(null);
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [leaveSummary, setLeaveSummary] = useState(null);

    // Employee State
    const [employees, setEmployees] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);

    // UI State
    const [dataLoading, setDataLoading] = useState(true);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(isAdmin ? 'overview' : 'employees'); // Default to overview for admin
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // New employee form
    const [newEmployee, setNewEmployee] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'EMPLOYEE',
        basicSalary: ''
    });
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [missedCheckOut, setMissedCheckOut] = useState(null);

    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        } else if (!loading && mustChangePass) {
            router.push('/auth/change-password');
        } else if (user) {
            fetchDashboardData();
        }
    }, [user, loading, mustChangePass, router, activeTab]);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowProfileMenu(false);
        if (showProfileMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showProfileMenu]);

    const fetchDashboardData = async () => {
        try {
            setDataLoading(true);
            if (isAdmin) {
                // If on overview, fetch analytics, else fetch employees
                if (activeTab === 'overview') {
                    const [overviewRes, trendRes, deptRes, leaveRes] = await Promise.all([
                        api.get('/analytics/overview'),
                        api.get('/analytics/attendance-trend'),
                        api.get('/analytics/department-distribution'),
                        api.get('/analytics/leave-summary')
                    ]);
                    setOverview(overviewRes.data);
                    setAttendanceTrend(trendRes.data.trend || []);
                    setDepartments(deptRes.data.distribution || []);
                    setLeaveSummary(leaveRes.data.summary);
                } else if (activeTab === 'employees') {
                    const response = await api.get('/attendance/status-today');
                    setEmployees(response.data.employees || []);
                }
            } else {
                const todayRes = await api.get('/attendance/today');
                setTodayAttendance(todayRes.data.attendance);

                // Check for missed check-out (Check previous day's record)
                // In a real app, this should be a robust backend check. 
                // For now, we'll check the last attendance record.
                const myAttendanceRes = await api.get('/attendance/my', { params: { limit: 5 } });
                const recent = myAttendanceRes.data.attendance || [];
                // Find a record that is NOT today, has CheckIn but NO CheckOut
                const missed = recent.find(a =>
                    !isSameDay(new Date(a.date), new Date()) &&
                    a.checkIn &&
                    !a.checkOut
                );
                setMissedCheckOut(missed);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setDataLoading(false);
        }
    };

    const handleCheckIn = async () => {
        setActionLoading(true);
        setError('');
        try {
            await api.post('/attendance/check-in');
            setSuccess('Checked in successfully');
            fetchDashboardData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Check-in failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        setActionLoading(true);
        setError('');
        try {
            await api.post('/attendance/check-out');
            setSuccess('Checked out successfully');
            fetchDashboardData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Check-out failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/create-employee', newEmployee);
            setCreatedCredentials(response.data.credentials);
            setSuccess('Employee created successfully');
            fetchDashboardData();
            setNewEmployee({
                firstName: '', lastName: '', email: '', phone: '',
                department: '', position: '', role: 'EMPLOYEE', basicSalary: ''
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create employee');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExportOverview = () => {
        if (!overview) return;

        // Simple summary CSV
        const data = [
            { Metric: 'Total Employees', Value: overview.totalEmployees },
            { Metric: 'Present Today', Value: overview.presentToday },
            { Metric: 'Attendance %', Value: `${Math.round((overview.presentToday / overview.totalEmployees) * 100)}%` },
            { Metric: 'On Leave', Value: overview.onLeaveToday },
            { Metric: 'Pending Approvals', Value: overview.pendingLeaves },
            { Metric: 'Monthly Payroll', Value: overview.monthlyPayroll }
        ];

        downloadCSV(data, `HR_Summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'present':
            case 'checked-in':
                return 'var(--success)';
            case 'leave':
                return 'var(--warning)';
            case 'absent':
            default:
                return 'var(--error)';
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const search = searchQuery.toLowerCase();
        const matchesSearch = (
            emp.firstName?.toLowerCase().includes(search) ||
            emp.lastName?.toLowerCase().includes(search) ||
            emp.employeeId?.toLowerCase().includes(search)
        );
        const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
        return matchesSearch && matchesDept;
    });

    const uniqueDepartments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))];

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh' }}>
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!user) return null;

    // Charts Config
    const maxTrend = attendanceTrend.length > 0 ? Math.max(...attendanceTrend.map(t => t.present), 1) : 1;
    const totalDeptEmployees = departments.length > 0 ? departments.reduce((sum, d) => sum + d.count, 0) || 1 : 1;
    const colors = ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

    // Admin Tabs
    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FiActivity /> },
        { id: 'employees', label: 'Employees', icon: <FiUsers /> },
        { id: 'attendance', label: 'Attendance', href: '/attendance', icon: <FiClock /> },
        { id: 'timeoff', label: 'Time Off', href: '/leave', icon: <FiCalendar /> },
        { id: 'payroll', label: 'Payroll', href: '/payroll', icon: <RupeeIcon size={16} /> },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Top Navigation */}
            <header className="header">
                <div className="container header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                        {/* Logo */}
                        <Link href="/dashboard" className="logo">
                            <Image
                                src="/imagee.png"
                                alt="Dayflow Logo"
                                width={120}
                                height={40}
                                style={{ objectFit: 'contain' }}
                            />
                        </Link>

                        {/* Navigation Tabs */}
                        {isAdmin && (
                            <nav style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                {tabs.map(tab => (
                                    tab.href ? (
                                        <Link
                                            key={tab.id}
                                            href={tab.href}
                                            className="btn btn-ghost"
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </Link>
                                    ) : (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    )
                                ))}
                            </nav>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                        {/* Profile Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}
                                className="btn btn-ghost"
                                style={{ padding: 'var(--space-xs)', gap: 'var(--space-sm)' }}
                            >
                                <div className="avatar">
                                    {user.employee?.firstName?.[0]}{user.employee?.lastName?.[0]}
                                </div>
                                <FiChevronDown size={16} />
                            </button>

                            {showProfileMenu && (
                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                    <div className="dropdown-header">
                                        <p className="dropdown-user-name">{user.employee?.firstName} {user.employee?.lastName}</p>
                                        <p className="dropdown-user-email">{user.email}</p>
                                    </div>
                                    <Link
                                        href="/profile"
                                        className="dropdown-item"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        <FiUser size={16} /> My Profile
                                    </Link>
                                    <button
                                        className="dropdown-item danger"
                                        onClick={() => { logout(); setShowProfileMenu(false); }}
                                    >
                                        <FiLogOut size={16} /> Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: 'var(--space-xl)' }}>
                {/* Alerts */}
                {(error || success) && (
                    <div style={{ maxWidth: '1200px', margin: '0 auto var(--space-lg)' }}>
                        {error && (
                            <div className="alert alert-error">
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="alert alert-success">
                                <span>{success}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ADMIN DASHBOARD */}
                {isAdmin && (
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                                    <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <FiActivity size={24} /> Dashboard Overview
                                    </h1>
                                    <button className="btn btn-secondary" onClick={handleExportOverview}>
                                        <FiFileText /> Export Summary
                                    </button>
                                </div>

                                {dataLoading ? (
                                    <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                        <div className="spinner spinner-lg"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Summary Cards */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                            gap: 'var(--space-lg)',
                                            marginBottom: 'var(--space-2xl)'
                                        }}>
                                            <div className="card" style={{ padding: 'var(--space-xl)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Total Employees</p>
                                                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{overview?.totalEmployees || 0}</p>
                                                    </div>
                                                    <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
                                                        <FiUsers size={24} />
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <FiTrendingUp /> <span>Team growing</span>
                                                </div>
                                            </div>

                                            <div className="card" style={{ padding: 'var(--space-xl)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Present Today</p>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                                                                {overview?.totalEmployees ? Math.round((overview.presentToday / overview.totalEmployees) * 100) : 0}%
                                                            </p>
                                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>({overview?.presentToday || 0}/{overview?.totalEmployees || 0})</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--success)' }}>
                                                        <FiClock size={24} />
                                                    </div>
                                                </div>
                                                <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', marginTop: 'var(--space-md)' }}>
                                                    <div style={{ height: '100%', width: `${overview?.totalEmployees ? (overview.presentToday / overview.totalEmployees) * 100 : 0}%`, background: 'var(--success)', borderRadius: '2px' }}></div>
                                                </div>
                                            </div>

                                            <div className="card" style={{ padding: 'var(--space-xl)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Pending Approvals</p>
                                                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>{overview?.pendingLeaves || 0}</p>
                                                    </div>
                                                    <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: 'var(--warning)' }}>
                                                        <FiCalendar size={24} />
                                                    </div>
                                                </div>
                                                <Link href="/leave" style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--primary)', display: 'inline-block', textDecoration: 'none', fontWeight: 500 }}>
                                                    Review Requests &rarr;
                                                </Link>
                                            </div>

                                            <div className="card" style={{ padding: 'var(--space-xl)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Payroll (This Month)</p>
                                                        <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>₹{(overview?.monthlyPayroll || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', color: '#ec4899' }}>
                                                        <RupeeIcon size={24} />
                                                    </div>
                                                </div>
                                                <p style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                    Alerts: <span style={{ color: 'var(--success)' }}>On Track</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Charts Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-xl)' }}>

                                            {/* Attendance Trend Chart */}
                                            <div className="card">
                                                <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <FiBarChart2 size={20} /> Attendance Trends
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)', height: '250px', paddingTop: 'var(--space-lg)' }}>
                                                    {attendanceTrend.map((item, idx) => (
                                                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                                            <div
                                                                style={{
                                                                    width: '100%',
                                                                    maxWidth: '40px',
                                                                    height: `${(item.present / maxTrend) * 100}%`,
                                                                    background: 'linear-gradient(to top, var(--primary), var(--secondary))',
                                                                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                                                                    minHeight: '4px',
                                                                    transition: 'height 0.3s ease',
                                                                    position: 'relative'
                                                                }}
                                                                title={`${item.present} present`}
                                                            >
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '-24px',
                                                                    left: '50%',
                                                                    transform: 'translateX(-50%)',
                                                                    fontSize: '10px',
                                                                    color: 'var(--text-secondary)',
                                                                    fontWeight: 600
                                                                }}>
                                                                    {item.present}
                                                                </div>
                                                            </div>
                                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)', fontWeight: 500 }}>
                                                                {item.month}
                                                            </p>
                                                        </div>
                                                    ))}
                                                    {attendanceTrend.length === 0 && (
                                                        <p style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>No data available yet</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Department Distribution */}
                                            <div className="card">
                                                <h3 style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <FiPieChart size={20} /> Leave & Departments
                                                </h3>

                                                <div style={{ marginBottom: 'var(--space-xl)' }}>
                                                    <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>LEAVE DISTRIBUTION</h4>
                                                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                                        <div style={{ flex: 1, padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--primary)' }}>{leaveSummary?.paidLeaves || 0}</p>
                                                            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>PAID</p>
                                                        </div>
                                                        <div style={{ flex: 1, padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--warning)' }}>{leaveSummary?.sickLeaves || 0}</p>
                                                            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>SICK</p>
                                                        </div>
                                                        <div style={{ flex: 1, padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-muted)' }}>{leaveSummary?.unpaidLeaves || 0}</p>
                                                            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>UNPAID</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>DEPARTMENT BREAKDOWN</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                                        {departments.map((dept, idx) => {
                                                            const percentage = ((dept.count / totalDeptEmployees) * 100).toFixed(0);
                                                            return (
                                                                <div key={idx}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{dept.department}</span>
                                                                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>{dept.count} ({percentage}%)</span>
                                                                    </div>
                                                                    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
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
                                                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
                                                                No department data available
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* EMPLOYEES TAB */}
                        {activeTab === 'employees' && (
                            <>
                                {/* Header with Add Button and Search */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                                    <div>
                                        <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-xs)' }}>Employees</h1>
                                        <p style={{ color: 'var(--text-secondary)' }}>{filteredEmployees.length} team members</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                        {/* Filters */}
                                        <div style={{ position: 'relative' }}>
                                            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input
                                                type="text"
                                                placeholder="Search employees..."
                                                className="form-input"
                                                style={{ paddingLeft: '40px', width: '220px' }}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            <FiFilter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <select
                                                className="form-input form-select"
                                                style={{ paddingLeft: '40px', width: '180px' }}
                                                value={departmentFilter}
                                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                            >
                                                {uniqueDepartments.map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                            <FiPlus size={18} /> Add Employee
                                        </button>
                                    </div>
                                </div>

                                {/* Employee Cards Grid */}
                                {dataLoading ? (
                                    <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                        <div className="spinner spinner-lg"></div>
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                        <FiUsers size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }} />
                                        <h3 style={{ marginBottom: 'var(--space-sm)' }}>No employees found</h3>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                                            {searchQuery ? 'Try a different search term' : 'Add your first employee to get started'}
                                        </p>
                                        {!searchQuery && (
                                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                                <FiPlus size={18} /> Add Employee
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: 'var(--space-lg)'
                                    }}>
                                        {filteredEmployees.map(emp => (
                                            <Link
                                                key={emp.id}
                                                href={`/employees/${emp.id}`}
                                                className="card"
                                                style={{
                                                    textAlign: 'center',
                                                    padding: 'var(--space-xl)',
                                                    position: 'relative',
                                                    textDecoration: 'none',
                                                    transition: 'var(--transition-fast)'
                                                }}
                                            >
                                                {/* Status Dot */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 'var(--space-md)',
                                                    right: 'var(--space-md)',
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    background: getStatusColor(emp.status),
                                                    boxShadow: `0 0 0 2px var(--surface-primary)`
                                                }} />

                                                <div
                                                    className="avatar"
                                                    style={{
                                                        width: '72px',
                                                        height: '72px',
                                                        margin: '0 auto var(--space-md)',
                                                        fontSize: 'var(--font-size-xl)'
                                                    }}
                                                >
                                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                </div>

                                                <h4 style={{ marginBottom: 'var(--space-xs)' }}>
                                                    {emp.firstName} {emp.lastName}
                                                </h4>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                    {emp.department || 'No Dept'}
                                                </p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                                                    {emp.employeeId}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Employee Dashboard View - Left Side */}
                {!isAdmin && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)', maxWidth: '1200px', margin: '0 auto' }}>
                        <div>
                            {/* ... Employee Dashboard Content (Same as before) ... */}
                            {/* Note: I'm keeping the exact same employee view logic as before to avoid regression */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                                <div className="card" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '80px',
                                        height: '80px',
                                        background: todayAttendance ? (todayAttendance.checkOut ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)') : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '0 0 0 100%'
                                    }} />
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: todayAttendance ? (todayAttendance.checkOut ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)') : 'rgba(239, 68, 68, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 'var(--space-md)'
                                    }}>
                                        <FiClock size={24} style={{ color: todayAttendance ? (todayAttendance.checkOut ? 'var(--success)' : 'var(--warning)') : 'var(--error)' }} />
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Today's Status</p>
                                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: todayAttendance ? (todayAttendance.checkOut ? 'var(--success)' : 'var(--warning)') : 'var(--error)' }}>
                                        {todayAttendance ? (todayAttendance.checkOut ? 'Completed' : 'Working') : 'Not Started'}
                                    </p>
                                </div>
                                <div className="card" style={{
                                    padding: 'var(--space-lg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: !todayAttendance
                                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                                        : (!todayAttendance.checkOut
                                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
                                            : 'var(--surface-primary)')
                                }}>
                                    {!todayAttendance ? (
                                        <button className="btn btn-success" onClick={handleCheckIn} disabled={actionLoading} style={{ width: '100%', padding: '1rem', fontWeight: 700 }}><FiLogIn size={20} /> Check In</button>
                                    ) : !todayAttendance.checkOut ? (
                                        <button className="btn btn-danger" onClick={handleCheckOut} disabled={actionLoading} style={{ width: '100%', padding: '1rem', fontWeight: 700 }}><FiLogOut size={20} /> Check Out</button>
                                    ) : (
                                        <div style={{ textAlign: 'center' }}><FiUser size={24} style={{ color: 'var(--success)' }} /><p style={{ fontWeight: 600, color: 'var(--success)' }}>Day Complete!</p></div>
                                    )}
                                </div>
                                <div className="card" style={{ padding: 'var(--space-lg)' }}><p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Leave Balance</p><p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>24</p></div>
                                <div className="card" style={{ padding: 'var(--space-lg)' }}><p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Attendance</p><p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--success)' }}>95%</p></div>
                            </div>

                            {/* Actions Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
                                <Link href="/profile" className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}><FiUser size={24} style={{ color: 'var(--primary)' }} /><p>Profile</p></Link>
                                <Link href="/attendance" className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}><FiClock size={24} style={{ color: 'var(--success)' }} /><p>Attendance</p></Link>
                                <Link href="/leave" className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}><FiCalendar size={24} style={{ color: 'var(--warning)' }} /><p>Leave</p></Link>
                                <button className="card" onClick={logout} style={{ textAlign: 'center', padding: 'var(--space-lg)', border: 'none' }}><FiLogOut size={24} style={{ color: 'var(--error)' }} /><p>Log Out</p></button>
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                                <div className="avatar avatar-xl" style={{ margin: '0 auto var(--space-md)' }}>{user.employee?.firstName?.[0]}</div>
                                <h3>{user.employee?.firstName}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>{user.employee?.department}</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Add Employee Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => { setShowAddModal(false); setCreatedCredentials(null); }}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Add New Employee</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setShowAddModal(false); setCreatedCredentials(null); }}>
                                <FiX size={24} />
                            </button>
                        </div>

                        {createdCredentials ? (
                            <div className="modal-body" style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'var(--success-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto var(--space-lg)'
                                }}>
                                    <FiUser size={28} style={{ color: 'var(--success)' }} />
                                </div>
                                <h3 style={{ marginBottom: 'var(--space-lg)' }}>Employee Created</h3>
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: 'var(--space-lg)',
                                    borderRadius: 'var(--radius-lg)',
                                    textAlign: 'left'
                                }}>
                                    <div style={{ marginBottom: 'var(--space-md)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Login ID</p>
                                        <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>{createdCredentials.loginId}</p>
                                    </div>
                                    <div style={{ marginBottom: 'var(--space-md)' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Email</p>
                                        <p style={{ fontWeight: 600 }}>{createdCredentials.email}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Temporary Password</p>
                                        <p style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--warning)' }}>{createdCredentials.password}</p>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-lg)' }}>
                                    Share these credentials securely. The employee must change their password on first login.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: 'var(--space-lg)', width: '100%' }}
                                    onClick={() => { setShowAddModal(false); setCreatedCredentials(null); }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateEmployee}>
                                <div className="modal-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">First Name *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="John"
                                                value={newEmployee.firstName}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Last Name *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Doe"
                                                value={newEmployee.lastName}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Email *</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="john.doe@Example.com"
                                                value={newEmployee.email}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Phone</label>
                                            <input
                                                type="tel"
                                                className="form-input"
                                                placeholder="+1 234 567 890"
                                                value={newEmployee.phone}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Department *</label>
                                            <select
                                                className="form-input form-select"
                                                value={newEmployee.department}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, department: e.target.value }))}
                                                required
                                            >
                                                <option value="">Select Dept</option>
                                                <option value="IT">IT</option>
                                                <option value="HR">HR</option>
                                                <option value="Engineering">Engineering</option>
                                                <option value="Marketing">Marketing</option>
                                                <option value="Sales">Sales</option>
                                                <option value="Operations">Operations</option>
                                                <option value="Finance">Finance</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Position *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Software Engineer"
                                                value={newEmployee.position}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">System Role *</label>
                                            <select
                                                className="form-input form-select"
                                                value={newEmployee.role}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
                                                required
                                            >
                                                <option value="EMPLOYEE">Employee</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                            <p className="helper-text">Admins have full access to all modules</p>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Basic Salary (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="e.g. 50000"
                                                value={newEmployee.basicSalary}
                                                onChange={(e) => setNewEmployee(prev => ({ ...prev, basicSalary: e.target.value }))}
                                            />
                                            <p className="helper-text">Initial basic salary for payroll</p>
                                        </div>
                                    </div>

                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                        {actionLoading ? <><FiPlus className="spinner" /> Creating...</> : <><FiPlus size={16} /> Create Employee</>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
