'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { emailService } from '@/lib/services/email';
import { Turma, User, Envio, ConfiguracaoGlobal } from '@/types';
import { getCurrentDate, getCurrentTime } from '@/lib/utils';

export default function NovoAlunoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    turmaId: '',
    responsavelNome: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    domiciliar: false,
    dataInicio: '',
    dataFim: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadTurmas();
  }, [user]);

  const loadTurmas = async () => {
    try {
      const data = await FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
        whereEqual('pedagogoId', user!.id),
        whereEqual('active', true),
      ]);
      setTurmas(data);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const alunoId = await FirestoreService.create(DOC_TYPES.ALUNO, {
        nome: formData.nome,
        matricula: formData.matricula,
        turmaId: formData.turmaId,
        pedagogoId: user!.id,
        responsavelNome: formData.responsavelNome,
        responsavelEmail: formData.responsavelEmail,
        responsavelTelefone: formData.responsavelTelefone,
        active: true,
        domiciliar: formData.domiciliar,
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim,
      });

      const turma = turmas.find((t) => t.id === formData.turmaId);
      if (turma) {
        await FirestoreService.update(formData.turmaId, {
          alunoIds: [...(turma.alunoIds || []), alunoId],
        });
      }

      // Se aluno for domiciliar, gera registros de atividades pendentes e notifica professores
      if (formData.domiciliar) {
        const [professores, envios, configs] = await Promise.all([
          FirestoreService.getAllByType<User>(DOC_TYPES.USER),
          FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
          FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO),
        ]);

        const globalConfig = configs.length > 0 ? configs[0] : null;

        const profsTurma = professores.filter(
          (p) => p.role === 'professor' && turma?.professorIds?.includes(p.id)
        );

        for (const prof of profsTurma) {
          const temEnvio = envios.some(
            (e) => e.alunoId === alunoId && e.turmaId === formData.turmaId && e.professorId === prof.id
          );

          if (!temEnvio) {
            await FirestoreService.create<Envio>(DOC_TYPES.ENVIO, {
              atividadeId: '',
              alunoId,
              professorId: prof.id,
              professorNome: prof.name,
              professorEmail: prof.email,
              turmaId: formData.turmaId,
              disciplina: prof.disciplinas?.[0] || 'Atividade Domiciliar',
              versao: 1,
              status: 'pendente',
              arquivo: null,
              comentarios: '',
              dataEnvio: formData.dataInicio || getCurrentDate(),
              horaEnvio: getCurrentTime(),
              pedagogoId: user!.id,
              alunoNome: formData.nome,
              turmaNome: turma?.nome || '',
            });

            // Dispara e-mail avisando o professor
            if (prof.email) {
              await emailService.sendThursdayEmail(prof.name, prof.email);
            }

            // Sincroniza com Google Agenda via backend Python
            try {
              await fetch('/api/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  calendarId: globalConfig?.googleCalendarId || 'primary',
                  credentialsJson: globalConfig?.googleCredentialsJson,
                  summary: `Atividade Domiciliar - ${formData.nome}`,
                  description: `Prazo de Atividade Domiciliar para o aluno ${formData.nome} na turma ${turma?.nome || ''}.`,
                  startDate: formData.dataInicio || getCurrentDate(),
                  endDate: formData.dataFim || formData.dataInicio || getCurrentDate(),
                  attendees: prof.email ? [prof.email] : [],
                }),
              });
            } catch (calErr) {
              console.error('Erro ao sincronizar com Google Agenda:', calErr);
            }
          }
        }
      }

      router.push('/pedagogo/alunos');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar aluno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Novo Aluno" description="Cadastre um novo aluno" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Nome do Aluno" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome completo" required />
          <Input label="Matricula" value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} placeholder="Numero da matricula" required />
          <Select label="Turma" value={formData.turmaId} onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })} options={turmas.map((t) => ({ value: t.id, label: t.nome }))} placeholder="Selecione a turma" required />
          <Input label="Nome do Responsavel" value={formData.responsavelNome} onChange={(e) => setFormData({ ...formData, responsavelNome: e.target.value })} placeholder="Nome do responsavel" required />
          <Input label="E-mail do Responsavel" type="email" value={formData.responsavelEmail} onChange={(e) => setFormData({ ...formData, responsavelEmail: e.target.value })} placeholder="email@exemplo.com" required />
          <Input label="Telefone do Responsavel" value={formData.responsavelTelefone} onChange={(e) => setFormData({ ...formData, responsavelTelefone: e.target.value })} placeholder="(11) 99999-9999" />

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Atividade Domiciliar</h3>
            <div className="flex items-center space-x-2 mb-4">
              <input type="checkbox" id="domiciliar" checked={formData.domiciliar} onChange={(e) => setFormData({ ...formData, domiciliar: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="domiciliar" className="text-sm font-medium text-gray-700">Aluno em atividade domiciliar</label>
            </div>
            {formData.domiciliar && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Data Inicio" type="date" value={formData.dataInicio} onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })} required={formData.domiciliar} />
                <Input label="Data Fim" type="date" value={formData.dataFim} onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })} required={formData.domiciliar} />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" loading={loading}>Cadastrar</Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
