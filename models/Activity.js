const db = require('../config/db');
const path = require('path');
const fs = require('fs');

class Activity {
  constructor({
    id,
    name,
    description,
    image,
    stade_id,
    category,
    price,
    address,
    rating,
    created_at,
    updated_at,
    stade_nom,
    stade_ville
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.image = image;
    this.stade_id = stade_id;
    this.category = category;
    this.price = price;
    this.address = address;
    this.rating = rating;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.stade = stade_nom ? {
      nom: stade_nom,
      ville: stade_ville
    } : null;
  }

  static async findAll() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT activities.*, 
               stades.nom as stade_nom, 
               stades.ville as stade_ville 
        FROM activities
        LEFT JOIN stades ON activities.stade_id = stades.id
      `;
      db.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results.map(activity => new Activity(activity)));
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT activities.*, 
               stades.nom as stade_nom, 
               stades.ville as stade_ville 
        FROM activities
        LEFT JOIN stades ON activities.stade_id = stades.id
        WHERE activities.id = ?
      `;
      db.query(query, [id], (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return resolve(null);
        resolve(new Activity(results[0]));
      });
    });
  }

  static async create(activityData) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO activities SET ?';
      db.query(query, activityData, (err, result) => {
        if (err) return reject(err);
        resolve(new Activity({
          id: result.insertId,
          ...activityData
        }));
      });
    });
  }

  static async update(id, activityData) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE activities SET ? WHERE id = ?';
      db.query(query, [activityData, id], async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        const updatedActivity = await Activity.findById(id);
        resolve(updatedActivity);
      });
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      // First get the activity to return it and to check for image deletion
      Activity.findById(id)
        .then(activity => {
          if (!activity) return resolve(null);

          const query = 'DELETE FROM activities WHERE id = ?';
          db.query(query, [id], (err, result) => {
            if (err) return reject(err);
            
            // Delete associated image file if it exists
            if (activity.image) {
              const imagePath = path.join(__dirname, '../public', activity.image);
              if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, err => {
                  if (err) console.error('Error deleting image file:', err);
                });
              }
            }
            
            resolve(activity);
          });
        })
        .catch(reject);
    });
  }

  static async getImagePath(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT image FROM activities WHERE id = ?';
      db.query(query, [id], (err, results) => {
        if (err) return reject(err);
        if (results.length === 0) return resolve(null);
        resolve(results[0].image);
      });
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      image: this.image,
      stade_id: this.stade_id,
      category: this.category,
      price: this.price,
      address: this.address,
      rating: this.rating,
      created_at: this.created_at,
      updated_at: this.updated_at,
      stade: this.stade
    };
  }
}

module.exports = Activity;