const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const userRoutes = require('./routes/users');

const app = express();

// CORS configuration
app.use(cors({ origin: config.CORS_ORIGIN }));

// JSON body parser with 10KB limit
app.use(express.json({ limit: '10kb' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/users', userRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');
    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
