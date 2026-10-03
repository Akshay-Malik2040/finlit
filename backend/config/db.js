const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri === 'PASTE_YOUR_ATLAS_URI_HERE') {
    console.error('❌ MONGO_URI is not set in your .env file. Please add your MongoDB Atlas URI.');
    process.exit(1);
  }

  const isAtlas = uri.includes('mongodb+srv');
  console.log(`🔗 Connecting to ${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'}...`);

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (!isAtlas) {
      // Only fall back to in-memory if using a local URI
      console.log(`⚠️ Local MongoDB not active (${error.message}).`);
      console.log('🚀 Starting Automated In-Memory Database Fallback...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        const conn = await mongoose.connect(mongoUri);
        console.log(`✅ In-Memory Database Active & Connected: ${conn.connection.host}`);
      } catch (memErr) {
        console.error(`❌ Failed to start In-Memory DB: ${memErr.message}`);
        process.exit(1);
      }
    } else {
      console.error(`❌ Atlas connection failed: ${error.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;