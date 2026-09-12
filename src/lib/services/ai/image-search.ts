export interface WebImageResult {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  source: 'Wikimedia Commons' | 'Wikipédia' | 'Openverse';
  description?: string;
}

const USER_AGENT = 'DomiciliaEscolar/1.0 (atividades@colegiomaluf.edu.br)';

/**
 * Normaliza e gera termos de busca inteligentes para a disciplina e conteúdo
 */
export function generateImageQueries(disciplina: string, conteudo: string, serie?: string): string[] {
  const queries: string[] = [];

  // Limpa caracteres especiais e pontuação
  const cleanTema = conteudo
    .replace(/[,\.;:\?!\(\)\[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Stopwords comuns em português
  const stopWords = new Set([
    'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma',
    'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele',
    'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já',
    'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era',
    'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles',
    'estão', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha',
    'têm', 'numa', 'pelos', 'elas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'lhe',
    'deles', 'essas', 'esses', 'pelas', 'este', 'fosse', 'dele', 'tu', 'te', 'vocês', 'vos',
    'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos', 'nossas',
    'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto',
    'aquilo', 'estou', 'está', 'estamos', 'estão', 'estive', 'esteve', 'estivemos', 'estiveram',
    'sobre', 'exercícios', 'atividade', 'estudo', 'conteúdo', 'aula', 'questões', 'questão', 'tema'
  ]);

  const words = cleanTema
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));

  // 1. Tenta pegar as primeiras 2 a 3 palavras mais significativas do tema
  if (words.length > 0) {
    queries.push(words.slice(0, 3).join(' '));
  }

  // 2. Se houver tema curto (até 4 palavras), usa direto
  if (cleanTema.length > 3 && cleanTema.length <= 40) {
    if (!queries.includes(cleanTema)) {
      queries.push(cleanTema);
    }
  }

  // 3. Adiciona termos visuais pedagógicos específicos por disciplina
  const discLower = disciplina.toLowerCase();
  const baseKeyword = words.slice(0, 2).join(' ') || cleanTema;

  if (discLower.includes('história')) {
    queries.push(`${baseKeyword} pintura história`);
    queries.push(`${baseKeyword} mapa histórico`);
  } else if (discLower.includes('geografia')) {
    queries.push(`${baseKeyword} mapa relevo`);
    queries.push(`${baseKeyword} paisagem geografia`);
  } else if (discLower.includes('ciência') || discLower.includes('biologia')) {
    queries.push(`${baseKeyword} esquema biologia`);
    queries.push(`${baseKeyword} diagrama científico`);
  } else if (discLower.includes('física')) {
    queries.push(`${baseKeyword} física experimento`);
    queries.push(`${baseKeyword} diagrama vetores`);
  } else if (discLower.includes('química')) {
    queries.push(`${baseKeyword} química estrutura`);
    queries.push(`${baseKeyword} tabela periódica`);
  } else if (discLower.includes('matemática') || discLower.includes('geometria')) {
    queries.push(`${baseKeyword} geometria figura`);
    queries.push(`${baseKeyword} gráfico plano`);
  } else if (discLower.includes('arte')) {
    queries.push(`${baseKeyword} obra de arte`);
    queries.push(`${baseKeyword} pintura`);
  } else if (discLower.includes('português') || discLower.includes('literatura')) {
    queries.push(`${baseKeyword} literatura autor`);
    queries.push(`${baseKeyword} manuscrito`);
  }

  // Se não sobrou nada, usa a própria disciplina
  if (queries.length === 0) {
    queries.push(disciplina);
  }

  return Array.from(new Set(queries));
}

/**
 * Pesquisa imagens na Wikipédia em português
 */
async function searchWikipediaImages(query: string, limit = 5): Promise<WebImageResult[]> {
  try {
    const url = `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=${limit}&prop=pageimages|extracts&exintro=1&explaintext=1&exsentences=1&pithumbsize=900&format=json&origin=*`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];

    const results: WebImageResult[] = [];
    for (const p of pages as any[]) {
      if (p.thumbnail?.source) {
        const thumbUrl = p.thumbnail.source;
        // Evita ícones minúsculos e logos genéricos do Wikipedia/Wikimedia
        if (thumbUrl.includes('Wiki') || thumbUrl.includes('disambig') || thumbUrl.includes('stub')) {
          continue;
        }

        results.push({
          id: `wiki-${p.pageid}`,
          title: p.title || query,
          thumbUrl,
          fullUrl: thumbUrl,
          width: p.thumbnail.width || 800,
          height: p.thumbnail.height || 600,
          source: 'Wikipédia',
          description: p.extract || p.title,
        });
      }
    }
    return results;
  } catch (err) {
    console.error('Erro na busca da Wikipédia:', err);
    return [];
  }
}

/**
 * Pesquisa imagens no Wikimedia Commons
 */
