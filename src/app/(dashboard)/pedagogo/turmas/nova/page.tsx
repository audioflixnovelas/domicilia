'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { User } from '@/types';

export default function NovaTurmaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [professores, setProfessores] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    ano: '',
    serie: '',
    professorIds: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadProfessores();
  }, [user]);

  const loadProfessores = async () => {
    try {
      const data = await FirestoreService.query<User>(DOC_TYPES.USER, [
        whereEqual('role', 'professor'),
        whereEqual('active', true),
      ]);
      const filtered = data.filter((p) =>
        p.pedagogoId === user!.id ||
        (p.pedagogoIds || []).includes(user!.id)
      );
      setProfessores(filtered);
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const turmaId = await FirestoreService.create(DOC_TYPES.TURMA, {
        nome: formData.nome,
        ano: formData.ano,
        serie: formData.serie,
        pedagogoId: user!.id,
        professorIds: formData.professorIds,
        alunoIds: [],
        active: true,
      });

      // Atualiza turmaIds de cada professor
      for (const profId of formData.professorIds) {
        const prof = professores.find((p) => p.id === profId);
        if (prof) {
          const turmasAtuais = prof.turmaIds || [];
          if (!turmasAtuais.includes(turmaId)) {
            await FirestoreService.update(profId, {
              turmaIds: [...turmasAtuais, turmaId],
            });
          }
        }
      }

      router.push('/pedagogo/turmas');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar turma');
    } finally {
      setLoading(false);
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

  return (
    <DashboardLayout>
      <PageHeader title="Nova Turma" description="Cadastre uma nova turma" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Nome da Turma" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: 1 Ano A" required />
          <Input label="Ano" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: e.target.value })} placeholder="Ex: 2024" required />
          <Input label="Serie" value={formData.serie} onChange={(e) => setFormData({ ...formData, serie: e.target.value })} placeholder="Ex: Ensino Fundamental" required />

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
            <Button type="submit" loading={loading}>Cadastrar</Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
