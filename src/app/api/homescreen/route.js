import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HomeScreen from '@/models/HomeScreen';

export async function GET() {
  try {
    await dbConnect();
    const homeScreen = await HomeScreen.findOne().sort({ createdAt: -1 });
    
    if (!homeScreen) {
      return NextResponse.json(
        { error: 'HomeScreen data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(homeScreen);
  } catch (error) {
    console.error('Error fetching homescreen data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homescreen data' },
      { status: 500 }
    );
  }
}
