
const dns = require('node:dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const caseRoutes = require('./routes/caseRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ai-mystery-room-eight-hazel.vercel.app',
    'https://ai-mystery-room-9qoa6b19j-vamsi-d5d5.vercel.app'
  ]
}));

app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.send('AI Mystery Room Backend is Running!');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is working successfully!'
  });
});

// Mystery routes
app.use('/api/cases', caseRoutes);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
