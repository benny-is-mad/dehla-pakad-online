const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    // If no real URI is set, use in-memory MongoDB for local dev
    const isPlaceholder = !uri || uri.includes('YOUR_MONGODB') || uri.includes('<');
    if (isPlaceholder) {
      console.log('⚠️  No MONGO_URI found — starting in-memory MongoDB for local dev...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log('✅ In-memory MongoDB ready (data resets on server restart)');
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
