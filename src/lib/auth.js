import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export function verifyToken(token) {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

export function withAuth(handler) {
  return async (request, context) => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Add user info to request
    request.user = decoded;
    return handler(request, context);
  };
}
