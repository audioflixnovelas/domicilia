import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Aluno, Turma, Envio, User, CronLog, ConfiguracaoGlobal } from '@/types';
import { emailService } from '@/lib/services/email';
import { getCurrentTime } from '@/lib/utils';

export const runtime = 'nodejs';

function isPeriodoAtivo(aluno: Aluno): boolean {
  if (!aluno.domiciliar) return false;
  const hojeStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (aluno.dataInicio && aluno.dataFim) {
    return hojeStr >= aluno.dataInicio && hojeStr <= aluno.dataFim;
  }
  return true;
}

function getBrasiliaDateInfo() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(now);
  const dayOfWeekStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(now).toLowerCase();
  const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(now), 10);
  return { now, dateStr, dayOfWeekStr, hour };
}

export async function GET(request: NextRequest) {
  return handleRemindersCron(request);
}

export async function POST(request: NextRequest) {
  return handleRemindersCron(request);
}

async function handleRemindersCron(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const forcedDay = searchParams.get('day'); // 'quinta' | 'quarta'

    const { dateStr, dayOfWeekStr } = getBrasiliaDateInfo();

    // Carregar configurações globais do sistema
    const configs = await FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO);
    const globalConfig = configs.length > 0 ? configs[0] : null;

    // Verificar intervalo de datas ativas configurado pelo admin
    if (!force && globalConfig) {
      if (globalConfig.dataInicioLembretes && dateStr < globalConfig.dataInicioLembretes) {
        return NextResponse.json({
          success: true,
          message: `Lembretes ainda não iniciaram. Data de início configurada: ${globalConfig.dataInicioLembretes}`,
          date: dateStr,
        });
      }
      if (globalConfig.dataFimLembretes && dateStr > globalConfig.dataFimLembretes) {
        return NextResponse.json({
          success: true,
          message: `Lembretes encerrados. Data de término configurada: ${globalConfig.dataFimLembretes}`,
          date: dateStr,
        });
      }
    }

    // Consultar histórico de disparos no Firestore
    const cronLogs = await FirestoreService.getAllByType<CronLog>(DOC_TYPES.CRON_LOG);
    const lastLog = cronLogs.length > 0
      ? cronLogs.sort((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? 1 : -1))[0]
      : null;

    const lastDispatchDay = lastLog?.lastDispatchDay; // 'quinta' | 'quarta' | undefined

    // Configuração do dia inicial escolhido pelo admin (padrão: 'quinta')
    const diaInicialConfig = globalConfig?.diaInicialLembretes || 'quinta';

    // Alternância: se a última semana mandou na quinta, mandar na quarta; se mandou na quarta, mandar na quinta.
    // Se não houver histórico de disparo, usa o dia inicial definido na configuração.
    const nextExpectedDay: 'quinta' | 'quarta' = lastDispatchDay
      ? (lastDispatchDay === 'quinta' ? 'quarta' : 'quinta')
      : diaInicialConfig;

    const isThursday = dayOfWeekStr === 'thursday';
    const isWednesday = dayOfWeekStr === 'wednesday';

    let targetDayToSend: 'quinta' | 'quarta' | null = null;

    if (force) {
      if (forcedDay === 'quinta' || forcedDay === 'quarta') {
        targetDayToSend = forcedDay;
      } else if (isWednesday) {
        targetDayToSend = 'quarta';
      } else if (isThursday) {
        targetDayToSend = 'quinta';
      } else {
        targetDayToSend = nextExpectedDay;
      }
    } else {
      // Verificar se já disparou hoje
      if (lastLog?.lastDispatchDate === dateStr) {
        return NextResponse.json({
          success: true,
          message: 'E-mails já foram disparados hoje.',
          date: dateStr,
          lastDispatchDay,
        });
      }

      if (nextExpectedDay === 'quinta' && isThursday) {
        targetDayToSend = 'quinta';
      } else if (nextExpectedDay === 'quarta' && isWednesday) {
        targetDayToSend = 'quarta';
      }
    }

    if (!targetDayToSend) {
      return NextResponse.json({
        success: true,
        message: 'Hoje não é dia de disparo de lembretes.',
        dayOfWeek: dayOfWeekStr,
        nextExpectedDay,
        lastDispatchDay: lastDispatchDay || 'nenhum',
      });
    }

    // Carregar dados necessários do Firestore
    const [todosAlunos, todasTurmas, todosEnvios, todosProfessores] = await Promise.all([
      FirestoreService.getAllByType<Aluno>(DOC_TYPES.ALUNO),
      FirestoreService.getAllByType<Turma>(DOC_TYPES.TURMA),
      FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
      FirestoreService.query<User>(DOC_TYPES.USER, [whereEqual('role', 'professor')]),
    ]);

    // Filtrar alunos em período de atividade domiciliar ativo
    const alunosAtivos = todosAlunos.filter((a) => a.active !== false && isPeriodoAtivo(a));

    // Turmas que possuem alunos ativos
    const turmasComAlunosAtivos = todasTurmas.filter((t) =>
      alunosAtivos.some((a) => a.turmaId === t.id)
    );

    // Professores associados a essas turmas
    const professoresComAlunosAtivos = todosProfessores.filter((prof) => {
      if (prof.active === false) return false;
      return turmasComAlunosAtivos.some(
        (turma) => turma.professorIds?.includes(prof.id) || prof.turmaIds?.includes(turma.id)
      );
    });

    let emailsEnviados = 0;

    if (targetDayToSend === 'quinta') {
      // Quando for disparado os e-mails de QUINTA-FEIRA, trocar o status de "Em dia" para "Pendente"
      for (const aluno of alunosAtivos) {
        const turma = todasTurmas.find((t) => t.id === aluno.turmaId);
        if (!turma) continue;

        const alunoEnvios = todosEnvios.filter((e) => e.alunoId === aluno.id && e.turmaId === turma.id);
        const temPendente = alunoEnvios.some((e) => e.status === 'pendente');

        if (!temPendente) {
          const novoEnvioData = {
            atividadeId: '',
            alunoId: aluno.id,
            professorId: turma.professorIds?.[0] || '',
            professorNome: '',
            professorEmail: '',
            turmaId: turma.id,
            disciplina: 'Atividade Domiciliar',
            versao: 1,
            status: 'pendente' as const,
            arquivo: null,
            comentarios: '',
            dataEnvio: dateStr,
            horaEnvio: getCurrentTime(),
            pedagogoId: turma.pedagogoId || '',
            alunoNome: aluno.nome,
            turmaNome: turma.nome,
          };
          await FirestoreService.create<Envio>(DOC_TYPES.ENVIO, novoEnvioData);
        }
      }

      // Disparar e-mail de quinta-feira para os professores
      for (const prof of professoresComAlunosAtivos) {
        if (prof.email) {
          const sent = await emailService.sendThursdayEmail(prof.name, prof.email);
          if (sent) emailsEnviados++;
        }
      }
    } else if (targetDayToSend === 'quarta') {
      // Disparar e-mail de quarta-feira para os professores
      for (const prof of professoresComAlunosAtivos) {
        if (prof.email) {
          const sent = await emailService.sendWednesdayEmail(prof.name, prof.email);
          if (sent) emailsEnviados++;
        }
      }
    }

    // Registrar o disparo no CRON_LOG
    await FirestoreService.create<CronLog>(DOC_TYPES.CRON_LOG, {
      lastDispatchDay: targetDayToSend,
      lastDispatchDate: dateStr,
    });

    return NextResponse.json({
      success: true,
      daySent: targetDayToSend,
      emailsEnviados,
      professoresNotificados: professoresComAlunosAtivos.map((p) => ({ id: p.id, name: p.name, email: p.email })),
      date: dateStr,
    });
  } catch (error: any) {
    console.error('Erro na rota de cron de lembretes:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
