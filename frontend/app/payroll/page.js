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
    FiPlus,
    FiX,
    FiLoader,
    FiAlertCircle,
    FiCheckCircle,
    FiZap,
    FiClock,
    FiCalendar,
    FiUsers,
    FiDownload,
    FiMail,
    FiLock,
    FiEdit2,
    FiTrendingUp,
    FiTrendingDown,
    FiSearch,
    FiFilter,
    FiChevronLeft,
    FiChevronRight,
    FiSave
} from 'react-icons/fi';

export default function PayrollPage() {
    const { user, loading: authLoading, isAdmin, company } = useAuth();
    const [payroll, setPayroll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeTab, setActiveTab] = useState('current'); // 'current', 'history', 'structure'

    const [formData, setFormData] = useState({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basicWage: '',
        hra: '',
        conveyance: '',
        medical: '',
        special: '',
        bonus: '',
        pf: '',
        tax: '',
        otherDeductions: '',
        workingDays: '22',
        effectiveFrom: format(new Date(), 'yyyy-MM-dd')
    });

    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (user) {
            fetchPayroll();
            if (isAdmin) fetchEmployees();
        }
    }, [user, authLoading, currentMonth]);

    const fetchPayroll = async () => {
        try {
            setLoading(true);
            const endpoint = isAdmin ? '/payroll/all' : '/payroll/my';
            const response = await api.get(endpoint, {
                params: { month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear() }
            });
            setPayroll(response.data.payroll || []);
        } catch (err) {
            console.error('Failed to load payroll data');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees');
            setEmployees(response.data.employees || []);
        } catch (err) {
            console.error('Failed to fetch employees');
        }
    };

    // Download PDF with auth token
    const downloadPDF = async (payrollId, employeeId, month, year) => {
        try {
            const response = await api.get(`/payroll/${payrollId}/slip`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Salary_Slip_${month}_${year}_${employeeId || 'EMP'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF download failed:', err);
            setError('Failed to download PDF. Please try again.');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        try {
            const earnings = parseFloat(formData.basicWage || 0) +
                parseFloat(formData.hra || 0) +
                parseFloat(formData.conveyance || 0) +
                parseFloat(formData.medical || 0) +
                parseFloat(formData.special || 0) +
                parseFloat(formData.bonus || 0);
            const deductions = parseFloat(formData.pf || 0) +
                parseFloat(formData.tax || 0) +
                parseFloat(formData.otherDeductions || 0);

            await api.post('/payroll', {
                employeeId: formData.employeeId,
                month: formData.month,
                year: formData.year,
                basicWage: parseFloat(formData.basicWage) || 0,
                monthlyWage: earnings,
                workingDays: parseInt(formData.workingDays) || 22,
                netSalary: earnings - deductions
            });
            setSuccess('Payroll record created successfully!');
            setShowModal(false);
            resetForm();
            fetchPayroll();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create payroll record');
        } finally {
            setActionLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            employeeId: '',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            basicWage: '',
            hra: '',
            conveyance: '',
            medical: '',
            special: '',
            bonus: '',
            pf: '',
            tax: '',
            otherDeductions: '',
            workingDays: '22',
            effectiveFrom: format(new Date(), 'yyyy-MM-dd')
        });
    };

    const handleEditSalary = (employee) => {
        setSelectedEmployee(employee);
        setFormData({
            ...formData,
            employeeId: employee.id,
            basicWage: employee.payroll?.[0]?.basicWage || '',
            hra: employee.payroll?.[0]?.hra || '',
            conveyance: employee.payroll?.[0]?.conveyance || '',
            medical: employee.payroll?.[0]?.medical || '',
            special: employee.payroll?.[0]?.special || '',
        });
        setShowEditModal(true);
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calculate totals for employee view
    const latestPayroll = payroll[0];
    const earnings = useMemo(() => {
        if (!latestPayroll) return [];
        return [
            { label: 'Basic Salary', amount: latestPayroll.basicWage || 0 },
            { label: 'HRA', amount: latestPayroll.hra || (latestPayroll.basicWage * 0.4) || 0 },
            { label: 'Conveyance', amount: latestPayroll.conveyance || 2000 },
            { label: 'Medical', amount: latestPayroll.medical || 1500 },
            { label: 'Special Allowance', amount: latestPayroll.special || 0 },
        ].filter(e => e.amount > 0);
    }, [latestPayroll]);

    const deductions = useMemo(() => {
        if (!latestPayroll) return [];
        const basic = latestPayroll.basicWage || 0;
        return [
            { label: 'Provident Fund', amount: Math.round(basic * 0.12) },
            { label: 'Professional Tax', amount: 200 },
            { label: 'Income Tax (TDS)', amount: latestPayroll.tax || 0 },
        ].filter(e => e.amount > 0);
    }, [latestPayroll]);

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netPay = totalEarnings - totalDeductions;

    // Filter employees
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        const search = searchQuery.toLowerCase();
        return employees.filter(e =>
            e.firstName?.toLowerCase().includes(search) ||
            e.lastName?.toLowerCase().includes(search) ||
            e.employeeId?.toLowerCase().includes(search)
        );
    }, [employees, searchQuery]);

    if (authLoading) {
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
                            <Link href="/dashboard" className="btn btn-ghost">
                                {isAdmin ? <><FiUsers size={16} /> Employees</> : 'Dashboard'}
                            </Link>
                            <Link href="/attendance" className="btn btn-ghost">
                                <FiClock size={16} /> Attendance
                            </Link>
                            <Link href="/leave" className="btn btn-ghost">
                                <FiCalendar size={16} /> Time Off
                            </Link>
                            <button className="btn btn-primary">
                                <RupeeIcon size={16} /> Payroll
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            <main style={{ padding: 'var(--space-xl)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                    {/* Alerts */}
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>
                            <FiAlertCircle size={18} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="alert alert-success" style={{ marginBottom: 'var(--space-lg)' }}>
                            <FiCheckCircle size={18} /> {success}
                        </div>
                    )}

                    {/* Page Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                        <div>
                            <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <RupeeIcon size={24} />
                                {isAdmin ? 'Payroll Management' : 'My Salary'}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {isAdmin ? 'Manage employee salaries and payroll' : 'View your salary details and history'}
                            </p>
                        </div>

                        {isAdmin && (
                            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                {isLocked ? (
                                    <button className="btn btn-secondary" onClick={() => setIsLocked(false)}>
                                        <FiLock size={16} /> Payroll Locked
                                    </button>
                                ) : (
                                    <button className="btn btn-warning" onClick={() => setIsLocked(true)}>
                                        <FiLock size={16} /> Lock Payroll
                                    </button>
                                )}
                                <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={isLocked}>
                                    <FiPlus size={16} /> New Payroll
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Month Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                        <button className="btn btn-ghost" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
                            <FiChevronLeft size={18} />
                        </button>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', minWidth: '150px', textAlign: 'center' }}>
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button className="btn btn-ghost" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
                            <FiChevronRight size={18} />
                        </button>
                    </div>

                    {/* EMPLOYEE VIEW */}
                    {!isAdmin && (
                        <>
                            {loading ? (
                                <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                    <div className="spinner spinner-lg"></div>
                                </div>
                            ) : !latestPayroll ? (
                                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                    <RupeeIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }} />
                                    <h4>No salary record for this month</h4>
                                    <p style={{ color: 'var(--text-secondary)' }}>Contact HR for salary details</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)' }}>

                                    {/* Main Salary Card */}
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        {/* Net Pay Header */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                                            padding: 'var(--space-xl)',
                                            color: 'white',
                                            textAlign: 'center'
                                        }}>
                                            <p style={{ opacity: 0.9, marginBottom: 'var(--space-xs)' }}>Net Pay for {months[latestPayroll.month - 1]} {latestPayroll.year}</p>
                                            <p style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 700 }}>
                                                ₹{(latestPayroll.netSalary || netPay).toLocaleString()}
                                            </p>
                                            <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)' }}>
                                                <div>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Total Earnings</p>
                                                    <p style={{ fontWeight: 600 }}>₹{totalEarnings.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>Total Deductions</p>
                                                    <p style={{ fontWeight: 600 }}>₹{totalDeductions.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Earnings vs Deductions */}
                                        <div style={{ padding: 'var(--space-xl)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
                                                {/* Earnings */}
                                                <div>
                                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)', color: 'var(--success)' }}>
                                                        <FiTrendingUp size={18} /> Earnings
                                                    </h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                                        {earnings.map((item, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                                                <span style={{ fontWeight: 500 }}>₹{item.amount.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)', marginTop: 'var(--space-sm)' }}>
                                                            <span style={{ fontWeight: 600 }}>Total Earnings</span>
                                                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{totalEarnings.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Deductions */}
                                                <div>
                                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)', color: 'var(--error)' }}>
                                                        <FiTrendingDown size={18} /> Deductions
                                                    </h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                                        {deductions.map((item, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                                                <span style={{ fontWeight: 500 }}>₹{item.amount.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)', marginTop: 'var(--space-sm)' }}>
                                                            <span style={{ fontWeight: 600 }}>Total Deductions</span>
                                                            <span style={{ fontWeight: 700, color: 'var(--error)' }}>₹{totalDeductions.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Read-only Notice */}
                                        <div style={{
                                            padding: 'var(--space-md) var(--space-xl)',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)'
                                        }}>
                                            <FiLock size={16} style={{ color: 'var(--primary)' }} />
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                Salary information is managed by HR. Contact HR for any queries.
                                            </span>
                                        </div>
                                    </div>

                                    {/* Side Panel */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                                        {/* Download Slip */}
                                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                            <h4 style={{ marginBottom: 'var(--space-lg)' }}>Salary Slip</h4>
                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%' }}
                                                onClick={() => downloadPDF(latestPayroll.id, latestPayroll.employee?.employeeId || user.employee?.employeeId, latestPayroll.month, latestPayroll.year)}
                                            >
                                                <FiDownload size={16} /> Download PDF
                                            </button>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                            <h4 style={{ marginBottom: 'var(--space-lg)' }}>Quick Stats</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                                <div>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Working Days</p>
                                                    <p style={{ fontWeight: 600 }}>{latestPayroll.workingDays || 22} days</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Per Day Rate</p>
                                                    <p style={{ fontWeight: 600 }}>₹{Math.round((latestPayroll.monthlyWage || totalEarnings) / (latestPayroll.workingDays || 22)).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>YTD Earnings</p>
                                                    <p style={{ fontWeight: 600, color: 'var(--success)' }}>₹{((latestPayroll.netSalary || netPay) * (currentMonth.getMonth() + 1)).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Salary History */}
                                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                                            <h4 style={{ marginBottom: 'var(--space-lg)' }}>Recent History</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                                {payroll.slice(0, 3).map((p, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) 0', borderBottom: idx < 2 ? '1px solid var(--border-color)' : 'none' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{months[p.month - 1]} {p.year}</span>
                                                        <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>₹{(p.netSalary || 0).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* HR VIEW */}
                    {isAdmin && (
                        <>
                            {/* Payroll Locked Banner */}
                            {isLocked && (
                                <div style={{
                                    padding: 'var(--space-lg)',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: 'var(--radius-lg)',
                                    marginBottom: 'var(--space-xl)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)'
                                }}>
                                    <FiLock size={24} style={{ color: 'var(--warning)' }} />
                                    <div>
                                        <p style={{ fontWeight: 600, color: 'var(--warning)' }}>Payroll Locked for {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Salary changes are disabled. Unlock to make modifications.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-md)' }}>
                                <button className={`btn ${activeTab === 'current' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('current')}>
                                    <RupeeIcon size={16} /> Current Month
                                </button>
                                <button className={`btn ${activeTab === 'structure' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('structure')}>
                                    <FiEdit2 size={16} /> Salary Structure
                                </button>
                            </div>

                            {/* Search & Filters */}
                            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label className="form-label"><FiSearch size={14} /> Search Employee</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Search by name or ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Current Month - Payroll Table */}
                            {activeTab === 'current' && (
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                                        <h3>Payroll - {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                                    </div>

                                    {loading ? (
                                        <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                            <div className="spinner spinner-lg"></div>
                                        </div>
                                    ) : payroll.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                            <RupeeIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }} />
                                            <h4>No payroll records for this month</h4>
                                            <p style={{ color: 'var(--text-secondary)' }}>Add payroll records for employees</p>
                                        </div>
                                    ) : (
                                        <div className="table-container">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Employee</th>
                                                        <th>Basic</th>
                                                        <th>Gross</th>
                                                        <th>Deductions</th>
                                                        <th>Net Pay</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payroll.map(record => (
                                                        <tr key={record.id}>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                                                                        {record.employee?.firstName?.[0]}{record.employee?.lastName?.[0]}
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ fontWeight: 500 }}>{record.employee?.firstName} {record.employee?.lastName}</p>
                                                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{record.employee?.department}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>₹{(record.basicWage || 0).toLocaleString()}</td>
                                                            <td>₹{(record.monthlyWage || 0).toLocaleString()}</td>
                                                            <td style={{ color: 'var(--error)' }}>₹{((record.monthlyWage || 0) - (record.netSalary || 0)).toLocaleString()}</td>
                                                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{(record.netSalary || 0).toLocaleString()}</td>
                                                            <td>
                                                                {isLocked ? (
                                                                    <span className="badge badge-warning"><FiLock size={10} /> Locked</span>
                                                                ) : (
                                                                    <span className="badge badge-success">Active</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                                                    <button className="btn btn-ghost btn-sm" onClick={() => downloadPDF(record.id, record.employee?.employeeId, record.month, record.year)}>
                                                                        <FiDownload size={14} />
                                                                    </button>
                                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleEditSalary(record.employee)} disabled={isLocked}>
                                                                        <FiEdit2 size={14} />
                                                                    </button>
                                                                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                                                                        try {
                                                                            await api.post(`/payroll/${record.id}/email`);
                                                                            setSuccess('Salary slip emailed!');
                                                                            setTimeout(() => setSuccess(''), 3000);
                                                                        } catch (err) {
                                                                            setError('Failed to email slip');
                                                                        }
                                                                    }}>
                                                                        <FiMail size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Salary Structure */}
                            {activeTab === 'structure' && (
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                                        <h3>Employee Salary Structure</h3>
                                    </div>

                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Employee</th>
                                                    <th>Current CTC</th>
                                                    <th>Basic</th>
                                                    <th>HRA</th>
                                                    <th>Effective From</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredEmployees.map(emp => (
                                                    <tr key={emp.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                                <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                                                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                                </div>
                                                                <div>
                                                                    <p style={{ fontWeight: 500 }}>{emp.firstName} {emp.lastName}</p>
                                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{emp.employeeId}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontWeight: 600 }}>₹{((emp.payroll?.[0]?.monthlyWage || 0) * 12).toLocaleString()}</td>
                                                        <td>₹{(emp.payroll?.[0]?.basicWage || 0).toLocaleString()}</td>
                                                        <td>₹{(emp.payroll?.[0]?.hra || 0).toLocaleString()}</td>
                                                        <td>{emp.joiningDate ? format(new Date(emp.joiningDate), 'dd MMM yyyy') : '-'}</td>
                                                        <td>
                                                            <button className="btn btn-primary btn-sm" onClick={() => handleEditSalary(emp)} disabled={isLocked}>
                                                                <FiEdit2 size={14} /> Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Add Payroll Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Create Payroll Record</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Employee *</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                                        required
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeId})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Month</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.month}
                                            onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                        >
                                            {months.map((month, i) => (
                                                <option key={i} value={i + 1}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Year</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.year}
                                            onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                            required
                                        />
                                    </div>
                                </div>

                                <h4 style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)', color: 'var(--success)' }}>Earnings</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Basic Salary *</label>
                                        <input type="number" className="form-input" placeholder="30000" value={formData.basicWage} onChange={(e) => setFormData(prev => ({ ...prev, basicWage: e.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">HRA</label>
                                        <input type="number" className="form-input" placeholder="12000" value={formData.hra} onChange={(e) => setFormData(prev => ({ ...prev, hra: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Conveyance</label>
                                        <input type="number" className="form-input" placeholder="2000" value={formData.conveyance} onChange={(e) => setFormData(prev => ({ ...prev, conveyance: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Medical</label>
                                        <input type="number" className="form-input" placeholder="1500" value={formData.medical} onChange={(e) => setFormData(prev => ({ ...prev, medical: e.target.value }))} />
                                    </div>
                                </div>

                                <h4 style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)', color: 'var(--error)' }}>Deductions</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Provident Fund</label>
                                        <input type="number" className="form-input" placeholder="3600" value={formData.pf} onChange={(e) => setFormData(prev => ({ ...prev, pf: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tax (TDS)</label>
                                        <input type="number" className="form-input" placeholder="0" value={formData.tax} onChange={(e) => setFormData(prev => ({ ...prev, tax: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                    {actionLoading ? <><FiLoader className="spinner" /> Creating...</> : <><FiSave size={16} /> Create Record</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Salary Modal */}
            {showEditModal && selectedEmployee && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Edit Salary Structure</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowEditModal(false)}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
                                <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong> - {selectedEmployee.employeeId}
                            </p>

                            <div className="form-group">
                                <label className="form-label">Basic Salary</label>
                                <input type="number" className="form-input" value={formData.basicWage} onChange={(e) => setFormData(prev => ({ ...prev, basicWage: e.target.value }))} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Effective From *</label>
                                <input type="date" className="form-input" value={formData.effectiveFrom} onChange={(e) => setFormData(prev => ({ ...prev, effectiveFrom: e.target.value }))} required />
                            </div>

                            <div style={{ padding: 'var(--space-md)', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-md)' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    💡 Changes will apply from the effective date onwards.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={() => { setShowEditModal(false); setSuccess('Salary updated successfully!'); setTimeout(() => setSuccess(''), 3000); }}>
                                <FiSave size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
