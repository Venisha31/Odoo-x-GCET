const express = require('express');
const { prisma, authenticate, isAdmin } = require('../middleware/auth');
const { sendLeaveStatusEmail } = require('../services/email.service');

const router = express.Router();

// Calculate days between dates
const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// @route   GET /api/leave/allocation
// @desc    Get current user's leave allocation
router.get('/allocation', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        let allocation = await prisma.leaveAllocation.findUnique({
            where: { employeeId: req.user.employee.id }
        });

        // Create if not exists
        if (!allocation) {
            allocation = await prisma.leaveAllocation.create({
                data: {
                    employeeId: req.user.employee.id,
                    paidLeaves: 24,
                    sickLeaves: 12
                }
            });
        }

        res.json({
            allocation: {
                paidAvailable: allocation.paidLeaves - allocation.paidUsed,
                paidTotal: allocation.paidLeaves,
                paidUsed: allocation.paidUsed,
                sickAvailable: allocation.sickLeaves - allocation.sickUsed,
                sickTotal: allocation.sickLeaves,
                sickUsed: allocation.sickUsed,
                unpaidUsed: allocation.unpaidUsed
            }
        });
    } catch (error) {
        console.error('Get allocation error:', error);
        res.status(500).json({ error: 'Failed to fetch allocation' });
    }
});

// @route   POST /api/leave/apply
// @desc    Apply for leave
router.post('/apply', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const { type, startDate, endDate, remarks, attachment } = req.body;

        if (!type || !startDate || !endDate) {
            return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return res.status(400).json({ error: 'Start date cannot be after end date' });
        }

        const days = calculateDays(start, end);

        // Check allocation
        const allocation = await prisma.leaveAllocation.findUnique({
            where: { employeeId: req.user.employee.id }
        });

        if (allocation) {
            if (type === 'PAID') {
                const available = allocation.paidLeaves - allocation.paidUsed;
                if (days > available) {
                    return res.status(400).json({ error: `Only ${available} paid leave days available` });
                }
            } else if (type === 'SICK') {
                const available = allocation.sickLeaves - allocation.sickUsed;
                if (days > available) {
                    return res.status(400).json({ error: `Only ${available} sick leave days available` });
                }
            }
        }

        // Check for overlapping leave requests
        const overlapping = await prisma.leaveRequest.findFirst({
            where: {
                employeeId: req.user.employee.id,
                status: { not: 'REJECTED' },
                OR: [
                    {
                        startDate: { lte: end },
                        endDate: { gte: start }
                    }
                ]
            }
        });

        if (overlapping) {
            return res.status(400).json({ error: 'You have an overlapping leave request' });
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                employeeId: req.user.employee.id,
                type,
                startDate: start,
                endDate: end,
                remarks,
                attachment,
                status: 'PENDING'
            }
        });

        res.status(201).json({
            message: 'Leave request submitted successfully',
            leaveRequest,
            daysRequested: days
        });
    } catch (error) {
        console.error('Apply leave error:', error);
        res.status(500).json({ error: 'Failed to apply for leave' });
    }
});

