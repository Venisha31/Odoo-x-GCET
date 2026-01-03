'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { format, subMonths, addMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks } from 'date-fns';
import { downloadCSV } from '../lib/export';
import {
    FiClock,
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiSearch,
    FiZap,
    FiUsers,
    FiGrid,
    FiList,
    FiFilter,
    FiEdit2,
    FiCheck,
    FiX,
    FiAlertCircle,
    FiCheckCircle,
    FiLoader,
    FiFileText
} from 'react-icons/fi';

export default function AttendancePage() {
    const { user, loading: authLoading, isAdmin, company } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
    const [timeRange, setTimeRange] = useState('week'); // 'day', 'week', 'month'
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [auditLog, setAuditLog] = useState([]);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (user) {
            fetchAttendance();
            if (isAdmin) fetchEmployees();
        }
    }, [user, authLoading, currentDate, timeRange, selectedEmployee, selectedDepartment]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            if (isAdmin) {
                const params = {};
                if (timeRange === 'day') {
                    params.date = format(currentDate, 'yyyy-MM-dd');
                } else if (timeRange === 'week') {
                    params.startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                    params.endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                } else {
                    params.startDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM-dd');
                    params.endDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), 'yyyy-MM-dd');
                }
                if (selectedEmployee) params.employeeId = selectedEmployee;
                if (searchQuery) params.search = searchQuery;
                const response = await api.get('/attendance/all', { params });
                setAttendance(response.data.attendance || []);
            } else {
                const response = await api.get('/attendance/my', {
                    params: {
                        month: currentDate.getMonth() + 1,
                        year: currentDate.getFullYear()
                    }
                });
                setAttendance(response.data.attendance || []);
                setSummary(response.data.summary);
            }
        } catch (err) {
            console.error('Fetch attendance error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees');
            setEmployees(response.data.employees || []);
        } catch (err) {
            console.error('Fetch employees error:', err);
        }
    };

    const handleManualOverride = async (e) => {
        e.preventDefault();
        if (!editingRecord) return;
        setActionLoading(true);
        try {
            await api.put(`/attendance/${editingRecord.id}`, {
                status: editingRecord.status,
                checkIn: editingRecord.checkIn,
                checkOut: editingRecord.checkOut
            });
            // Add to audit log
            setAuditLog(prev => [{
                timestamp: new Date(),
                action: 'Manual Override',
                employee: `${editingRecord.employee?.firstName} ${editingRecord.employee?.lastName}`,
                changedBy: `${user.employee?.firstName} ${user.employee?.lastName}`,
                details: `Status changed to ${editingRecord.status}`
            }, ...prev]);
            setSuccess('Attendance updated successfully');
            setShowEditModal(false);
            fetchAttendance();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExport = () => {
        if (!attendance.length) return;

        const csvData = attendance.map(record => ({
            Employee: `${record.employee?.firstName} ${record.employee?.lastName}`,
            Department: record.employee?.department || '-',
            Date: format(new Date(record.date), 'yyyy-MM-dd'),
            Status: record.status,
            CheckIn: record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-',
            CheckOut: record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-',
            WorkHours: record.workHours || 0,
            ExtraHours: record.extraHours || 0
        }));

        const fileName = `Attendance_${timeRange}_${format(currentDate, 'yyyy-MM-dd')}.csv`;
        downloadCSV(csvData, fileName);
    };

    const formatTime = (datetime) => {
        if (!datetime) return '-';
        return format(new Date(datetime), 'HH:mm');
    };

    const getStatusBadge = (status) => {
        const styles = {
            PRESENT: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', label: 'Present' },
            ABSENT: { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', label: 'Absent' },
            HALF_DAY: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', label: 'Half Day' },
            LEAVE: { bg: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', label: 'Leave' },
        };
        const style = styles[status] || styles.ABSENT;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: style.bg,
                color: style.color,
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600
            }}>
                {style.label}
            </span>
        );
    };

    // Get week days for calendar view
    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    // Filter departments
    const departments = useMemo(() => {
        const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
        return depts;
    }, [employees]);

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        return employees.filter(e => {
            if (selectedDepartment && e.department !== selectedDepartment) return false;
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                return e.firstName?.toLowerCase().includes(search) ||
                    e.lastName?.toLowerCase().includes(search) ||
                    e.employeeId?.toLowerCase().includes(search);
            }
            return true;
        });
    }, [employees, selectedDepartment, searchQuery]);

    // Navigate dates
    const navigatePrev = () => {
        if (timeRange === 'day') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
        else if (timeRange === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subMonths(currentDate, 1));
    };

    const navigateNext = () => {
        if (timeRange === 'day') setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
        else if (timeRange === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addMonths(currentDate, 1));
    };

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
                            <div className="logo-icon"><FiZap size={20} /></div>
                            <span className="text-gradient">{company?.name || 'Dayflow'}</span>
                        </Link>

                        <nav style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <Link href="/dashboard" className="btn btn-ghost">
                                {isAdmin ? <><FiUsers size={16} /> Employees</> : 'Dashboard'}
                            </Link>
                            <button className="btn btn-primary">
                                <FiClock size={16} /> Attendance
                            </button>
                            <Link href="/leave" className="btn btn-ghost">
                                <FiCalendar size={16} /> Time Off
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="container" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>

                {/* Alerts */}
                {success && (
                    <div className="alert alert-success" style={{ marginBottom: 'var(--space-lg)' }}>
                        <FiCheckCircle size={18} /> {success}
                    </div>
                )}
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--space-lg)' }}>
                        <FiAlertCircle size={18} /> {error}
                    </div>
                )}

                {/* Page Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FiClock size={24} />
                            {isAdmin ? 'Attendance Management' : 'My Attendance'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {isAdmin ? 'View and manage employee attendance records' : 'View your attendance history'}
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                        {/* Calendar/Table Toggle */}
                        <div style={{ display: 'flex', gap: '0', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: '4px' }}>
                            <button
                                className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('calendar')}
                                style={{ borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}
                            >
                                <FiGrid size={16} /> Calendar
                            </button>
                            <button
                                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setViewMode('table')}
                                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                            >
                                <FiList size={16} /> Table
                            </button>
                        </div>

                        {/* Time Range Toggle */}
                        <div style={{ display: 'flex', gap: '0', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: '4px' }}>
                            <button className={`btn btn-sm ${timeRange === 'day' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTimeRange('day')}>Day</button>
                            <button className={`btn btn-sm ${timeRange === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTimeRange('week')}>Week</button>
                            <button className={`btn btn-sm ${timeRange === 'month' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTimeRange('month')}>Month</button>
                        </div>
                    </div>
                </div>

                {/* HR Filters */}
                {isAdmin && (
                    <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            {/* Employee Selector */}
                            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                                <label className="form-label"><FiUsers size={14} /> Employee</label>
                                <select
                                    className="form-input form-select"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                >
                                    <option value="">All Employees</option>
                                    {filteredEmployees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Department Filter */}
                            <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                                <label className="form-label"><FiFilter size={14} /> Department</label>
                                <select
                                    className="form-input form-select"
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Search */}
                            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                                <label className="form-label"><FiSearch size={14} /> Search</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Audit Log Button */}
                            <button className="btn btn-secondary" onClick={() => setShowAuditLog(!showAuditLog)}>
                                <FiFileText size={16} /> Audit Log
                            </button>

                            {/* Export Button */}
                            <button className="btn btn-success" onClick={handleExport} disabled={attendance.length === 0}>
                                <FiFileText size={16} /> Export CSV
                            </button>
                        </div>
                    </div>
                )}

                {/* Date Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                    <button className="btn btn-ghost" onClick={navigatePrev}>
                        <FiChevronLeft size={18} /> Previous
                    </button>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                        {timeRange === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                        {timeRange === 'week' && `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`}
                        {timeRange === 'month' && format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button className="btn btn-ghost" onClick={navigateNext}>
                        Next <FiChevronRight size={18} />
                    </button>
                </div>

                {/* Summary Cards - Employee View */}
                {!isAdmin && summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Present</p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--success)' }}>{summary.presentDays}</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Half Days</p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--warning)' }}>{summary.halfDays || 0}</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Leave</p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--primary)' }}>{summary.leaveDays}</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Total Hours</p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{summary.totalWorkHours?.toFixed(1) || 0}</p>
                        </div>
                    </div>
                )}

                {/* Status Legend */}
                <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Status Legend:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Present</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--error)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Absent</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--warning)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Half Day</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Leave</span>
                        </div>
                    </div>
                </div>

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <div className="card">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-sm)' }}>
                            {/* Header */}
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} style={{ textAlign: 'center', padding: 'var(--space-md)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                    {day}
                                </div>
                            ))}
                            {/* Days */}
                            {weekDays.map(day => {
                                const isToday = isSameDay(day, new Date());
                                const record = attendance.find(a => isSameDay(new Date(a.date), day));
                                const status = record?.status || 'ABSENT';
                                const statusColors = {
                                    PRESENT: 'var(--success)',
                                    ABSENT: 'var(--error)',
                                    HALF_DAY: 'var(--warning)',
                                    LEAVE: 'var(--primary)'
                                };

                                return (
                                    <div
                                        key={day.toISOString()}
                                        style={{
                                            padding: 'var(--space-lg)',
                                            borderRadius: 'var(--radius-lg)',
                                            background: isToday ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                            border: isToday ? '2px solid var(--primary)' : '2px solid transparent',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                                            {format(day, 'd')}
                                        </p>
                                        {record ? (
                                            <>
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: statusColors[status],
                                                    margin: '0 auto var(--space-xs)'
                                                }} />
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                    {formatTime(record.checkIn)} - {formatTime(record.checkOut)}
                                                </p>
                                                {record.workHours && (
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                        {record.workHours.toFixed(1)}h
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>No record</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <div className="card">
                        {loading ? (
                            <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                <div className="spinner spinner-lg"></div>
                            </div>
                        ) : attendance.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                <FiClock size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }} />
                                <h4 style={{ marginBottom: 'var(--space-sm)' }}>No records found</h4>
                                <p style={{ color: 'var(--text-secondary)' }}>Attendance records will appear here</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            {isAdmin && <th>Employee</th>}
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th>Check In</th>
                                            <th>Check Out</th>
                                            <th>Work Hours</th>
                                            <th>Extra Hours</th>
                                            {isAdmin && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map(record => (
                                            <tr key={record.id}>
                                                {isAdmin && (
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                            <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                                                                {record.employee?.firstName?.[0]}{record.employee?.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <p style={{ fontWeight: 500 }}>{record.employee?.firstName} {record.employee?.lastName}</p>
                                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{record.employee?.department}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                <td>{format(new Date(record.date), 'dd MMM yyyy')}</td>
                                                <td>{getStatusBadge(record.status)}</td>
                                                <td>{formatTime(record.checkIn)}</td>
                                                <td>{formatTime(record.checkOut)}</td>
                                                <td>{record.workHours?.toFixed(2) || '-'}</td>
                                                <td style={{ color: record.extraHours > 0 ? 'var(--success)' : 'inherit' }}>
                                                    {record.extraHours?.toFixed(2) || '-'}
                                                </td>
                                                {isAdmin && (
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => { setEditingRecord(record); setShowEditModal(true); }}
                                                        >
                                                            <FiEdit2 size={14} /> Edit
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Audit Log Panel */}
                {isAdmin && showAuditLog && (
                    <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                            <h3><FiFileText size={20} /> Audit Log</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAuditLog(false)}><FiX size={16} /></button>
                        </div>
                        {auditLog.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                                No changes recorded yet. Manual overrides will appear here.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {auditLog.map((log, idx) => (
                                    <div key={idx} style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                            <span style={{ fontWeight: 600 }}>{log.action}</span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            <strong>{log.employee}</strong> - {log.details}
                                        </p>
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            Changed by: {log.changedBy}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Edit Modal - Manual Override */}
            {showEditModal && editingRecord && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2>Edit Attendance</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowEditModal(false)}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleManualOverride}>
                            <div className="modal-body">
                                <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
                                    <strong>{editingRecord.employee?.firstName} {editingRecord.employee?.lastName}</strong> - {format(new Date(editingRecord.date), 'dd MMM yyyy')}
                                </p>

                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-input form-select"
                                        value={editingRecord.status}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                                    >
                                        <option value="PRESENT">Present</option>
                                        <option value="ABSENT">Absent</option>
                                        <option value="HALF_DAY">Half Day</option>
                                        <option value="LEAVE">Leave</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Check In</label>
                                        <input
                                            type="time"
                                            className="form-input"
                                            value={editingRecord.checkIn ? format(new Date(editingRecord.checkIn), 'HH:mm') : ''}
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':');
                                                const date = new Date(editingRecord.date);
                                                date.setHours(parseInt(hours), parseInt(minutes));
                                                setEditingRecord({ ...editingRecord, checkIn: date.toISOString() });
                                            }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Check Out</label>
                                        <input
                                            type="time"
                                            className="form-input"
                                            value={editingRecord.checkOut ? format(new Date(editingRecord.checkOut), 'HH:mm') : ''}
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':');
                                                const date = new Date(editingRecord.date);
                                                date.setHours(parseInt(hours), parseInt(minutes));
                                                setEditingRecord({ ...editingRecord, checkOut: date.toISOString() });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ padding: 'var(--space-md)', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-md)' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--warning)' }}>
                                        ⚠️ This change will be recorded in the audit log.
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                    {actionLoading ? <FiLoader className="spinner" size={16} /> : <FiCheck size={16} />} Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
