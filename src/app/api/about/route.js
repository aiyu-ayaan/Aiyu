import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import About from '@/models/About';

export async function GET() {
  try {
    await dbConnect();
    const about = await About.findOne().sort({ createdAt: -1 });
    
    if (!about) {
      return NextResponse.json(
        { error: 'About data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(about);
  } catch (error) {
    console.error('Error fetching about data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch about data' },
      { status: 500 }
    );
  }
}
