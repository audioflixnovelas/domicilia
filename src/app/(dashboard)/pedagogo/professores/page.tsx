'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { User, Turma } from '@/types';

export default function ProfessoresPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [professores, setProfessores] = useState<User[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; professor: User | null }>({
    open: false,
    professor: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [professoresData, turmasData] = await Promise.all([
        FirestoreService.query<User>(DOC_TYPES.USER, [
          whereEqual('role', 'professor'),
        ]),
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
          whereEqual('active', true),
        ]),
      ]);

      const profsDoPedagogo = professoresData.filter(
        (p) => p.pedagogoId === user!.id || (p.pedagogoIds || []).includes(user!.id)
      );

      setProfessores(profsDoPedagogo);
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar professores:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (professor: User) => {
    try {
      await FirestoreService.update(professor.id, {
        active: !professor.active,
      });
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status do professor:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.professor) return;
    setDeleting(true);
    try {
      await FirestoreService.delete(deleteModal.professor.id);
      setDeleteModal({ open: false, professor: null });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getTurmasNomes = (turmaIds?: string[]) => {
    if (!turmaIds || turmaIds.length === 0) return '-';
    return turmas
      .filter((t) => turmaIds.includes(t.id))
      .map((t) => t.nome)
      .join(', ') || '-';
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Gerenciar Professores"
        description="Cadastre, edite e gerencie os professores sob sua responsabilidade"
        actions={
          <Button onClick={() => router.push('/pedagogo/professores/novo')}>
            Novo Professor
          </Button>
        }
      />

      {professores.length === 0 ? (
        <EmptyState
          title="Nenhum professor cadastrado"
          description="Cadastre professores para associá-los a turmas e disciplinas."
          action={
            <Button onClick={() => router.push('/pedagogo/professores/novo')}>
              Cadastrar Professor
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Turmas</TableHead>
                <TableHead>Disciplinas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {professores.map((professor) => (
                <TableRow key={professor.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{professor.name}</div>
                  </TableCell>
                  <TableCell>{professor.email}</TableCell>
                  <TableCell>{getTurmasNomes(professor.turmaIds)}</TableCell>
                  <TableCell>{professor.disciplinas?.join(', ') || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={professor.active ? 'success' : 'danger'}>
                      {professor.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/pedagogo/professores/${professor.id}/editar`)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(professor)}
                      >
                        {professor.active ? 'Desabilitar' : 'Reabilitar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, professor })}
                      >
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, professor: null })}
        title="Confirmar Exclusão"
      >
        <p className="text-gray-600">
          Tem certeza que deseja excluir o professor{' '}
          <strong className="text-gray-900">{deleteModal.professor?.name}</strong>?
          Esta ação não poderá ser desfeita.
        </p>
        <div className="mt-6 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setDeleteModal({ open: false, professor: null })}
          >
            Cancelar
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Excluir
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
