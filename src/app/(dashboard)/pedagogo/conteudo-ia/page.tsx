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
  const [aiStep, setAiStep] = useState<'prompt' | 'review'>('prompt');
  const [generatedText, setGeneratedText] = useState('');
  const [customImageDataUrls, setCustomImageDataUrls] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setCustomImageDataUrls((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeCustomImage = (index: number) => {
    setCustomImageDataUrls((prev) => prev.filter((_, i) => i !== index));
  };

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
      const hojeStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

      const pendentesMap = new Map<string, EnvioPendenteExt>();

      // Adiciona envios explicitamente marcados como pendentes
      for (const e of enviosData) {
        if ((e.status === 'pendente' || e.status === 'atrasado') && isPeriodoAtivoAluno(alunosMap.get(e.alunoId) as Aluno)) {
          const key = `${e.alunoId}_${e.turmaId}_${e.professorId || 'gen'}`;
          pendentesMap.set(key, {
            ...e,
            alunoObj: alunosMap.get(e.alunoId),
            turmaObj: turmasMap.get(e.turmaId),
          });
        }
      }

      // Calcula dinamicamente alunos no atestado que não enviaram há mais de 14 dias (quinzenal)
      for (const aluno of alunosAtivosNoPeriodo) {
        const turma = turmasMap.get(aluno.turmaId);
        if (!turma) continue;

        // Se já existe qualquer registro pendente para este aluno nesta turma, ignora para não duplicar
        const jaExistePendente = Array.from(pendentesMap.values()).some(
          (item) => item.alunoId === aluno.id && item.turmaId === turma.id
        );
        if (jaExistePendente) continue;

        const enviosAluno = enviosData.filter((e) => e.alunoId === aluno.id && e.turmaId === turma.id);
        const enviosCompletados = enviosAluno.filter((e) => e.status === 'enviado' || e.status === 'gerado_ia');
        const ultimoEnvio = enviosCompletados.sort((a, b) => (b.dataEnvio > a.dataEnvio ? 1 : -1))[0];

        let precisaEnviar = false;
        if (!ultimoEnvio) {
          precisaEnviar = true;
        } else if (ultimoEnvio.dataEnvio) {
          const dataUltimo = new Date(ultimoEnvio.dataEnvio);
          const dataHoje = new Date(hojeStr);
          const diffDias = Math.floor((dataHoje.getTime() - dataUltimo.getTime()) / (1000 * 3600 * 24));
          if (diffDias >= 14) {
            precisaEnviar = true;
          }
        }

        if (precisaEnviar) {
          const key = `${aluno.id}_${turma.id}_gen`;
          pendentesMap.set(key, {
            id: `pending_${aluno.id}_${turma.id}`,
            atividadeId: '',
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            professorId: '',
            professorNome: 'Pendente',
            turmaId: turma.id,
            turmaNome: turma.nome,
            disciplina: disciplinas[0] || 'Atividade Domiciliar',
            versao: 1,
            status: 'pendente',
            arquivo: null,
            comentarios: '',
            dataEnvio: hojeStr,
            horaEnvio: '07:00',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            alunoObj: aluno,
            turmaObj: turma,
          });
        }
      }

      setEnviosPendentes(Array.from(pendentesMap.values()));
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
    setAiStep('prompt');
    setGeneratedText('');
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
        emailDestinoNotificacoes: 'cartoonlandiapr@gmail.com',
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
        formData.serie,
        formData.conteudo,
        formData.laudoAluno,
        formData.objetivos
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
      const destinoEmail = configObj.emailDestinoNotificacoes || 'cartoonlandiapr@gmail.com';
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
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900 flex justify-between items-center">
            <div>
              <p><strong>Aluno:</strong> {selectedEnvio?.alunoNome} | <strong>Turma:</strong> {selectedEnvio?.turmaNome}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-200 rounded-full">
              Passo {aiStep === 'prompt' ? '1/2: Instruções' : '2/2: Revisão & Edição'}
            </span>
          </div>

          {aiStep === 'prompt' ? (
            <>
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
                  placeholder="Descreva o conteúdo. Ex: Reuvolução Industrial, Iluminismo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivos de Aprendizagem (Opcional)
                </label>
                <Input
                  value={formData.objetivos}
                  onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                  placeholder="Ex: Compreender conceitos principais"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anexar Figuras / Mapas / Gráficos Escolhidos pelo Pedagogo (Permite múltiplos arquivos)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCustomImageUpload}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2"
                />
                {customImageDataUrls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-green-600 font-medium">
                      ✓ {customImageDataUrls.length} imagem(ns) carregada(s) para inserção no PDF/DOCX:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {customImageDataUrls.map((url, idx) => (
                        <div key={idx} className="relative group border border-gray-200 rounded p-1 bg-white">
                          <img src={url} alt={`Anexo ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => removeCustomImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow hover:bg-red-700"
                            title="Remover imagem"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revise e edite a atividade gerada pela IA antes de enviar:
              </label>
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={12}
                className="block w-full rounded-lg border border-gray-300 p-3 font-mono text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          {successMsg && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{successMsg}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            {aiStep === 'prompt' ? (
              <Button
                onClick={async () => {
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
                      emailDestinoNotificacoes: 'cartoonlandiapr@gmail.com',
                      iaHabilitada: true,
                      iaProvider: 'llm7',
                      iaApiKey: '',
                      iaModelo: 'gpt-3.5-turbo',
                      senhaProfessor: 'professor123',
                      createdAt: '',
                      updatedAt: '',
                    };

                    const resIA = await generateActivityForStudent(
                      selectedEnvio.alunoNome || 'Aluno',
                      selectedEnvio.turmaNome || 'Turma',
                      formData.disciplina,
                      configObj,
                      formData.serie,
                      formData.conteudo,
                      formData.laudoAluno,
                      formData.objetivos,
                      customImageDataUrls.length > 0 ? customImageDataUrls : undefined
                    );

                    setGeneratedText(resIA.texto);
                    setAiStep('review');
                  } catch (err: any) {
                    console.error('Erro na prévia IA:', err);
                    setError(err.message || 'Falha ao gerar prévia por IA.');
                  } finally {
                    setGenerating(false);
                  }
                }}
                loading={generating}
              >
                Gerar Prévia da Atividade
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAiStep('prompt')}>
                  Voltar às Instruções
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedEnvio || !user) return;
                    setError('');
                    setGenerating(true);
                    try {
                      const { gerarDOCX, gerarPDF } = await import('@/lib/services/ai/gerar-documentos');
                      const atividadeData = {
                        titulo: 'Atividade Domiciliar',
                        disciplina: formData.disciplina,
                        serie: formData.serie || '',
                        turma: selectedEnvio.turmaNome || '',
                        aluno: selectedEnvio.alunoNome || '',
                        conteudo: generatedText,
                        imagens: customImageDataUrls.length > 0 ? customImageDataUrls : undefined,
                      };

                      const [pdf, docx] = await Promise.all([
                        Promise.resolve(gerarPDF(atividadeData)),
                        gerarDOCX(atividadeData),
                      ]);

                      const updateData = {
                        disciplina: formData.disciplina,
                        status: 'gerado_ia' as const,
                        comentarios: `Gerado pelo Pedagogo via IA (revisado). ${formData.laudoAluno ? '(Considerando laudo)' : ''}`,
                        dataEnvio: getCurrentDate(),
                        horaEnvio: getCurrentTime(),
                      };

                      await FirestoreService.update(selectedEnvio.id, updateData);

                      await FirestoreService.create<Historico>(DOC_TYPES.HISTORICO, {
                        envioId: selectedEnvio.id,
                        versao: 1,
                        arquivo: null,
                        comentarios: `Atividade revisada e lançada pelo pedagogo ${user.name} via IA`,
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

                      // Gera a Ficha de Atividade (DOCX) oficial do Colégio Maluf
                      const fichaResponse = await fetch('/api/ficha', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          professor: selectedEnvio.professorNome || user.name,
                          disciplina: formData.disciplina,
                          aluno: selectedEnvio.alunoNome || '',
                          turma: selectedEnvio.turmaNome || '',
                          pedagoga: user.name,
                          data: getCurrentDate(),
                          numAulas: '4',
                          encaminhamento: 'Atividade Gerada por IA pelo Pedagogo',
                          roteiro: formData.conteudo || 'Realizar exercícios da atividade adaptada em anexo',
                          observacoes: formData.laudoAluno ? `Atividade adaptada: ${formData.laudoAluno}` : 'Lançado pelo pedagogo com apoio de IA',
                          quinzena: '1',
                          trimestre: '1',
                          anoLetivo: new Date().getFullYear().toString(),
                        }),
                      });

                      let attachments: { filename: string; content: Buffer }[] = [];

                      if (fichaResponse.ok) {
                        const fichaBuffer = Buffer.from(await fichaResponse.arrayBuffer());
                        attachments.push({
                          filename: `ficha_${selectedEnvio.alunoNome?.replace(/\s/g, '_')}_${formData.disciplina}.docx`,
                          content: fichaBuffer,
                        });
                      }

                      attachments.push(
                        { filename: `atividade_${selectedEnvio.alunoNome?.replace(/\s/g, '_')}_${formData.disciplina}.pdf`, content: pdf },
                        { filename: `atividade_${selectedEnvio.alunoNome?.replace(/\s/g, '_')}_${formData.disciplina}.docx`, content: docx }
                      );

                      const destinoEmail = globalConfig?.emailDestinoNotificacoes || 'cartoonlandiapr@gmail.com';
                      await emailService.sendNotification(
                        {
                          ...selectedEnvio,
                          disciplina: formData.disciplina,
                          status: 'gerado_ia',
                          dataEnvio: getCurrentDate(),
                          horaEnvio: getCurrentTime(),
                          comentarios: `Gerado por IA pelo Pedagogo ${user.name}`,
                        } as Envio,
                        attachments
                      );

                      setSuccessMsg('Atividade revisada e enviada com sucesso por IA!');
                      setTimeout(() => {
                        setModalOpen(false);
                        loadData();
                      }, 1500);
                    } catch (err: any) {
                      console.error('Erro ao enviar atividade revisada:', err);
                      setError(err.message || 'Erro ao enviar atividade revisada.');
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  loading={generating}
                >
                  Confirmar e Enviar Atividade
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
