const mongoose = require('mongoose');

const connectDB = async () => {
  const defaultURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finlit_v2';
  try {
    const conn = await mongoose.connect(defaultURI, {
      family: 4,
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`⚠️ Local MongoDB service not active (${error.message}).`);
    console.log('🚀 Starting Automated In-Memory Database Fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ In-Memory Database Active & Connected: ${conn.connection.host}`);
    } catch (memErr) {
      console.error(`❌ Failed to start In-Memory DB: ${memErr.message}`);
    }
  }
};

module.exports = connectDB;