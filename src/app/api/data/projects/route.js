import { NextResponse } from 'next/server';
import { readDataFile, writeDataFile } from '@/lib/dataManager';
import { withAuth } from '@/lib/auth';

// GET - Public endpoint to fetch projects data
export async function GET() {
  try {
    const data = readDataFile('projectsData.json');
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// PUT - Protected endpoint to update projects data
export const PUT = withAuth(async (request) => {
  try {
    const data = await request.json();
    writeDataFile('projectsData.json', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update data' },
      { status: 500 }
    );
  }
});
