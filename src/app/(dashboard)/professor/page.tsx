'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Turma, Aluno, Envio } from '@/types';
import { formatDate, isPeriodoAtivoAluno } from '@/lib/utils';

interface EnvioComAluno extends Envio {
  alunoDataFim?: string;
}

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunosMap, setAlunosMap] = useState<Record<string, Aluno[]>>({});
  const [enviosPendentes, setEnviosPendentes] = useState<EnvioComAluno[]>([]);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Carrega turmas do professor
      const turmasData = await FirestoreService.getAllByType<Turma>(DOC_TYPES.TURMA);
      const turmasProfessor = turmasData.filter(
        (t) => t.active && (t.professorIds || []).includes(user!.id)
      );

      setTurmas(turmasProfessor);

      // Carrega alunos domiciliares ativos (dentro do período do atestado) das turmas
      const alunosData = await FirestoreService.getAllByType<Aluno>(DOC_TYPES.ALUNO);
      const map: Record<string, Aluno[]> = {};

      const alunosAtivosNoPeriodo = alunosData.filter(isPeriodoAtivoAluno);

      for (const t of turmasProfessor) {
        map[t.id] = alunosAtivosNoPeriodo.filter((a) => a.turmaId === t.id);
      }
      setAlunosMap(map);

      // Carrega envios do professor para alunos que ainda estão no período de atestado
      const enviosData = await FirestoreService.query<Envio>(DOC_TYPES.ENVIO, [
        whereEqual('professorId', user!.id),
      ]);

      const alunosMapById = new Map(alunosAtivosNoPeriodo.map((a) => [a.id, a]));

      const pendentesFiltrados: EnvioComAluno[] = [];

      for (const e of enviosData) {
        if ((e.status === 'pendente' || e.status === 'atrasado') && alunosMapById.has(e.alunoId)) {
          const aluno = alunosMapById.get(e.alunoId);
          pendentesFiltrados.push({
            ...e,
            alunoDataFim: aluno?.dataFim,
          });
        }
      }

      setEnviosPendentes(pendentesFiltrados);
    } catch (error) {
      console.error('Erro ao carregar dashboard professor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Bem-vindo, Prof. ${user?.name}`}
        description="Painel de acompanhamento e envio de atividades domiciliares"
      />

      {/* Turmas do Professor */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sua(s) Turma(s) Atribuída(s)</h3>
        {turmas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Você ainda não está vinculado a nenhuma turma ativa. Entre em contato com o pedagogo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {turmas.map((turma) => {
              const alunosTurma = alunosMap[turma.id] || [];
              return (
                <Card key={turma.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>{turma.nome}</CardTitle>
                      <Badge variant="info">{turma.serie} ({turma.ano})</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Alunos Domiciliares em Atestado ({alunosTurma.length}):
                    </p>
                    {alunosTurma.length === 0 ? (
                      <p className="text-xs text-gray-500 italic mb-4">Nenhum aluno em atividade domiciliar nesta turma.</p>
                    ) : (
                      <ul className="text-sm text-gray-600 space-y-1 mb-4">
                        {alunosTurma.map((a) => (
                          <li key={a.id} className="flex justify-between items-center">
                            <span>• {a.nome}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/professor/enviar?turmaId=${turma.id}&alunoId=${a.id}`)}
                            >
                              Enviar
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      variant="primary"
                      className="w-full mt-2"
                      onClick={() => router.push(`/professor/turmas/${turma.id}`)}
                    >
                      Ver Detalhes da Turma
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Atividades Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {enviosPendentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                    Nenhuma atividade pendente de envio! Tudo em dia. ✨
                  </TableCell>
                </TableRow>
              ) : (
                enviosPendentes.map((envio) => (
                  <TableRow key={envio.id}>
                    <TableCell className="font-medium text-gray-900">{envio.alunoNome || '-'}</TableCell>
                    <TableCell>{envio.turmaNome || '-'}</TableCell>
                    <TableCell>{envio.disciplina}</TableCell>
                    <TableCell>{formatDate(envio.alunoDataFim || envio.dataEnvio)}</TableCell>
                    <TableCell>
                      <Badge variant="warning">
                        Pendente
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(`/professor/enviar?turmaId=${envio.turmaId}&alunoId=${envio.alunoId}`)
                        }
                      >
                        Enviar Agora
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
