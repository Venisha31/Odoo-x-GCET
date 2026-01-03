const express = require('express');
const { prisma, authenticate, isAdmin, isAdminOrSelf } = require('../middleware/auth');
const { generateSalarySlip } = require('../services/pdf.service');
const { sendPayslipEmail } = require('../services/email.service');

const router = express.Router();

// @route   GET /api/payroll/my
// @desc    Get current user's payroll
router.get('/my', authenticate, async (req, res) => {
    try {
        if (!req.user.employee) {
            return res.status(400).json({ error: 'Employee profile not found' });
        }

        const payroll = await prisma.payroll.findMany({
            where: { employeeId: req.user.employee.id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        res.json({ payroll });
    } catch (error) {
        console.error('Get my payroll error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll' });
    }
});

// @route   GET /api/payroll/all
// @desc    Get all payroll records (Admin only) - filtered by company
router.get('/all', authenticate, isAdmin, async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;

        let whereClause = {
            employee: {
                companyId: req.user.companyId
            }
        };
        if (month) whereClause.month = parseInt(month);
        if (year) whereClause.year = parseInt(year);
        if (employeeId) whereClause.employeeId = employeeId;

        const payroll = await prisma.payroll.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        department: true
                    }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        res.json({ payroll });
    } catch (error) {
        console.error('Get all payroll error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll' });
    }
});

// @route   GET /api/payroll/employee/:employeeId
// @desc    Get payroll for specific employee
router.get('/employee/:employeeId', authenticate, isAdminOrSelf, async (req, res) => {
    try {
        const payroll = await prisma.payroll.findMany({
            where: { employeeId: req.params.employeeId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        res.json({ payroll });
    } catch (error) {
        console.error('Get employee payroll error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll' });
    }
});

// @route   POST /api/payroll
// @desc    Create payroll record (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const {
            employeeId,
            month,
            year,
            basicWage,
            monthlyWage,
            yearlyWage,
            workingDays,
            hra,
            da,
            bonus,
            pf,
            esi,
            tax
        } = req.body;

        if (!employeeId || !month || !year) {
            return res.status(400).json({ error: 'Employee ID, month, and year are required' });
        }

        // Check if employee exists
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check for existing payroll
        const existing = await prisma.payroll.findUnique({
            where: {
                employeeId_month_year: {
                    employeeId,
                    month: parseInt(month),
                    year: parseInt(year)
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Payroll record already exists for this month' });
        }

        // Calculate net salary
        const basic = basicWage || 0;
        const monthly = monthlyWage || basic;
        const allowances = (hra || 0) + (da || 0) + (bonus || 0);
        const deductions = (pf || 0) + (esi || 0) + (tax || 0);
        const netSalary = monthly + allowances - deductions;

        const payroll = await prisma.payroll.create({
            data: {
                employeeId,
                month: parseInt(month),
                year: parseInt(year),
                basicWage: basic,
                monthlyWage: monthly,
                yearlyWage: yearlyWage || monthly * 12,
                workingDays: workingDays || 22,
                hra: hra || 0,
                da: da || 0,
                bonus: bonus || 0,
                pf: pf || 0,
                esi: esi || 0,
                tax: tax || 0,
                netSalary
            }
        });

        res.status(201).json({
            message: 'Payroll record created successfully',
            payroll
        });
    } catch (error) {
        console.error('Create payroll error:', error);
        res.status(500).json({ error: 'Failed to create payroll record' });
    }
});

// @route   PUT /api/payroll/:id
// @desc    Update payroll record (Admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const {
            basicWage,
            monthlyWage,
            yearlyWage,
            workingDays,
            hra,
            da,
            bonus,
            pf,
            esi,
            tax
        } = req.body;

        const existing = await prisma.payroll.findUnique({
            where: { id: req.params.id }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Payroll record not found' });
        }

        // Build update data
        const updateData = {};
        if (basicWage !== undefined) updateData.basicWage = basicWage;
        if (monthlyWage !== undefined) updateData.monthlyWage = monthlyWage;
        if (yearlyWage !== undefined) updateData.yearlyWage = yearlyWage;
        if (workingDays !== undefined) updateData.workingDays = workingDays;
        if (hra !== undefined) updateData.hra = hra;
        if (da !== undefined) updateData.da = da;
        if (bonus !== undefined) updateData.bonus = bonus;
        if (pf !== undefined) updateData.pf = pf;
        if (esi !== undefined) updateData.esi = esi;
        if (tax !== undefined) updateData.tax = tax;

        // Recalculate net salary
        const monthly = monthlyWage ?? existing.monthlyWage;
        const allowances = (hra ?? existing.hra) + (da ?? existing.da) + (bonus ?? existing.bonus);
        const deductions = (pf ?? existing.pf) + (esi ?? existing.esi) + (tax ?? existing.tax);
        updateData.netSalary = monthly + allowances - deductions;

        const payroll = await prisma.payroll.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({
            message: 'Payroll record updated successfully',
            payroll
        });
    } catch (error) {
        console.error('Update payroll error:', error);
        res.status(500).json({ error: 'Failed to update payroll record' });
    }
});

