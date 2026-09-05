'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { User } from '@/types';

export default function PedagogosAdminPage() {
  const router = useRouter();
  const [pedagogos, setPedagogos] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; pedagogo: User | null }>({
    open: false,
    pedagogo: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPedagogos();
  }, []);

  const loadPedagogos = async () => {
    try {
      const data = await FirestoreService.query<User>(DOC_TYPES.USER, [
        whereEqual('role', 'pedagogo'),
      ]);
      setPedagogos(data);
    } catch (error) {
      console.error('Erro ao carregar pedagogos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (pedagogo: User) => {
    try {
      await FirestoreService.update(pedagogo.id, {
        active: !pedagogo.active,
      });
      loadPedagogos();
    } catch (error) {
      console.error('Erro ao alterar status do pedagogo:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.pedagogo) return;
    setDeleting(true);
    try {
      await FirestoreService.delete(deleteModal.pedagogo.id);
      setDeleteModal({ open: false, pedagogo: null });
      loadPedagogos();
    } catch (error) {
      console.error('Erro ao excluir pedagogo:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Gerenciar Pedagogos"
        description="Cadastre, edite e gerencie os pedagogos do sistema"
        actions={
          <Button onClick={() => router.push('/admin/pedagogos/novo')}>
            Novo Pedagogo
          </Button>
        }
      />

      {pedagogos.length === 0 ? (
        <EmptyState
          title="Nenhum pedagogo cadastrado"
          description="Cadastre o primeiro pedagogo para gerenciar as atividades da instituição."
          action={
            <Button onClick={() => router.push('/admin/pedagogos/novo')}>
              Cadastrar Pedagogo
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
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {pedagogos.map((pedagogo) => (
                <TableRow key={pedagogo.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{pedagogo.name}</div>
                  </TableCell>
                  <TableCell>{pedagogo.email}</TableCell>
                  <TableCell>
                    <Badge variant={pedagogo.active ? 'success' : 'danger'}>
                      {pedagogo.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/pedagogos/${pedagogo.id}/editar`)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(pedagogo)}
                      >
                        {pedagogo.active ? 'Bloquear' : 'Ativar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, pedagogo })}
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
        onClose={() => setDeleteModal({ open: false, pedagogo: null })}
        title="Confirmar Exclusão"
      >
        <p className="text-gray-600">
          Tem certeza que deseja excluir o pedagogo{' '}
          <strong className="text-gray-900">{deleteModal.pedagogo?.name}</strong>?
          Esta ação não poderá ser desfeita.
        </p>
        <div className="mt-6 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setDeleteModal({ open: false, pedagogo: null })}
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
