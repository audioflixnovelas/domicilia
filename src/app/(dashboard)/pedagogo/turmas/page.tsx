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
import { Turma, User } from '@/types';

export default function TurmasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; turma: Turma | null }>({
    open: false,
    turma: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [turmasData, professoresData] = await Promise.all([
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
        ]),
        FirestoreService.query<User>(DOC_TYPES.USER, [
          whereEqual('role', 'professor'),
        ]),
      ]);

      setTurmas(turmasData);
      setProfessores(professoresData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (turma: Turma) => {
    try {
      await FirestoreService.update(turma.id, {
        active: !turma.active,
      });
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status da turma:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.turma) return;
    setDeleting(true);
    try {
      await FirestoreService.delete(deleteModal.turma.id);
      setDeleteModal({ open: false, turma: null });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getProfessoresNomes = (professorIds?: string[]) => {
    if (!professorIds || professorIds.length === 0) return '-';
    return professores
      .filter((p) => professorIds.includes(p.id))
      .map((p) => p.name)
      .join(', ') || '-';
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Gerenciar Turmas"
        description="Cadastre, edite e gerencie as turmas sob sua coordenação"
        actions={
          <Button onClick={() => router.push('/pedagogo/turmas/nova')}>
            Nova Turma
          </Button>
        }
      />

      {turmas.length === 0 ? (
        <EmptyState
          title="Nenhuma turma cadastrada"
          description="Cadastre turmas para vincular alunos e professores."
          action={
            <Button onClick={() => router.push('/pedagogo/turmas/nova')}>
              Cadastrar Turma
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Nome</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Professores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {turmas.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{turma.nome}</div>
                  </TableCell>
                  <TableCell>{turma.ano}</TableCell>
                  <TableCell>{turma.serie}</TableCell>
                  <TableCell>{getProfessoresNomes(turma.professorIds)}</TableCell>
                  <TableCell>
                    <Badge variant={turma.active ? 'success' : 'danger'}>
                      {turma.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/pedagogo/turmas/${turma.id}/editar`)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(turma)}
                      >
                        {turma.active ? 'Desabilitar' : 'Reabilitar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, turma })}
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
        onClose={() => setDeleteModal({ open: false, turma: null })}
        title="Confirmar Exclusão"
      >
        <p className="text-gray-600">
          Tem certeza que deseja excluir a turma{' '}
          <strong className="text-gray-900">{deleteModal.turma?.nome}</strong>?
          Esta ação não poderá ser desfeita.
        </p>
        <div className="mt-6 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setDeleteModal({ open: false, turma: null })}
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