async function searchCommonsImages(query: string, limit = 6): Promise<WebImageResult[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      query + ' filetype:bitmap'
    )}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=900&format=json&origin=*`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];

    const results: WebImageResult[] = [];
    for (const p of pages as any[]) {
      const info = p.imageinfo?.[0];
      if (!info) continue;

      // Filtra apenas imagens reais (ignora PDFs, áudios, etc)
      if (!info.mime?.startsWith('image/')) continue;

      const titleClean = (p.title || '')
        .replace(/^File:/i, '')
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(/_/g, ' ');

      const thumb = info.thumburl || info.url;

      results.push({
        id: `commons-${p.pageid}`,
        title: titleClean,
        thumbUrl: thumb,
        fullUrl: info.url,
        width: info.thumbwidth || info.width || 800,
        height: info.thumbheight || info.height || 600,
        source: 'Wikimedia Commons',
        description: titleClean,
      });
    }
    return results;
  } catch (err) {
    console.error('Erro na busca do Wikimedia Commons:', err);
    return [];
  }
}

/**
 * Pesquisa imagens abertas no Openverse como fonte complementar
 */
async function searchOpenverseImages(query: string, limit = 4): Promise<WebImageResult[]> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const items = data.results || [];

    return items.map((item: any) => ({
      id: `openverse-${item.id}`,
      title: item.title || query,
      thumbUrl: item.thumbnail || item.url,
      fullUrl: item.url,
      width: item.width || 800,
      height: item.height || 600,
      source: 'Openverse',
      description: item.title,
    }));
  } catch {
    return [];
  }
}

/**
 * Pesquisa multi-fonte de imagens educativas na web
 */
export async function searchWebImages(query: string, limit = 10): Promise<WebImageResult[]> {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();

  // Dispara consultas paralelas
  const [wikiResults, commonsResults, openverseResults] = await Promise.all([
    searchWikipediaImages(cleanQuery, Math.ceil(limit / 2)),
    searchCommonsImages(cleanQuery, Math.ceil(limit / 2)),
    searchOpenverseImages(cleanQuery, 3),
  ]);

  // Mescla e remove duplicatas por URL
  const seenUrls = new Set<string>();
  const combined: WebImageResult[] = [];

  for (const item of [...wikiResults, ...commonsResults, ...openverseResults]) {
    const key = item.thumbUrl || item.fullUrl;
    if (!key || seenUrls.has(key)) continue;
    seenUrls.add(key);
    combined.push(item);
    if (combined.length >= limit) break;
  }

  return combined;
}

/**
 * Baixa uma imagem da web e otimiza para Base64 Data URL
 * Garantindo compatibilidade total com DOCX e PDF (sem estourar tamanho do arquivo)
 */
export async function fetchAndOptimizeImage(
  imageUrl: string,
  maxWidth = 900
): Promise<{ dataUrl: string; width: number; height: number; mimeType: string }> {
  // Se já for data URL
  if (imageUrl.startsWith('data:image/')) {
    return {
      dataUrl: imageUrl,
      width: 800,
      height: 600,
      mimeType: imageUrl.substring(5, imageUrl.indexOf(';')),
    };
  }

  const res = await fetch(imageUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao baixar imagem (${res.status}): ${imageUrl}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Tenta otimizar com Sharp se disponível
  try {
    const sharpModule = 'sharp';
    const sharp = eval('require')(sharpModule);

    const imageInstance = sharp(buffer);
    const meta = await imageInstance.metadata();

    const origWidth = meta.width || 800;
    const origHeight = meta.height || 600;

    // Redimensiona proporcionalmente mantendo alta nitidez
    const targetWidth = Math.min(maxWidth, origWidth);
    const targetHeight = Math.round((targetWidth * origHeight) / origWidth);

    const optimizedBuf = await imageInstance
      .resize({ width: targetWidth, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return {
      dataUrl: `data:image/jpeg;base64,${optimizedBuf.toString('base64')}`,
      width: targetWidth,
      height: targetHeight,
      mimeType: 'image/jpeg',
    };
  } catch (sharpErr) {
    // Fallback sem sharp: converte buffer bruto
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return {
      dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
      width: 800,
      height: 600,
      mimeType: mime,
    };
  }
}

/**
 * Localiza automaticamente as 1 a 3 melhores imagens da web para uma atividade
 */
export async function autoFindImagesForActivity(
  disciplina: string,
  conteudo: string,
  serie?: string,
  maxImages = 2
): Promise<string[]> {
  try {
    const queries = generateImageQueries(disciplina, conteudo, serie);
    const candidates: WebImageResult[] = [];

    for (const q of queries) {
      if (candidates.length >= maxImages * 2) break;
      const res = await searchWebImages(q, 4);
      candidates.push(...res);
    }

    if (candidates.length === 0) return [];

    // Deduplica candidatos
    const uniqueCandidates: WebImageResult[] = [];
    const seen = new Set<string>();
    for (const item of candidates) {
      if (!seen.has(item.thumbUrl)) {
        seen.add(item.thumbUrl);
        uniqueCandidates.push(item);
      }
    }

    // Seleciona as primeiras 'maxImages' e converte para Data URL
    const selected = uniqueCandidates.slice(0, maxImages);
    const dataUrls: string[] = [];

    for (const img of selected) {
      try {
        const optimized = await fetchAndOptimizeImage(img.thumbUrl || img.fullUrl);
        dataUrls.push(optimized.dataUrl);
      } catch (err) {
        console.warn(`Aviso: falha ao processar imagem ${img.title}:`, err);
      }
    }

    return dataUrls;
  } catch (err) {
    console.error('Erro na busca automática de imagens para a atividade:', err);
    return [];
  }
}
