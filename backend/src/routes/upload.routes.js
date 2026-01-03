const express = require('express');
const path = require('path');
const fs = require('fs');
const { upload } = require('../middleware/upload');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/upload/logo
// @desc    Upload company logo
router.post('/logo', authenticate, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Return the URL path to access the file
        const fileUrl = `/uploads/logos/${req.file.filename}`;

        res.json({
            message: 'Logo uploaded successfully',
            url: fileUrl,
            filename: req.file.filename
        });

    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// @route   POST /api/upload/avatar
// @desc    Upload user profile picture
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/avatars/${req.file.filename}`;

        res.json({
            message: 'Avatar uploaded successfully',
            url: fileUrl,
            filename: req.file.filename
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// @route   POST /api/upload/document
// @desc    Upload document (PDF, DOC, etc.)
router.post('/document', authenticate, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/documents/${req.file.filename}`;

        res.json({
            message: 'Document uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });

    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// @route   POST /api/upload/image
// @desc    General image upload
router.post('/image', authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/general/${req.file.filename}`;

        res.json({
            message: 'Image uploaded successfully',
            url: fileUrl,
            filename: req.file.filename
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// @route   POST /api/upload/sick-certificate
// @desc    Upload sick leave certificate
router.post('/sick-certificate', authenticate, upload.single('sickCertificate'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/sick-certificates/${req.file.filename}`;

        res.json({
            message: 'Sick leave certificate uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });

    } catch (error) {
        console.error('Sick certificate upload error:', error);
        res.status(500).json({ error: 'Failed to upload sick certificate' });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof require('multer').MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Only images and documents are allowed!') {
        return res.status(400).json({ error: error.message });
    }
    next(error);
});

module.exports = router;
