export type UserRole = 'admin' | 'pedagogo' | 'professor';

export interface User {
  id: string;
  uid: string;
  type: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  pedagogoId?: string;
  pedagogoIds?: string[];
  turmaIds?: string[];
  disciplinas?: string[];
}

export interface Pedagogo extends User {
  id: string;
  role: 'pedagogo';
  turmaIds: string[];
}

export interface Professor extends User {
  id: string;
  role: 'professor';
  pedagogoId: string;
  turmaIds: string[];
  disciplinas: string[];
}

export interface Turma {
  id: string;
  nome: string;
  ano: string;
  serie: string;
  pedagogoId: string;
  professorIds: string[];
  alunoIds: string[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  turmaId: string;
  pedagogoId: string;
  responsavelNome: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  domiciliar: boolean;
  dataInicio: string;
  dataFim: string;
}

export interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  disciplina: string;
  prazo: string;
  turmaId: string;
  pedagogoId: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface ConteudoIA {
  id: string;
  pedagogoId: string;
  disciplina: string;
  serie: string;
  titulo: string;
  conteudo: string;
  objetivos: string;
  exerciciosExemplo: string;
  nivel: 'facil' | 'medio' | 'dificil';
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Envio {
  id: string;
  atividadeId: string;
  alunoId: string;
  professorId: string;
  turmaId: string;
  disciplina: string;
  versao: number;
  status: 'enviado' | 'pendente' | 'atrasado' | 'gerado_ia';
  arquivo: FileUpload | null;
  comentarios: string;
  dataEnvio: string;
  horaEnvio: string;
  createdAt: string;
  updatedAt: string;
  pedagogoId?: string;
  alunoNome?: string;
  professorNome?: string;
  turmaNome?: string;
  professorEmail?: string;
}

export interface FileUpload {
  url: string;
  nome: string;
  tipo: string;
  tamanho: number;
  storagePath: string;
}

export interface Historico {
  id: string;
  envioId: string;
  versao: number;
  arquivo: FileUpload | null;
  comentarios: string;
  dataEnvio: string;
  horaEnvio: string;
  professorId: string;
  professorNome: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  disciplina: string;
  createdAt: string;
}

export interface LembreteConfig {
  id: string;
  pedagogoId: string;
  diasAntes: number[];
  horario: string;
  ativo: boolean;
  textoEmail: string;
  assinatura: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguracaoGlobal {
  id: string;
  nomeInstituicao: string;
  logoUrl: string;
  corPrincipal: string;
  diasLembrete: number[];
  horarioLembrete: string;
  prazoLimite: number;
  prazoIA: number;
  intervaloIA: number;
  maxTentativasIA: number;
  textoEmailLembrete: string;
  textoEmailConfirmacao: string;
  assinaturaEmail: string;
  emailDestinoNotificacoes: string;
  iaHabilitada: boolean;
  iaProvider: string;
  iaApiKey: string;
  iaModelo: string;
  senhaProfessor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relatorio {
  totalEnvios: number;
  enviosNoPrazo: number;
  enviosAtrasados: number;
  pendentes: number;
  geradosIA: number;
  porProfessor: { [key: string]: { enviados: number; pendentes: number } };
  porTurma: { [key: string]: { enviados: number; pendentes: number } };
  porDisciplina: { [key: string]: { enviados: number; pendentes: number } };
  porPeriodo: { [key: string]: number };
}

export interface AuditLog {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  target: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface CronLog {
  id?: string;
  lastDispatchDay: 'quinta' | 'quarta';
  lastDispatchDate: string;
  createdAt?: string;
  updatedAt?: string;
}
