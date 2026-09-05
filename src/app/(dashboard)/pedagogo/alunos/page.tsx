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
import { Aluno, Turma } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AlunosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; aluno: Aluno | null }>({
    open: false,
    aluno: null,
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [alunosData, turmasData] = await Promise.all([
        FirestoreService.query<Aluno>(DOC_TYPES.ALUNO, [
          whereEqual('pedagogoId', user!.id),
        ]),
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
          whereEqual('active', true),
        ]),
      ]);

      setAlunos(alunosData);
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (aluno: Aluno) => {
    try {
      await FirestoreService.update(aluno.id, {
        active: !aluno.active,
      });
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status do aluno:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.aluno) return;
    setDeleting(true);
    try {
      await FirestoreService.delete(deleteModal.aluno.id);
      setDeleteModal({ open: false, aluno: null });
      loadData();
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getTurmaNome = (turmaId: string) => {
    const turma = turmas.find((t) => t.id === turmaId);
    return turma?.nome || '-';
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader
        title="Gerenciar Alunos"
        description="Cadastre, edite e acompanhe os alunos em atividade domiciliar"
        actions={
          <Button onClick={() => router.push('/pedagogo/alunos/novo')}>
            Novo Aluno
          </Button>
        }
      />

      {alunos.length === 0 ? (
        <EmptyState
          title="Nenhum aluno cadastrado"
          description="Cadastre alunos para acompanhar o regime de atividade domiciliar."
          action={
            <Button onClick={() => router.push('/pedagogo/alunos/novo')}>
              Cadastrar Aluno
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Domiciliar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {alunos.map((aluno) => (
                <TableRow key={aluno.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{aluno.nome}</div>
                  </TableCell>
                  <TableCell>{aluno.matricula}</TableCell>
                  <TableCell>{getTurmaNome(aluno.turmaId)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{aluno.responsavelNome}</div>
                      <div className="text-xs text-gray-500">{aluno.responsavelEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {aluno.domiciliar ? (
                      <div>
                        <Badge variant="info">Sim</Badge>
                        {aluno.dataInicio && aluno.dataFim && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(aluno.dataInicio)} a {formatDate(aluno.dataFim)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="default">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={aluno.active ? 'success' : 'danger'}>
                      {aluno.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/pedagogo/alunos/${aluno.id}/editar`)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(aluno)}
                      >
                        {aluno.active ? 'Desabilitar' : 'Reabilitar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, aluno })}
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
        onClose={() => setDeleteModal({ open: false, aluno: null })}
        title="Confirmar Exclusão"
      >
        <p className="text-gray-600">
          Tem certeza que deseja excluir o aluno{' '}
          <strong className="text-gray-900">{deleteModal.aluno?.nome}</strong>?
          Esta ação não poderá ser desfeita.
        </p>
        <div className="mt-6 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setDeleteModal({ open: false, aluno: null })}
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
