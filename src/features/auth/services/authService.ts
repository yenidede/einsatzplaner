import {hash, compare} from 'bcryptjs';
import clientPromise from '@/lib/mongo/client';
import { CreateUserData, LoginData, User, UserWithoutPassword, USERS_COLLECTION, userHelpers} from '@/lib/mongo/models/User';

export class AuthService {
  static async createUser(data: CreateUserData): Promise<UserWithoutPassword> {
    const client = await clientPromise;
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    if (!client) {
      throw new Error('Database connection failed');
    }
    const db = client.db();
    
    // Hash the password
    const hashedPassword = await hash(data.password, 10);
    
    // Create user
    const user: User = {
      ...data,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    
    };
    
    const result = await db.collection(USERS_COLLECTION).insertOne(user);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create user');
    }
    
    return userHelpers.sanitizeUser(user);
  }

  static async login(data: LoginData): Promise<UserWithoutPassword | null> {
    const client = await clientPromise;
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    if (!client) {
      throw new Error('Database connection failed');
    }
    const db = client.db();
    
    // Find user by email
    const userDoc = await db.collection(USERS_COLLECTION).findOne({ email: data.email });
    
    if (!userDoc) {
      return null; // User not found
    }
    
    const user = userDoc as User;
    
    // Compare passwords
    const isValidPassword = await compare(data.password, user.password);
    
    if (!isValidPassword) {
      return null; // Invalid password
    }
    
    return userHelpers.sanitizeUser(user);
  }
}