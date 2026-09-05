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
import { User, Turma, Aluno, Envio } from '@/types';
import { formatDate, isPeriodoAtivoAluno } from '@/lib/utils';

export default function PedagogoDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [professores, setProfessores] = useState<User[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [enviosPendentes, setEnviosPendentes] = useState<Envio[]>([]);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [allProfessores, turmasData, alunosData, enviosData] = await Promise.all([
        FirestoreService.query<User>(DOC_TYPES.USER, [whereEqual('role', 'professor')]),
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
          whereEqual('active', true),
        ]),
        FirestoreService.query<Aluno>(DOC_TYPES.ALUNO, [
          whereEqual('pedagogoId', user!.id),
          whereEqual('active', true),
        ]),
        FirestoreService.query<Envio>(DOC_TYPES.ENVIO, [
          whereEqual('pedagogoId', user!.id),
        ]),
      ]);

      const profsPedagogo = allProfessores.filter(
        (p) => p.pedagogoId === user!.id || (p.pedagogoIds || []).includes(user!.id)
      );

      const alunosAtivosNoPeriodo = alunosData.filter(isPeriodoAtivoAluno);
      const idsAlunosValidos = new Set(alunosAtivosNoPeriodo.map((a) => a.id));

      setProfessores(profsPedagogo);
      setTurmas(turmasData);
      setAlunos(alunosAtivosNoPeriodo);
      setEnviosPendentes(
        enviosData.filter(
          (e) => (e.status === 'pendente' || e.status === 'atrasado') && idsAlunosValidos.has(e.alunoId)
        )
      );
    } catch (error) {
      console.error('Erro ao carregar dashboard pedagogo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Painel do Pedagogo"
        description="Acompanhamento e gestão do atendimento escolar domiciliar"
      />

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3 text-blue-600 text-2xl">
                🎒
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Alunos em Atividade Domiciliar</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {alunos.length}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3 text-indigo-600 text-2xl">
                👨‍🏫
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Professores Vinculados</dt>
                  <dd className="text-2xl font-bold text-gray-900">{professores.length}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 rounded-md p-3 text-amber-600 text-2xl">
                🏫
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Turmas Ativas</dt>
                  <dd className="text-2xl font-bold text-gray-900">{turmas.length}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3 text-red-600 text-2xl">
                ⏳
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Atividades Pendentes</dt>
                  <dd className="text-2xl font-bold text-red-600">{enviosPendentes.length}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Button onClick={() => router.push('/pedagogo/professores/novo')} className="h-12 text-base">
          + Novo Professor
        </Button>
        <Button onClick={() => router.push('/pedagogo/turmas/nova')} variant="outline" className="h-12 text-base">
          + Nova Turma
        </Button>
        <Button onClick={() => router.push('/pedagogo/alunos/novo')} variant="outline" className="h-12 text-base">
          + Novo Aluno Domiciliar
        </Button>
      </div>

      {/* Tabela de Pendências Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Pendências de Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Aluno</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Data Limite / Registro</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {enviosPendentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                    Nenhuma atividade pendente no momento! 🎉
                  </TableCell>
                </TableRow>
              ) : (
                enviosPendentes.slice(0, 5).map((envio) => (
                  <TableRow key={envio.id}>
                    <TableCell className="font-medium text-gray-900">{envio.alunoNome || '-'}</TableCell>
                    <TableCell>{envio.professorNome || '-'}</TableCell>
                    <TableCell>{envio.turmaNome || '-'}</TableCell>
                    <TableCell>{envio.disciplina}</TableCell>
                    <TableCell>{formatDate(envio.dataEnvio)}</TableCell>
                    <TableCell>
                      <Badge variant="warning">
                        Pendente
                      </Badge>
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