// @route   DELETE /api/payroll/:id
// @desc    Delete payroll record (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        await prisma.payroll.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'Payroll record deleted successfully' });
    } catch (error) {
        console.error('Delete payroll error:', error);
        res.status(500).json({ error: 'Failed to delete payroll record' });
    }
});

// @route   POST /api/payroll/bulk
// @desc    Create bulk payroll for all employees (Admin only)
router.post('/bulk', authenticate, isAdmin, async (req, res) => {
    try {
        const { month, year, defaultMonthlyWage } = req.body;

        if (!month || !year || !defaultMonthlyWage) {
            return res.status(400).json({ error: 'Month, year, and default monthly wage are required' });
        }

        const employees = await prisma.employee.findMany({ where: { companyId: req.user.companyId } });
        const created = [];
        const skipped = [];

        for (const employee of employees) {
            // Check if payroll exists
            const exists = await prisma.payroll.findUnique({
                where: {
                    employeeId_month_year: {
                        employeeId: employee.id,
                        month: parseInt(month),
                        year: parseInt(year)
                    }
                }
            });

            if (exists) {
                skipped.push(employee.id);
                continue;
            }

            const payroll = await prisma.payroll.create({
                data: {
                    employeeId: employee.id,
                    month: parseInt(month),
                    year: parseInt(year),
                    basicWage: defaultMonthlyWage * 0.5,
                    monthlyWage: defaultMonthlyWage,
                    yearlyWage: defaultMonthlyWage * 12,
                    workingDays: 22,
                    netSalary: defaultMonthlyWage
                }
            });

            created.push(payroll);
        }

        res.status(201).json({
            message: `Created ${created.length} payroll records, skipped ${skipped.length} existing`,
            created: created.length,
            skipped: skipped.length
        });
    } catch (error) {
        console.error('Bulk payroll error:', error);
        res.status(500).json({ error: 'Failed to create bulk payroll' });
    }
});

// @route   GET /api/payroll/:id/slip
// @desc    Download salary slip PDF
router.get('/:id/slip', authenticate, async (req, res) => {
    try {
        const payroll = await prisma.payroll.findUnique({
            where: { id: req.params.id },
            include: {
                employee: true
            }
        });

        if (!payroll) {
            return res.status(404).json({ error: 'Payroll record not found' });
        }

        // Check access: admin or self
        if (req.user.role !== 'ADMIN' && req.user.employee?.id !== payroll.employeeId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get company info
        const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });

        // Generate PDF
        const pdfBuffer = await generateSalarySlip(payroll, payroll.employee, company);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Salary_Slip_${payroll.month}_${payroll.year}_${payroll.employee.employeeId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Generate slip error:', error);
        res.status(500).json({ error: 'Failed to generate salary slip' });
    }
});

// @route   POST /api/payroll/:id/email
// @desc    Email salary slip to employee (Admin only)
router.post('/:id/email', authenticate, isAdmin, async (req, res) => {
    try {
        const payroll = await prisma.payroll.findUnique({
            where: { id: req.params.id },
            include: {
                employee: true
            }
        });

        if (!payroll) {
            return res.status(404).json({ error: 'Payroll record not found' });
        }

        const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
        const pdfBuffer = await generateSalarySlip(payroll, payroll.employee, company);

        const result = await sendPayslipEmail(payroll.employee, payroll, pdfBuffer);

        if (result.success) {
            res.json({ message: 'Salary slip emailed successfully' });
        } else {
            res.status(400).json({ error: result.reason || 'Failed to email salary slip' });
        }
    } catch (error) {
        console.error('Email slip error:', error);
        res.status(500).json({ error: 'Failed to email salary slip' });
    }
});

module.exports = router;
