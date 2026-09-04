import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const pythonBackendUrl = process.env.PYTHON_CALENDAR_SERVICE_URL || 'http://localhost:5001';

    let endpoint = '/events/create';
    if (action === 'get_auth_url') {
      endpoint = '/auth/url';
    } else if (action === 'callback') {
      endpoint = '/auth/callback';
    }

    const response = await fetch(`${pythonBackendUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Erro ao integrar com o backend Python do Google Agenda:', error);
    return NextResponse.json({ error: error.message || 'Erro de conexão com o serviço Python' }, { status: 500 });
  }
}
