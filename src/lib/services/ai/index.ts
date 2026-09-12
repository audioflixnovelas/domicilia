import { ConfiguracaoGlobal, ConteudoIA } from '@/types';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { gerarDOCX, gerarPDF, AtividadeData } from './gerar-documentos';

export interface AIProvider {
  generateActivity(prompt: string, config: ConfiguracaoGlobal): Promise<string>;
}

export function cleanLatexMath(text: string): string {
  if (!text) return text;
  return text
    // Remove marcadores crus de figura [Figura: ...] do corpo de texto
    .replace(/\[Figura:[^\]]*\]/gi, '')
    // Remove delimitadores de bloco/inline LaTeX
    .replace(/\\\[\s*/g, '')
    .replace(/\s*\\\]/g, '')
    .replace(/\\\(\s*/g, '')
    .replace(/\s*\\\)/g, '')
    // Substitui frações \frac{num}{den} por num / den
    .replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '($1 / $2)')
    // Substitui funções trigonométricas e comandos comuns
    .replace(/\\text\s*\{([^}]+)\}/g, '$1')
    .replace(/\\sen\b|\\sin\b/g, 'sen')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b|\\tg\b/g, 'tan')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\sqrt\s*\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt\b/g, '√')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\pm\b/g, '±')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\approx\b/g, '≈')
    // Substitui exponenciais comuns como ^2 por ²
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\^([0-9a-zA-Z]+)/g, '^$1')
    // Limpa barras invertidas sobrando em símbolos
    .replace(/\\/g, '');
}

interface QueueItem {
  id: string;
  prompt: string;
  config: ConfiguracaoGlobal;
  conteudo?: ConteudoIA;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  result?: string;
  error?: string;
}

import { autoFindImagesForActivity, fetchAndOptimizeImage } from './image-search';

class LLM7Provider implements AIProvider {
  private baseUrl = 'https://api.llm7.io/v1';

