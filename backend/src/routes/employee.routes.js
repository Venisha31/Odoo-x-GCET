const express = require('express');
const { prisma, authenticate, isAdmin, isAdminOrSelf } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees (Admin only) - filtered by company
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        console.log('GET /employees - User:', req.user.email, 'CompanyId:', req.user.companyId);

        // Build where clause - only filter by company if companyId exists
        const whereClause = req.user.companyId ? { companyId: req.user.companyId } : {};

        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { id: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log('Found', employees.length, 'employees');
        res.json({ employees });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID
router.get('/:id', authenticate, isAdminOrSelf, async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: { id: true, email: true, role: true }
                }
            }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ employee });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
router.put('/:id', authenticate, isAdminOrSelf, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phone,
            address,
            department,
            position,
            profilePicture,
            about,
            interests,
            skills,
            role // Admin can update role
        } = req.body;

        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Employees can only update limited fields
        let updateData = {};
        if (req.user.role === 'ADMIN') {
            updateData = {
                firstName,
                lastName,
                phone,
                address,
                department,
                position,
                profilePicture,
                about,
                interests,
                skills
            };

            // Update User Role if provided
            if (role && (role === 'ADMIN' || role === 'EMPLOYEE')) {
                await prisma.user.update({
                    where: { id: employee.userId },
                    data: { role }
                });
            }

        } else {
            // Employee can update personal info fields
            updateData = {
                phone,
                address,
                profilePicture,
                about,
                interests,
                skills
            };
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedEmployee = await prisma.employee.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                user: {
                    select: { id: true, email: true, role: true }
                }
            }
        });

        res.json({
            message: 'Employee updated successfully',
            employee: updatedEmployee
        });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Delete user (cascade will delete employee)
        await prisma.user.delete({
            where: { id: employee.userId }
        });

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// @route   GET /api/employees/:id/profile
// @desc    Get employee full profile with leave allocation
router.get('/:id/profile', authenticate, isAdminOrSelf, async (req, res) => {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: { id: true, email: true, role: true, createdAt: true }
                },
                leaveAllocation: true,
                payroll: {
                    orderBy: { year: 'desc' },
                    take: 12
                }
            }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ employee });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
