const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Verify JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { employee: true, company: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

// Check if user is Admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

// Check if user is Employee
const isEmployee = (req, res, next) => {
    if (req.user.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: 'Access denied. Employee only.' });
    }
    next();
};

// Check if user is Admin or the employee themselves
const isAdminOrSelf = (req, res, next) => {
    const employeeId = req.params.employeeId || req.params.id;

    if (req.user.role === 'ADMIN') {
        return next();
    }

    if (req.user.employee && req.user.employee.id === employeeId) {
        return next();
    }

    return res.status(403).json({ error: 'Access denied.' });
};

module.exports = {
    authenticate,
    isAdmin,
    isEmployee,
    isAdminOrSelf,
    prisma
};
