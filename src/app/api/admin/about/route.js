import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import About from '@/models/About';
import { authenticateRequest } from '@/middleware/auth';

export async function PUT(request) {
  const auth = authenticateRequest(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await dbConnect();
    const data = await request.json();
    
    // Update or create the about document
    const about = await About.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: about,
    });
  } catch (error) {
    console.error('Error updating about data:', error);
    return NextResponse.json(
      { error: 'Failed to update about data', details: error.message },
      { status: 500 }
    );
  }
}
