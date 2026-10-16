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

      const hojeStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

      const alunosComStatus: AlunoComStatus[] = alunosDaTurma.map((aluno) => {
        const alunoEnvios = todosEnvios.filter((e) => e.alunoId === aluno.id && e.turmaId === turmaId);
        const temPendenciaExplicit = alunoEnvios.some((e) => e.status === 'pendente' || e.status === 'atrasado');

        const enviosCompletados = alunoEnvios.filter((e) => e.status === 'enviado' || e.status === 'gerado_ia');
        const ultimoEnvio = enviosCompletados.sort((a, b) => (b.dataEnvio > a.dataEnvio ? 1 : -1))[0];

        let temPendencia = temPendenciaExplicit;
        if (!ultimoEnvio) {
          temPendencia = true;
        } else if (ultimoEnvio.dataEnvio) {
          const dataUltimo = new Date(ultimoEnvio.dataEnvio);
          const dataHoje = new Date(hojeStr);
          const diffDias = Math.floor((dataHoje.getTime() - dataUltimo.getTime()) / (1000 * 3600 * 24));
          if (diffDias >= 14) {
            temPendencia = true;
          }
        }

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
