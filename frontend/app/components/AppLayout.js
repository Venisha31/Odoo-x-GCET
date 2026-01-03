'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
    const pathname = usePathname();

    // Paths where Sidebar should NOT appear
    const isAuthPage = pathname?.startsWith('/auth');
    const isLandingPage = pathname === '/';

    const showSidebar = !isAuthPage && !isLandingPage;

    if (!showSidebar) {
        return <>{children}</>;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ flex: 1, marginLeft: '260px', width: 'calc(100% - 260px)' }}>
                {children}
            </div>
        </div>
    );
}
