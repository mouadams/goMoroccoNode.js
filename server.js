// index.js
const express = require('express');
const app = express();
const cors = require('cors');
const userRoutes = require('./routes/userRoutes'); // Ensure this path is correct

// Allow requests from localhost:8080 (your frontend)
app.use(cors({
  origin: 'http://localhost:8080', // or '*' to allow all
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to Node Auth Project');
});


app.use("/api", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});