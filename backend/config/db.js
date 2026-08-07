const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finlit_v2';
    const conn = await mongoose.connect(mongoURI, {
      family: 4,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('💡 Note: Please ensure MongoDB service is running locally or specify a valid MONGO_URI in backend/.env file.');
  }
};

module.exports = connectDB;