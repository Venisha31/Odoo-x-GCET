'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import {
    FiCalendar,
    FiClock,
    FiPlus,
    FiX,
    FiCheck,
    FiAlertCircle,
    FiLoader,
    FiPaperclip,
    FiZap,
    FiUsers,
    FiMessageSquare,
    FiFilter,
    FiCheckCircle,
    FiXCircle,
    FiInfo,
    FiSend
} from 'react-icons/fi';

export default function LeavePage() {
    const { user, loading: authLoading, isAdmin, company } = useAuth();
    const [activeTab, setActiveTab] = useState('apply'); // 'apply', 'status', 'approval', 'allocation'
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [allocation, setAllocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [uploadingCertificate, setUploadingCertificate] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [hrComment, setHrComment] = useState('');
    const [overlapWarning, setOverlapWarning] = useState('');

    const [formData, setFormData] = useState({
        type: 'PAID',
        startDate: '',
        endDate: '',
        remarks: '',
        attachment: ''
    });

    const router = useRouter();
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        } else if (user) {
            fetchData();
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (isAdmin) {
                const response = await api.get('/leave/all');
                setLeaveRequests(response.data.leaveRequests || []);
            } else {
                const [leavesRes, allocRes] = await Promise.all([
                    api.get('/leave/my'),
                    api.get('/leave/allocation')
                ]);
                setLeaveRequests(leavesRes.data.leaveRequests || []);
                setAllocation(allocRes.data.allocation);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate days and check overlap
    const leaveDays = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return 0;
        const diff = differenceInDays(parseISO(formData.endDate), parseISO(formData.startDate)) + 1;
        return diff > 0 ? diff : 0;
    }, [formData.startDate, formData.endDate]);

    // Check for overlap with existing requests
    useEffect(() => {
        if (!formData.startDate || !formData.endDate) {
            setOverlapWarning('');
            return;
        }
        const start = parseISO(formData.startDate);
        const end = parseISO(formData.endDate);

        const overlapping = leaveRequests.filter(req => {
            if (req.status === 'REJECTED') return false;
            const reqStart = parseISO(req.startDate);
            const reqEnd = parseISO(req.endDate);
            return (
                isWithinInterval(start, { start: reqStart, end: reqEnd }) ||
                isWithinInterval(end, { start: reqStart, end: reqEnd }) ||
                isWithinInterval(reqStart, { start, end })
            );
        });

        if (overlapping.length > 0) {
            setOverlapWarning(`⚠️ Overlaps with ${overlapping.length} existing request(s)`);
        } else {
            setOverlapWarning('');
        }
    }, [formData.startDate, formData.endDate, leaveRequests]);

    useEffect(() => {
        if (formData.type !== 'SICK' && formData.attachment) {
            setFormData(prev => ({ ...prev, attachment: '' }));
            setUploadedFileName('');
            setUploadError('');
        }
    }, [formData.type, formData.attachment]);

    // Get balance after request
    const balanceAfterRequest = useMemo(() => {
        if (!allocation || leaveDays === 0) return null;
        if (formData.type === 'PAID') {
            return allocation.paidAvailable - leaveDays;
        } else if (formData.type === 'SICK') {
            return allocation.sickAvailable - leaveDays;
        }
        return null;
    }, [allocation, formData.type, leaveDays]);

    const handleCertificateUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadError('');
        setError('');
        setUploadingCertificate(true);
        try {
            const data = new FormData();
            data.append('document', file);
            const response = await api.post('/upload/document', data);
            setFormData(prev => ({ ...prev, attachment: response.data.url }));
            setUploadedFileName(response.data.originalName || file.name);
        } catch (err) {
            setUploadError(err.response?.data?.error || 'Failed to upload certificate');
        } finally {
            setUploadingCertificate(false);
        }
    };

    const handleClear = () => {
        setFormData({ type: 'PAID', startDate: '', endDate: '', remarks: '', attachment: '' });
        setUploadedFileName('');
        setUploadError('');
    };

    const handleApply = async (e) => {
        e.preventDefault();
        if (overlapWarning) {
            if (!confirm('This request overlaps with existing leave. Continue anyway?')) return;
        }
        setActionLoading(true);
        setError('');
        if (formData.type === 'SICK' && !formData.attachment) {
            setActionLoading(false);
            setError('Please upload a sick leave certificate before submitting.');
            return;
        }
        try {
            await api.post('/leave/apply', formData);
            setSuccess('Leave request submitted successfully');
            setShowModal(false);
            handleClear();
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAction = async (id, action, comment = '') => {
        setActionLoading(true);
        setError('');
        try {
            await api.put(`/leave/${id}/${action}`, { comment });
            setSuccess(`Leave request ${action}ed successfully`);
            setSelectedRequest(null);
            setHrComment('');
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || `Failed to ${action} request`);
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', icon: <FiClock size={12} /> },
            APPROVED: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', icon: <FiCheckCircle size={12} /> },
            REJECTED: { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', icon: <FiXCircle size={12} /> }
        };
        const style = styles[status] || styles.PENDING;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: style.bg,
                color: style.color,
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {style.icon} {status}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const styles = {
            PAID: { bg: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' },
            SICK: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' },
            UNPAID: { bg: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-secondary)' }
        };
        const labels = { PAID: 'Paid Leave', SICK: 'Sick Leave', UNPAID: 'Unpaid Leave' };
        const style = styles[type] || styles.PAID;
        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: style.bg,
                color: style.color,
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500
            }}>
                {labels[type] || type}
            </span>
        );
    };

    // Filter requests
    const filteredRequests = useMemo(() => {
        return leaveRequests.filter(req => {
            if (statusFilter !== 'all' && req.status !== statusFilter) return false;
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                return (
                    req.employee?.firstName?.toLowerCase().includes(search) ||
                    req.employee?.lastName?.toLowerCase().includes(search)
                );
            }
            return true;
        });
    }, [leaveRequests, statusFilter, searchQuery]);

    // Pending count
    const pendingCount = leaveRequests.filter(r => r.status === 'PENDING').length;

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
                            <Link href="/attendance" className="btn btn-ghost">
                                <FiClock size={16} /> Attendance
                            </Link>
                            <button className="btn btn-primary">
                                <FiCalendar size={16} /> Time Off
                            </button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FiCalendar size={24} />
                            {isAdmin ? 'Leave Management' : 'Time Off'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {isAdmin ? 'Manage employee leave requests' : 'Apply and track your leave requests'}
                        </p>
                    </div>

                    {!isAdmin && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <FiPlus size={16} /> Apply for Leave
                        </button>
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
                    {!isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('apply')}
                                className={`btn ${activeTab === 'apply' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <FiPlus size={16} /> Apply Leave
                            </button>
                            <button
                                onClick={() => setActiveTab('status')}
                                className={`btn ${activeTab === 'status' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <FiClock size={16} /> My Requests
                            </button>
                        </>
                    )}
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('approval')}
                                className={`btn ${activeTab === 'approval' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ position: 'relative' }}
                            >
                                <FiCheck size={16} /> Pending Approval
                                {pendingCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: 'var(--error)',
                                        color: 'white',
                                        fontSize: '10px',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                <FiCalendar size={16} /> All Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('allocation')}
                                className={`btn ${activeTab === 'allocation' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                Settings
                            </button>
                        </>
                    )}
                </div>

                {/* Employee: Leave Balance Cards */}
                {!isAdmin && allocation && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                        <div className="card" style={{ padding: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' }}>Paid Leave</p>
                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--primary)' }}>
                                {allocation.paidAvailable}
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}> / {allocation.paidTotal || 24}</span>
                            </p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>Days Remaining</p>
                        </div>
                        <div className="card" style={{ padding: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' }}>Sick Leave</p>
                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--warning)' }}>
                                {allocation.sickAvailable}
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}> / {allocation.sickTotal || 12}</span>
                            </p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>Days Remaining</p>
                        </div>
                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' }}>Used This Year</p>
                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                                {(allocation.paidTotal || 24) - allocation.paidAvailable + (allocation.sickTotal || 12) - allocation.sickAvailable}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>Days Taken</p>
                        </div>
                        <div className="card" style={{ padding: 'var(--space-lg)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xs)' }}>Pending</p>
                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--warning)' }}>
                                {leaveRequests.filter(r => r.status === 'PENDING').length}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>Requests</p>
                        </div>
                    </div>
                )}

                {/* Employee: Apply Leave Tab */}
                {!isAdmin && activeTab === 'apply' && (
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FiPlus size={20} /> Apply for Leave
                        </h3>

                        <form onSubmit={handleApply}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                                <div className="form-group">
                                    <label className="form-label">Leave Type *</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                    >
                                        <option value="PAID">🏖️ Paid Leave ({allocation?.paidAvailable || 0} days available)</option>
                                        <option value="SICK">🤒 Sick Leave ({allocation?.sickAvailable || 0} days available)</option>
                                        <option value="UNPAID">📋 Unpaid Leave</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Duration</label>
                                    <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{leaveDays}</span> day(s)
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Start Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        min={format(new Date(), 'yyyy-MM-dd')}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">End Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        min={formData.startDate || format(new Date(), 'yyyy-MM-dd')}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Overlap Warning */}
                            {overlapWarning && (
                                <div style={{ padding: 'var(--space-md)', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <FiAlertCircle size={18} style={{ color: 'var(--warning)' }} />
                                    <span style={{ color: 'var(--warning)', fontSize: 'var(--font-size-sm)' }}>{overlapWarning}</span>
                                </div>
                            )}

                            {/* Balance Preview */}
                            {balanceAfterRequest !== null && leaveDays > 0 && (
                                <div style={{
                                    padding: 'var(--space-md)',
                                    background: balanceAfterRequest < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--space-lg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-sm)'
                                }}>
                                    <FiInfo size={18} style={{ color: balanceAfterRequest < 0 ? 'var(--error)' : 'var(--success)' }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>
                                        After this request: <strong>{balanceAfterRequest}</strong> {formData.type === 'PAID' ? 'paid' : 'sick'} days remaining
                                        {balanceAfterRequest < 0 && ' (Insufficient balance!)'}
                                    </span>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Reason / Remarks</label>
                                <textarea
                                    className="form-input form-textarea"
                                    value={formData.remarks}
                                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                    placeholder="Briefly describe the reason for leave..."
                                    rows={3}
                                />
                            </div>

                            {formData.type === 'SICK' && (
                                <div className="form-group">
                                    <label className="form-label">Sick Leave Certificate *</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            onChange={handleCertificateUpload}
                                            disabled={uploadingCertificate}
                                            className="form-input"
                                        />
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                                            Accepted formats: PDF or image (max 5MB)
                                        </p>
                                        {uploadingCertificate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                <FiLoader className="spinner" size={14} /> Uploading certificate...
                                            </div>
                                        )}
                                        {formData.attachment && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--success)', fontSize: 'var(--font-size-sm)' }}>
                                                <FiPaperclip size={14} />
                                                <a href={`${apiBaseUrl}${formData.attachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                                    {uploadedFileName || 'View certificate'}
                                                </a>
                                            </div>
                                        )}
                                        {uploadError && (
                                            <div style={{ color: 'var(--error)', fontSize: 'var(--font-size-sm)' }}>
                                                {uploadError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                                <button type="button" className="btn btn-secondary" onClick={handleClear}>
                                    Clear
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading || leaveDays === 0 || (formData.type === 'SICK' && uploadingCertificate)}>
                                    {actionLoading ? <><FiLoader className="spinner" size={16} /> Submitting...</> : <><FiSend size={16} /> Submit Request</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Employee: Leave Status Timeline */}
                {!isAdmin && activeTab === 'status' && (
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FiClock size={20} /> My Leave Requests
                        </h3>

                        {loading ? (
                            <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                <div className="spinner spinner-lg"></div>
                            </div>
                        ) : leaveRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                <FiCalendar size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }} />
                                <h4>No leave requests yet</h4>
                                <p style={{ color: 'var(--text-secondary)' }}>Apply for leave to see your requests here</p>
                            </div>
                        ) : (
                            /* Timeline View */
                            <div style={{ position: 'relative', paddingLeft: 'var(--space-xl)' }}>
                                {/* Timeline Line */}
                                <div style={{
                                    position: 'absolute',
                                    left: '8px',
                                    top: '0',
                                    bottom: '0',
                                    width: '2px',
                                    background: 'var(--border-color)'
                                }} />

                                {leaveRequests.map((req, idx) => (
                                    <div key={req.id} style={{
                                        position: 'relative',
                                        marginBottom: 'var(--space-xl)',
                                        paddingBottom: 'var(--space-xl)',
                                        borderBottom: idx < leaveRequests.length - 1 ? '1px solid var(--border-color)' : 'none'
                                    }}>
                                        {/* Timeline Dot */}
                                        <div style={{
                                            position: 'absolute',
                                            left: '-24px',
                                            top: '4px',
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: req.status === 'APPROVED' ? 'var(--success)' : req.status === 'REJECTED' ? 'var(--error)' : 'var(--warning)',
                                            border: '3px solid var(--bg-primary)'
                                        }} />

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>
                                                    {getTypeBadge(req.type)}
                                                    {getStatusBadge(req.status)}
                                                </div>
                                                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                                                    {format(new Date(req.startDate), 'MMM dd')} - {format(new Date(req.endDate), 'MMM dd, yyyy')}
                                                </p>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                    {differenceInDays(new Date(req.endDate), new Date(req.startDate)) + 1} day(s)
                                                </p>
                                            </div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                                                Applied {format(new Date(req.createdAt), 'MMM dd, yyyy')}
                                            </p>
                                        </div>

                                        {req.remarks && (
                                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>
                                                <strong>Reason:</strong> {req.remarks}
                                            </p>
                                        )}

                                        {req.attachment && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                                <FiPaperclip size={14} />
                                                <a href={`${apiBaseUrl}${req.attachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: 'var(--font-size-sm)' }}>
                                                    View certificate
                                                </a>
                                            </div>
                                        )}

                                        {/* HR Comment */}
                                        {req.hrComment && (
                                            <div style={{
                                                marginTop: 'var(--space-md)',
                                                padding: 'var(--space-md)',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                borderRadius: 'var(--radius-md)',
                                                borderLeft: '3px solid var(--primary)'
                                            }}>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                                    <FiMessageSquare size={12} /> HR Comment
                                                </p>
                                                <p style={{ fontSize: 'var(--font-size-sm)' }}>{req.hrComment}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* HR: Pending Approval */}
                {isAdmin && activeTab === 'approval' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <FiCheck size={20} /> Pending Approval ({pendingCount})
                            </h3>
                        </div>

                        {loading ? (
                            <div className="flex-center" style={{ padding: 'var(--space-3xl)' }}>
                                <div className="spinner spinner-lg"></div>
                            </div>
                        ) : pendingCount === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                <FiCheckCircle size={48} style={{ color: 'var(--success)', marginBottom: 'var(--space-lg)' }} />
                                <h4>All caught up!</h4>
                                <p style={{ color: 'var(--text-secondary)' }}>No pending leave requests</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                                {leaveRequests.filter(r => r.status === 'PENDING').map(req => (
                                    <div key={req.id} style={{
                                        padding: 'var(--space-lg)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: selectedRequest?.id === req.id ? '2px solid var(--primary)' : '2px solid transparent'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                                                <div className="avatar" style={{ width: 48, height: 48 }}>
                                                    {req.employee?.firstName?.[0]}{req.employee?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                        {req.employee?.firstName} {req.employee?.lastName}
                                                    </p>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                        {req.employee?.department} • {req.employee?.position}
                                                    </p>
                                                </div>
                                            </div>
                                            {getTypeBadge(req.type)}
                                        </div>

                                        <div style={{ marginTop: 'var(--space-lg)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
                                            <div>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>From</p>
                                                <p style={{ fontWeight: 500 }}>{format(new Date(req.startDate), 'dd MMM yyyy')}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>To</p>
                                                <p style={{ fontWeight: 500 }}>{format(new Date(req.endDate), 'dd MMM yyyy')}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Duration</p>
                                                <p style={{ fontWeight: 500 }}>{differenceInDays(new Date(req.endDate), new Date(req.startDate)) + 1} day(s)</p>
                                            </div>
                                        </div>

                                        {req.remarks && (
                                            <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                <strong>Reason:</strong> {req.remarks}
                                            </p>
                                        )}

                                        {req.attachment && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                                <FiPaperclip size={14} />
                                                <a href={`${apiBaseUrl}${req.attachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: 'var(--font-size-sm)' }}>
                                                    View certificate
                                                </a>
                                            </div>
                                        )}

                                        {/* Comment Box & Actions */}
                                        {selectedRequest?.id === req.id ? (
                                            <div style={{ marginTop: 'var(--space-lg)' }}>
                                                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                                                    <label className="form-label">HR Comment (optional)</label>
                                                    <textarea
                                                        className="form-input form-textarea"
                                                        value={hrComment}
                                                        onChange={(e) => setHrComment(e.target.value)}
                                                        placeholder="Add a comment for the employee..."
                                                        rows={2}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                                    <button className="btn btn-success" onClick={() => handleAction(req.id, 'approve', hrComment)} disabled={actionLoading}>
                                                        <FiCheck size={16} /> Approve
                                                    </button>
                                                    <button className="btn btn-danger" onClick={() => handleAction(req.id, 'reject', hrComment)} disabled={actionLoading}>
                                                        <FiX size={16} /> Reject
                                                    </button>
                                                    <button className="btn btn-secondary" onClick={() => { setSelectedRequest(null); setHrComment(''); }}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)' }}>
                                                <button className="btn btn-primary" onClick={() => setSelectedRequest(req)}>
                                                    <FiMessageSquare size={16} /> Review & Respond
                                                </button>
                                                <button className="btn btn-success btn-sm" onClick={() => handleAction(req.id, 'approve')} disabled={actionLoading}>
                                                    Quick Approve
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* HR: All Requests with Filters */}
                {isAdmin && activeTab === 'all' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                            <h3><FiCalendar size={20} /> All Leave Requests</h3>
                            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                <select className="form-input form-select" style={{ width: '150px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="all">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search employee..."
                                    style={{ width: '200px' }}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Type</th>
                                        <th>Duration</th>
                                        <th>Dates</th>
                                        <th>Status</th>
                                        <th>Applied On</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map(req => (
                                        <tr key={req.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                                                        {req.employee?.firstName?.[0]}{req.employee?.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 500 }}>{req.employee?.firstName} {req.employee?.lastName}</p>
                                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{req.employee?.department}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{getTypeBadge(req.type)}</td>
                                            <td>{differenceInDays(new Date(req.endDate), new Date(req.startDate)) + 1} day(s)</td>
                                            <td>{format(new Date(req.startDate), 'dd MMM')} - {format(new Date(req.endDate), 'dd MMM')}</td>
                                            <td>{getStatusBadge(req.status)}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                {format(new Date(req.createdAt), 'dd MMM yyyy')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* HR: Allocation Settings */}
                {isAdmin && activeTab === 'allocation' && (
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Leave Allocation Settings</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
                            Default leave allocation for all employees. Individual allocations can be modified from employee profiles.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>Paid Leave / Year</p>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--primary)' }}>24 Days</p>
                            </div>
                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>Sick Leave / Year</p>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--warning)' }}>12 Days</p>
                            </div>
                            <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>Carry Forward</p>
                                <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>5 Days Max</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Quick Apply Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Quick Leave Request</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleApply}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Leave Type</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                    >
                                        <option value="PAID">Paid Leave</option>
                                        <option value="SICK">Sick Leave</option>
                                        <option value="UNPAID">Unpaid Leave</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">From</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">To</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Reason</label>
                                    <textarea
                                        className="form-input form-textarea"
                                        value={formData.remarks}
                                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                        placeholder="Reason for leave..."
                                        rows={2}
                                    />
                                </div>

                                {formData.type === 'SICK' && (
                                    <div className="form-group">
                                        <label className="form-label">Sick Leave Certificate *</label>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            onChange={handleCertificateUpload}
                                            disabled={uploadingCertificate}
                                            className="form-input"
                                        />
                                        {formData.attachment && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                                <FiPaperclip size={14} />
                                                <a href={`${apiBaseUrl}${formData.attachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                                    {uploadedFileName || 'View certificate'}
                                                </a>
                                            </div>
                                        )}
                                        {uploadError && (
                                            <p style={{ color: 'var(--error)', marginTop: 'var(--space-xs)', fontSize: 'var(--font-size-sm)' }}>{uploadError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); handleClear(); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading || (formData.type === 'SICK' && uploadingCertificate)}>
                                    {actionLoading ? <FiLoader className="spinner" size={16} /> : <FiSend size={16} />} Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
