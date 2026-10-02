const dns = require('dns');
const mongoose = require('mongoose');
require('dotenv').config()

dotenv.config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MONGODB_USERNAME, MONGODB_PASSWORD } = process.env;

if (!MONGODB_USERNAME || !MONGODB_PASSWORD) {
  throw new Error(
    'MONGODB_USERNAME / MONGODB_PASSWORD not set. Add them to your .env file.'
  );
}

const uri = process.env.MONGODB;
const DB_NAME = 'solargenaration';

let isConnected = false;

/**
 * Opens the MongoDB connection via Mongoose (call once, at server startup).
 * Uses Mongoose — not the native MongoClient — because every model in
 * models/ (Province, District, SolarInstallation, ...) is a Mongoose schema
 * and calls methods like Province.find() that only work through Mongoose's
 * own connection.
 */
export async function connectDB() {
  if (isConnected) return mongoose.connection;

  await mongoose.connect(uri, { dbName: DB_NAME });

  isConnected = true;
  console.log(`✅ Connected to MongoDB (${DB_NAME})`);
  return mongoose.connection;
}


export function assertConnected() {
  if (!isConnected) {
    throw new Error('Database not initialized. Call connectDB() before handling requests.');
  }
} 