'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { Turma, User } from '@/types';

export default function EditarTurmaPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [professores, setProfessores] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    ano: '',
    serie: '',
    professorIds: [] as string[],
  });
  const [professorIdsAntigos, setProfessorIdsAntigos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [id, user]);

  const loadData = async () => {
    try {
      const [turmaData, allProfessores] = await Promise.all([
        FirestoreService.getById<Turma>(id),
        FirestoreService.query<User>(DOC_TYPES.USER, [
          whereEqual('role', 'professor'),
          whereEqual('active', true),
        ]),
      ]);
      const professoresData = allProfessores.filter((p) =>
        p.pedagogoId === user!.id ||
        (p.pedagogoIds || []).includes(user!.id)
      );

      if (turmaData) {
        const profIds = turmaData.professorIds || [];
        setFormData({
          nome: turmaData.nome,
          ano: turmaData.ano,
          serie: turmaData.serie,
          professorIds: profIds,
        });
        setProfessorIdsAntigos(profIds);
      }
      setProfessores(professoresData);
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
        ano: formData.ano,
        serie: formData.serie,
        professorIds: formData.professorIds,
      });

      // Remove turma dos professores removidos
      for (const profId of professorIdsAntigos) {
        if (!formData.professorIds.includes(profId)) {
          const prof = professores.find((p) => p.id === profId);
          if (prof) {
            const turmasAtualizadas = (prof.turmaIds || []).filter((t) => t !== id);
            await FirestoreService.update(profId, { turmaIds: turmasAtualizadas });
          }
        }
      }

      // Adiciona turma aos professores adicionados
      for (const profId of formData.professorIds) {
        if (!professorIdsAntigos.includes(profId)) {
          const prof = professores.find((p) => p.id === profId);
          if (prof) {
            const turmasAtuais = prof.turmaIds || [];
            if (!turmasAtuais.includes(id)) {
              await FirestoreService.update(profId, { turmaIds: [...turmasAtuais, id] });
            }
          }
        }
      }

      router.push('/pedagogo/turmas');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar turma');
    } finally {
      setSaving(false);
    }
  };

  const toggleProfessor = (professorId: string) => {
    setFormData((prev) => ({
      ...prev,
      professorIds: prev.professorIds.includes(professorId)
        ? prev.professorIds.filter((id) => id !== professorId)
        : [...prev.professorIds, professorId],
    }));
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader title="Editar Turma" description="Atualize os dados da turma" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Nome da Turma" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
          <Input label="Ano" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: e.target.value })} required />
          <Input label="Serie" value={formData.serie} onChange={(e) => setFormData({ ...formData, serie: e.target.value })} required />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Professores</label>
            <div className="grid grid-cols-2 gap-2">
              {professores.map((professor) => (
                <label key={professor.id} className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={formData.professorIds.includes(professor.id)} onChange={() => toggleProfessor(professor.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{professor.name}</span>
                </label>
              ))}
            </div>
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
