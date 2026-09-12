'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES } from '@/lib/services/firestore';
import { ConfiguracaoGlobal, User } from '@/types';
import { syncAnnualRemindersForTeacher } from '@/lib/services/calendar-reminders';

const defaultDisciplinas = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Educação Física', 'Artes', 'Música', 'Informática', 'Educação Digital'
];

function ConfiguracoesAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<ConfiguracaoGlobal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthNotice, setOauthNotice] = useState('');
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [generatingReminders, setGeneratingReminders] = useState(false);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => { loadConfig(); }, []);

  useEffect(() => {
    // Processa callback OAuth se reencaminhado com 'code'
    const code = searchParams.get('code');
    if (code && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      handleOAuthCallback(code);
    }
  }, [searchParams]);

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
          horarioLembrete: '07:00',
          dataInicioLembretes: '2026-09-10',
          dataFimLembretes: '2026-12-16',
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

  const handleOAuthCallback = async (code: string) => {
    try {
      setOauthLoading(true);
      setOauthNotice('Processando autorização do Google Agenda...');

      const redirectUri = window.location.origin + '/admin/configuracoes';
      const configs = await FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO);
      const configToUse = configs.length > 0 ? configs[0] : config;

      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://domicilia-maluf.squareweb.app';
      const res = await fetch(`${backendUrl}/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          clientId: configToUse?.googleOAuthClientId,
          clientSecret: configToUse?.googleOAuthClientSecret,
          redirectUri,
        }),
      });

      const data = await res.json();
      if (data.oauthTokensJson) {
        if (configToUse?.id) {
          await FirestoreService.update(configToUse.id, {
            googleOAuthTokensJson: data.oauthTokensJson,
          });
          setConfig({ ...configToUse, googleOAuthTokensJson: data.oauthTokensJson });
        }
        setOauthNotice('✅ Conta Google vinculada com sucesso ao DomicilIA!');
        setTimeout(() => setOauthNotice(''), 5000);
        router.replace('/admin/configuracoes');
      } else {
        setOauthNotice(`❌ Erro no vínculo: ${data.error || 'Falha ao obter tokens de autorização.'}`);
      }
    } catch (err) {
      console.error('Erro no callback OAuth:', err);
      setOauthNotice('❌ Erro ao comunicar com o servidor de autenticação.');
    } finally {
      setOauthLoading(false);
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

      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://domicilia-maluf.squareweb.app';
      const res = await fetch(`${backendUrl}/auth/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      {oauthNotice && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg font-medium text-sm">
          {oauthNotice}
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

        {/* Credenciais Google OAuth para Professores */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Credenciais Google Agenda (Google OAuth)</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Informe as credenciais OAuth do Google para que cada professor possa vincular sua conta individual do Google Agenda em seu próprio painel.
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

            <div className="pt-4 border-t border-gray-100">
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                loading={generatingReminders}
                onClick={async () => {
                  if (!config) return;
                  setGeneratingReminders(true);
                  try {
                    await saveConfigToFirestore(config);
                    const users = await FirestoreService.getAllByType<User>(DOC_TYPES.USER);
                    const professoresComGoogle = users.filter(
                      (u) => Boolean(u.googleOAuthTokensJson)
                    );

                    if (professoresComGoogle.length === 0) {
                      alert('Nenhum professor possui conta Google vinculada até o momento. Solicite aos professores que cliquem no botão "Vincular Conta Google com DomicilIA" no seu próprio painel de professor.');
                      return;
                    }

                    let totalSucessos = 0;
                    for (const prof of professoresComGoogle) {
                      const res = await syncAnnualRemindersForTeacher(prof, config);
                      totalSucessos += res.successCount;
                    }

                    alert(`Lembretes anuais criados com sucesso! Total de ${totalSucessos} eventos registrados nas agendas dos professores vinculados.`);
                  } catch (err: any) {
                    console.error('Erro ao gerar lembretes anuais:', err);
                    alert(`Falha ao gerar lembretes: ${err.message || err}`);
                  } finally {
                    setGeneratingReminders(false);
                  }
                }}
              >
                📅 Gerar Lembretes Anuais em Todos os Professores
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Este botão calcula todas as quintas e quartas intercaladas entre as datas de início e fim e cria automaticamente os lembretes de 07:00 da manhã no Google Agenda de todos os professores vinculados.
              </p>
            </div>
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

export default function ConfiguracoesAdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ConfiguracoesAdminContent />
    </Suspense>
  );
}
