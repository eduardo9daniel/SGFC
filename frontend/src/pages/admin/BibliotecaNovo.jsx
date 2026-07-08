import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

const empty = {
  titulo: '',
  autor: '',
  cargo: '',
  instituicao: '',
  tipo_trabalho: '',
  palavras_chave: '',
  link_documento: '',
  link_lattes: ''
};

export default function BibliotecaNovo() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const [form, setForm] = useState(empty);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  function atualizar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function validarUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!id) return;

    async function carregarItem() {
      try {
        setCarregando(true);

        const { data } = await api.get(`/admin/biblioteca/${id}`);
        const item = data.data;

        setForm({
          titulo: item.titulo || '',
          autor: item.autor || '',
          cargo: item.cargo || '',
          instituicao: item.instituicao || '',
          tipo_trabalho: item.tipo_trabalho || '',
          palavras_chave: Array.isArray(item.palavras_chave)
            ? item.palavras_chave.join(', ')
            : item.palavras_chave || '',
          link_documento: item.link_documento || '',
          link_lattes: item.link_lattes || ''
        });
      } catch (err) {
        toast(err.response?.data?.erro || 'Erro ao carregar item.', 'erro');
        navigate('/admin/biblioteca');
      } finally {
        setCarregando(false);
      }
    }

    carregarItem();
  }, [id, navigate, toast]);

  async function salvar(e) {
    e.preventDefault();

    if (!form.titulo.trim()) return toast('Informe o título do trabalho.', 'erro');
    if (!form.autor.trim()) return toast('Informe o autor/servidor.', 'erro');
    if (!form.cargo.trim()) return toast('Informe o cargo.', 'erro');
    if (!form.instituicao.trim()) return toast('Informe a instituição.', 'erro');
    if (!form.tipo_trabalho.trim()) return toast('Informe o tipo de trabalho.', 'erro');
    if (!form.palavras_chave.trim()) return toast('Informe ao menos uma palavra-chave.', 'erro');
    if (!form.link_documento.trim()) return toast('Informe o link do documento.', 'erro');

    if (!validarUrl(form.link_documento)) {
      return toast('Informe um link do documento válido, iniciado por http ou https.', 'erro');
    }

    if (form.link_lattes.trim() && !validarUrl(form.link_lattes)) {
      return toast('Informe um link do Lattes válido, iniciado por http ou https.', 'erro');
    }

    const dados = {
      titulo: form.titulo.trim(),
      autor: form.autor.trim(),
      cargo: form.cargo.trim(),
      instituicao: form.instituicao.trim(),
      tipo_trabalho: form.tipo_trabalho.trim(),
      palavras_chave: form.palavras_chave,
      link_documento: form.link_documento.trim(),
      link_lattes: form.link_lattes.trim()
    };

    try {
      setSalvando(true);

      if (id) {
        await api.put(`/admin/biblioteca/${id}`, {
          ...dados,
          ativo: 1
        });

        toast('Item atualizado com sucesso!');
      } else {
        await api.post('/admin/biblioteca', dados);
        toast('Item cadastrado com sucesso!');
      }

      navigate('/admin/biblioteca');
    } catch (err) {
      toast(
        err.response?.data?.erro ||
          (id ? 'Erro ao atualizar item.' : 'Erro ao cadastrar item.'),
        'erro'
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <PainelLayout titulo="Biblioteca de Itens">
        <div className="card">
          <p>Carregando dados do item...</p>
        </div>
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Biblioteca de Itens">
      <div className="d-flex align-center gap-12 mb-24">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/admin/biblioteca')}
        >
          ← Voltar
        </button>

        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {id ? 'Editar Trabalho Acadêmico' : 'Cadastrar Trabalho Acadêmico'}
          </h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            {id
              ? 'Atualize os dados do item selecionado.'
              : 'Preencha os dados abaixo para incluir um novo item na biblioteca.'}
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 980 }}>
        <form onSubmit={salvar} noValidate>
          <h3 style={sectionStyle}>Dados do trabalho</h3>

          <div className="campo">
            <label>Título do trabalho *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => atualizar('titulo', e.target.value)}
              placeholder="Ex: Avaliação educacional na rede pública"
            />
          </div>

          <div style={grid2}>
            <div className="campo">
              <label>Autor/Servidor *</label>
              <input
                type="text"
                value={form.autor}
                onChange={e => atualizar('autor', e.target.value)}
                placeholder="Nome do autor/servidor"
              />
            </div>

            <div className="campo">
              <label>Cargo *</label>
              <input
                type="text"
                value={form.cargo}
                onChange={e => atualizar('cargo', e.target.value)}
                placeholder="Ex: Professor, Pedagogo, Diretor"
              />
            </div>
          </div>

          <div style={grid2}>
            <div className="campo">
              <label>Instituição *</label>
              <input
                type="text"
                value={form.instituicao}
                onChange={e => atualizar('instituicao', e.target.value)}
                placeholder="Ex: UFF"
              />
            </div>

            <div className="campo">
              <label>Tipo de trabalho *</label>
              <select
                value={form.tipo_trabalho}
                onChange={e => atualizar('tipo_trabalho', e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="Artigo">Artigo</option>
                <option value="Monografia">Monografia</option>
                <option value="Dissertação">Dissertação</option>
                <option value="Tese">Tese</option>
                <option value="Relatório Técnico">Relatório Técnico</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <h3 style={sectionStyle}>Palavras-chave e documento</h3>

          <div className="campo">
            <label>Palavras-chave *</label>
            <input
              type="text"
              value={form.palavras_chave}
              onChange={e => atualizar('palavras_chave', e.target.value)}
              placeholder="Ex: avaliação educacional, alfabetização, política pública"
            />
            <small style={{ color: 'var(--cinza-600)' }}>
              Separe as palavras-chave por vírgula.
            </small>
          </div>

          <div className="campo">
            <label>Link do documento *</label>
            <input
              type="url"
              value={form.link_documento}
              onChange={e => atualizar('link_documento', e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="campo">
            <label>Link do Lattes</label>
            <input
              type="url"
              value={form.link_lattes}
              onChange={e => atualizar('link_lattes', e.target.value)}
              placeholder="https://lattes.cnpq.br/..."
            />
          </div>

          <div className="d-flex gap-12 mt-24">
            <button
              type="submit"
              className="btn btn-primario btn-lg"
              disabled={salvando}
            >
              {salvando
                ? 'Salvando...'
                : id
                  ? '💾 Salvar Alterações'
                  : '✅ Cadastrar Item'}
            </button>

            <button
              type="button"
              className="btn btn-outline btn-lg"
              onClick={() => navigate('/admin/biblioteca')}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </PainelLayout>
  );
}

const sectionStyle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#EA5B23',
  borderBottom: '1.5px solid #EA5B23',
  paddingBottom: 6,
  marginBottom: 16,
  marginTop: 24,
  textTransform: 'uppercase',
  letterSpacing: '.4px'
};

const grid2 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16
};