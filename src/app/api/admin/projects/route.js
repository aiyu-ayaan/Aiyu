import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import ProjectsPage from '@/models/ProjectsPage';
import { authenticateRequest } from '@/middleware/auth';

// Add a new project
export async function POST(request) {
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
    
    const project = new Project(data);
    await project.save();
    
    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  }
}

// Update projects page metadata
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
    
    const projectsPage = await ProjectsPage.findOneAndUpdate(
      {},
      data,
      { new: true, upsert: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: projectsPage,
    });
  } catch (error) {
    console.error('Error updating projects page:', error);
    return NextResponse.json(
      { error: 'Failed to update projects page', details: error.message },
      { status: 500 }
    );
  }
}
