'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Aluno, Envio, Turma, User } from '@/types';
import { getCurrentDate, getCurrentTime } from '@/lib/utils';

interface AlunoComStatus extends Aluno {
  hasPending: boolean;
}

export default function TurmaAlunosPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const turmaId = params.id as string;

  const [alunos, setAlunos] = useState<AlunoComStatus[]>([]);
  const [turma, setTurma] = useState<Turma | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, turmaId]);

  const isPeriodoAtivo = (aluno: Aluno): boolean => {
    if (!aluno.domiciliar) return false;
    if (aluno.dataInicio && aluno.dataFim) {
      const hoje = new Date().toISOString().split('T')[0];
      return hoje >= aluno.dataInicio && hoje <= aluno.dataFim;
    }
    return true;
  };

  const loadData = async () => {
    try {
      const [turmaData, todosAlunos, todosEnvios] = await Promise.all([
        FirestoreService.getById<Turma>(turmaId),
        FirestoreService.getAllByType<Aluno>(DOC_TYPES.ALUNO),
        FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
      ]);

      setTurma(turmaData);

      const alunosDaTurma = todosAlunos.filter((a) => a.turmaId === turmaId && isPeriodoAtivo(a));

      // Sincroniza envios pendentes no banco para alunos que ainda nao possuem envio registrado
      for (const aluno of alunosDaTurma) {
        const alunoEnvios = todosEnvios.filter((e) => e.alunoId === aluno.id && e.turmaId === turmaId);
        if (alunoEnvios.length === 0) {
          const novoEnvioData = {
            atividadeId: '',
            alunoId: aluno.id,
            professorId: user!.id,
            professorNome: user!.name,
            professorEmail: user!.email,
            turmaId,
            disciplina: user?.disciplinas?.[0] || 'Educacao Digital',
            versao: 1,
            status: 'pendente' as const,
            arquivo: null,
            comentarios: '',
            dataEnvio: aluno.dataInicio || getCurrentDate(),
            horaEnvio: getCurrentTime(),
            pedagogoId: turmaData?.pedagogoId || '',
            alunoNome: aluno.nome,
            turmaNome: turmaData?.nome || '',
          };
          const novoEnvioId = await FirestoreService.create<Envio>(DOC_TYPES.ENVIO, novoEnvioData);
          todosEnvios.push({ id: novoEnvioId, ...novoEnvioData, createdAt: '', updatedAt: '' });
        }
      }

      const alunosComStatus: AlunoComStatus[] = alunosDaTurma.map((aluno) => {
        const alunoEnvios = todosEnvios.filter((e) => e.alunoId === aluno.id && e.turmaId === turmaId);
        const temPendencia = alunoEnvios.some((e) => e.status === 'pendente');
        return { ...aluno, hasPending: temPendencia };
      });

      setAlunos(alunosComStatus);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarAtividade = (alunoId: string) => {
    router.push(`/professor/enviar?turmaId=${turmaId}&alunoId=${alunoId}`);
  };

  if (authLoading || loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader title={turma?.nome || 'Alunos'} description="Alunos com atividade domiciliar ativa" actions={<Button variant="outline" onClick={() => router.push('/professor/turmas')}>Voltar</Button>} />
      {alunos.length === 0 ? (
        <EmptyState title="Nenhum aluno com domiciliar ativo" description="Nao ha alunos com periodo vigente nesta turma" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alunos.map((aluno) => (
            <Card key={aluno.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{aluno.nome}</h3>
                  {aluno.hasPending ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendente</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Em dia</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">Matricula: {aluno.matricula}</p>
                {aluno.dataInicio && aluno.dataFim && (
                  <p className="mt-1 text-sm text-gray-500">Periodo: {aluno.dataInicio} a {aluno.dataFim}</p>
                )}
                <div className="mt-4">
                  <Button onClick={() => handleEnviarAtividade(aluno.id)} size="sm">Enviar Atividade</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
