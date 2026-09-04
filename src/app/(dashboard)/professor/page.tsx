'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Turma, Aluno, Envio, ConfiguracaoGlobal } from '@/types';
import { formatDate, isPeriodoAtivoAluno } from '@/lib/utils';

function ProfessorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunosMap, setAlunosMap] = useState<Record<string, Aluno[]>>({});
  const [enviosPendentes, setEnviosPendentes] = useState<Envio[]>([]);
  const [globalConfig, setGlobalConfig] = useState<ConfiguracaoGlobal | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  useEffect(() => {
    // Processa callback OAuth se reencaminhado com 'code'
    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams]);

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

      const idsAlunosValidos = new Set(alunosAtivosNoPeriodo.map((a) => a.id));

      const pendentesFiltrados = enviosData.filter(
        (e) => (e.status === 'pendente' || e.status === 'atrasado') && idsAlunosValidos.has(e.alunoId)
      );

      setEnviosPendentes(pendentesFiltrados);

      // Carrega config global
      const configs = await FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO);
      if (configs.length > 0) setGlobalConfig(configs[0]);
    } catch (error) {
      console.error('Erro ao carregar dashboard professor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      const redirectUri = window.location.origin + '/professor';
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'callback',
          code,
          clientId: globalConfig?.googleOAuthClientId,
          clientSecret: globalConfig?.googleOAuthClientSecret,
          redirectUri,
        }),
      });

      const data = await res.json();
      if (data.oauthTokensJson && globalConfig?.id) {
        await FirestoreService.update(globalConfig.id, {
          googleOAuthTokensJson: data.oauthTokensJson,
        });
        alert('Conta Google vinculada com sucesso ao DomicilIA!');
        router.replace('/professor');
      }
    } catch (err) {
      console.error('Erro no callback OAuth:', err);
    }
  };

  const handleVincularGoogle = async () => {
    setOauthLoading(true);
    try {
      const redirectUri = window.location.origin + '/professor';

      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_auth_url',
          clientId: globalConfig?.googleOAuthClientId,
          clientSecret: globalConfig?.googleOAuthClientSecret,
          redirectUri,
        }),
      });

      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || 'Configure o Client ID e Client Secret em Configurações do Sistema para realizar o vínculo.');
      }
    } catch (err) {
      console.error('Erro ao solicitar OAuth:', err);
      alert('Falha ao conectar com o serviço do Google Agenda.');
    } finally {
      setOauthLoading(false);
    }
  };

  if (loading) return <PageLoading />;

  const isLinked = Boolean(globalConfig?.googleOAuthTokensJson || globalConfig?.googleCredentialsJson);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Bem-vindo, Prof. ${user?.name}`}
        description="Painel de acompanhamento e envio de atividades domiciliares"
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleVincularGoogle}
              loading={oauthLoading}
              className="flex items-center gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {isLinked ? '✓ Conta Google Vinculada' : 'Vincular Conta Google com DomicilIA'}
            </Button>

            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              📅 Abrir Google Agenda
            </a>
          </div>
        }
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
                <TableHead>Data do Registro / Início</TableHead>
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

export default function ProfessorDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProfessorDashboardContent />
    </Suspense>
  );
}
