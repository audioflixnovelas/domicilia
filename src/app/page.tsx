import Link from 'next/link';

export const metadata = {
  title: 'DomicilIA - Sistema Inteligente de Atividades Domiciliares',
  description: 'Plataforma completa para gestão, elaboração e acompanhamento de atividades escolares em regime domiciliar.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      {/* Navbar Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-black text-blue-600 tracking-tight">DomicilIA</span>
            <span className="hidden sm:inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              Gestão Escolar Domiciliar
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Entrar no Sistema
            </Link>
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              Acessar Painel
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="bg-gradient-to-b from-blue-50 via-white to-gray-50 py-16 lg:py-24 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Gestão Inteligente de <br className="hidden sm:inline" />
              <span className="text-blue-600">Atividades Escolares Domiciliares</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              O <strong>DomicilIA</strong> otimiza o atendimento pedagógico de alunos em regime de atestado ou licença médica. Conecte administradores, pedagogos e professores em um fluxo integrado com inteligência artificial e sincronização no Google Agenda.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all text-base"
              >
                Acessar Plataforma
              </Link>
              <a
                href="#recursos"
                className="bg-white hover:bg-gray-100 text-gray-700 font-semibold px-8 py-3.5 rounded-xl border border-gray-300 transition-all text-base"
              >
                Conhecer Recursos
              </a>
            </div>
          </div>
        </section>

        {/* Módulos e Recursos */}
        <section id="recursos" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Como o DomicilIA funciona?</h2>
            <p className="text-gray-600 mt-2">Perfis sob medida para cada etapa do atendimento educacional</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card Administrador */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4 text-blue-600">
                ⚙️
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Painel do Administrador</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Controle total da instituição: cadastro de pedagogos, configuração de matérias/disciplinas, definição dos períodos ativados de lembretes e relatórios gerais.
              </p>
            </div>

            {/* Card Pedagogo */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl mb-4 text-indigo-600">
                📝
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Coordenação & Lançamento IA</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Cadastre turmas, professores e alunos em atestado. A aba <strong>Lançar Atividades</strong> permite incluir laudos médicos e adaptar/gerar conteúdos automaticamente via IA.
              </p>
            </div>

            {/* Card Professor */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl mb-4 text-green-600">
                👨‍🏫
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Painel do Professor</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Acompanhe a lista de atividades pendentes exclusivamente durante o período do atestado do aluno. Envie arquivos e fichas em DOCX com facilidade.
              </p>
            </div>
          </div>

          {/* Destaques Especiais */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-blue-600 text-white p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="bg-blue-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full">
                  Inovação Pedagógica
                </span>
                <h3 className="text-2xl font-bold mt-4 mb-2">Geração Automática de Atividades por IA</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  O sistema elabora exercícios personalizados considerando a série, a matéria e o laudo médico do aluno, gerando instantaneamente arquivos formatados em PDF e DOCX.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="bg-gray-800 text-gray-300 text-xs font-bold uppercase px-3 py-1 rounded-full">
                  Organização Integrada
                </span>
                <h3 className="text-2xl font-bold mt-4 mb-2">Sincronização com o Google Agenda</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Registro e acompanhamento automático dos prazos de envio e datas limite diretamente na agenda dos professores e coordenadores via Google OAuth API.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} DomicilIA. Todos os direitos reservados.</p>
          <div className="flex space-x-6">
            <Link href="/politica-de-privacidade" className="hover:text-blue-600 transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-uso" className="hover:text-blue-600 transition-colors">
              Termos de Uso
            </Link>
            <Link href="/login" className="hover:text-blue-600 transition-colors font-medium">
              Acessar Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
