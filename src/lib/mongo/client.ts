import { MongoClient } from 'mongodb';
import { env } from '@/config/env';

let clientPromise: Promise<MongoClient> | null = null;
let globalAny = (global as any) || globalThis;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to avoid creating multiple clients
    if (!globalAny._mongoClientPromise) {
        if (!env.data || !env.data.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined in env.data');
            }
        const client = new MongoClient(env.data.DATABASE_URL, {});
        globalAny._mongoClientPromise = client.connect();
        }
    clientPromise = globalAny._mongoClientPromise;
} else {
    // In production mode, create a new client for each connection
    if (!env.data || !env.data.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined in env.data');
        }
    const client = new MongoClient(env.data.DATABASE_URL, {});
    clientPromise = client.connect();
}

export default clientPromise;