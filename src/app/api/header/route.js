import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Header from '@/models/Header';

export async function GET() {
  try {
    await dbConnect();
    const header = await Header.findOne().sort({ createdAt: -1 });
    
    if (!header) {
      return NextResponse.json(
        { error: 'Header data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(header);
  } catch (error) {
    console.error('Error fetching header data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch header data' },
      { status: 500 }
    );
  }
}
