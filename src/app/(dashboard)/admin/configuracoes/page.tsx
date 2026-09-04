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
import { FirestoreService, DOC_TYPES } from '@/lib/services/firestore';
import { ConfiguracaoGlobal } from '@/types';

const defaultDisciplinas = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Educação Física', 'Artes', 'Música', 'Informática', 'Educação Digital'
];

export default function ConfiguracoesAdminPage() {
  const [config, setConfig] = useState<ConfiguracaoGlobal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [novaDisciplina, setNovaDisciplina] = useState('');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const configs = await FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO);
      if (configs.length > 0) {
        const loadedConfig = configs[0];
        if (!Array.isArray(loadedConfig.disciplinas)) {
          loadedConfig.disciplinas = defaultDisciplinas;
        }
        setConfig(loadedConfig);
      } else {
        setConfig({
          id: '',
          nomeInstituicao: '',
          logoUrl: '',
          corPrincipal: '#3B82F6',
          disciplinas: defaultDisciplinas,
          diasLembrete: [15, 7, 4, 3, 2, 1, 0],
          horarioLembrete: '09:00',
          dataInicioLembretes: '',
          dataFimLembretes: '',
          diaInicialLembretes: 'quinta',
          prazoLimite: 30,
          prazoIA: 7,
          intervaloIA: 15,
          maxTentativasIA: 5,
          textoEmailLembrete: 'Lembrete: Voce possui atividade domiciliar pendente.',
          textoEmailConfirmacao: 'Sua atividade foi enviada com sucesso.',
          assinaturaEmail: 'Atenciosamente,\nSistema de Atividades Domiciliares',
          emailDestinoNotificacoes: 'domiciliarmaluf@gmail.com',
          googleCalendarId: 'primary',
          googleCredentialsJson: '',
          googleOAuthClientId: '',
          googleOAuthClientSecret: '',
          googleOAuthTokensJson: '',
          iaHabilitada: false,
          iaProvider: 'llm7',
          iaApiKey: '',
          iaModelo: 'gpt-3.5-turbo',
          senhaProfessor: 'professor123',
          createdAt: '',
          updatedAt: '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuracoes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfigToFirestore = async (configToSave: ConfiguracaoGlobal) => {
    if (configToSave.id) {
      await FirestoreService.update(configToSave.id, configToSave);
      return configToSave.id;
    } else {
      const newId = await FirestoreService.create(DOC_TYPES.CONFIGURACAO, configToSave);
      return newId;
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSuccess(false);
    try {
      const id = await saveConfigToFirestore(config);
      if (!config.id) {
        setConfig({ ...config, id });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configuracoes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleIniciarOAuth = async () => {
    if (!config) return;
    setOauthLoading(true);
    try {
      // Salva antes de iniciar OAuth
      await saveConfigToFirestore(config);

      const redirectUri = window.location.origin + '/admin/configuracoes';

      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_auth_url',
          clientId: config.googleOAuthClientId,
          clientSecret: config.googleOAuthClientSecret,
          redirectUri,
        }),
      });

      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || 'Erro ao gerar URL de autorização OAuth do Google.');
      }
    } catch (err) {
      console.error('Erro ao iniciar vínculo OAuth:', err);
      alert('Falha na comunicação com o backend de autenticação.');
    } finally {
      setOauthLoading(false);
    }
  };

  const addDisciplina = async () => {
    if (!novaDisciplina.trim() || !config) return;
    const item = novaDisciplina.trim();
    const atuais = config.disciplinas || defaultDisciplinas;
    if (!atuais.includes(item)) {
      const novasDisciplinas = [...atuais, item];
      const updatedConfig = { ...config, disciplinas: novasDisciplinas };
      setConfig(updatedConfig);
      setNovaDisciplina('');

      try {
        const id = await saveConfigToFirestore(updatedConfig);
        if (!config.id) setConfig({ ...updatedConfig, id });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        console.error('Erro ao salvar nova matéria:', err);
      }
    } else {
      setNovaDisciplina('');
    }
  };

  const removeDisciplina = async (disciplina: string) => {
    if (!config) return;
    const atuais = config.disciplinas || defaultDisciplinas;
    const novasDisciplinas = atuais.filter((d) => d !== disciplina);
    const updatedConfig = { ...config, disciplinas: novasDisciplinas };
    setConfig(updatedConfig);

    try {
      const id = await saveConfigToFirestore(updatedConfig);
      if (!config.id) setConfig({ ...updatedConfig, id });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Erro ao remover matéria:', err);
    }
  };

  if (loading) return <PageLoading />;

  const isGoogleLinked = Boolean(config?.googleOAuthTokensJson || config?.googleCredentialsJson);

  return (
    <DashboardLayout>
      <PageHeader
        title="Configurações do Sistema"
        description="Configure os parâmetros globais do sistema"
        actions={<Button onClick={handleSave} loading={saving}>Salvar Configurações</Button>}
      />
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          Configurações salvas com sucesso!
        </div>
      )}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Instituição</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nome da Instituição"
              value={config?.nomeInstituicao || ''}
              onChange={(e) => setConfig({ ...config!, nomeInstituicao: e.target.value })}
              placeholder="Nome da instituição"
            />
            <Input
              label="Cor Principal"
              type="color"
              value={config?.corPrincipal || '#3B82F6'}
              onChange={(e) => setConfig({ ...config!, corPrincipal: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Gerenciamento de Matérias / Disciplinas */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Matérias / Disciplinas</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da nova matéria (ex: Filosofia, Sociologia)"
                value={novaDisciplina}
                onChange={(e) => setNovaDisciplina(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDisciplina(); } }}
              />
              <Button type="button" onClick={addDisciplina}>Adicionar Matéria</Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {(config?.disciplinas || defaultDisciplinas).map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200">
                  {d}
                  <button
                    type="button"
                    onClick={() => removeDisciplina(d)}
                    className="text-blue-500 hover:text-red-600 font-bold ml-1 rounded-full p-0.5 cursor-pointer"
                    title="Remover matéria"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integração Vínculo Google Agenda */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Vínculo Google Agenda (Google OAuth)</h3>
              {isGoogleLinked ? (
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                  ✓ Conta Google Vinculada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                  ⚠️ Pendente de Vínculo
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Conecte a conta do Google da instituição via OAuth para registrar e sincronizar os prazos de atividades automaticamente no Google Agenda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Google Client ID (OAuth)"
                value={config?.googleOAuthClientId || ''}
                onChange={(e) => setConfig({ ...config!, googleOAuthClientId: e.target.value })}
                placeholder="xxxx.apps.googleusercontent.com"
              />
              <Input
                label="Google Client Secret (OAuth)"
                type="password"
                value={config?.googleOAuthClientSecret || ''}
                onChange={(e) => setConfig({ ...config!, googleOAuthClientSecret: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                onClick={handleIniciarOAuth}
                loading={oauthLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {isGoogleLinked ? 'Reconectar / Vincular Conta Google' : 'Vincular Conta Google com DomicilIA'}
              </Button>
            </div>

            <hr className="my-4 border-gray-200" />

            <Input
              label="ID da Agenda do Google (Calendar ID)"
              value={config?.googleCalendarId || 'primary'}
              onChange={(e) => setConfig({ ...config!, googleCalendarId: e.target.value })}
              placeholder="ex: primary"
              helperText="Padrão 'primary' utiliza a agenda principal da conta vinculada"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Lembretes Automáticos</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data de Início dos Lembretes"
                type="date"
                value={config?.dataInicioLembretes || ''}
                onChange={(e) => setConfig({ ...config!, dataInicioLembretes: e.target.value })}
                helperText="Data a partir da qual os lembretes começam a ser enviados"
              />
              <Input
                label="Data de Término dos Lembretes"
                type="date"
                value={config?.dataFimLembretes || ''}
                onChange={(e) => setConfig({ ...config!, dataFimLembretes: e.target.value })}
                helperText="Data limite após a qual os lembretes deixam de ser enviados"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Dia Inicial do Ciclo de Lembrete"
                  value={config?.diaInicialLembretes || 'quinta'}
                  onChange={(e) => setConfig({ ...config!, diaInicialLembretes: e.target.value as 'quinta' | 'quarta' })}
                  options={[
                    { value: 'quinta', label: 'Quinta-feira' },
                    { value: 'quarta', label: 'Quarta-feira' },
                  ]}
                />
                <p className="mt-1 text-xs text-gray-500">Primeiro dia do ciclo de disparos dos lembretes</p>
              </div>
              <Input
                label="Horário do Disparo"
                type="time"
                value={config?.horarioLembrete || '09:00'}
                onChange={(e) => setConfig({ ...config!, horarioLembrete: e.target.value })}
              />
            </div>

            <Input
              label="Dias Antes do Prazo (separados por vírgula)"
              value={config?.diasLembrete?.join(', ') || ''}
              onChange={(e) =>
                setConfig({
                  ...config!,
                  diasLembrete: e.target.value.split(',').map((d) => parseInt(d.trim()) || 0),
                })
              }
              placeholder="15, 7, 4, 3, 2, 1, 0"
            />
            <Input
              label="Texto do E-mail de Lembrete"
              value={config?.textoEmailLembrete || ''}
              onChange={(e) => setConfig({ ...config!, textoEmailLembrete: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Prazos</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Prazo Limite (dias)"
              type="number"
              value={config?.prazoLimite || 30}
              onChange={(e) => setConfig({ ...config!, prazoLimite: parseInt(e.target.value) || 30 })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Inteligência Artificial</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="iaHabilitada"
                checked={config?.iaHabilitada || false}
                onChange={(e) => setConfig({ ...config!, iaHabilitada: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="iaHabilitada" className="text-sm font-medium text-gray-700">
                Habilitar Geração Automática por IA
              </label>
            </div>
            <Input
              label="Prazo para Geração IA (dias antes do vencimento)"
              type="number"
              value={config?.prazoIA || 7}
              onChange={(e) => setConfig({ ...config!, prazoIA: parseInt(e.target.value) || 7 })}
            />
            <Input
              label="Intervalo entre Tentativas IA (minutos)"
              type="number"
              value={config?.intervaloIA || 15}
              onChange={(e) => setConfig({ ...config!, intervaloIA: parseInt(e.target.value) || 15 })}
            />
            <Input
              label="Máximo de Tentativas IA"
              type="number"
              value={config?.maxTentativasIA || 5}
              onChange={(e) => setConfig({ ...config!, maxTentativasIA: parseInt(e.target.value) || 5 })}
            />
            <Input
              label="Chave API (opcional para LLM7 free)"
              value={config?.iaApiKey || ''}
              onChange={(e) => setConfig({ ...config!, iaApiKey: e.target.value })}
              placeholder="Deixe vazio para uso gratuito"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Acesso do Professor</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Senha de Acesso do Professor"
              type="password"
              value={config?.senhaProfessor || 'professor123'}
              onChange={(e) => setConfig({ ...config!, senhaProfessor: e.target.value })}
              helperText="Senha que os professores usarão para acessar o sistema"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">E-mails</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="E-mail de Notificações"
              type="email"
              value={config?.emailDestinoNotificacoes || ''}
              onChange={(e) => setConfig({ ...config!, emailDestinoNotificacoes: e.target.value })}
              placeholder="email@exemplo.com"
            />
            <Input
              label="Assinatura dos E-mails"
              value={config?.assinaturaEmail || ''}
              onChange={(e) => setConfig({ ...config!, assinaturaEmail: e.target.value })}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
