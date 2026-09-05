'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { AuthService } from '@/lib/services/auth';
import { emailService } from '@/lib/services/email';
import { Turma, Aluno, User, ConfiguracaoGlobal } from '@/types';
import { generateId } from '@/lib/utils';

const defaultDisciplinas = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Inglês', 'Educação Física', 'Artes', 'Música', 'Informática', 'Educação Digital'
];

export default function NovoProfessorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinasOptions, setDisciplinasOptions] = useState<string[]>(defaultDisciplinas);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    turmaIds: [] as string[],
    disciplinas: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      const [turmasData, configs] = await Promise.all([
        FirestoreService.query<Turma>(DOC_TYPES.TURMA, [
          whereEqual('pedagogoId', user!.id),
          whereEqual('active', true),
        ]),
        FirestoreService.getAllByType<ConfiguracaoGlobal>(DOC_TYPES.CONFIGURACAO),
      ]);

      setTurmas(turmasData);

      if (configs.length > 0 && configs[0].disciplinas && configs[0].disciplinas.length > 0) {
        setDisciplinasOptions(configs[0].disciplinas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verifica se professor já existe no banco pelo e-mail
      const existingUsers = await FirestoreService.query<User>(DOC_TYPES.USER, [
        whereEqual('email', formData.email),
      ]);

      let userId: string;

      if (existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.role !== 'professor') {
          throw new Error('E-mail já cadastrado com outro perfil de usuário.');
        }
        userId = existingUser.id;

        // Reutiliza o cadastro: mescla turmas, disciplinas e pedagogos
        const novasTurmas = Array.from(new Set([...(existingUser.turmaIds || []), ...formData.turmaIds]));
        const novasDisciplinas = Array.from(new Set([...(existingUser.disciplinas || []), ...formData.disciplinas]));
        const novosPedagogos = Array.from(new Set([
          existingUser.pedagogoId,
          ...(existingUser.pedagogoIds || []),
          user!.id,
        ])).filter(Boolean) as string[];

        await FirestoreService.update(userId, {
          turmaIds: novasTurmas,
          disciplinas: novasDisciplinas,
          pedagogoIds: novosPedagogos,
          active: true, // Garante que o professor esteja ativo
        });
      } else {
        const tempPassword = formData.password || generateId();

        userId = await AuthService.register(
          formData.email,
          tempPassword,
          formData.name,
          'professor'
        );

        await FirestoreService.update(userId, {
          pedagogoId: user!.id,
          pedagogoIds: [user!.id],
          turmaIds: formData.turmaIds,
          disciplinas: formData.disciplinas,
        });

        // Envia email de boas-vindas apenas para novos
        await emailService.sendWelcome(
          {
            id: userId,
            uid: userId,
            type: 'user',
            email: formData.email,
            name: formData.name,
            role: 'professor',
            active: true,
            createdAt: '',
            updatedAt: '',
          },
          tempPassword
        );
      }

      // Associa o professor às turmas selecionadas
      for (const turmaId of formData.turmaIds) {
        const turma = turmas.find((t) => t.id === turmaId);
        if (turma) {
          const profsAtuais = turma.professorIds || [];
          if (!profsAtuais.includes(userId)) {
            await FirestoreService.update(turmaId, {
              professorIds: [...profsAtuais, userId],
            });
          }
        }
      }

      router.push('/pedagogo/professores');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar/reutilizar professor');
    } finally {
      setLoading(false);
    }
  };

  const toggleTurma = (turmaId: string) => {
    setFormData((prev) => ({
      ...prev,
      turmaIds: prev.turmaIds.includes(turmaId)
        ? prev.turmaIds.filter((id) => id !== turmaId)
        : [...prev.turmaIds, turmaId],
    }));
  };

  const toggleDisciplina = (disciplina: string) => {
    setFormData((prev) => ({
      ...prev,
      disciplinas: prev.disciplinas.includes(disciplina)
        ? prev.disciplinas.filter((d) => d !== disciplina)
        : [...prev.disciplinas, disciplina],
    }));
  };

  return (
    <DashboardLayout>
      <PageHeader title="Novo Professor" description="Cadastre um novo professor" />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nome Completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do professor"
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

          <Input
            label="Senha Temporária"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Deixe vazio para gerar automaticamente"
            helperText="Se não informada, uma senha será gerada automaticamente"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Turmas</label>
            <div className="grid grid-cols-2 gap-2">
              {turmas.map((turma) => (
                <label
                  key={turma.id}
                  className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.turmaIds.includes(turma.id)}
                    onChange={() => toggleTurma(turma.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{turma.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Disciplinas</label>
            <div className="grid grid-cols-2 gap-2">
              {disciplinasOptions.map((disciplina) => (
                <label
                  key={disciplina}
                  className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.disciplinas.includes(disciplina)}
                    onChange={() => toggleDisciplina(disciplina)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{disciplina}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
