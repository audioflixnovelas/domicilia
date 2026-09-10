import { User, ConfiguracaoGlobal } from '@/types';

export function calculateReminderDates(
  startDateStr: string = '2026-09-10',
  endDateStr: string = '2026-12-16',
  initialDay: 'quinta' | 'quarta' = 'quinta'
): { dateStr: string; dayType: 'quinta' | 'quarta' }[] {
  const result: { dateStr: string; dayType: 'quinta' | 'quarta' }[] = [];

  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  let currentDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));
  const endDate = new Date(Date.UTC(eYear, eMonth - 1, eDay, 23, 59, 59));

  // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  let expectedDay: 'quinta' | 'quarta' = initialDay;

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getUTCDay();

    if (expectedDay === 'quinta' && dayOfWeek === 4) {
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      result.push({ dateStr: `${year}-${month}-${day}`, dayType: 'quinta' });

      // Próximo disparo será Quarta-feira na semana seguinte (6 dias depois)
      currentDate.setUTCDate(currentDate.getUTCDate() + 6);
      expectedDay = 'quarta';
    } else if (expectedDay === 'quarta' && dayOfWeek === 3) {
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      result.push({ dateStr: `${year}-${month}-${day}`, dayType: 'quarta' });

      // Próximo disparo será Quinta-feira na semana seguinte (8 dias depois)
      currentDate.setUTCDate(currentDate.getUTCDate() + 8);
      expectedDay = 'quinta';
    } else {
      // Avança um dia até encontrar o próximo dia inicial correto
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  return result;
}

export async function syncAnnualRemindersForTeacher(
  teacher: User,
  config: ConfiguracaoGlobal
): Promise<{ successCount: number; errorCount: number }> {
  if (!teacher.googleOAuthTokensJson) {
    return { successCount: 0, errorCount: 0 };
  }

  const startDateStr = config.dataInicioLembretes || '2026-09-10';
  const endDateStr = config.dataFimLembretes || '2026-12-16';
  const initialDay = config.diaInicialLembretes || 'quinta';
  const reminderTime = config.horarioLembrete || '07:00';

  const dates = calculateReminderDates(startDateStr, endDateStr, initialDay);
  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://domicilia-maluf.squareweb.app';

  let successCount = 0;
  let errorCount = 0;

  for (const item of dates) {
    const isThursday = item.dayType === 'quinta';
    const summary = isThursday
      ? 'Início da semana de atividades domiciliares'
      : 'Último dia para envio de atividades domiciliares';

    const description = isThursday
      ? 'A partir de hoje inicia-se o prazo para envio das atividades domiciliares no DomicilIA (Colégio Maluf).'
      : 'Hoje é o último dia para envio das atividades domiciliares no DomicilIA (Colégio Maluf). Em caso de já ter enviado, desconsidere esse lembrete.';

    try {
      const res = await fetch(`${backendUrl}/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: 'primary',
          oauthTokens: teacher.googleOAuthTokensJson,
          summary,
          description,
          startDate: item.dateStr,
          endDate: item.dateStr,
          timeStr: reminderTime,
        }),
      });

      if (res.ok) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      console.error(`Erro ao criar evento para a data ${item.dateStr}:`, err);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}
