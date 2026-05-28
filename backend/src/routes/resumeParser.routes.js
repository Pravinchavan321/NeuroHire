const router = require('express').Router();
const multer = require('multer');
const axios = require('axios');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are supported for preview parsing'), false);
  }
});

const uploadMiddleware = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'Resume file must be 5MB or smaller' });
    }
    if (err) return res.status(415).json({ success: false, error: err.message });
    next();
  });
};

router.post('/parse', auth, tenantGuard, uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Resume file is required' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

    const aiRes = await axios.post(
      `${process.env.AI_SERVICE_URL}/parse-resume`,
      formData,
      { headers: formData.getHeaders ? formData.getHeaders() : {} }
    );

    res.json({ success: true, data: aiRes.data });
  } catch (error) {
    console.error('Resume parse proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.detail || 'Resume parsing failed'
    });
  }
});

module.exports = router;
