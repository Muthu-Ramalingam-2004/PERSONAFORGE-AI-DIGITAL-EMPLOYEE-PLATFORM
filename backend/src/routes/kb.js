const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const kbController = require('../controllers/kbController');
const authMiddleware = require('../middleware/authMiddleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (restrict to PDF, TXT, DOCX)
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.txt', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, TXT, and DOCX are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get documents list for an AI Employee
router.get('/employee/:employeeId', authMiddleware, kbController.getEmployeeDocuments);

// Search Knowledge Base (RAG)
router.get('/search', authMiddleware, kbController.searchKnowledgeBase);

// Upload a document
router.post('/upload', authMiddleware, upload.single('file'), kbController.uploadDocument);

// Delete a document
router.delete('/:id', authMiddleware, kbController.deleteDocument);

module.exports = router;
