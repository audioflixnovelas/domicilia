'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Envio, Turma, User } from '@/types';
import { formatDate } from '@/lib/utils';

export default function RelatoriosAdminPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [enviosData, turmasData, professoresData] = await Promise.all([
        FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
        FirestoreService.getAllByType<Turma>(DOC_TYPES.TURMA),
        FirestoreService.query<User>(DOC_TYPES.USER, [whereEqual('role', 'professor')]),
      ]);
      setEnvios(enviosData);
      setTurmas(turmasData);
      setProfessores(professoresData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnvios = envios.filter((envio) => {
    if (filtroTurma && envio.turmaId !== filtroTurma) return false;
    if (filtroProfessor && envio.professorId !== filtroProfessor) return false;
    if (filtroPeriodoInicio && envio.dataEnvio < filtroPeriodoInicio) return false;
    if (filtroPeriodoFim && envio.dataEnvio > filtroPeriodoFim) return false;
    return true;
  });

  const stats = {
    total: filteredEnvios.length,
    enviados: filteredEnvios.filter((e) => e.status === 'enviado').length,
    pendentes: filteredEnvios.filter((e) => e.status === 'pendente').length,
    atrasados: filteredEnvios.filter((e) => e.status === 'atrasado').length,
    geradosIA: filteredEnvios.filter((e) => e.status === 'gerado_ia').length,
  };

  const exportToCSV = () => {
    const headers = ['Aluno', 'Professor', 'Turma', 'Disciplina', 'Data', 'Hora', 'Status', 'Versão'];
    const rows = filteredEnvios.map((e) => [
      e.alunoNome,
      e.professorNome,
      e.turmaNome,
      e.disciplina,
      e.dataEnvio,
      e.horaEnvio,
      e.status,
      e.versao.toString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Relatórios"
        description="Visualize e exporte relatórios do sistema"
        actions={
          <Button onClick={exportToCSV} variant="outline">
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Enviados</p>
            <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Atrasados</p>
            <p className="text-2xl font-bold text-red-600">{stats.atrasados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Gerados IA</p>
            <p className="text-2xl font-bold text-purple-600">{stats.geradosIA}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Select
              label="Turma"
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
              options={turmas.map((t) => ({ value: t.id, label: t.nome }))}
              placeholder="Todas as turmas"
            />
            <Select
              label="Professor"
              value={filtroProfessor}
              onChange={(e) => setFiltroProfessor(e.target.value)}
              options={professores.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Todos os professores"
            />
            <Input
              label="Período Início"
              type="date"
              value={filtroPeriodoInicio}
              onChange={(e) => setFiltroPeriodoInicio(e.target.value)}
            />
            <Input
              label="Período Fim"
              type="date"
              value={filtroPeriodoFim}
              onChange={(e) => setFiltroPeriodoFim(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Aluno</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Versão</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredEnvios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Nenhum envio encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredEnvios.map((envio) => (
                <TableRow key={envio.id}>
                  <TableCell>{envio.alunoNome}</TableCell>
                  <TableCell>{envio.professorNome}</TableCell>
                  <TableCell>{envio.turmaNome}</TableCell>
                  <TableCell>{envio.disciplina}</TableCell>
                  <TableCell>{formatDate(envio.dataEnvio)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        envio.status === 'enviado'
                          ? 'success'
                          : envio.status === 'pendente'
                          ? 'warning'
                          : envio.status === 'atrasado'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {envio.status === 'enviado'
                        ? 'Enviado'
                        : envio.status === 'pendente'
                        ? 'Pendente'
                        : envio.status === 'atrasado'
                        ? 'Atrasado'
                        : 'Gerado IA'}
                    </Badge>
                  </TableCell>
                  <TableCell>v{envio.versao}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </DashboardLayout>
  );
}
