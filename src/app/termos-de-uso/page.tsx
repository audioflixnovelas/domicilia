import Link from 'next/link';

export const metadata = {
  title: 'Termos de Uso | DomicilIA',
  description: 'Termos e Condições de Uso do Sistema DomicilIA',
};

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-blue-600">DomicilIA</h1>
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Voltar ao Login
          </Link>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Termos e Condições de Uso
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Aceitação dos Termos</h3>
            <p>
              Ao acessar ou utilizar a plataforma <strong>DomicilIA</strong>, você concorda em cumprir e respeitar os presentes Termos de Uso. Caso não concorde com qualquer disposição aqui estabelecida, você não deve utilizar a plataforma.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Descrição do Serviço</h3>
            <p>
              O DomicilIA é um sistema de gestão escolar voltado para o acompanhamento, lançamento, envio e registro de atividades pedagógicas direcionadas a alunos em regime de atendimento domiciliar.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Cadastro e Segurança de Acesso</h3>
            <p>
              O acesso ao sistema é restrito a usuários autorizados pela instituição de ensino (administradores, pedagogos e professores). O usuário é inteiramente responsável por manter o sigilo de suas credenciais de acesso (e-mail e senha) e por todas as ações realizadas em sua conta.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Responsabilidades do Usuário</h3>
            <p>Os usuários comprometem-se a:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Utilizar a plataforma exclusivamente para fins educacionais e pedagógicos legítimos.</li>
              <li>Garantir a veracidade e exatidão das informações cadastradas (dados de alunos, turmas e atividades).</li>
              <li>Respeitar os direitos autorais e propriedade intelectual ao anexar arquivos e gerar materiais.</li>
              <li>Não tentar violar sistemas de segurança, introduzir vírus ou interferir na operação da plataforma.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Integração com Serviços de Terceiros (Google Agenda)</h3>
            <p>
              O sistema permite a sincronização opcional dos prazos das atividades com o Google Agenda. A utilização dessa funcionalidade está sujeita aos termos de serviço e privacidade do Google. O DomicilIA utiliza o acesso ao Google Agenda exclusivamente para agendamento dos lembretes escolares.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Limitação de Responsabilidade</h3>
            <p>
              O DomicilIA empenha-se em manter a plataforma disponível e funcional de forma contínua. Contudo, não nos responsabilizamos por indisponibilidades temporárias causadas por falhas de conexão de internet do usuário, manutenções programadas ou instabilidade nos serviços de terceiros.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Alterações nos Termos</h3>
            <p>
              Reservamo-nos o direito de atualizar estes Termos de Uso periodicamente. Alterações significativas serão notificadas aos usuários por meio do próprio sistema.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Foro e Legislação Aplicável</h3>
            <p>
              Estes Termos são regidos e interpretados de acordo com a legislação da República Federativa do Brasil.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Entendido / Ir para Login
          </Link>
        </div>
      </div>
    </div>
  );
}
