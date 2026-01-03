const express = require('express');
const { prisma, authenticate, isAdmin, isAdminOrSelf } = require('../middleware/auth');

const router = express.Router();

// Helper to get start of day
const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Calculate work hours and extra hours
const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return { workHours: 0, extraHours: 0 };

    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
    const workHours = Math.min(diff, 8); // Cap at 8 hours
    const extraHours = Math.max(0, diff - 8); // Overtime

    return {
        workHours: parseFloat(workHours.toFixed(2)),
        extraHours: parseFloat(extraHours.toFixed(2))
    };
};

// @route   POST /api/attendance/check-in
// @desc    Employee check-in
router.post('/check-in', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const today = startOfDay(new Date());

        // Check if already checked in today
        const existing = await prisma.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId: req.user.employee.id,
                    date: today
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already checked in today' });
        }

        const attendance = await prisma.attendance.create({
            data: {
                employeeId: req.user.employee.id,
                date: today,
                checkIn: new Date(),
                status: 'PRESENT'
            }
        });

        res.status(201).json({
            message: 'Check-in successful',
            attendance
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Check-in failed' });
    }
});

// @route   POST /api/attendance/check-out
// @desc    Employee check-out
router.post('/check-out', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const today = startOfDay(new Date());

        const attendance = await prisma.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId: req.user.employee.id,
                    date: today
                }
            }
        });

        if (!attendance) {
            return res.status(400).json({ error: 'Please check-in first' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ error: 'Already checked out today' });
        }

        const checkOutTime = new Date();
        const { workHours, extraHours } = calculateHours(attendance.checkIn, checkOutTime);

        // Determine status based on hours worked
        let status = 'PRESENT';
        if (workHours < 4) {
            status = 'HALF_DAY';
        }

        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                checkOut: checkOutTime,
                status,
                workHours,
                extraHours
            }
        });

        res.json({
            message: 'Check-out successful',
            attendance: updated,
            hoursWorked: workHours,
            extraHours
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ error: 'Check-out failed' });
    }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance for current user
router.get('/today', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const today = startOfDay(new Date());

        const attendance = await prisma.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId: req.user.employee.id,
                    date: today
                }
            }
        });

        res.json({ attendance });
    } catch (error) {
        console.error('Get today attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// @route   GET /api/attendance/my
// @desc    Get current user's attendance history
router.get('/my', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const { startDate, endDate, month, year } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                date: {
                    gte: startOfDay(new Date(startDate)),
                    lte: startOfDay(new Date(endDate))
                }
            };
        } else if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            dateFilter = {
                date: {
                    gte: start,
                    lte: end
                }
            };
        }

        const attendance = await prisma.attendance.findMany({
            where: {
                employeeId: req.user.employee.id,
                ...dateFilter
            },
            orderBy: { date: 'desc' }
        });

        // Calculate summary
        const summary = {
            totalDays: attendance.length,
            presentDays: attendance.filter(a => a.status === 'PRESENT').length,
            halfDays: attendance.filter(a => a.status === 'HALF_DAY').length,
            leaveDays: attendance.filter(a => a.status === 'LEAVE').length,
            totalWorkHours: attendance.reduce((sum, a) => sum + (a.workHours || 0), 0),
            totalExtraHours: attendance.reduce((sum, a) => sum + (a.extraHours || 0), 0)
        };

        res.json({ attendance, summary });
    } catch (error) {
        console.error('Get my attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// @route   GET /api/attendance/all
// @desc    Get all employees attendance (Admin only)
router.get('/all', authenticate, isAdmin, async (req, res) => {
    try {
        const { date, startDate, endDate, employeeId, search } = req.query;

        let dateFilter = {};
        if (date) {
            dateFilter = { date: startOfDay(new Date(date)) };
        } else if (startDate && endDate) {
            dateFilter = {
                date: {
                    gte: startOfDay(new Date(startDate)),
                    lte: startOfDay(new Date(endDate))
                }
            };
        }

        let employeeFilter = {};
        if (employeeId) {
            employeeFilter = { employeeId };
        }

        let searchFilter = {};
        if (search) {
            searchFilter = {
                employee: {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { employeeId: { contains: search, mode: 'insensitive' } }
                    ]
                }
            };
        }

        const attendance = await prisma.attendance.findMany({
            where: {
                ...dateFilter,
                ...employeeFilter,
                ...searchFilter,
                employee: {
                    companyId: req.user.companyId,
                    ...(searchFilter.employee || {})
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
            orderBy: { date: 'desc' }
        });

        res.json({ attendance });
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// @route   GET /api/attendance/status-today
// @desc    Get today's status for all employees (Admin)
router.get('/status-today', authenticate, isAdmin, async (req, res) => {
    try {
        const today = startOfDay(new Date());

        const employees = await prisma.employee.findMany({
            where: {
                companyId: req.user.companyId
            },
            include: {
                attendance: {
                    where: { date: today },
                    take: 1
                },
                leaveRequests: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: today },
                        endDate: { gte: today }
                    },
                    take: 1
                }
            }
        });

        const statusList = employees.map(emp => {
            let status = 'absent'; // red
            if (emp.attendance.length > 0) {
                status = emp.attendance[0].checkOut ? 'present' : 'checked-in'; // green
            } else if (emp.leaveRequests.length > 0) {
                status = 'leave'; // yellow
            }

            return {
                id: emp.id,
                employeeId: emp.employeeId,
                firstName: emp.firstName,
                lastName: emp.lastName,
                profilePicture: emp.profilePicture,
                department: emp.department,
                status,
                attendance: emp.attendance[0] || null
            };
        });

        res.json({ employees: statusList });
    } catch (error) {
        console.error('Get status today error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance (Admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { status, checkIn, checkOut } = req.body;

        let updateData = {};
        if (status) updateData.status = status;
        if (checkIn) updateData.checkIn = new Date(checkIn);
        if (checkOut) {
            updateData.checkOut = new Date(checkOut);
            // Recalculate hours if checkOut updated
            const attendance = await prisma.attendance.findUnique({ where: { id: req.params.id } });
            if (attendance?.checkIn) {
                const { workHours, extraHours } = calculateHours(attendance.checkIn, new Date(checkOut));
                updateData.workHours = workHours;
                updateData.extraHours = extraHours;
            }
        }

        const attendance = await prisma.attendance.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({
            message: 'Attendance updated successfully',
            attendance
        });
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
});

module.exports = router;
