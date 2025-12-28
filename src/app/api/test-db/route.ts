import { NextResponse } from 'next/server';
import { connect } from '@/infrastructure/database';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Test MongoDB connection
    await connect();
    
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const dbName = mongoose.connection.db?.databaseName || 'unknown';
    const host = mongoose.connection.host || 'unknown';
    const port = mongoose.connection.port || 'unknown';

    // Try a simple query to verify connection works
    const collections = await mongoose.connection.db?.listCollections().toArray() || [];

    return NextResponse.json({
      success: true,
      connection: {
        status: states[connectionState as keyof typeof states] || 'unknown',
        state: connectionState,
        database: dbName,
        host: `${host}:${port}`,
        collections: collections.map((c: any) => c.name),
        collectionCount: collections.length,
      },
      message: connectionState === 1 
        ? 'MongoDB connected successfully' 
        : `MongoDB connection state: ${states[connectionState as keyof typeof states]}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        message: 'Failed to connect to MongoDB',
      },
      { status: 500 }
    );
  }
}

