import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | DomicilIA',
  description: 'Política de Privacidade e Proteção de Dados do Sistema DomicilIA',
};

export default function PoliticaDePrivacidadePage() {
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
          Política de Privacidade
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Introdução</h3>
            <p>
              O <strong>DomicilIA</strong> é uma plataforma dedicada ao gerenciamento de atividades escolares domiciliares para instituições de ensino. Comprometemo-nos a proteger a privacidade dos nossos usuários, incluindo administradores, pedagogos, professores, alunos e seus responsáveis, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Dados Coletados</h3>
            <p>Coletamos os dados estritamente necessários para o funcionamento pedagógico do sistema:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Educadores e Usuários da Instituição:</strong> Nome completo, e-mail institucional, perfil de acesso (administrador, pedagogo, professor) e histórico de atividades.</li>
              <li><strong>Alunos em Regime Domiciliar:</strong> Nome, número de matrícula, turma, período do atestado/regime domiciliar e registros de atividades escolares.</li>
              <li><strong>Responsáveis:</strong> Nome completo, e-mail e telefone de contato para envio das atividades.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Uso dos Dados e Integração com Google Agenda</h3>
            <p>
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Permitir o gerenciamento e envio de atividades pedagógicas em regime domiciliar.</li>
              <li>Enviar notificações por e-mail sobre novos prazos e lembretes de atividades.</li>
              <li>
                <strong>Sincronização com o Google Agenda (Google Calendar API):</strong> Quando ativada pela instituição ou professor, utilizamos a permissão do Google OAuth estritamente para registrar os prazos das atividades domiciliares na agenda. Não armazenamos nem compartilhamos dados da sua conta Google para qualquer outra finalidade além do agendamento escolar.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Compartilhamento de Dados</h3>
            <p>
              O DomicilIA não comercializa nem compartilha dados pessoais com terceiros para fins publicitários. Os dados podem ser processados por provedores de infraestrutura estritamente necessários ao serviço (como Firebase para autenticação e banco de dados, e Google Cloud para sincronização da agenda).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Segurança da Informação</h3>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger os dados pessoais contra acessos não autorizados, perda, destruição ou alteração, incluindo criptografia na transmissão (HTTPS/SSL) e controle estrito de acesso por perfil.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Direitos do Titular</h3>
            <p>
              Em conformidade com a LGPD, os usuários e responsáveis têm direito de solicitar o acesso, correção, anonimização ou exclusão de seus dados pessoais entrando em contato com a coordenação da instituição de ensino ou pelo e-mail de suporte do sistema.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Contato</h3>
            <p>
              Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados pessoais, entre em contato pelo e-mail: <a href="mailto:domiciliarmaluf@gmail.com" className="text-blue-600 underline">domiciliarmaluf@gmail.com</a>.
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
