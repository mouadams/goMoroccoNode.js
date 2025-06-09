const Activity = require('../models/Activity');
//const Stade = require('../models/Stade');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/activities');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2048 * 2048 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|svg/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Only images are allowed (jpeg, png, jpg, gif, svg)'));
    }
}).single('image');

// Controller methods
exports.getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.findAll();
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

exports.createActivity = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const { name, description, stade_id, category, price, address, rating } = req.body;
      
      // Basic validation
      if (!name || !stade_id || !category || !price || !address) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const activityData = {
        name,
        description: description || null,
        stade_id,
        category,
        price,
        address,
        rating: rating || null,
        image: req.file ? `/uploads/activities/${req.file.filename}` : null
      };

      const newActivity = await Activity.create(activityData);
      res.status(201).json(newActivity);
    } catch (err) {
      console.error(err);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to create activity' });
    }
  });
};

// Update activity
exports.updateActivity = async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }
  
      try {
        // First get the current activity using the correct method name
        const currentActivity = await Activity.findById(req.params.id);
        
        if (!currentActivity) {
          // Clean up uploaded file if activity doesn't exist
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(404).json({ 
            success: false, 
            message: 'Activity not found' 
          });
        }
        
        const { name, description, stade_id, category, price, address, rating } = req.body;
        
        // Check if stade exists if stade_id is being updated
        if (stade_id) {
          const stadeExists = await new Promise((resolve, reject) => {
            db.query('SELECT id FROM stades WHERE id = ?', [stade_id], (err, results) => {
              if (err) return reject(err);
              resolve(results.length > 0);
            });
          });
          
          if (!stadeExists) {
            // Clean up uploaded file if stade doesn't exist
            if (req.file) {
              fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
              success: false, 
              message: 'Stade does not exist' 
            });
          }
        }
        
        // Prepare update data - only include fields that are being updated
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (stade_id !== undefined) updateData.stade_id = parseInt(stade_id);
        if (category !== undefined) updateData.category = category;
        if (price !== undefined) {
          const parsedPrice = parseFloat(price);
          updateData.price = isNaN(parsedPrice) ? null : parsedPrice;
        }
        if (address !== undefined) updateData.address = address;
        if (rating !== undefined) {
          if (rating === null || rating === '') {
            updateData.rating = null;
          } else {
            const parsedRating = parseFloat(rating);
            updateData.rating = isNaN(parsedRating) ? null : parsedRating;
          }
        }
        
        // Handle image update
        if (req.file) {
          // Delete old image if it exists
          if (currentActivity.image) {
            const oldImagePath = path.join(__dirname, '../public', currentActivity.image);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          }
          updateData.image = `/uploads/activities/${req.file.filename}`;
        } else if (req.body.image === null || req.body.image === '') {
          // Handle explicit image removal
          if (currentActivity.image) {
            const oldImagePath = path.join(__dirname, '../public', currentActivity.image);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          }
          updateData.image = null;
        }
        
        // Add updated_at timestamp
        updateData.updated_at = new Date();
        
        // Perform the update using the correct method
        const updatedActivity = await Activity.update(req.params.id, updateData);
        
        if (!updatedActivity) {
          // Clean up uploaded file if update failed
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(500).json({
            success: false,
            message: 'Failed to update activity'
          });
        }
        
        res.json({
          success: true,
          data: updatedActivity,
          message: 'Activity updated successfully'
        });
        
      } catch (err) {
        console.error('Error updating activity:', err);
        
        // Clean up uploaded file if there was an error
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
          success: false, 
          message: 'Failed to update activity',
          error: err.message 
        });
      }
    });
  };
  
  // Delete activity
  exports.deleteActivity = async (req, res) => {
    try {
      const activityId = req.params.id;
      
      // Validate that ID is provided and is a number
      if (!activityId || isNaN(activityId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid activity ID'
        });
      }
      
      // First get the activity to check if it exists and get image info
      const activity = await Activity.findById(activityId);
      
      if (!activity) {
        return res.status(404).json({ 
          success: false, 
          message: 'Activity not found' 
        });
      }
      
      // Delete the activity record using the Activity model's delete method
      const deletedActivity = await Activity.delete(activityId);
      
      if (!deletedActivity) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to delete activity from database' 
        });
      }
      
      res.json({
        success: true,
        data: deletedActivity,
        message: 'Activity deleted successfully'
      });
      
    } catch (err) {
      console.error('Error deleting activity:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete activity',
        error: err.message 
      });
    }
  };