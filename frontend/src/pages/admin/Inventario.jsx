import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { useAuth } from '../../context/AuthContext';

export default function Inventario() {
  const { user } = useAuth();
  const base = user?.tipo === 'coordenador' ? '/coordenador' : '/admin';

  const secoes = [
    {
      titulo: 'Bens de Consumo',
      icone: '📦',
      descricao:
        'Controle materiais consumíveis, quantidades em estoque, estoque mínimo, validade e localização.',
      rota: `${base}/inventario/bens-consumo`,
      acao: 'Acessar bens de consumo'
    },
    {
      titulo: 'Bens Duráveis',
      icone: '🗄️',
      descricao:
        'Controle patrimônio, estado de conservação, situação, responsável, localização e aquisição.',
      rota: `${base}/inventario/bens-duraveis`,
      acao: 'Acessar bens duráveis'
    }
  ];

  return (
    <PainelLayout titulo="Inventário">
      <div className="mb-24">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
          Inventário
        </h2>

        <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
          Selecione a categoria de bens que deseja consultar ou atualizar.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20
        }}
      >
        {secoes.map(secao => (
          <Link
            key={secao.rota}
            to={secao.rota}
            className="card"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              minHeight: 210,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--cinza-200)',
              transition: 'transform .2s ease, box-shadow .2s ease'
            }}
          >
            <div>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 14,
                  background: 'var(--laranja-claro)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  marginBottom: 18
                }}
              >
                {secao.icone}
              </div>

              <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>
                {secao.titulo}
              </h3>

              <p
                style={{
                  color: 'var(--cinza-600)',
                  fontSize: '.9rem',
                  lineHeight: 1.55
                }}
              >
                {secao.descricao}
              </p>
            </div>

            <strong style={{ color: 'var(--laranja)', marginTop: 18 }}>
              {secao.acao} →
            </strong>
          </Link>
        ))}
      </div>
    </PainelLayout>
  );
}