  async generateActivity(prompt: string, config: ConfiguracaoGlobal): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.iaApiKey || 'free'}`,
      },
      body: JSON.stringify({
        model: config.iaModelo || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Você é um renomado autor de livros didáticos de excelência e especialista pedagógico alinhado à BNCC, reconhecido por produzir atividades de ALTO NÍVEL CONCEITUAL, COMPLETAS, DIDÁTICAS e EXTREMAMENTE ENRIQUECEDORAS.

DIRETRIZES FUNDAMENTAIS PARA CRIAÇÃO DE ATIVIDADES DE EXCELÊNCIA:

1. ESTRUTURA COMPLETA E DETALHADA:
   A atividade deve ser rica e autoexplicativa, permitindo ao estudante em regime domiciliar aprender com profundidade e autonomia.
   Estrutura obrigatória:
   - TÍTULO INSTIGANTE E CONTEXTUALIZADO (Ex: # Título da Atividade)
   - ## 1. Introdução e Contextualização Prática: Por que este conhecimento é importante no mundo real, na ciência, na sociedade ou no cotidiano?
   - ## 2. Resumo Teórico do Conteúdo (Completo e Aprofundado):
     * Explicação clara e detalhada dos conceitos essenciais, propriedades, causas e efeitos.
     * Nada de explicações curtas de um único parágrafo! Desenvolva os tópicos com rigor pedagógico e linguagem acessível à série.
   - ## 3. Exemplos Resolvidos e Comentados Passo a Passo (2 Exemplos):
     * Demonstre o raciocínio detalhado de resolução ou análise de caso, guiando o aluno pelo método correto.
   - ## 4. Atividades Práticas e Desafios de Fixação (8 a 10 Questões):
     * Cada questão DEVE ter uma contextualização rica (3 a 6 linhas de situação-problema real, texto motivador ou cenário prático).
     * Questões desmembradas em sub-itens analíticos:
       a) Compreensão e identificação dos elementos essenciais.
       b) Aplicação prática do conceito ou cálculo/análise estruturada.
       c) Conclusão crítica, interpretação reflexiva ou tomada de decisão fundamentada.
     * Inclua questões específicas para análise e interpretação das figuras/ilustrações de apoio pedagógico presentes na atividade.
     * Insira uma linha de resposta limpa (___) para cada sub-item.
   - ## 5. Você Sabia? / Aplicação no Mundo Atual:
     * Uma curiosidade estimulante ou conexão interdisciplinar com inovação, tecnologia ou cultura.

2. RIGOR TEMÁTICO E ESPECIFICIDADE POR DISCIPLINA:
   - CIÊNCIAS HUMANAS (História, Geografia, Filosofia, Sociologia):
     * Análise de processos históricos, fontes documentais, mapas, territórios e dinâmicas sociais/geopolíticas.
   - CIÊNCIAS DA NATUREZA (Ciências, Biologia, Física, Química):
     * Método científico, fenômenos biológicos, estruturas e funções, experimentos práticos e leis naturais.
   - MATEMÁTICA E GEOMETRIA:
     * Resolução de problemas reais, raciocínio lógico, relações geométricas e algébricas aplicadas.
   - LINGUAGENS (Português, Redação, Literatura, Inglês):
     * Gêneros textuais, interpretação de texto autêntico, vocabulário e recursos estilísticos e gramaticais em contexto.
   - ARTES, EDUCAÇÃO FÍSICA E DIGITAL:
     * Expressão artística, história da arte, cidadania digital, saúde e cultura corporal.

3. FORMATAÇÃO E NOTAÇÃO LIMPA:
   - PROIBIDO código/tags LaTeX (\\frac, \\sin, \\cos, \\sqrt, \\theta, \\times, ^2). Escreva fórmulas em português legível e acessível: (a² + b² = c², v = d / t, h = √(25)).
   - PROIBIDO desenhos em ASCII art (o sistema insere ilustrações reais da web e diagramas).
   - NÃO inclua gabarito de respostas no final da atividade.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 3500,
      }),
    });

    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    if (!response.ok) {
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || 'Nao foi possivel gerar a atividade.';
    return cleanLatexMath(content);
  }
}

class AIQueue {
  private queue: QueueItem[] = [];
  private processing = false;

  enqueue(prompt: string, config: ConfiguracaoGlobal, conteudo?: ConteudoIA): string {
    const item: QueueItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      prompt,
      config,
      conteudo,
      attempts: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.queue.push(item);
    this.processNext();
    return item.id;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;

    const item = this.queue.find((i) => i.status === 'pending');
    if (!item) return;

    this.processing = true;
    item.status = 'processing';
    item.attempts++;

    try {
      const provider = new LLM7Provider();
      item.result = await provider.generateActivity(item.prompt, item.config);
      item.status = 'completed';
    } catch (error: any) {
      if (error.message === 'RATE_LIMITED' && item.attempts < (item.config.maxTentativasIA || 5)) {
        item.status = 'pending';
        setTimeout(() => this.processNext(), (item.config.intervaloIA || 15) * 60 * 1000);
      } else {
        item.status = 'failed';
        item.error = error.message;
      }
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  getItem(id: string): QueueItem | undefined {
    return this.queue.find((i) => i.id === id);
  }

  getPendingItems(): QueueItem[] {
    return this.queue.filter((i) => i.status === 'pending' || i.status === 'processing');
  }

  retry(id: string): void {
    const item = this.queue.find((i) => i.id === id);
    if (item && item.status === 'failed') {
      item.status = 'pending';
      item.attempts = 0;
      this.processNext();
    }
  }
}

export const aiQueue = new AIQueue();

export async function buscarConteudoIA(disciplina: string, serie: string): Promise<ConteudoIA | null> {
  try {
    const conteudos = await FirestoreService.query<ConteudoIA>(DOC_TYPES.CONTEUDO_IA, [
      whereEqual('disciplina', disciplina),
      whereEqual('serie', serie),
      whereEqual('ativo', true),
    ]);
    return conteudos.length > 0 ? conteudos[0] : null;
  } catch {
    return null;
  }
}

export interface GenerateActivityOptions {
  buscarImagensWeb?: boolean;
  termoBuscaImagens?: string;
  maxImagens?: number;
}

export async function generateActivityForStudent(
  alunoNome: string,
  turmaNome: string,
  disciplina: string,
  config: ConfiguracaoGlobal,
  serie?: string,
  userConteudo?: string,
  laudoAluno?: string,
  objetivos?: string,
  imagens?: string[],
  opcoes?: GenerateActivityOptions
): Promise<{ texto: string; pdf: Buffer; docx: Buffer; imagens: string[] }> {
  const conteudoDB = await buscarConteudoIA(disciplina, serie || '');
  const temaEfetivo = userConteudo || conteudoDB?.titulo || disciplina;

  // 1. Gerenciamento e Busca de Imagens da Web
  let finalImagens: string[] = imagens ? [...imagens] : [];

  // Se o usuário não forneceu imagens manuais e a busca na web estiver habilitada (padrão ativo)
  if (finalImagens.length === 0 && opcoes?.buscarImagensWeb !== false) {
    try {
      const termoBusca = opcoes?.termoBuscaImagens || temaEfetivo;
      const webImages = await autoFindImagesForActivity(
        disciplina,
        termoBusca,
        serie,
        opcoes?.maxImagens || 2
      );
      if (webImages.length > 0) {
        finalImagens = webImages;
      }
    } catch (err) {
      console.warn('Aviso: falha na busca automática de imagens na web:', err);
    }
  }

  // Otimiza e garante que todas as imagens sejam Data URLs seguras
  const processedImagens: string[] = [];
  for (const img of finalImagens) {
    try {
      if (img.startsWith('data:image/')) {
        processedImagens.push(img);
      } else {
        const opt = await fetchAndOptimizeImage(img);
        processedImagens.push(opt.dataUrl);
      }
    } catch (err) {
      console.warn('Falha ao processar imagem para documento:', err);
    }
  }

  // 2. Montagem do Prompt Rico e Pedagógico
  let prompt = `Elabore uma atividade domiciliar de ALTA QUALIDADE, COMPLETA e RIGOROSAMENTE sobre a matéria "${disciplina}" para o(a) aluno(a) ${alunoNome} (${serie || 'Ensino Fundamental/Médio'}, Turma ${turmaNome}).

