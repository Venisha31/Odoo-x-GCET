const express = require('express');
const { prisma, authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get dashboard overview stats
router.get('/overview', authenticate, isAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('Analytics overview - User:', req.user.email, 'CompanyId:', req.user.companyId);

        // Build company filter - if no companyId, show all (for legacy support)
        const companyFilter = req.user.companyId ? { companyId: req.user.companyId } : {};
        const employeeCompanyFilter = req.user.companyId ? { employee: { companyId: req.user.companyId } } : {};

        // Total employees in this company
        const totalEmployees = await prisma.employee.count({
            where: companyFilter
        });

        // Present today (from this company)
        const presentToday = await prisma.attendance.count({
            where: {
                date: today,
                status: 'PRESENT',
                ...employeeCompanyFilter
            }
        });

        // On leave today (from this company)
        const onLeaveToday = await prisma.attendance.count({
            where: {
                date: today,
                status: 'LEAVE',
                ...employeeCompanyFilter
            }
        });

        // Pending leave requests (from this company)
        const pendingLeaves = await prisma.leaveRequest.count({
            where: {
                status: 'PENDING',
                ...employeeCompanyFilter
            }
        });

        // Total payroll this month
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const payrollData = await prisma.payroll.aggregate({
            where: {
                month: currentMonth,
                year: currentYear,
                ...employeeCompanyFilter
            },
            _sum: { netSalary: true }
        });

        console.log('Analytics result - Total employees:', totalEmployees, 'Present:', presentToday);

        res.json({
            totalEmployees,
            presentToday,
            onLeaveToday,
            absentToday: totalEmployees - presentToday - onLeaveToday,
            pendingLeaves,
            monthlyPayroll: payrollData._sum.netSalary || 0
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// @route   GET /api/analytics/attendance-trend
// @desc    Get attendance trend for last 6 months
router.get('/attendance-trend', authenticate, isAdmin, async (req, res) => {
    try {
        const months = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

            const presentCount = await prisma.attendance.count({
                where: {
                    date: { gte: date, lt: nextMonth },
                    status: 'PRESENT',
                    employee: { companyId: req.user.companyId }
                }
            });

            const leaveCount = await prisma.attendance.count({
                where: {
                    date: { gte: date, lt: nextMonth },
                    status: 'LEAVE',
                    employee: { companyId: req.user.companyId }
                }
            });

            months.push({
                month: date.toLocaleString('default', { month: 'short' }),
                year: date.getFullYear(),
                present: presentCount,
                leave: leaveCount
            });
        }

        res.json({ trend: months });
    } catch (error) {
        console.error('Attendance trend error:', error);
        res.status(500).json({ error: 'Failed to fetch trend' });
    }
});

// @route   GET /api/analytics/department-distribution
// @desc    Get employee count by department
router.get('/department-distribution', authenticate, isAdmin, async (req, res) => {
    try {
        const departments = await prisma.employee.groupBy({
            by: ['department'],
            where: { companyId: req.user.companyId },
            _count: { id: true }
        });

        const distribution = departments.map(d => ({
            department: d.department || 'Unassigned',
            count: d._count.id
        }));

        res.json({ distribution });
    } catch (error) {
        console.error('Department distribution error:', error);
        res.status(500).json({ error: 'Failed to fetch distribution' });
    }
});

// @route   GET /api/analytics/leave-summary
// @desc    Get leave type breakdown
router.get('/leave-summary', authenticate, isAdmin, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);

        const leaveSummary = await prisma.leaveRequest.groupBy({
            by: ['type', 'status'],
            where: {
                createdAt: { gte: startOfYear, lte: endOfYear },
                employee: { companyId: req.user.companyId }
            },
            _count: { id: true }
        });

        // Calculate totals by type
        const approved = {
            PAID: 0,
            SICK: 0,
            UNPAID: 0
        };

        leaveSummary.forEach(item => {
            if (item.status === 'APPROVED') {
                approved[item.type] = item._count.id;
            }
        });

        res.json({
            summary: {
                paidLeaves: approved.PAID,
                sickLeaves: approved.SICK,
                unpaidLeaves: approved.UNPAID,
                totalApproved: approved.PAID + approved.SICK + approved.UNPAID,
                pendingCount: leaveSummary.filter(l => l.status === 'PENDING').reduce((a, b) => a + b._count.id, 0)
            }
        });
    } catch (error) {
        console.error('Leave summary error:', error);
        res.status(500).json({ error: 'Failed to fetch leave summary' });
    }
});

// @route   GET /api/analytics/payroll-summary
// @desc    Get payroll costs summary
router.get('/payroll-summary', authenticate, isAdmin, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyData = [];

        for (let month = 1; month <= 12; month++) {
            const data = await prisma.payroll.aggregate({
                where: {
                    month,
                    year: currentYear,
                    employee: { companyId: req.user.companyId }
                },
                _sum: { netSalary: true },
                _count: { id: true }
            });

            monthlyData.push({
                month,
                monthName: new Date(currentYear, month - 1).toLocaleString('default', { month: 'short' }),
                totalPayout: data._sum.netSalary || 0,
                employeeCount: data._count.id
            });
        }

        const yearTotal = monthlyData.reduce((sum, m) => sum + m.totalPayout, 0);

        res.json({
            monthly: monthlyData,
            yearTotal,
            averageMonthly: yearTotal / 12
        });
    } catch (error) {
        console.error('Payroll summary error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll summary' });
    }
});

module.exports = router;
