const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma, authenticate, isAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/email.service');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Generate random password
const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate Employee ID: [COMPANY_CODE][FIRST_LAST_INITIALS][YEAR][SERIAL]
// Example: OIJODO20220001
const generateEmployeeId = async (firstName, lastName, companyCode = 'OI') => {
    const year = new Date().getFullYear();
    const firstInitial = (firstName.charAt(0) || 'X').toUpperCase();
    const lastInitial = (lastName.charAt(0) || 'X').toUpperCase();
    const firstTwo = (firstName.substring(0, 2) || 'XX').toUpperCase();
    const lastTwo = (lastName.substring(0, 2) || 'XX').toUpperCase();

    // Logic: If user wants First 2 letters of First + Last Name (e.g. JODO for John Doe)
    const initials = `${firstTwo}${lastTwo}`;

    // Get or create company and increment serial
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: { name: 'Default Company', code: companyCode }
        });
    }

    const updatedCompany = await prisma.company.update({
        where: { id: company.id },
        data: { serialNo: { increment: 1 } }
    });

    const serial = String(updatedCompany.serialNo).padStart(4, '0');
    return `${company.code}${initials}${year}${serial}`;
};

// @route   POST /api/auth/register
// @desc    Register ADMIN/COMPANY
router.post('/register', async (req, res) => {
    try {
        console.log('Register Request:', req.body);
        const { companyName, name, email, password, phone } = req.body;

        // 1. Check for empty fields
        if (!companyName || !companyName.trim()) return res.status(400).json({ error: 'Company Name is required' });
        if (!name || !name.trim()) return res.status(400).json({ error: 'Full Name is required' });
        if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });
        if (!password || !password.trim()) return res.status(400).json({ error: 'Password is required' });

        // 2. Validate Password Strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // 3. Validate Email Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // 4. Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'This email is already registered. Please login.' });
        }

        // Split name
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || '';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Transaction: Create Company, User, Employee
        const result = await prisma.$transaction(async (tx) => {
            // Generate unique company code: 3 chars + 3 numbers (e.g., VED123)
            const cleanName = companyName.replace(/[^a-zA-Z]/g, '').toUpperCase();
            const baseCode = (cleanName.substring(0, 3) || 'COM').padEnd(3, 'X');
            const randomSuffix = Math.floor(100 + Math.random() * 900); // 100-999
            const uniqueCode = `${baseCode}${randomSuffix}`;

            const company = await tx.company.create({
                data: {
                    name: companyName,
                    code: uniqueCode
                }
            });

            // Generate ID: [Company][First][Last][Year][Serial]
            const year = new Date().getFullYear();
            const f2 = (firstName.substring(0, 2) || 'XX').toUpperCase();
            const l2 = (lastName.substring(0, 2) || 'XX').toUpperCase();
            // Use the unique company code in the Employee ID
            const employeeId = `${uniqueCode}${f2}${l2}${year}0001`;

            await tx.company.update({
                where: { id: company.id },
                data: { serialNo: 1 }
            });

            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    mustChangePass: false,
                    companyId: company.id,
                    employee: {
                        create: {
                            employeeId,
                            firstName,
                            lastName,
                            email,
                            phone,
                            companyId: company.id,
                            leaveAllocation: { create: { paidLeaves: 24, sickLeaves: 12 } }
                        }
                    }
                },
                include: { employee: true }
            });

            return { user, company };
        });

        const token = generateToken(result.user.id);
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: result.user
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user with validation
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide both email and password' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { employee: true, company: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user.id);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                mustChangePass: user.mustChangePass,
                employee: user.employee,
                company: user.company
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed due to server error' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User with this email does not exist' });

        // Generate token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Save token to DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetTokenExpiry
            }
        });

        // Send Email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;
        const message = `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset for Dayflow HRMS.</p>
            <p>Please click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
            <p>This link is valid for 1 hour.</p>
        `;

        try {
            const { sendEmail } = require('../services/email.service');
            await sendEmail(email, 'Password Reset Request - Dayflow', message);
            res.json({ message: 'Password reset link sent to your email' });
        } catch (emailError) {
            console.error('Email send failed:', emailError);
            res.status(500).json({ error: 'Failed to send email. configuring SMTP?' });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() } // Must not be expired
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ message: 'Password has been reset successfully. You can now login.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/auth/create-employee
// @desc    Admin creates employee (auto-generated ID & password)
router.post('/create-employee', authenticate, isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, department, position, role, basicSalary } = req.body;

        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'First name, last name, and email are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const company = await prisma.company.findFirst();
        if (!company) {
            return res.status(400).json({ error: 'No company found. Please register first.' });
        }

        const employeeId = await generateEmployeeId(firstName, lastName, company.code);
        const generatedPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(generatedPassword, 12);

        // Transaction to create User, Employee, and optional Payroll
        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: role || 'EMPLOYEE',
                    mustChangePass: true,
                    companyId: company.id,
                    employee: {
                        create: {
                            employeeId,
                            firstName,
                            lastName,
                            email,
                            phone,
                            department,
                            position,
                            companyId: company.id,
                            leaveAllocation: { create: { paidLeaves: 24, sickLeaves: 12 } }
                        }
                    }
                },
                include: { employee: true }
            });

            // If basic salary is provided, create initial payroll record for current month
            if (basicSalary) {
                const today = new Date();
                const salary = parseFloat(basicSalary);
                await tx.payroll.create({
                    data: {
                        employeeId: newUser.employee.id,
                        month: today.getMonth() + 1, // 1-indexed
                        year: today.getFullYear(),
                        basicWage: salary,
                        netSalary: salary, // Initial net = basic (no deductions yet)
                        workingDays: 22
                    }
                });
            }

            return newUser;
        });

        sendWelcomeEmail(user.employee, {
            loginId: employeeId,
            email,
            password: generatedPassword
        }).catch(err => console.error('Welcome email error:', err));

        res.status(201).json({
            message: 'Employee created successfully',
            employee: user.employee,
            credentials: { loginId: employeeId, email, password: generatedPassword }
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change password (first login or update)
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        if (!req.user.mustChangePass) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required' });
            }
            const isMatch = await bcrypt.compare(currentPassword, req.user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword, mustChangePass: false }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                employee: { include: { leaveAllocation: true } },
                company: true
            }
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                mustChangePass: user.mustChangePass,
                employee: user.employee,
                company: user.company
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

module.exports = router;
