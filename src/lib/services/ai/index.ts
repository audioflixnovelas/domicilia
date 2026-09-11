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
            content: `Você é um autor de materiais didáticos premiado e professor especialista de ensino domiciliar. Seu objetivo é criar atividades EXTREMAMENTE INTERESSANTES, ENGAJANTES, DIVERSAS e DE ALTA QUALIDADE PEDAGÓGICA.

DIRETRIZES DE QUALIDADE, CRIATIVIDADE E CONTEXTUALIZAÇÃO:
1. EXCELÊNCIA E DIVERSIDADE NAS QUESTÕES (MUITO IMPORTANTE):
   - PROIBIDO criar questões repetitivas ou burocráticas que apenas trocam números ("Dado um triângulo de catetos X e Y...").
   - Crie 8 a 10 questões INTERESSANTES, RICAS E CONTEXTUALIZADAS no mundo real:
     * Engenharia, arquitetura e construção civil (rampas de acessibilidade NBR 9050, cabos de pontes estaiadas, inclinação de telhados, escadas de emergência).
     * Aviação, navegação e astronomia (trajetória de decolagem de aviões, distância de faróis marítimos, sombras de monumentos).
     * Tecnologia, design e jogos (tamanho de telas em polegadas, vetores de movimento em jogos 3D).
     * Desafios conceituais e raciocínio lógico bem explicados.
   - Mescle questões de cálculo prático, dissertativas com justificativa técnica e múltipla escolha com alternativas realistas.

2. RESUMO TEÓRICO COMPLETO E DIDÁTICO:
   - A seção "## Resumo Teórico do Conteúdo" deve ser rica, motivadora e explicativa.
   - Explique a utilidade prática do tema antes das fórmulas.
   - Apresente todas as fórmulas limpas em português (a² = b² + c², h² = m . n, b² = a . m, c² = a . n, a . h = b . c).
   - Mencione que o documento conta com um Diagrama Vetorial do Triângulo Retângulo ilustrando catetos (b, c), hipotenusa (a), altura (h) e projeções (m, n).
   - Apresente 2 EXEMPLOS RESOLVIDOS PASSO A PASSO contextualizados.

3. PROIBIDO LATEX E ASCII ART:
   - NUNCA use código ou tags LaTeX (\\[, \\], \\(, \\), \\frac, \\sin, \\cos, \\tan, \\theta, \\sqrt, ^2).
   - NUNCA use ASCII art.
   - Escreva fórmulas limpas em português (ex: a² + b² = c², h = √(23,04) = 4,8).

4. ESTRUTURA E FORMATAÇÃO:
   - Insira uma única linha de resposta (___) para cada questão.
   - NÃO inclua gabarito final.`,
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

export async function generateActivityForStudent(
  alunoNome: string,
  turmaNome: string,
  disciplina: string,
  config: ConfiguracaoGlobal,
  serie?: string,
  userConteudo?: string,
  laudoAluno?: string,
  objetivos?: string,
  imagens?: string[]
): Promise<{ texto: string; pdf: Buffer; docx: Buffer }> {
  const conteudoDB = await buscarConteudoIA(disciplina, serie || '');

  let prompt = `Elabore uma atividade domiciliar RIGOROSAMENTE sobre a matéria "${disciplina}" para o(a) aluno(a) ${alunoNome} (${serie || 'Ensino Fundamental/Médio'}, Turma ${turmaNome}).

ATENÇÃO IMPERATIVA:
- A disciplina É "${disciplina}". NÃO gere questões de outra matéria. Se a matéria for História, Geografia, Português, Biologia etc., JAMAIS gere continhas de matemática.
- Adapte o vocabulário e a profundidade estritamente para a série/ano: ${serie || 'Nível Escolar'}.`;

  if (userConteudo) {
    prompt += `\n\nTEMA / CONTEÚDO ESPECÍFICO EXIGIDO PELO PROFESSOR:
${userConteudo}`;
  } else if (conteudoDB) {
    prompt += `\n\nCONTEÚDO PROGRAMÁTICO BASE:
- Tema: ${conteudoDB.titulo}
- Detalhes: ${conteudoDB.conteudo}
- Exemplo: ${conteudoDB.exerciciosExemplo}`;
  }

  if (laudoAluno) {
    prompt += `\n\nLAUDO DO ALUNO / ADAPTAÇÕES PEDAGÓGICAS (MUITO IMPORTANTE):
${laudoAluno}
Adapte as questões (ex: questões mais diretas, enunciados claros, opções objetivas) respeitando rigorosamente as necessidades deste laudo.`;
  }

  if (objetivos) {
    prompt += `\n\nOBJETIVOS DE APRENDIZAGEM:
${objetivos}`;
  }

  prompt += `\n\nEXIGÊNCIAS DE ESTRUTURA E CONTEÚDO PEDAGÓGICO:
1. TÍTULO E EXPLICAÇÃO TEÓRICA EXTREMAMENTE DIDÁTICA E RICA:
   - Apresente um título atrativo e uma seção "## Resumo Teórico do Conteúdo" rica e contextualizada.
   - Apresente todas as definições, propriedades, fórmulas (limpas em português) e 2 exemplos resolvidos passo a passo com situações práticas do cotidiano.

2. FÓRMULAS E NOTAÇÃO MATEMÁTICA LIMPA:
   - JAMAIS use notação LaTeX (JAMAIS use \\(, \\), \\frac, \\sin, \\cos, \\tan, \\theta, \\times, ^2).
   - Escreva fórmulas em texto simples e claro em português (a² + b² = c², h² = m . n, b² = a . m, c² = a . n, a . h = b . c, sen(x) = oposto/hipotenusa).

3. QUESTÕES CRIATIVAS, DESAFIADORAS E DIVERSIFICADAS (8 A 10 QUESTÕES):
   - PROIBIDO repetir a mesma estrutura burocrática de questão.
   - Crie questões aplicadas em engenharia (rampas NBR 9050, pontes, telhados, escadas), navegação/aviação, telas de eletrônicos e desafios conceituais.
   - Insira uma única linha de resposta (___) para cada questão.

4. ILUSTRAÇÕES E DIAGRAMAS GEOMÉTRICOS:
   - NUNCA crie desenhos em ASCII art. O sistema anexará automaticamente o diagrama vetorial ilustrando os elementos (catetos b e c, hipotenusa a, altura h, projeções m e n).

5. TABELAS:
   - Se houver dados comparativos, utilize a sintaxe de tabela Markdown (| Coluna 1 | Coluna 2 |).`;

  const provider = new LLM7Provider();
  const texto = await provider.generateActivity(prompt, config);

  const atividadeData: AtividadeData = {
    titulo: 'Atividade Domiciliar',
    disciplina,
    serie: serie || '',
    turma: turmaNome,
    aluno: alunoNome,
    conteudo: texto,
    imagens,
  };

  const [pdf, docx] = await Promise.all([
    Promise.resolve(gerarPDF(atividadeData)),
    gerarDOCX(atividadeData),
  ]);

  return { texto, pdf, docx };
}
