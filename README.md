# DomicilIA - Sistema de Atividades Domiciliares

Sistema completo para gerenciamento de atividades domiciliares em instituições de ensino.

## Funcionalidades

### Administrador
- Cadastrar, editar, bloquear, reativar e excluir pedagogos
- Configurar parâmetros globais do sistema
- Visualizar todos os relatórios

### Pedagogo
- Cadastrar, editar, desabilitar e reabilitar professores
- Cadastrar e editar turmas
- Cadastrar e editar alunos
- Relacionar professores a turmas e disciplinas
- Visualizar atividades entregues e pendentes
- Gerar relatórios
- Configurar lembretes

### Professor
- Acesso simples com senha
- Visualizar turmas atribuídas
- Enviar atividades (PDF, DOCX, imagens)
- Histórico de envios
- Receber confirmação por e-mail

## Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Supabase Storage (500MB grátis)
- Resend (e-mails)
- LLM7.io (IA gratuita)

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Firebase
- Conta no Supabase (para armazenamento)
- Conta no Resend (para e-mails)

## Configuração

### 1. Firebase

1. Crie um projeto no Firebase Console
2. Ative Authentication (método: E-mail/Senha)
3. Crie um banco de dados Firestore
4. Copie as credenciais para `.env.local`

### 2. Supabase

1. Crie uma conta gratuita no Supabase
2. Crie um novo projeto
3. Crie um bucket chamado `domicilia`
4. Torne o bucket público (Settings > API > Public)
5. Copie a URL e a chave anônima para `.env.local`

### 3. Resend

1. Crie uma conta no Resend
2. Gere uma API Key
3. Configure o domínio de envio

### 4. Variáveis de Ambiente

Copie o arquivo `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

## Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar servidor
npm start
```

## Estrutura do Projeto

```
src/
├── app/                    # Rotas Next.js App Router
│   ├── (auth)/            # Rotas de autenticação
│   ├── (dashboard)/       # Rotas do painel
│   │   ├── admin/         # Rotas do administrador
│   │   ├── pedagogo/      # Rotas do pedagogo
│   │   └── professor/     # Rotas do professor
│   └── api/               # Rotas de API
├── components/            # Componentes React
│   ├── ui/               # Componentes de interface
│   ├── layout/           # Layouts
│   ├── auth/             # Componentes de auth
│   └── ...
├── contexts/             # Contextos React
├── hooks/                # Hooks personalizados
├── lib/                  # Bibliotecas e serviços
│   ├── firebase/         # Configuração Firebase
│   ├── services/         # Serviços
│   │   ├── auth/         # Autenticação
│   │   ├── firestore/    # Banco de dados
│   │   ├── storage/      # Armazenamento (Supabase)
│   │   ├── email/        # E-mails
│   │   └── ai/           # Inteligência Artificial
│   └── utils/            # Utilitários
└── types/                # Tipos TypeScript
```

## Segurança

- Regras do Firestore configuradas
- Autenticação por perfil
- Proteção de rotas
- Validação de uploads
- Sanitização de dados
- Logs de auditoria

## IA Automática

O sistema possui integração com LLM7.io para geração automática de atividades:

- Gera atividades quando o professor não envia até o prazo
- Sistema de fila com retry automático
- Não utiliza APIs pagas
- Configurável pelo administrador

## Relatórios

- Exportação para CSV
- Filtros por turma, professor e período
- Estatísticas em tempo real

## Hospedagem

O sistema é compatível com:

- Cloudflare Pages
- Cloudflare Workers
- Vercel
- Outros provedores Next.js

## Licença

MIT
