const express = require('express');
const router = express.Router();
const stadeController = require('../controllers/StadeController');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/stades');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 4 * 1024 * 1024 // 4MB limit (was incorrectly calculated before)
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, png, jpg, gif, webp)'));
    }
  }
}).single('image'); // Single file upload with field name 'image'

// GET all stades
router.get('/', stadeController.getAllStades);

// GET single stade by ID
router.get('/:id', stadeController.getStade);

// UPDATE route with proper error handling
router.put('/:id', (req, res) => {
  console.log('PUT request received for stade ID:', req.params.id);
  console.log('Content-Type:', req.headers['content-type']);
  
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large. Maximum size is 4MB.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message,
        error: err.message
      });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Log what we received after multer processing
    console.log('After multer processing:', {
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body),
      body: req.body
    });
    
    // Continue with the update logic
    stadeController.updateStade(req, res);
  });
});

module.exports = router;