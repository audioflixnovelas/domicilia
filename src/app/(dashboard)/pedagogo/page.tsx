'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Aluno, Turma, User, Envio } from '@/types';
import { getCurrentDate, getCurrentTime } from '@/lib/utils';

export default function EditarAlunoPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    turmaId: '',
    responsavelNome: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    domiciliar: false,
    dataInicio: '',
    dataFim: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [id, user]);

  const loadData = async () => {
    try {
      const [alunoData, turmasData] = await Promise.all([
        FirestoreService.getById<Aluno>(id),
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
          whereEqual('active', true),
        ]),
      ]);

      if (alunoData) {
        setFormData({
          nome: alunoData.nome,
          matricula: alunoData.matricula,
          turmaId: alunoData.turmaId,
          responsavelNome: alunoData.responsavelNome,
          responsavelEmail: alunoData.responsavelEmail,
          responsavelTelefone: alunoData.responsavelTelefone,
          domiciliar: alunoData.domiciliar || false,
          dataInicio: alunoData.dataInicio || '',
          dataFim: alunoData.dataFim || '',
        });
      }
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await FirestoreService.update(id, {
        nome: formData.nome,
        matricula: formData.matricula,
        turmaId: formData.turmaId,
        responsavelNome: formData.responsavelNome,
        responsavelEmail: formData.responsavelEmail,
        responsavelTelefone: formData.responsavelTelefone,
        domiciliar: formData.domiciliar,
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim,
      });

      // Se aluno for domiciliar, garante registros de atividades pendentes
      if (formData.domiciliar) {
        const turma = turmas.find((t) => t.id === formData.turmaId);
        const [professores, envios] = await Promise.all([
          FirestoreService.getAllByType<User>(DOC_TYPES.USER),
          FirestoreService.getAllByType<Envio>(DOC_TYPES.ENVIO),
        ]);

        const profsTurma = professores.filter(
          (p) => p.role === 'professor' && turma?.professorIds?.includes(p.id)
        );

        for (const prof of profsTurma) {
          const temEnvio = envios.some(
            (e) => e.alunoId === id && e.turmaId === formData.turmaId && e.professorId === prof.id
          );

          if (!temEnvio) {
            await FirestoreService.create<Envio>(DOC_TYPES.ENVIO, {
              atividadeId: '',
              alunoId: id,
              professorId: prof.id,
              professorNome: prof.name,
              professorEmail: prof.email,
              turmaId: formData.turmaId,
              disciplina: prof.disciplinas?.[0] || 'Educacao Digital',
              versao: 1,
              status: 'pendente',
              arquivo: null,
              comentarios: '',
              dataEnvio: formData.dataInicio || getCurrentDate(),
              horaEnvio: getCurrentTime(),
              pedagogoId: user!.id,
              alunoNome: formData.nome,
              turmaNome: turma?.nome || '',
            });
          }
        }
      }

      router.push('/pedagogo/alunos');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar aluno');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader title="Editar Aluno" description="Atualize os dados do aluno" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Nome do Aluno" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
          <Input label="Matricula" value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} required />
          <Select label="Turma" value={formData.turmaId} onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })} options={turmas.map((t) => ({ value: t.id, label: t.nome }))} required />
          <Input label="Nome do Responsavel" value={formData.responsavelNome} onChange={(e) => setFormData({ ...formData, responsavelNome: e.target.value })} required />
          <Input label="E-mail do Responsavel" type="email" value={formData.responsavelEmail} onChange={(e) => setFormData({ ...formData, responsavelEmail: e.target.value })} required />
          <Input label="Telefone do Responsavel" value={formData.responsavelTelefone} onChange={(e) => setFormData({ ...formData, responsavelTelefone: e.target.value })} />

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Atividade Domiciliar</h3>
            <div className="flex items-center space-x-2 mb-4">
              <input type="checkbox" id="domiciliar" checked={formData.domiciliar} onChange={(e) => setFormData({ ...formData, domiciliar: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="domiciliar" className="text-sm font-medium text-gray-700">Aluno em atividade domiciliar</label>
            </div>
            {formData.domiciliar && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Data Inicio" type="date" value={formData.dataInicio} onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })} required={formData.domiciliar} />
                <Input label="Data Fim" type="date" value={formData.dataFim} onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })} required={formData.domiciliar} />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
