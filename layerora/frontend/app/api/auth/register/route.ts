import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await api.post('/auth/register', body);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.detail || 'Registration failed' },
      { status: 400 }
    );
  }
}