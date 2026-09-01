'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { ConfiguracaoGlobal } from '@/types';

export default function ConfiguracoesAdminPage() {
  const [config, setConfig] = useState<ConfiguracaoGlobal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const configs = await FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO);
      if (configs.length > 0) { setConfig(configs[0]); }
      else {
        setConfig({
          id: '', nomeInstituicao: '', logoUrl: '', corPrincipal: '#3B82F6',
          diasLembrete: [15, 7, 4, 3, 2, 1, 0], horarioLembrete: '09:00', prazoLimite: 30,
          prazoIA: 7, intervaloIA: 15, maxTentativasIA: 5,
          textoEmailLembrete: 'Lembrete: Voce possui atividade domiciliar pendente.',
          textoEmailConfirmacao: 'Sua atividade foi enviada com sucesso.',
          assinaturaEmail: 'Atenciosamente,\nSistema de Atividades Domiciliares',
          emailDestinoNotificacoes: 'domiciliarmaluf@gmail.com', iaHabilitada: false,
          iaProvider: 'llm7', iaApiKey: '', iaModelo: 'gpt-3.5-turbo',
          senhaProfessor: 'professor123',
          createdAt: '', updatedAt: '',
        });
      }
    } catch (error) { console.error('Erro ao carregar configuracoes:', error); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true); setSuccess(false);
    try {
      if (config.id) { await FirestoreService.update(config.id, config); }
      else { const id = await FirestoreService.create(DOC_TYPES.CONFIGURACAO, config); setConfig({ ...config, id }); }
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch (error) { console.error('Erro ao salvar configuracoes:', error); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader title="Configuracoes do Sistema" description="Configure os parametros globais do sistema"
        actions={<Button onClick={handleSave} loading={saving}>Salvar Configuracoes</Button>} />
      {success && <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">Configuracoes salvas com sucesso!</div>}
      <div className="space-y-6">
        <Card><CardHeader><h3 className="text-lg font-semibold text-gray-900">Instituicao</h3></CardHeader><CardContent className="space-y-4">
          <Input label="Nome da Instituicao" value={config?.nomeInstituicao || ''} onChange={(e) => setConfig({ ...config!, nomeInstituicao: e.target.value })} placeholder="Nome da instituicao" />
          <Input label="Cor Principal" type="color" value={config?.corPrincipal || '#3B82F6'} onChange={(e) => setConfig({ ...config!, corPrincipal: e.target.value })} />
        </CardContent></Card>
        <Card><CardHeader><h3 className="text-lg font-semibold text-gray-900">Lembretes</h3></CardHeader><CardContent className="space-y-4">
          <Input label="Horario dos Lembretes" type="time" value={config?.horarioLembrete || '09:00'} onChange={(e) => setConfig({ ...config!, horarioLembrete: e.target.value })} />
          <Input label="Dias Antes do Prazo (separados por virgula)" value={config?.diasLembrete?.join(', ') || ''} onChange={(e) => setConfig({ ...config!, diasLembrete: e.target.value.split(',').map((d) => parseInt(d.trim()) || 0) })} placeholder="15, 7, 4, 3, 2, 1, 0" />
          <Input label="Texto do E-mail de Lembrete" value={config?.textoEmailLembrete || ''} onChange={(e) => setConfig({ ...config!, textoEmailLembrete: e.target.value })} />
        </CardContent></Card>
        <Card><CardHeader><h3 className="text-lg font-semibold text-gray-900">Prazos</h3></CardHeader><CardContent className="space-y-4">
          <Input label="Prazo Limite (dias)" type="number" value={config?.prazoLimite || 30} onChange={(e) => setConfig({ ...config!, prazoLimite: parseInt(e.target.value) || 30 })} />
        </CardContent></Card>
        <Card><CardHeader><h3 className="text-lg font-semibold text-gray-900">Inteligencia Artificial</h3></CardHeader><CardContent className="space-y-4">
          <div className="flex items-center space-x-2"><input type="checkbox" id="iaHabilitada" checked={config?.iaHabilitada || false} onChange={(e) => setConfig({ ...config!, iaHabilitada: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="iaHabilitada" className="text-sm font-medium text-gray-700">Habilitar Geracao Automatica por IA</label></div>
          <Input label="Prazo para Geracao IA (dias antes do vencimento)" type="number" value={config?.prazoIA || 7} onChange={(e) => setConfig({ ...config!, prazoIA: parseInt(e.target.value) || 7 })} />
          <Input label="Intervalo entre Tentativas IA (minutos)" type="number" value={config?.intervaloIA || 15} onChange={(e) => setConfig({ ...config!, intervaloIA: parseInt(e.target.value) || 15 })} />
          <Input label="Maximo de Tentativas IA" type="number" value={config?.maxTentativasIA || 5} onChange={(e) => setConfig({ ...config!, maxTentativasIA: parseInt(e.target.value) || 5 })} />
          <Input label="Chave API (opcional para LLM7 free)" value={config?.iaApiKey || ''} onChange={(e) => setConfig({ ...config!, iaApiKey: e.target.value })} placeholder="Deixe vazio para uso gratuito" />
        </CardContent></Card>
        <Card><CardHeader><h3 className="text-lg font-semibold text-gray-900">Acesso do Professor</h3></CardHeader><CardContent className="space-y-4">
          <Input label="Senha de Acesso do Professor" type="password" value={config?.senhaProfessor || 'professor123'} onChange={(e) => setConfig({ ...config!, senhaProfessor: e.target.value })} helperText="Senha que os professores usarao para acessar o sistema" />
        </CardContent></Card>
        <Card><CardHeader><h3 className="text-lg font-semibold text-gray-900">E-mails</h3></CardHeader><CardContent className="space-y-4">
          <Input label="E-mail de Notificacoes" type="email" value={config?.emailDestinoNotificacoes || ''} onChange={(e) => setConfig({ ...config!, emailDestinoNotificacoes: e.target.value })} placeholder="email@exemplo.com" />
          <Input label="Assinatura dos E-mails" value={config?.assinaturaEmail || ''} onChange={(e) => setConfig({ ...config!, assinaturaEmail: e.target.value })} />
        </CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
