import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Aluno, Turma, Envio, User, ConfiguracaoGlobal, Historico } from '@/types';
import { generateActivityForStudent } from '@/lib/services/ai';
import { emailService } from '@/lib/services/email';
import { getCurrentDate, getCurrentTime } from '@/lib/utils';

export const runtime = 'nodejs';

function isPeriodoAtivo(aluno: Aluno): boolean {
  if (!aluno.domiciliar) return false;
  if (aluno.dataInicio && aluno.dataFim) {
    const hoje = new Date().toISOString().split('T')[0];
    return hoje >= aluno.dataInicio && hoje <= aluno.dataFim;
  }
  return true;
}

export async function GET(request: NextRequest) {
  return handleCron();
}

export async function POST(request: NextRequest) {
  return handleCron();
}

async function handleCron() {
  try {
    const configs = await FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO);
    const config = configs.length > 0 ? configs[0] : null;

    if (!config || !config.iaHabilitada) {
      return NextResponse.json({
        success: false,
        message: 'IA nao habilitada nas configuracoes globais.',
      });
    }

    const [todosAlunos, todasTurmas, todosEnvios] = await Promise.all([
      FirestoreService.getAllByType<Aluno>(DOC_TYPES.ALUNO),
      FirestoreService.getAllByType<Turma>(DOC_TYPES.TURMA),
      FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
    ]);

    const alunosAtivos = todosAlunos.filter((a) => a.active !== false && isPeriodoAtivo(a));

    let processados = 0;
    const resultados: any[] = [];

    for (const aluno of alunosAtivos) {
      const turma = todasTurmas.find((t) => t.id === aluno.turmaId);
      if (!turma) continue;

      const alunoEnvios = todosEnvios.filter((e) => e.alunoId === aluno.id && e.turmaId === turma.id);
      const temEnvioReal = alunoEnvios.some((e) => e.status === 'enviado' || e.status === 'gerado_ia');

      if (!temEnvioReal) {
        const disciplina = 'Educacao Digital';

        try {
          const resIA = await generateActivityForStudent(
            aluno.nome,
            turma.nome,
            disciplina,
            config,
            turma.serie
          );

          const envioData = {
            atividadeId: '',
            alunoId: aluno.id,
            professorId: turma.professorIds?.[0] || '',
            professorNome: 'IA Automatica',
            turmaId: turma.id,
            disciplina,
            versao: 1,
            status: 'gerado_ia' as const,
            arquivo: null,
            comentarios: 'Atividade gerada automaticamente por IA devido a pendencia.',
            dataEnvio: getCurrentDate(),
            horaEnvio: getCurrentTime(),
            pedagogoId: turma.pedagogoId || '',
            alunoNome: aluno.nome,
            turmaNome: turma.nome,
          };

          const envioId = await FirestoreService.create<Envio>(DOC_TYPES.ENVIO, envioData);

          await FirestoreService.create<Historico>(DOC_TYPES.HISTORICO, {
            envioId,
            versao: 1,
            arquivo: null,
            comentarios: 'Gerado automaticamente por IA',
            dataEnvio: getCurrentDate(),
            horaEnvio: getCurrentTime(),
            professorId: 'IA',
            professorNome: 'Sistema IA',
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            turmaId: turma.id,
            turmaNome: turma.nome,
            disciplina,
          });

          const destinoEmail = config.emailDestinoNotificacoes || 'domiciliarmaluf@gmail.com';
          await emailService.sendAIActivity(
            destinoEmail,
            aluno.nome,
            turma.nome,
            disciplina,
            resIA.texto,
            resIA.pdf,
            resIA.docx
          );

          processados++;
          resultados.push({ aluno: aluno.nome, turma: turma.nome, status: 'sucesso' });
        } catch (err: any) {
          console.error(`Erro ao gerar IA para aluno ${aluno.nome}:`, err);
          resultados.push({ aluno: aluno.nome, turma: turma.nome, status: 'erro', error: err.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processados,
      resultados,
    });
  } catch (error: any) {
    console.error('Erro na rota de cron da IA:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
