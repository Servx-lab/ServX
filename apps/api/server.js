const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 5000;

const app = createApp();

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
});
