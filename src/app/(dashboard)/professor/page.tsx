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
import { Envio } from '@/types';
import { formatDate } from '@/lib/utils';

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enviosPendentes, setEnviosPendentes] = useState<Envio[]>([]);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Carrega envios do professor
      const enviosData = await FirestoreService.query<Envio>(DOC_TYPES.ENVIO, [
        whereEqual('professorId', user!.id),
      ]);
      setEnviosPendentes(enviosData.filter((e) => e.status === 'pendente' || e.status === 'atrasado'));
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
                    <TableCell>{formatDate(envio.dataEnvio)}</TableCell>
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
