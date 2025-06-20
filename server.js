// index.js
const express = require('express');
const app = express();
const cors = require('cors');
const userRoutes = require('./routes/userRoutes'); 
const activityRoutes = require('./routes/activityRoutes'); 
const StadeRoutes = require('./routes/stadeRoutes'); 
const path = require('path');


app.use('/storage', express.static(path.join(__dirname, 'public/uploads')));// Serve static files for stades

// Allow requests from localhost:8080 (your frontend)
app.use(cors({
  //origin 8081 or 8080
  origin: ['http://localhost:8081', 'http://localhost:8080'], // or '*' to allow all
  credentials: true
}));
app.use('/public', express.static('public')); // Serve static files from the 'public' directory

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to Node Auth Project');
});


app.use("/api", userRoutes);
app.use('/activities', activityRoutes);
app.use('/stades', StadeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});