// @route   GET /api/leave/my
// @desc    Get current user's leave requests
router.get('/my', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const leaveRequests = await prisma.leaveRequest.findMany({
            where: { employeeId: req.user.employee.id },
            orderBy: { createdAt: 'desc' }
        });

        // Get allocation
        const allocation = await prisma.leaveAllocation.findUnique({
            where: { employeeId: req.user.employee.id }
        });

        res.json({
            leaveRequests,
            allocation: allocation ? {
                paidAvailable: allocation.paidLeaves - allocation.paidUsed,
                sickAvailable: allocation.sickLeaves - allocation.sickUsed
            } : null
        });
    } catch (error) {
        console.error('Get my leaves error:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

// @route   GET /api/leave/all
// @desc    Get all leave requests (Admin only) - filtered by company
router.get('/all', authenticate, isAdmin, async (req, res) => {
    try {
        const { status, employeeId, type } = req.query;

        let whereClause = {
            employee: {
                companyId: req.user.companyId
            }
        };
        if (status) whereClause.status = status;
        if (employeeId) whereClause.employeeId = employeeId;
        if (type) whereClause.type = type;

        const leaveRequests = await prisma.leaveRequest.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true,
                        profilePicture: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ leaveRequests });
    } catch (error) {
        console.error('Get all leaves error:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

// @route   GET /api/leave/pending
// @desc    Get pending leave requests (Admin only) - filtered by company
router.get('/pending', authenticate, isAdmin, async (req, res) => {
    try {
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: {
                status: 'PENDING',
                employee: {
                    companyId: req.user.companyId
                }
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true,
                        profilePicture: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({ leaveRequests });
    } catch (error) {
        console.error('Get pending leaves error:', error);
        res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
});

// @route   PUT /api/leave/:id/approve
// @desc    Approve leave request (Admin only)
router.put('/:id/approve', authenticate, isAdmin, async (req, res) => {
    try {
        const { adminComment } = req.body;

        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        if (leaveRequest.status !== 'PENDING') {
            return res.status(400).json({ error: 'Leave request already processed' });
        }

        const days = calculateDays(leaveRequest.startDate, leaveRequest.endDate);

        // Update allocation
        const updateField = leaveRequest.type === 'PAID' ? 'paidUsed' :
            leaveRequest.type === 'SICK' ? 'sickUsed' : 'unpaidUsed';

        await prisma.leaveAllocation.update({
            where: { employeeId: leaveRequest.employeeId },
            data: { [updateField]: { increment: days } }
        });

        const updated = await prisma.leaveRequest.update({
            where: { id: req.params.id },
            data: {
                status: 'APPROVED',
                adminComment
            }
        });

        // Create attendance records for leave days
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);

            await prisma.attendance.upsert({
                where: {
                    employeeId_date: {
                        employeeId: leaveRequest.employeeId,
                        date
                    }
                },
                update: { status: 'LEAVE' },
                create: {
                    employeeId: leaveRequest.employeeId,
                    date,
                    status: 'LEAVE'
                }
            });
        }

        // Send email notification (async)
        const employee = await prisma.employee.findUnique({ where: { id: leaveRequest.employeeId } });
        if (employee) {
            sendLeaveStatusEmail(employee, updated, 'APPROVED').catch(err => console.error('Leave email error:', err));
        }

        res.json({
            message: 'Leave request approved',
            leaveRequest: updated
        });
    } catch (error) {
        console.error('Approve leave error:', error);
        res.status(500).json({ error: 'Failed to approve leave request' });
    }
});

// @route   PUT /api/leave/:id/reject
// @desc    Reject leave request (Admin only)
router.put('/:id/reject', authenticate, isAdmin, async (req, res) => {
    try {
        const { adminComment } = req.body;

        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        if (leaveRequest.status !== 'PENDING') {
            return res.status(400).json({ error: 'Leave request already processed' });
        }

        const updated = await prisma.leaveRequest.update({
            where: { id: req.params.id },
            data: {
                status: 'REJECTED',
                adminComment
            }
        });

        // Send email notification (async)
        const employee = await prisma.employee.findUnique({ where: { id: leaveRequest.employeeId } });
        if (employee) {
            sendLeaveStatusEmail(employee, updated, 'REJECTED').catch(err => console.error('Leave email error:', err));
        }

        res.json({
            message: 'Leave request rejected',
            leaveRequest: updated
        });
    } catch (error) {
        console.error('Reject leave error:', error);
        res.status(500).json({ error: 'Failed to reject leave request' });
    }
});

// @route   PUT /api/leave/allocation/:employeeId
// @desc    Update leave allocation (Admin only)
router.put('/allocation/:employeeId', authenticate, isAdmin, async (req, res) => {
    try {
        const { paidLeaves, sickLeaves } = req.body;

        const allocation = await prisma.leaveAllocation.upsert({
            where: { employeeId: req.params.employeeId },
            update: { paidLeaves, sickLeaves },
            create: {
                employeeId: req.params.employeeId,
                paidLeaves: paidLeaves || 24,
                sickLeaves: sickLeaves || 12
            }
        });

        res.json({
            message: 'Allocation updated',
            allocation
        });
    } catch (error) {
        console.error('Update allocation error:', error);
        res.status(500).json({ error: 'Failed to update allocation' });
    }
});

// @route   DELETE /api/leave/:id
// @desc    Cancel leave request (Employee only, if pending)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: req.params.id }
        });

        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        // Check if user owns this request or is admin
        if (req.user.role !== 'ADMIN' && req.user.employee?.id !== leaveRequest.employeeId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (leaveRequest.status !== 'PENDING') {
            return res.status(400).json({ error: 'Can only cancel pending requests' });
        }

        await prisma.leaveRequest.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'Leave request cancelled' });
    } catch (error) {
        console.error('Cancel leave error:', error);
        res.status(500).json({ error: 'Failed to cancel leave request' });
    }
});

module.exports = router;
