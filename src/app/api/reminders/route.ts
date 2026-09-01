import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { envioId, professorEmail, alunoNome, turmaNome, disciplina, prazo, config } =
      await request.json();

    if (!professorEmail || !alunoNome || !turmaNome || !disciplina) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não informados' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Chave API do Resend não configurada' }, { status: 500 });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Lembrete - Atividade Domiciliar</h2>
          
          <p>Olá <strong>${professorEmail.split('@')[0]}</strong>,</p>
          
          <p>${config?.textoEmail || 'Lembrete: Você possui atividade domiciliar pendente.'}</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Aluno:</strong> ${alunoNome}</p>
            <p><strong>Turma:</strong> ${turmaNome}</p>
            <p><strong>Disciplina:</strong> ${disciplina}</p>
            ${prazo ? `<p><strong>Prazo:</strong> ${prazo}</p>` : ''}
          </div>
          
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Acessar Sistema
            </a>
          </p>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            ${config?.assinatura || 'Atenciosamente,\nSistema de Atividades Domiciliares'}
          </p>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'sistema@domicilia.com.br',
        to: professorEmail,
        subject: 'Lembrete - Atividade Domiciliar Pendente',
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao enviar lembrete');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao enviar lembrete:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
