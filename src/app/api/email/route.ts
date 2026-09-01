import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, attachments } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Campos obrigatorios nao informados' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Chave API do Resend nao configurada' }, { status: 500 });
    }

    const body: any = {
      from: process.env.EMAIL_FROM || 'sistema@domicilia.com.br',
      to,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      body.attachments = attachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao enviar e-mail');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
