const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { getAdminQuestions, bulkUploadQuestions } = require('../controllers/adminController');

// Multer: memory storage, 50MB limit, CSV only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// All admin routes require auth + admin role
router.use(auth, requireAdmin);

router.get('/questions', getAdminQuestions);
router.post('/questions/bulk', upload.single('file'), bulkUploadQuestions);

module.exports = router;
