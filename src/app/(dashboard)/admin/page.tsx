'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { User, Envio } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPedagogos: 0,
    activePedagogos: 0,
    totalEnvios: 0,
    totalProfessores: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [pedagogos, professores, envios] = await Promise.all([
        FirestoreService.query<User>(DOC_TYPES.USER, [whereEqual('role', 'pedagogo')]),
        FirestoreService.query<User>(DOC_TYPES.USER, [whereEqual('role', 'professor')]),
        FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
      ]);

      setStats({
        totalPedagogos: pedagogos.length,
        activePedagogos: pedagogos.filter((p) => p.active).length,
        totalProfessores: professores.length,
        totalEnvios: envios.length,
      });
    } catch (error) {
      console.error('Erro ao carregar dados do painel do administrador:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Painel do Administrador"
        description="Visão geral do sistema de Atividades Domiciliares"
      />

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3 text-blue-600 text-2xl">
                👥
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pedagogos Cadastrados</dt>
                  <dd className="text-2xl font-bold text-gray-900">{stats.totalPedagogos}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3 text-green-600 text-2xl">
                ✅
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pedagogos Ativos</dt>
                  <dd className="text-2xl font-bold text-green-600">{stats.activePedagogos}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Professores no Sistema</dt>
                  <dd className="text-2xl font-bold text-gray-900">{stats.totalProfessores}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3 text-purple-600 text-2xl">
                📄
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total de Envios</dt>
                  <dd className="text-2xl font-bold text-gray-900">{stats.totalEnvios}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>👥</span> Gerenciar Pedagogos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Cadastre novos pedagogos, edite informações existentes ou altere o status de acesso.
            </p>
            <Button onClick={() => router.push('/admin/pedagogos')} className="w-full">
              Acessar Pedagogos
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📈</span> Relatórios Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Visualize o acompanhamento completo de atividades por professor, turma e disciplina.
            </p>
            <Button onClick={() => router.push('/admin/relatorios')} variant="outline" className="w-full">
              Ver Relatórios
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>⚙️</span> Configurações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Ajuste prazos, lembretes por e-mail, integração de IA e senha padrão para professores.
            </p>
            <Button onClick={() => router.push('/admin/configuracoes')} variant="outline" className="w-full">
              Abrir Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
