const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create subdirectories based on file type
        let subDir = 'general';
        if (file.fieldname === 'logo') {
            subDir = 'logos';
        } else if (file.fieldname === 'profilePicture' || file.fieldname === 'avatar') {
            subDir = 'avatars';
        } else if (file.fieldname === 'document') {
            subDir = 'documents';
        }

        const uploadPath = path.join(uploadsDir, subDir);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${uniqueSuffix}-${baseName}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allow images
    const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
    const isImage = imageTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeImage = imageTypes.test(file.mimetype.split('/')[1]);

    // Allow documents
    const docTypes = /pdf|doc|docx|xls|xlsx/;
    const isDoc = docTypes.test(path.extname(file.originalname).toLowerCase());

    if (isImage || isMimeImage || isDoc) {
        cb(null, true);
    } else {
        cb(new Error('Only images and documents are allowed!'), false);
    }
};

// Create multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

module.exports = { upload, uploadsDir };
