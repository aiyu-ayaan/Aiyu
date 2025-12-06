import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HomeScreen from '@/models/HomeScreen';
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
    
    const homeScreen = await HomeScreen.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: homeScreen,
    });
  } catch (error) {
    console.error('Error updating homescreen data:', error);
    return NextResponse.json(
      { error: 'Failed to update homescreen data', details: error.message },
      { status: 500 }
    );
  }
}
