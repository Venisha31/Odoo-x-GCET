'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import RupeeIcon from './RupeeIcon';
import {
    FiHome,
    FiUser,
    FiClock,
    FiCalendar,
    FiUsers,
    FiLogOut,
    FiZap,
    FiCheck,
    FiPieChart
} from 'react-icons/fi';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout, isAdmin } = useAuth();

    const employeeLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: FiHome },
        { href: '/attendance', label: 'Attendance', icon: FiClock },
        { href: '/leave', label: 'Leave', icon: FiCalendar },
        { href: '/payroll', label: 'Payroll', icon: () => <RupeeIcon size={18} /> },
        { href: '/profile', label: 'Profile', icon: FiUser },
    ];

    const adminLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: FiHome },
        { href: '/employees', label: 'Employees', icon: FiUsers },
        { href: '/attendance', label: 'Attendance', icon: FiClock },
        { href: '/leave', label: 'Leave Approvals', icon: FiCheck }, // Changed icon to Check for approvals
        { href: '/payroll', label: 'Payroll', icon: () => <RupeeIcon size={18} /> },
        { href: '/analytics', label: 'Reports', icon: FiPieChart },
    ];

    const links = isAdmin ? adminLinks : employeeLinks;

    return (
        <aside className="sidebar">
            <Link href="/dashboard" className="sidebar-logo">
                <Image
                    src="/imagee.png"
                    alt="Dayflow Logo"
                    width={120}
                    height={40}
                    style={{ objectFit: 'contain' }}
                />
            </Link>

            <nav className="sidebar-nav">
                {links.map(link => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon className="nav-icon" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div style={{
                marginTop: 'auto',
                paddingTop: 'var(--space-lg)',
                borderTop: '1px solid var(--border-color-light)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    marginBottom: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div className="avatar">
                        {user?.employee?.firstName?.[0]}{user?.employee?.lastName?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: 'var(--text-primary)'
                        }}>
                            {user?.employee?.firstName} {user?.employee?.lastName}
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                            textTransform: 'capitalize'
                        }}>
                            {user?.role?.toLowerCase()}
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="nav-item w-full"
                    style={{
                        color: 'var(--error)',
                        border: 'none',
                        background: 'transparent',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer'
                    }}
                >
                    <FiLogOut className="nav-icon" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
