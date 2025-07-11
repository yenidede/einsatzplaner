import { MongoClient } from 'mongodb';
import { env } from '@/config/environment';

let clientPromise: Promise<MongoClient> | null = null;
let  globalCache = (global as any) || globalThis;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to avoid creating multiple clients
    if (!globalCache._mongoClientPromise) {
        const client = new MongoClient(env.database.url, { });
        globalCache._mongoClientPromise = client.connect();
        }
    clientPromise = globalCache._mongoClientPromise;
} else {
    // In production mode, create a new client for each connection
    const client = new MongoClient(env.database.url, {});
    clientPromise = client.connect();
}

export default clientPromise;