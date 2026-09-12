import { NextRequest, NextResponse } from 'next/server';
import { generateActivityForStudent } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  try {
    const {
      alunoNome,
      turmaNome,
      disciplina,
      config,
      serie,
      userConteudo,
      laudoAluno,
      objetivos,
      imagens,
      opcoes,
    } = await request.json();

    if (!alunoNome || !turmaNome || !disciplina) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não informados' },
        { status: 400 }
      );
    }

    const result = await generateActivityForStudent(
      alunoNome,
      turmaNome,
      disciplina,
      config,
      serie,
      userConteudo,
      laudoAluno,
      objetivos,
      imagens,
      opcoes
    );

    return NextResponse.json({
      success: true,
      activity: {
        texto: result.texto,
        imagens: result.imagens,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar atividade:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
