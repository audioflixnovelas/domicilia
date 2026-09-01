'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FirestoreService, DOC_TYPES } from '@/lib/services/firestore';
import { AuthService } from '@/lib/services/auth';
import { emailService } from '@/lib/services/email';
import { User } from '@/types';
import { generateId } from '@/lib/utils';

export default function NovoPedagogoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tempPassword = formData.password || generateId();
      await AuthService.register(formData.email, tempPassword, formData.name, 'pedagogo');
      await emailService.sendWelcome({ uid: '', email: formData.email, name: formData.name, role: 'pedagogo', active: true, createdAt: '', updatedAt: '', id: '', type: 'user' }, tempPassword);
      router.push('/admin/pedagogos');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar pedagogo');
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Novo Pedagogo" description="Cadastre um novo pedagogo no sistema" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Nome Completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do pedagogo" required />
          <Input label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" required />
          <Input label="Senha Temporaria" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Deixe vazio para gerar automaticamente" helperText="Se nao informada, uma senha sera gerada automaticamente" />
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
