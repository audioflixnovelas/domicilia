'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES } from '@/lib/services/firestore';
import { Aluno, Turma } from '@/types';
import { isPeriodoAtivoAluno } from '@/lib/utils';

export default function ProfessorTurmasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunosCountMap, setAlunosCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [todosAlunos, todasTurmas] = await Promise.all([
        FirestoreService.getAllByType<Aluno>(DOC_TYPES.ALUNO),
        FirestoreService.getAllByType<Turma>(DOC_TYPES.TURMA),
      ]);

      const turmasProfessor = todasTurmas.filter(
        (t) => t.active && (t.professorIds || []).includes(user!.id)
      );

      setTurmas(turmasProfessor);

      const alunosAtivosNoPeriodo = todosAlunos.filter(isPeriodoAtivoAluno);
      const countMap: Record<string, number> = {};

      for (const t of turmasProfessor) {
        countMap[t.id] = alunosAtivosNoPeriodo.filter((a) => a.turmaId === t.id).length;
      }

      setAlunosCountMap(countMap);
    } catch (error) {
      console.error('Erro ao carregar turmas do professor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Minhas Turmas"
        description="Turmas e alunos com atividade domiciliar ativa"
      />

      {turmas.length === 0 ? (
        <EmptyState
          title="Nenhuma turma atribuída"
          description="Você ainda não possui turmas atribuídas no seu perfil."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((turma) => {
            const count = alunosCountMap[turma.id] || 0;
            return (
              <Card key={turma.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-gray-100 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>{turma.nome}</CardTitle>
                    <Badge variant="info">
                      {turma.serie} ({turma.ano})
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Alunos Domiciliares em Atestado: <span className="font-bold text-gray-900">{count}</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    {count > 0
                      ? 'Há alunos que necessitam de acompanhamento de atividades domiciliares.'
                      : 'Nenhum aluno em atestado vigente nesta turma.'}
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push(`/professor/turmas/${turma.id}`)}
                  >
                    Ver Alunos da Turma
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
