'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Aluno, Turma, Envio, User, ConfiguracaoGlobal, Historico } from '@/types';
import { formatDate, getCurrentDate, getCurrentTime, isPeriodoAtivoAluno } from '@/lib/utils';
import { generateActivityForStudent } from '@/lib/services/ai';
import { emailService } from '@/lib/services/email';

const defaultDisciplinas = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Educação Física', 'Artes', 'Música', 'Informática', 'Educação Digital'
];

const seriesOptions = ['1ª série', '2ª série', '3ª série', '4ª série', '5ª série', '6ª série', '7ª série', '8ª série', '9ª série', 'Ensino Médio'];

interface EnvioPendenteExt extends Envio {
  alunoObj?: Aluno;
  turmaObj?: Turma;
}

export default function LancarAtividadesPedagogoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enviosPendentes, setEnviosPendentes] = useState<EnvioPendenteExt[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>(defaultDisciplinas);
  const [globalConfig, setGlobalConfig] = useState<ConfiguracaoGlobal | null>(null);

  // Estado do Modal de Geracao IA
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState<EnvioPendenteExt | null>(null);
  const [formData, setFormData] = useState({
    disciplina: '',
    serie: '',
    laudoAluno: '',
    conteudo: '',
    objetivos: '',
    exerciciosExemplo: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [enviosData, alunosData, turmasData, configs] = await Promise.all([
        FirestoreService.query<Envio>(DOC_TYPES.ENVIO, [
          whereEqual('pedagogoId', user!.id),
        ]),
        FirestoreService.query<Aluno>(DOC_TYPES.ALUNO, [
          whereEqual('pedagogoId', user!.id),
        ]),
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
        ]),
        FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO),
      ]);

      if (configs.length > 0) {
        setGlobalConfig(configs[0]);
        if (configs[0].disciplinas && configs[0].disciplinas.length > 0) {
          setDisciplinas(configs[0].disciplinas);
        }
      }

      const alunosMap = new Map(alunosData.map((a) => [a.id, a]));
      const turmasMap = new Map(turmasData.map((t) => [t.id, t]));

      const alunosAtivosNoPeriodo = alunosData.filter(isPeriodoAtivoAluno);
      const idsAlunosValidos = new Set(alunosAtivosNoPeriodo.map((a) => a.id));

      const pendentes: EnvioPendenteExt[] = [];

      for (const e of enviosData) {
        if ((e.status === 'pendente' || e.status === 'atrasado') && idsAlunosValidos.has(e.alunoId)) {
          pendentes.push({
            ...e,
            alunoObj: alunosMap.get(e.alunoId),
            turmaObj: turmasMap.get(e.turmaId),
          });
        }
      }

      setEnviosPendentes(pendentes);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModalGerarIA = (envio: EnvioPendenteExt) => {
    setSelectedEnvio(envio);
    setFormData({
      disciplina: envio.disciplina || disciplinas[0] || 'Português',
      serie: envio.turmaObj?.serie || '6ª série',
      laudoAluno: '',
      conteudo: '',
      objetivos: '',
      exerciciosExemplo: '',
    });
    setError('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleGerarEEnviarIA = async () => {
    if (!selectedEnvio || !user) return;
    setError('');
    setGenerating(true);

    try {
      const configObj: ConfiguracaoGlobal = globalConfig || {
        id: '',
        nomeInstituicao: 'Colégio Maluf',
        logoUrl: '',
        corPrincipal: '#3B82F6',
        diasLembrete: [15, 7, 4, 3, 2, 1, 0],
        horarioLembrete: '09:00',
        prazoLimite: 30,
        prazoIA: 7,
        intervaloIA: 15,
        maxTentativasIA: 5,
        textoEmailLembrete: '',
        textoEmailConfirmacao: '',
        assinaturaEmail: '',
        emailDestinoNotificacoes: 'domiciliarmaluf@gmail.com',
        iaHabilitada: true,
        iaProvider: 'llm7',
        iaApiKey: '',
        iaModelo: 'gpt-3.5-turbo',
        senhaProfessor: 'professor123',
        createdAt: '',
        updatedAt: '',
      };

      // Gera atividade com IA incluindo laudo e orientações
      let promptComplementar = formData.conteudo ? `\nCONTEÚDO PROGRAMÁTICO: ${formData.conteudo}` : '';
      if (formData.laudoAluno) {
        promptComplementar += `\nLAUDO DO ALUNO / ADAPTAÇÕES: ${formData.laudoAluno} (Adapte a atividade para atender as necessidades deste laudo).`;
      }
      if (formData.objetivos) {
        promptComplementar += `\nOBJETIVOS: ${formData.objetivos}`;
      }

      const resIA = await generateActivityForStudent(
        selectedEnvio.alunoNome || 'Aluno',
        selectedEnvio.turmaNome || 'Turma',
        formData.disciplina,
        configObj,
        formData.serie
      );

      // Atualiza o registro de envio para status gerado_ia
      const updateData = {
        disciplina: formData.disciplina,
        status: 'gerado_ia' as const,
        comentarios: `Gerado pelo Pedagogo via IA. ${formData.laudoAluno ? ' (Considerando laudo médico/pedagógico)' : ''}`,
        dataEnvio: getCurrentDate(),
        horaEnvio: getCurrentTime(),
      };

      await FirestoreService.update(selectedEnvio.id, updateData);

      // Salva histórico
      await FirestoreService.create<Historico>(DOC_TYPES.HISTORICO, {
        envioId: selectedEnvio.id,
        versao: 1,
        arquivo: null,
        comentarios: `Atividade lançada pelo pedagogo ${user.name} via IA`,
        dataEnvio: getCurrentDate(),
        horaEnvio: getCurrentTime(),
        professorId: user.id,
        professorNome: user.name,
        alunoId: selectedEnvio.alunoId,
        alunoNome: selectedEnvio.alunoNome || '',
        turmaId: selectedEnvio.turmaId,
        turmaNome: selectedEnvio.turmaNome || '',
        disciplina: formData.disciplina,
      });

      // Envia notificação por e-mail com anexos PDF e DOCX
      const destinoEmail = configObj.emailDestinoNotificacoes || 'domiciliarmaluf@gmail.com';
      await emailService.sendAIActivity(
        destinoEmail,
        selectedEnvio.alunoNome || '',
        selectedEnvio.turmaNome || '',
        formData.disciplina,
        resIA.texto,
        resIA.pdf,
        resIA.docx
      );

      setSuccessMsg('Atividade gerada e enviada com sucesso por IA!');
      setTimeout(() => {
        setModalOpen(false);
        loadData();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao gerar atividade por IA:', err);
      setError(err.message || 'Erro ao gerar atividade por IA. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Lançar Atividades (Pedagogo)"
        description="Filtre e responda atividades pendentes gerando conteúdo adaptado por IA no lugar do professor"
      />

      <Card>
        <CardHeader>
          <CardTitle>Atividades Domiciliares Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Professor Atribuído</TableHead>
                <TableHead>Data do Registro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {enviosPendentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Nenhuma atividade pendente para os alunos em atestado no momento! ✨
                  </TableCell>
                </TableRow>
              ) : (
                enviosPendentes.map((envio) => (
                  <TableRow key={envio.id}>
                    <TableCell className="font-medium text-gray-900">{envio.alunoNome || '-'}</TableCell>
                    <TableCell>{envio.turmaNome || '-'}</TableCell>
                    <TableCell>{envio.professorNome || '-'}</TableCell>
                    <TableCell>{formatDate(envio.dataEnvio)}</TableCell>
                    <TableCell>
                      <Badge variant="warning">Pendente</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openModalGerarIA(envio)}>
                        🤖 Lançar via IA
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Lançamento por IA */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Lançar Atividade por IA - ${selectedEnvio?.alunoNome || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
            <p><strong>Aluno:</strong> {selectedEnvio?.alunoNome}</p>
            <p><strong>Turma:</strong> {selectedEnvio?.turmaNome}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Disciplina / Matéria"
              value={formData.disciplina}
              onChange={(e) => setFormData({ ...formData, disciplina: e.target.value })}
              options={disciplinas.map((d) => ({ value: d, label: d }))}
            />
            <Select
              label="Série / Ano"
              value={formData.serie}
              onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
              options={seriesOptions.map((s) => ({ value: s, label: s }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laudo do Aluno / Observações de Adaptação (Opcional)
            </label>
            <textarea
              value={formData.laudoAluno}
              onChange={(e) => setFormData({ ...formData, laudoAluno: e.target.value })}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Ex: Aluno com TDAH / dislexia. Necessita de questões objetivas e textos curtos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conteúdo Programático / Tema
            </label>
            <textarea
              value={formData.conteudo}
              onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Descreva o conteúdo. Ex: Frações equivalentes, adição e subtração de frações..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objetivos de Aprendizagem (Opcional)
            </label>
            <Input
              value={formData.objetivos}
              onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
              placeholder="Ex: Compreender a representação gráfica de frações"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          {successMsg && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{successMsg}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGerarEEnviarIA} loading={generating}>
              Gerar e Enviar Atividade por IA
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
