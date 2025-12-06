import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Site from '@/models/Site';
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
    
    const site = await Site.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: site,
    });
  } catch (error) {
    console.error('Error updating site data:', error);
    return NextResponse.json(
      { error: 'Failed to update site data', details: error.message },
      { status: 500 }
    );
  }
}
