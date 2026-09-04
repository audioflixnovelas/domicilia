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

        {/* Google Agenda (Backend Python) */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Integração Google Agenda (Backend Python)</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="ID da Agenda do Google (Calendar ID)"
              value={config?.googleCalendarId || 'primary'}
              onChange={(e) => setConfig({ ...config!, googleCalendarId: e.target.value })}
              placeholder="ex: primary ou id_da_agenda@group.calendar.google.com"
              helperText="Identificador do Google Agenda onde os eventos de atividades serão sincronizados"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credenciais Service Account JSON (Google)
              </label>
              <textarea
                value={config?.googleCredentialsJson || ''}
                onChange={(e) => setConfig({ ...config!, googleCredentialsJson: e.target.value })}
                rows={4}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-xs font-mono shadow-sm focus:border-blue-500 focus:outline-none"
                placeholder='{"type": "service_account", "project_id": "...", ...}'
              />
              <p className="mt-1 text-xs text-gray-500">
                Cole a chave JSON do Service Account do Google Cloud. Se deixado em branco, utiliza a variável de ambiente GOOGLE_CREDENTIALS_JSON.
              </p>
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
