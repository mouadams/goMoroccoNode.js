const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Stade = sequelize.define('Stade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ville: {
    type: DataTypes.STRING,
    allowNull: false
  },
  capacite: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  annee_construction: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'stades',
  timestamps: false // Disable createdAt and updatedAt
});

module.exports = Stade;