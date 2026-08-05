import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import '../../styles/acervoLivros.css';

const vazio = {
  titulo: '',
  autores: '',
  ano_publicacao: String(new Date().getFullYear()),
  editora: '',
  exemplares_total: '1',
  status: 'disponivel',
  sinopse: ''
};

export default function LivroForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const editando = Boolean(id);

  const rotaBase =
    user?.tipo === 'coordenador'
      ? '/coordenador/biblioteca'
      : '/admin/biblioteca';

  const rotaRetorno =
    `${rotaBase}?aba=acervo&subaba=livros`;

  const [form, setForm] = useState(vazio);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function carregar() {
      try {
        setLoading(true);
        const { data } = await api.get(`/admin/biblioteca/livros/${id}`);
        const livro = data.data;
        setForm({
          titulo: livro.titulo || '',
          autores: livro.autores || '',
          ano_publicacao: String(livro.ano_publicacao || ''),
          editora: livro.editora || '',
          exemplares_total: String(livro.exemplares_total || 1),
          status: livro.status || 'disponivel',
          sinopse: livro.sinopse || ''
        });
      } catch (error) {
        toast(error.response?.data?.erro || 'Erro ao carregar o livro.', 'erro');
        navigate(rotaRetorno);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [id, navigate, toast, rotaRetorno]);

  function atualizar(campo, valor) {
    setForm(atual => ({ ...atual, [campo]: valor }));
  }

  async function salvar(evento) {
    evento.preventDefault();

    if (!form.titulo.trim()) return toast('Informe o título.', 'erro');
    if (!form.autores.trim()) return toast('Informe o autor ou autores.', 'erro');
    if (!form.editora.trim()) return toast('Informe a editora.', 'erro');

    const ano = Number(form.ano_publicacao);
    const exemplares = Number(form.exemplares_total);

    if (!Number.isInteger(ano) || ano < 1000 || ano > 9999) {
      return toast('Informe um ano válido.', 'erro');
    }

    if (!Number.isInteger(exemplares) || exemplares < 1) {
      return toast('Informe ao menos um exemplar.', 'erro');
    }

    const dados = {
      titulo: form.titulo.trim(),
      autores: form.autores.trim(),
      ano_publicacao: ano,
      editora: form.editora.trim(),
      exemplares_total: exemplares,
      status: form.status,
      sinopse: form.sinopse.trim() || null
    };

    try {
      setSalvando(true);

      if (editando) {
        await api.put(`/admin/biblioteca/livros/${id}`, dados);
        toast('Livro atualizado com sucesso.');
      } else {
        await api.post('/admin/biblioteca/livros', dados);
        toast('Livro cadastrado com sucesso.');
      }

      navigate(rotaRetorno);
    } catch (error) {
      toast(
        error.response?.data?.erro || 'Erro ao salvar o livro.',
        'erro'
      );
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <PainelLayout titulo="Acervo de livros">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Acervo de livros">
      <div className="d-flex align-center gap-16 mb-24 flex-wrap">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate(rotaRetorno)}
        >
          ← Voltar
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {editando ? 'Editar livro' : 'Cadastrar livro'}
          </h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
            Informe os dados bibliográficos e a quantidade de exemplares.
          </p>
        </div>
      </div>

      <form className="card" style={{ maxWidth: 980 }} onSubmit={salvar}>
        <div className="acervo-form-grid">
          <div className="campo campo-full">
            <label>Título *</label>
            <input
              value={form.titulo}
              onChange={evento => atualizar('titulo', evento.target.value)}
            />
          </div>

          <div className="campo campo-full">
            <label>Autor(es) *</label>
            <input
              value={form.autores}
              onChange={evento => atualizar('autores', evento.target.value)}
              placeholder="Separe vários autores por ponto e vírgula"
            />
          </div>

          <div className="campo">
            <label>Ano de publicação *</label>
            <input
              type="number"
              min="1000"
              max="9999"
              value={form.ano_publicacao}
              onChange={evento => atualizar('ano_publicacao', evento.target.value)}
            />
          </div>

          <div className="campo">
            <label>Editora *</label>
            <input
              value={form.editora}
              onChange={evento => atualizar('editora', evento.target.value)}
            />
          </div>

          <div className="campo">
            <label>Exemplares *</label>
            <input
              type="number"
              min="1"
              value={form.exemplares_total}
              onChange={evento => atualizar('exemplares_total', evento.target.value)}
            />
          </div>

          <div className="campo">
            <label>Status</label>
            <select
              value={form.status}
              onChange={evento => atualizar('status', evento.target.value)}
            >
              <option value="disponivel">Disponível</option>
              <option value="emprestado">Emprestado</option>
              <option value="indisponivel">Indisponível</option>
            </select>
            <small style={{ color: 'var(--cinza-600)' }}>
              “Emprestado” também é atualizado automaticamente quando não há exemplares livres.
            </small>
          </div>

          <div className="campo campo-full">
            <label>Sinopse</label>
            <textarea
              rows="6"
              value={form.sinopse}
              onChange={evento => atualizar('sinopse', evento.target.value)}
            />
          </div>
        </div>

        <div className="acervo-acoes">
          <button type="submit" className="btn btn-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar livro'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(rotaRetorno)}
            disabled={salvando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </PainelLayout>
  );
}
