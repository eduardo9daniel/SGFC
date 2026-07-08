import { useEffect, useState } from 'react';
import {
  useNavigate,
  useSearchParams
} from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

const formularioVazio = {
  nome: '',
  natureza_pesquisa: '',
  titulo_trabalho: '',
  tipo_trabalho: '',
  filiacao: '',
  palavras_chave: '',
  link_lattes: '',
  link_documento: ''
};

const naturezas = [
  'Mestrado',
  'Doutorado',
  'Pós-doutorado'
];

const tiposTrabalho = [
  'Dissertação',
  'Tese',
  'Pós-doutorado',
  'Artigo',
  'Outro'
];

export default function PesquisaForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const id = searchParams.get('id');
  const editando = Boolean(id);

  const [form, setForm] = useState(formularioVazio);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (editando) {
      carregarPesquisa();
    }
  }, [id]);

  async function carregarPesquisa() {
    try {
      setLoading(true);

      const { data } = await api.get(
        '/admin/pesquisadores-nest'
      );

      const lista = data.data || [];

      const pesquisa = lista.find(
        item => String(item.id) === String(id)
      );

      if (!pesquisa) {
        toast(
          'Pesquisa não encontrada.',
          'erro'
        );

        navigate(
          '/admin/biblioteca?aba=pesquisas'
        );

        return;
      }

      setForm({
        nome: pesquisa.nome || '',

        natureza_pesquisa:
          pesquisa.natureza_pesquisa || '',

        titulo_trabalho:
          pesquisa.titulo_trabalho || '',

        tipo_trabalho:
          pesquisa.tipo_trabalho || '',

        filiacao:
          pesquisa.filiacao || '',

        palavras_chave:
          pesquisa.palavras_chave || '',

        link_lattes:
          pesquisa.link_lattes || '',

        link_documento:
          pesquisa.link_documento || ''
      });
    } catch (error) {
      toast(
        error.response?.data?.erro ||
          'Erro ao carregar pesquisa.',
        'erro'
      );

      navigate(
        '/admin/biblioteca?aba=pesquisas'
      );
    } finally {
      setLoading(false);
    }
  }

  function atualizarCampo(evento) {
    const { name, value } = evento.target;

    setForm(formAtual => ({
      ...formAtual,
      [name]: value
    }));
  }

  async function salvar(evento) {
    evento.preventDefault();

    if (!form.nome.trim()) {
      toast(
        'Informe o nome do pesquisador.',
        'erro'
      );

      return;
    }

    try {
      setSalvando(true);

      const dados = {
        nome: form.nome.trim(),

        natureza_pesquisa:
          form.natureza_pesquisa || null,

        titulo_trabalho:
          form.titulo_trabalho.trim() || null,

        tipo_trabalho:
          form.tipo_trabalho || null,

        filiacao:
          form.filiacao.trim() || null,

        palavras_chave:
          form.palavras_chave.trim() || null,

        link_lattes:
          form.link_lattes.trim() || null,

        link_documento:
          form.link_documento.trim() || null
      };

      if (editando) {
        await api.put(
          `/admin/pesquisadores-nest/${id}`,
          dados
        );

        toast(
          'Pesquisa atualizada com sucesso.'
        );
      } else {
        await api.post(
          '/admin/pesquisadores-nest',
          dados
        );

        toast(
          'Pesquisa cadastrada com sucesso.'
        );
      }

      navigate(
        '/admin/biblioteca?aba=pesquisas'
      );
    } catch (error) {
      toast(
        error.response?.data?.erro ||
          'Erro ao salvar pesquisa.',
        'erro'
      );
    } finally {
      setSalvando(false);
    }
  }

  function voltar() {
    navigate('/admin/biblioteca-painel');
  }

  if (loading) {
    return (
      <PainelLayout titulo="Pesquisa">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Pesquisa">
      {/* Cabeçalho */}
      <div className="d-flex align-center gap-16 mb-24 flex-wrap">
        <button
          type="button"
          className="btn btn-outline"
          onClick={voltar}
        >
          ← Retornar ao Painel
        </button>

        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800
            }}
          >
            {editando
              ? 'Editar Pesquisa'
              : 'Cadastrar Pesquisa'}
          </h2>

          <p
            style={{
              color: 'var(--cinza-600)',
              fontSize: '.9rem'
            }}
          >
            Preencha os dados abaixo para incluir uma
            pesquisa na biblioteca.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <form
        onSubmit={salvar}
        className="pesquisa-form-card"
      >
        {/* Dados da pesquisa */}
        <div className="pesquisa-form-secao">
          <div className="pesquisa-form-titulo">
            Dados da pesquisa
          </div>

          <div className="pesquisa-form-grid">
            <div className="pesquisa-form-campo pesquisa-form-campo-full">
              <label htmlFor="nome">
                Nome do pesquisador *
              </label>

              <input
                id="nome"
                type="text"
                name="nome"
                value={form.nome}
                onChange={atualizarCampo}
                placeholder="Nome completo do pesquisador"
                required
              />
            </div>

            <div className="pesquisa-form-campo">
              <label htmlFor="natureza_pesquisa">
                Natureza da pesquisa
              </label>

              <select
                id="natureza_pesquisa"
                name="natureza_pesquisa"
                value={form.natureza_pesquisa}
                onChange={atualizarCampo}
              >
                <option value="">
                  Selecione
                </option>

                {naturezas.map(item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="pesquisa-form-campo">
              <label htmlFor="tipo_trabalho">
                Tipo de trabalho
              </label>

              <select
                id="tipo_trabalho"
                name="tipo_trabalho"
                value={form.tipo_trabalho}
                onChange={atualizarCampo}
              >
                <option value="">
                  Selecione
                </option>

                {tiposTrabalho.map(item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="pesquisa-form-campo pesquisa-form-campo-full">
              <label htmlFor="titulo_trabalho">
                Título da tese/dissertação
              </label>

              <textarea
                id="titulo_trabalho"
                name="titulo_trabalho"
                value={form.titulo_trabalho}
                onChange={atualizarCampo}
                placeholder="Digite o título completo do trabalho"
                rows="3"
              />
            </div>

            <div className="pesquisa-form-campo pesquisa-form-campo-full">
              <label htmlFor="filiacao">
                Filiação
              </label>

              <input
                id="filiacao"
                type="text"
                name="filiacao"
                value={form.filiacao}
                onChange={atualizarCampo}
                placeholder="Instituição ou vínculo acadêmico"
              />
            </div>
          </div>
        </div>

        {/* Palavras-chave e links */}
        <div className="pesquisa-form-secao">
          <div className="pesquisa-form-titulo">
            Palavras-chave e links
          </div>

          <div className="pesquisa-form-grid">
            <div className="pesquisa-form-campo pesquisa-form-campo-full">
              <label htmlFor="palavras_chave">
                Palavras-chave
              </label>

              <input
                id="palavras_chave"
                type="text"
                name="palavras_chave"
                value={form.palavras_chave}
                onChange={atualizarCampo}
                placeholder="Ex.: educação, currículo, formação docente"
              />

              <small>
                Separe as palavras-chave por vírgula.
              </small>
            </div>

            <div className="pesquisa-form-campo pesquisa-form-campo-full">
              <label htmlFor="link_documento">
                Link do documento
              </label>

              <input
                id="link_documento"
                type="url"
                name="link_documento"
                value={form.link_documento}
                onChange={atualizarCampo}
                placeholder="https://..."
              />
            </div>

            <div className="pesquisa-form-campo pesquisa-form-campo-full">
              <label htmlFor="link_lattes">
                Link do Currículo Lattes
              </label>

              <input
                id="link_lattes"
                type="url"
                name="link_lattes"
                value={form.link_lattes}
                onChange={atualizarCampo}
                placeholder="http://lattes.cnpq.br/..."
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="pesquisa-form-acoes">
          <button
            type="button"
            className="btn btn-outline"
            onClick={voltar}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="btn btn-primario"
            disabled={salvando}
          >
            {salvando
              ? 'Salvando...'
              : editando
                ? 'Salvar alterações'
                : 'Cadastrar pesquisa'}
          </button>
        </div>
      </form>
    </PainelLayout>
  );
}