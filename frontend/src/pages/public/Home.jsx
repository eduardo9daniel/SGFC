import "../../cfdr_home_styles.css";
import {
  HeaderPublico,
  FooterPublico
} from '../../components/PublicLayout';
import logo from '../../assets/img/logo/logotipo_centroformcacao.png';

const recursos = [
  {
    icon: '📝',
    titulo: 'Inscrições on-line',
    texto:
      'Os profissionais podem consultar formações abertas, realizar inscrição e acompanhar sua participação pelo sistema.',
  },
  {
    icon: '✅',
    titulo: 'Registro de frequência',
    texto:
      'A equipe acompanha a presença dos participantes e organiza os dados das formações de forma centralizada.',
  },
  {
    icon: '🎓',
    titulo: 'Certificados digitais',
    texto:
      'Emissão e validação de certificados com código de autenticidade, facilitando a comprovação da formação.',
  },
  {
    icon: '📚',
    titulo: 'Biblioteca',
    texto:
      'Espaço aberto para consulta de trabalhos acadêmicos, pesquisas e produções formativas cadastradas no sistema.',
  },
];

export default function Home() {
  return (
    <div className="home-cfdr">
      <HeaderPublico />

      {/* =====================================================
          APRESENTAÇÃO
      ====================================================== */}
      <section id="inicio" className="cfdr-hero">
        <div
          className="cfdr-hero-bg"
          aria-hidden="true"
        />

        <div className="cfdr-container cfdr-hero-grid">
          <div className="cfdr-hero-texto animar-entrada">
            <p className="cfdr-etiqueta">
              Centro de Formação Darcy Ribeiro
            </p>

            <h1>
              Formação continuada para a educação de Niterói
            </h1>

            <p className="cfdr-subtitulo">
              Um ambiente digital para divulgar formações,
              organizar inscrições, registrar frequência,
              emitir certificados e apoiar a gestão das ações
              formativas.
            </p>

            <a
              href="/cadastro"
              className="btn btn-amarelo btn-lg cfdr-hero-botao"
            >
              Crie sua Conta
            </a>
          </div>

          <div
            className="cfdr-hero-card"
            aria-label="Resumo do sistema"
          >
            <img
              src={logo}
              alt="Centro de Formação Darcy Ribeiro"
            />

            <div className="cfdr-card-destaque">
              <span>Plataforma integrada</span>

              <strong>
                Inscrição • Frequência • Certificação
              </strong>
            </div>

            <ul>
              <li>✓ Consulta das formações</li>
              <li>✓ Biblioteca de trabalhos acadêmicos</li>
              <li>✓ Área do participante</li>
              <li>✓ Validação de certificados</li>
            </ul>
          </div>
        </div>
      </section>

      {/* =====================================================
          SERVIÇOS
      ====================================================== */}
      <section
        id="servicos"
        className="cfdr-secao"
      >
        <div className="cfdr-container">
          <div className="cfdr-cabecalho-secao">
            <p className="cfdr-etiqueta escura">
              O que o sistema oferece
            </p>

            <p>
              A página inicial apresenta o Centro, orienta os
              usuários e abre caminho para os principais serviços
              do sistema.
            </p>
          </div>

          <div className="cfdr-recursos-grid">
            {recursos.map((recurso) => (
              <article
                className="cfdr-recurso-card"
                key={recurso.titulo}
              >
                <div className="cfdr-recurso-icon">
                  {recurso.icon}
                </div>

                <h3>{recurso.titulo}</h3>

                <p>{recurso.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          BIBLIOTECA
      ====================================================== */}
      <section
        id="biblioteca"
        className="cfdr-faixa"
      >
        <div className="cfdr-container cfdr-faixa-grid">
          <div>
            <p className="cfdr-etiqueta">
              Biblioteca
            </p>

            <h2>
              Consulte trabalhos acadêmicos e produções formativas
            </h2>

            <p>
              Conheça trabalhos acadêmicos produzidos por profissionais da Rede Municipal 
              de Educação e pesquisas que têm como foco a Educação de Niterói.
            </p>
          </div>

          <div className="cfdr-acoes">
            <a
              href="/biblioteca"
              className="btn btn-outline-branco btn-lg"
            >
              Biblioteca
            </a>
          </div>
        </div>
      </section>

      {/* =====================================================
          ACESSO RÁPIDO
      ====================================================== */}
      <section
        id="acesso"
        className="cfdr-cta"
      >
        <div className="cfdr-container cfdr-cta-card">
          <div>
            <p className="cfdr-etiqueta">
              Acesso rápido
            </p>

            <h2>Já tem cadastro?</h2>

            <p>
              Entre no sistema para acompanhar inscrições,
              frequência e certificados.
            </p>
          </div>

          <div className="cfdr-acoes-rapidas">
            <a
              href="/login"
              className="btn btn-amarelo btn-lg"
            >
              Entrar
            </a>

            <a
              href="/cadastro"
              className="btn btn-outline-branco btn-lg"
            >
              Criar conta
            </a>

            <a
              href="/validar-certificado"
              className="btn btn-outline-branco btn-lg"
            >
              Validar certificado
            </a>
          </div>
        </div>
      </section>

      <FooterPublico />
    </div>
  );
}