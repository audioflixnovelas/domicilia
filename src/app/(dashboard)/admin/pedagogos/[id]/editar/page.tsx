'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PageLoading } from '@/components/ui/Loading';
import { FirestoreService, DOC_TYPES } from '@/lib/services/firestore';
import { User } from '@/types';

export default function EditarPedagogoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPedagogo();
  }, [id]);

  const loadPedagogo = async () => {
    try {
      const pedagogo = await FirestoreService.getById<User>(id);
      if (pedagogo) {
        setFormData({
          name: pedagogo.name,
          email: pedagogo.email,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar pedagogo:', error);
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
        name: formData.name,
        email: formData.email,
      });
      router.push('/admin/pedagogos');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar pedagogo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <DashboardLayout>
      <PageHeader title="Editar Pedagogo" description="Atualize os dados do pedagogo" />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nome Completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do pedagogo"
            required
          />

          <Input
            label="E-mail"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemplo.com"
            required
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
