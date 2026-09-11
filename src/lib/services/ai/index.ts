import { ConfiguracaoGlobal, ConteudoIA } from '@/types';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { gerarDOCX, gerarPDF, AtividadeData } from './gerar-documentos';

export interface AIProvider {
  generateActivity(prompt: string, config: ConfiguracaoGlobal): Promise<string>;
}

export function cleanLatexMath(text: string): string {
  if (!text) return text;
  return text
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
            content: `Você é um professor renomado, autor de materiais didáticos de excelência e especialista em ensino domiciliar adaptado. Seu objetivo é elaborar atividades domiciliares COMPLETAS, APROFUNDADAS, DE ALTA QUALIDADE PEDAGÓGICA e TOTALMENTE LIVRES de símbolos LaTeX ou contradições.

DIRETRIZES FUNDAMENTAIS DE QUALIDADE E CONTEÚDO:
1. RESUMO TEÓRICO COMPLETO E DENSO:
   - A seção "## Resumo Teórico do Conteúdo" DEVE SER RICA E APROFUNDADA (mínimo de 3 a 5 parágrafos e subseções detalhadas).
   - Apresente todas as definições fundamentais, propriedades, teoremas e TODAS as fórmulas do assunto.
   - Para tópicos de Matemática (ex: Relações Métricas no Triângulo Retângulo), detalhe obrigatoriamente:
     * Teorema de Pitágoras: a² = b² + c²
     * Relação da Altura: h² = m . n
     * Relações dos Catetos: b² = a . m e c² = a . n
     * Produto dos Catetos e Hipotenusa: a . h = b . c
     * Relações Trigonométricas: sen(x) = oposto/hipotenusa, cos(x) = adjacente/hipotenusa, tan(x) = oposto/adjacente
   - Inclua pelo menos 2 EXEMPLOS RESOLVIDOS PASSO A PASSO detalhados no resumo teórico antes das questões.

2. ZERO LATEX / SÍMBOLOS MATEMÁTICOS LIMPOS EM PORTUGUÊS:
   - PROIBIDO usar código ou tags LaTeX (NUNCA use \\[, \\], \\(, \\), \\frac{}, \\sin, \\cos, \\tan, \\theta, \\sqrt{}, ^2 ou barras invertidas).
   - Escreva TODAS as fórmulas em texto legível e formatado em português:
     * "a² + b² = c²" ou "c² = a² + b²"
     * "sen(x) = oposto / hipotenusa"
     * "cos(x) = adjacente / hipotenusa"
     * "tan(x) = oposto / adjacente"
     * "b = √(16) = 4" ou "b = raiz(16) = 4"

3. QUESTÕES DESAFIADORAS E DIVERSIFICADAS:
   - Crie de 8 a 10 questões bem elaboradas (mesclando questões conceituais, dissertativas, de cálculo prático e de múltipla escolha contextualizadas).
   - Insira uma única linha de resposta (___) para cada questão dissertativa ou de cálculo.

4. FIGURA / DIAGRAMA OBRIGATÓRIO (PARA GEOMETRIA E MATÉRIA VISUAL):
   - Em atividades de Geometria, Física ou Geografia, INCLUA SEMPRE a tag de figura no Resumo Teórico:
     [Figura: Diagrama do Triângulo Retângulo ABC com catetos b e c, hipotenusa a, altura h e projeções m e n]
   - O sistema irá transformar esta tag em uma ilustração vetorial colorida de alta resolução no PDF e DOCX!

5. VARIABILIDADE E RICA CONTEXTUALIZAÇÃO DAS QUESTÕES:
   - PROIBIDO repetir a mesma estrutura de enunciado (evite criar 10 questões idênticas trocando só os números).
   - Elabore questões diversificadas:
     * Questões conceituais (ex: provar relações, explicar projeções m e n).
     * Aplicações no cotidiano (ex: altura de um prédio, rampa de acesso, escada apoiada em parede, cabo de ancoragem de torre).
     * Cálculos da altura relativa à hipotenusa (h² = m . n) e das projeções (b² = a . m).
     * Questões de múltipla escolha com distratores realistas.

6. SEM GABARITO / ESPAÇAMENTO:
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
1. TÍTULO E EXPLICAÇÃO TEÓRICA APROFUNDADA:
   - Apresente um título claro e em seguida uma seção detalhada "## Resumo Teórico do Conteúdo".
   - Explique os conceitos principais, definições, fórmulas e contextos de aplicação antes das questões.

2. FÓRMULAS E NOTAÇÃO MATEMÁTICA (MUITO IMPORTANTE):
   - JAMAIS use notação LaTeX (JAMAIS use \\(, \\), \\frac, \\sin, \\cos, \\tan, \\theta, \\times, ^2).
   - Escreva fórmulas em texto simples e claro em português. Exemplos:
     * Use "a² + b² = c²" em vez de "a^2 + b^2 = c^2"
     * Use "sen(θ) = oposto / hipotenusa" em vez de "\\sin(\\theta) = \\frac{\\text{oposto}}{\\text{hipotenusa}}"
     * Use "cos(x)" e "tan(x)"

3. EXERCÍCIOS PRÁTICOS (6 A 10 QUESTÕES):
   - Elabore de 6 a 10 questões progressivas (conceituais, dissertativas, de múltipla escolha e de resolução prática).
   - As questões devem ser ricas e totalmente focadas no tema exigido (${disciplina}).

4. ILUSTRAÇÕES E DIAGRAMAS GEOMÉTRICOS:
   - NUNCA crie desenhos em ASCII art.
   - Para tópicos geométricos ou visuais, insira obrigatoriamente a tag descritiva:
     [Figura: Diagrama do Triângulo Retângulo ABC com catetos b, c, hipotenusa a, altura h e projeções m, n]

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
