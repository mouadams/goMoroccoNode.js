const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Adjust the path as necessary
const dotenv = require('dotenv');
dotenv.config();

// @desc    Auth user 
// @route   POST /api/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
   const { email, password } = req.body;

  // Check if email and password were sent
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  // Look for user in database
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = results[0];

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Successful login (token can be added here)
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });
});



// @desc    Register new user 
// @route   POST /api/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate input
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields (name, email, password, role) are required' });
  }

  // Validate role
  const allowedRoles = ['viewer', 'editor', 'admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role value' });
  }

  // Check if user already exists
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });

    if (results.length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with role
    const sql = `
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [name, email, hashedPassword, role], (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });

      res.status(201).json({
        message: 'User registered successfully',
        userId: result.insertId
      });
    });
  });
});


module.exports = {
  authUser,
  registerUser
};
