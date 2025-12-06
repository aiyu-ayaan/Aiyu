import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Site from '@/models/Site';

export async function GET() {
  try {
    await dbConnect();
    const site = await Site.findOne().sort({ createdAt: -1 });
    
    if (!site) {
      return NextResponse.json(
        { error: 'Site data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(site);
  } catch (error) {
    console.error('Error fetching site data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site data' },
      { status: 500 }
    );
  }
}
