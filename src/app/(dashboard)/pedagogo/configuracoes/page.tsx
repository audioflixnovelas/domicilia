'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { LembreteConfig } from '@/types';

export default function ConfiguracoesPedagogoPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<LembreteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) loadConfig();
  }, [user]);

  const loadConfig = async () => {
    try {
      const configs = await FirestoreService.query<LembreteConfig>(DOC_TYPES.LEMBRETE, [
        whereEqual('pedagogoId', user!.id),
      ]);
      if (configs.length > 0) {
        setConfig(configs[0]);
      } else {
        setConfig({
          id: '',
          pedagogoId: user!.id,
          diasAntes: [15, 7, 4, 3, 2, 1, 0],
          horario: '09:00',
          ativo: true,
          textoEmail:
            'Lembrete: Você possui atividade domiciliar pendente. Por favor, envie a atividade o mais rápido possível.',
          assinatura: 'Atenciosamente,\nCoordenação Pedagógica',
          createdAt: '',
          updatedAt: '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSuccess(false);

    try {
      if (config.id) {
        await FirestoreService.update(config.id, config);
      } else {
        const id = await FirestoreService.create(DOC_TYPES.LEMBRETE, config);
        setConfig({ ...config, id });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Configurações de Lembretes"
        description="Configure os lembretes para os professores"
        actions={
          <Button onClick={handleSave} loading={saving}>
            Salvar Configurações
          </Button>
        }
      />

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          Configurações salvas com sucesso!
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dias de Lembrete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Dias antes do prazo (separados por vírgula)"
              value={config?.diasAntes?.join(', ') || ''}
              onChange={(e) =>
                setConfig({
                  ...config!,
                  diasAntes: e.target.value.split(',').map((d) => parseInt(d.trim()) || 0),
                })
              }
              placeholder="15, 7, 4, 3, 2, 1, 0"
            />
            <Input
              label="Horário dos Lembretes"
              type="time"
              value={config?.horario || '09:00'}
              onChange={(e) => setConfig({ ...config!, horario: e.target.value })}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ativo"
                checked={config?.ativo || false}
                onChange={(e) => setConfig({ ...config!, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                Lembretes Ativos
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Texto do E-mail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem do Lembrete
              </label>
              <textarea
                value={config?.textoEmail || ''}
                onChange={(e) => setConfig({ ...config!, textoEmail: e.target.value })}
                rows={4}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Mensagem do lembrete"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assinatura</label>
              <textarea
                value={config?.assinatura || ''}
                onChange={(e) => setConfig({ ...config!, assinatura: e.target.value })}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Atenciosamente, Coordenação Pedagógica"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
