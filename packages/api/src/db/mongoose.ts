import mongoose from 'mongoose';
import { env } from '../config/env';

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('✅  MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌  MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️   MongoDB disconnected. Attempting reconnect...');
    isConnected = false;
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 5,
  });

  isConnected = true;
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('🔌  MongoDB disconnected gracefully');
}

export const connectDatabase = connectMongoDB;
export { mongoose };
