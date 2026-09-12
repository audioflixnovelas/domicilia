import { NextRequest, NextResponse } from 'next/server';
import {
  searchWebImages,
  fetchAndOptimizeImage,
  generateImageQueries,
  autoFindImagesForActivity,
} from '@/lib/services/ai/image-search';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const disciplina = searchParams.get('disciplina') || '';
    const conteudo = searchParams.get('conteudo') || '';
    const serie = searchParams.get('serie') || '';
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    // Se solicitou sugestões de termos de busca
    if (searchParams.get('type') === 'suggest') {
      const suggestions = generateImageQueries(disciplina, conteudo, serie);
      return NextResponse.json({ success: true, suggestions });
    }

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Parâmetro de busca (q) não informado.' },
        { status: 400 }
      );
    }

    const results = await searchWebImages(query, limit);
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Erro na API de busca de imagens:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao pesquisar imagens.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, disciplina, conteudo, serie, maxImages } = body;

    // Ação 1: Buscar imagens automaticamente para um tema
    if (action === 'auto') {
      if (!disciplina || !conteudo) {
        return NextResponse.json(
          { error: 'Disciplina e conteúdo são obrigatórios para busca automática.' },
          { status: 400 }
        );
      }

      const dataUrls = await autoFindImagesForActivity(
        disciplina,
        conteudo,
        serie,
        maxImages || 2
      );

      return NextResponse.json({ success: true, images: dataUrls });
    }

    // Ação 2: Baixar e otimizar uma imagem escolhida da web
    if (!url) {
      return NextResponse.json(
        { error: 'URL da imagem não informada.' },
        { status: 400 }
      );
    }

    const optimized = await fetchAndOptimizeImage(url);
    return NextResponse.json({ success: true, image: optimized });
  } catch (error: any) {
    console.error('Erro ao processar imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem.' },
      { status: 500 }
    );
  }
}
