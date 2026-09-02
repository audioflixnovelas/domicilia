'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { ConteudoIA, ConfiguracaoGlobal } from '@/types';

const defaultDisciplinas = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Educação Física', 'Artes', 'Música', 'Informática', 'Educação Digital'
];

const series = ['1 serie', '2 serie', '3 serie', '4 serie', '5 serie', '6 serie', '7 serie', '8 serie', '9 serie', 'Ensino Medio'];
const niveis = [
  { value: 'facil', label: 'Facil' },
  { value: 'medio', label: 'Medio' },
  { value: 'dificil', label: 'Dificil' },
];

export default function ConteudoIAPage() {
  const { user } = useAuth();
  const [conteudos, setConteudos] = useState<ConteudoIA[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>(defaultDisciplinas);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    disciplina: '',
    serie: '',
    titulo: '',
    conteudo: '',
    objetivos: '',
    exerciciosExemplo: '',
    nivel: 'medio' as 'facil' | 'medio' | 'dificil',
  });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [conteudosData, configs] = await Promise.all([
        FirestoreService.query<ConteudoIA>(DOC_TYPES.CONTEUDO_IA, [
          whereEqual('pedagogoId', user!.id),
        ]),
        FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO),
      ]);

      setConteudos(conteudosData);

      if (configs.length > 0 && configs[0].disciplinas && configs[0].disciplinas.length > 0) {
        setDisciplinas(configs[0].disciplinas);
      }
    } catch (error) {
      console.error('Erro ao carregar conteudos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ disciplina: '', serie: '', titulo: '', conteudo: '', objetivos: '', exerciciosExemplo: '', nivel: 'medio' });
    setModalOpen(true);
  };

  const openEdit = (conteudo: ConteudoIA) => {
    setEditingId(conteudo.id);
    setFormData({
      disciplina: conteudo.disciplina,
      serie: conteudo.serie,
      titulo: conteudo.titulo,
      conteudo: conteudo.conteudo,
      objetivos: conteudo.objetivos,
      exerciciosExemplo: conteudo.exerciciosExemplo,
      nivel: conteudo.nivel,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await FirestoreService.update(editingId, formData);
      } else {
        await FirestoreService.create(DOC_TYPES.CONTEUDO_IA, {
          ...formData,
          pedagogoId: user!.id,
          ativo: true,
        });
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await FirestoreService.delete(deleteModal.id);
      setDeleteModal({ open: false, id: null });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader title="Conteudos para IA" description="Cadastre o conteudo programatico para a IA gerar atividades" actions={<Button onClick={openNew}>Novo Conteudo</Button>} />

      {conteudos.length === 0 ? (
        <EmptyState title="Nenhum conteudo cadastrado" description="Cadastre conteudos por disciplina para a IA gerar atividades personalizadas" action={<Button onClick={openNew}>Cadastrar Conteudo</Button>} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Disciplina</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {conteudos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.disciplina}</TableCell>
                  <TableCell>{c.serie}</TableCell>
                  <TableCell><div className="font-medium">{c.titulo}</div></TableCell>
                  <TableCell>
                    <Badge variant={c.nivel === 'facil' ? 'success' : c.nivel === 'medio' ? 'warning' : 'danger'}>
                      {c.nivel === 'facil' ? 'Facil' : c.nivel === 'medio' ? 'Medio' : 'Dificil'}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant={c.ativo ? 'success' : 'default'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteModal({ open: true, id: c.id })}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal de cadastro/edicao */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Conteudo' : 'Novo Conteudo'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Disciplina" value={formData.disciplina} onChange={(e) => setFormData({ ...formData, disciplina: e.target.value })} options={disciplinas.map((d) => ({ value: d, label: d }))} placeholder="Selecione" />
            <Select label="Serie" value={formData.serie} onChange={(e) => setFormData({ ...formData, serie: e.target.value })} options={series.map((s) => ({ value: s, label: s }))} placeholder="Selecione" />
          </div>
          <Input label="Titulo do Conteudo" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Fracoes, Revolucao Industrial, etc." />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conteudo Programatico</label>
            <textarea value={formData.conteudo} onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })} rows={4} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none" placeholder="Descreva o conteudo que deve ser trabalhado. Ex: Conceito de fracoes, operacoes basicas, comparacao de fracoes..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objetivos de Aprendizagem</label>
            <textarea value={formData.objetivos} onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })} rows={3} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none" placeholder="O que o aluno deve aprender. Ex: Identificar fracoes, Converter entre fracoes e decimais..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exemplo de Exercicio</label>
            <textarea value={formData.exerciciosExemplo} onChange={(e) => setFormData({ ...formData, exerciciosExemplo: e.target.value })} rows={3} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none" placeholder="Modelo de exercicio para a IA usar como referencia. Ex: Resolva as seguintes fracoes: 1/2 + 1/3 = ?" />
          </div>
          <Select label="Nivel de Dificuldade" value={formData.nivel} onChange={(e) => setFormData({ ...formData, nivel: e.target.value as any })} options={niveis} />
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de exclusao */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: null })} title="Confirmar Exclusao">
        <p className="text-gray-600">Tem certeza que deseja excluir este conteudo?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, id: null })}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