DIRETRIZES OBRIGATÓRIAS:
- A disciplina É "${disciplina}". NÃO gere questões ou teorias de outra matéria.
- Adapte o vocabulário, complexidade e abordagem estritamente para a série/ano: ${serie || 'Nível Escolar'}.`;

  if (userConteudo) {
    prompt += `\n\nTEMA / CONTEÚDO ESPECÍFICO EXIGIDO:
${userConteudo}`;
  } else if (conteudoDB) {
    prompt += `\n\nCONTEÚDO PROGRAMÁTICO BASE:
- Tema: ${conteudoDB.titulo}
- Detalhes: ${conteudoDB.conteudo}
- Exemplo: ${conteudoDB.exerciciosExemplo}`;
  }

  if (laudoAluno) {
    prompt += `\n\nLAUDO DO ALUNO / ADAPTAÇÕES PEDAGÓGICAS ESPECIAIS:
${laudoAluno}
Adapte rigorosamente a linguagem, o ritmo das explicações e o formato das questões para atender com máxima sensibilidade e eficácia a estas necessidades.`;
  }

  if (objetivos) {
    prompt += `\n\nOBJETIVOS DE APRENDIZAGEM:
${objetivos}`;
  }

  if (processedImagens.length > 0) {
    prompt += `\n\nRECURSOS VISUAIS E ILUSTRAÇÕES DE APOIO:
A atividade incluirá ${processedImagens.length} ilustração(ões)/figura(s) educativa(s) pesquisada(s) da web.
No Resumo Teórico e em pelo menos 2 questões, faça referências explícitas às figuras de apoio (ex: "Com base na Figura de apoio...", "Ao analisar a ilustração temática..."), estimulando a leitura de imagens e a interpretação visual pelo estudante.`;
  }

  prompt += `\n\nEXIGÊNCIAS PEDAGÓGICAS E DE CONTEÚDO:
1. TÍTULO E INTRODUÇÃO PRÁTICA:
   - Crie um título claro e atrativo (# Título).
   - Inicie com a seção "## 1. Introdução e Contextualização", mostrando a aplicação e relevância do tema na vida real.

2. RESUMO TEÓRICO APROFUNDADO E DIDÁTICO:
   - Seção "## 2. Resumo Teórico do Conteúdo" rica, profunda e detalhada, com definições, conceitos-chave e desenvolvimento claro.
   - Permita ao aluno estudar e dominar o conteúdo apenas com este material.

3. EXEMPLOS RESOLVIDOS PASSO A PASSO:
   - Seção "## 3. Exemplos Resolvidos e Comentados", contendo 2 exemplos completos passo a passo demonstrando o método de análise ou resolução.

4. ATIVIDADES PRÁTICAS E DESAFIOS (8 A 10 QUESTÕES MULTI-ETAPAS):
   - Seção "## 4. Atividades Práticas e Desafios de Fixação".
   - Cada questão deve ter contexto sólido de 3 a 5 linhas e sub-itens (a, b, c) para raciocínio progressivo.
   - Insira linha de resposta (___) para cada sub-item.

5. SEÇÃO DE CURIOSIDADE:
   - Seção "## 5. Você Sabia?", conectando o conteúdo com fatos curiosos ou tecnologia.`;

  const provider = new LLM7Provider();
  const texto = await provider.generateActivity(prompt, config);

  const atividadeData: AtividadeData = {
    titulo: 'Atividade Domiciliar',
    disciplina,
    serie: serie || '',
    turma: turmaNome,
    aluno: alunoNome,
    conteudo: texto,
    imagens: processedImagens.length > 0 ? processedImagens : undefined,
  };

  const [pdf, docx] = await Promise.all([
    Promise.resolve(gerarPDF(atividadeData)),
    gerarDOCX(atividadeData),
  ]);

  return { texto, pdf, docx, imagens: processedImagens };
}
