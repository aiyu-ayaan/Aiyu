import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import ProjectsPage from '@/models/ProjectsPage';

export async function GET() {
  try {
    await dbConnect();
    
    const projects = await Project.find().sort({ year: -1 });
    const projectsPage = await ProjectsPage.findOne().sort({ createdAt: -1 });
    
    return NextResponse.json({
      projects,
      roles: projectsPage?.roles || [],
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
