import { ConfiguracaoGlobal, ConteudoIA } from '@/types';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { gerarDOCX, gerarPDF, AtividadeData } from './gerar-documentos';

export interface AIProvider {
  generateActivity(prompt: string, config: ConfiguracaoGlobal): Promise<string>;
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
            content: `Voce e um professor experiente e criativo. Gere atividades domiciliares completas, didaticas e adequadas ao nivel escolar.

FORMATO DA ATIVIDADE:
- Titulo claro e objetivo
- 5 a 10 exercicios progressivos (do facil ao dificil)
- Exercicios variados (multipla escolha, dissertativo, pratico)
- Espaco para resposta (linhas com ___)
- NAO inclua gabarito ou respostas
- NAO inclua cabecalho (nome, data, turma) - o sistema ja adiciona

FORMATACAO:
- Use ## para titulos de secao
- Use **texto** para negrito
- Cada exercicio em uma linha separada`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    if (!response.ok) {
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Nao foi possivel gerar a atividade.';
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

4. REGRAS SOBRE ILUSTRAÇÕES E DIAGRAMAS:
   - NUNCA crie desenhos em ASCII art (não use traços, barras invertidas ou símbolos para desenhar figuras como |\\, +---+).
   - Quando a questão envolver mapas, gráficos, figuras de geometria ou esquemas, insira apenas uma legenda descritiva como:
     [Figura: Descrição da figura ou mapa referente à questão]

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
