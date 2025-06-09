const fs = require('fs');
const path = require('path');
const db = require('../config/db'); // Your MySQL connection

// Validation rules
const validateStadeUpdate = (data, stadeId) => {
  const errors = {};
  let isValid = true;

  if (data.nom !== undefined) {
    if (typeof data.nom !== 'string' || data.nom.length > 255) {
      errors.nom = 'Nom must be a string with max 255 characters';
      isValid = false;
    } else {
      // Check uniqueness (async operation)
      return new Promise((resolve) => {
        db.query(
          'SELECT id FROM stades WHERE nom = ? AND id != ?',
          [data.nom, stadeId],
          (err, results) => {
            if (err) {
              errors.nom = 'Error checking name uniqueness';
              isValid = false;
            } else if (results.length > 0) {
              errors.nom = 'This name is already taken';
              isValid = false;
            }
            resolve({ isValid, errors });
          }
        );
      });
    }
  }

  if (data.ville !== undefined && (typeof data.ville !== 'string' || data.ville.length > 255)) {
    errors.ville = 'Ville must be a string with max 255 characters';
    isValid = false;
  }

  if (data.capacite !== undefined && (!Number.isInteger(Number(data.capacite)) || Number(data.capacite) < 1)) {
    errors.capacite = 'Capacite must be an integer greater than 0';
    isValid = false;
  }

  if (data.latitude !== undefined && (isNaN(Number(data.latitude)) || Number(data.latitude) < -90 || Number(data.latitude) > 90)) {
    errors.latitude = 'Latitude must be between -90 and 90';
    isValid = false;
  }

  if (data.longitude !== undefined && (isNaN(Number(data.longitude)) || Number(data.longitude) < -180 || Number(data.longitude) > 180)) {
    errors.longitude = 'Longitude must be between -180 and 180';
    isValid = false;
  }

  if (data.annee_construction !== undefined && (
    !Number.isInteger(Number(data.annee_construction)) || 
    Number(data.annee_construction) < 1800 || 
    Number(data.annee_construction) > (new Date().getFullYear() + 1)
  )) {
    errors.annee_construction = `Year must be between 1800 and ${new Date().getFullYear() + 1}`;
    isValid = false;
  }

  return Promise.resolve({ isValid, errors });
};

// Get all stades
exports.getAllStades = async (req, res) => {
  try {
    console.log('Fetching all stades...');
    
    const stades = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM stades', (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    console.log(`Found ${stades.length} stades`);
    res.json({
      success: true,
      count: stades.length,
      data: stades
    });
    
  } catch (err) {
    console.error('Error fetching stades:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stades',
      error: err.message
    });
  }
};

// Get single stade by ID
exports.getStade = async (req, res) => {
  try {
    console.log(`Fetching stade with ID: ${req.params.id}`);
    
    const stade = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM stades WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    });

    if (!stade) {
      console.log(`Stade not found with ID: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Stade not found'
      });
    }

    console.log('Stade found:', { id: stade.id, nom: stade.nom });
    res.json({
      success: true,
      data: stade
    });
    
  } catch (err) {
    console.error(`Error fetching stade ID ${req.params.id}:`, err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stade',
      error: err.message
    });
  }
};

// Update stade controller (without multer - handled in router)
exports.updateStade = async (req, res) => {
  const debugInfo = {
    hadImageFile: false,
    oldImage: null,
    newImage: null,
    requestData: { ...req.body },
    fileInfo: null
  };

  try {
    // Log request info
    console.log('Stade Update Request Received:', {
      stade_id: req.params.id,
      method: req.method,
      contentType: req.headers['content-type'],
      hasFile: !!req.file,
      files: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null,
      body: req.body
    });

    // First get the current stade
    const stade = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM stades WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    });

    if (!stade) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error deleting uploaded file:', e);
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Stade not found'
      });
    }

    debugInfo.oldImage = stade.image;

    // Prepare update data - convert string numbers to actual numbers
    const updateData = { ...req.body };
    
    // Convert numeric fields from strings to numbers
    if (updateData.capacite !== undefined) {
      updateData.capacite = Number(updateData.capacite);
    }
    if (updateData.latitude !== undefined) {
      updateData.latitude = Number(updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      updateData.longitude = Number(updateData.longitude);
    }
    if (updateData.annee_construction !== undefined) {
      updateData.annee_construction = Number(updateData.annee_construction);
    }
    
    // Validate data
    const validation = await validateStadeUpdate(updateData, req.params.id);
    if (!validation.isValid) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error deleting uploaded file:', e);
        }
      }
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Handle image upload
    if (req.file) {
      debugInfo.hadImageFile = true;
      debugInfo.fileInfo = {
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };

      // Delete old image if it exists
      if (stade.image) {
        const oldImagePath = path.join(__dirname, '../public', stade.image);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
            console.log('Old image deleted successfully:', oldImagePath);
          } catch (unlinkErr) {
            console.error('Error deleting old image:', unlinkErr);
          }
        }
      }

      // Set new image path
      updateData.image = `/uploads/stades/${req.file.filename}`;
      debugInfo.newImage = updateData.image;
    } else if (req.body.removeImage === 'true' || req.body.image === null || req.body.image === '') {
      // Handle explicit image removal
      if (stade.image) {
        const oldImagePath = path.join(__dirname, '../public', stade.image);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
            console.log('Image removed successfully:', oldImagePath);
          } catch (unlinkErr) {
            console.error('Error deleting old image:', unlinkErr);
          }
        }
      }
      updateData.image = null;
    }

    // Remove undefined values and empty strings from updateData
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    console.log('Final data to update:', updateData);

    // Only perform update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const result = await new Promise((resolve, reject) => {
        db.query('UPDATE stades SET ? WHERE id = ?', [updateData, req.params.id], (err, result) => {
          if (err) {
            console.error('Database update error:', err);
            // Clean up uploaded file if DB error occurs
            if (req.file) {
              try {
                fs.unlinkSync(req.file.path);
              } catch (e) {
                console.error('Error cleaning up file after DB error:', e);
              }
            }
            return reject(err);
          }
          resolve(result);
        });
      });

      console.log('Update result:', result);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'No stade was updated - stade not found or no changes detected'
        });
      }
    } else {
      console.log('No fields to update');
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    // Get the updated stade
    const updatedStade = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM stades WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });

    const imageChanged = (debugInfo.oldImage !== updatedStade.image);
    console.log('Image field update status:', {
      oldImagePath: debugInfo.oldImage,
      newImagePath: updatedStade.image,
      imageChanged: imageChanged
    });

    // Return success response
    res.json({
      success: true,
      data: updatedStade,
      message: 'Stade updated successfully',
      debug: {
        hadImageFile: debugInfo.hadImageFile,
        oldImagePath: debugInfo.oldImage,
        newImagePath: updatedStade.image,
        fieldsUpdated: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error updating stade:', error);
    
    // Clean up uploaded file if error occurred
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error cleaning up uploaded file:', unlinkErr);
      }
    }

    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while updating the stade.',
      error: error.message,
      debug: debugInfo
    });
  }
};