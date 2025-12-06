import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Header from '@/models/Header';
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
    
    const header = await Header.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: header,
    });
  } catch (error) {
    console.error('Error updating header data:', error);
    return NextResponse.json(
      { error: 'Failed to update header data', details: error.message },
      { status: 500 }
    );
  }
}
