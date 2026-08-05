import { useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Link } from 'react-router-dom';
import FormularioFormacaoCampos from '../../components/FormularioFormacaoCampos';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  criarFormularioFormacaoVazio,
  formularioParaPayload,
  validarFormularioFormacao
} from '../../utils/formacaoForm';
import api from '../../api';

export default function AgendarFormacaoPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState(() =>
    criarFormularioFormacaoVazio()
  );

  const [salvando, setSalvando] = useState(false);

  const rotaAgenda =
    user?.tipo === 'coordenador'
      ? '/coordenador/agenda-semanal'
      : '/admin/agenda-semanal';

  async function salvar(e) {
    e.preventDefault();

    const erro = validarFormularioFormacao(form);

    if (erro) {
      toast(erro, 'erro');
      return;
    }

    try {
      setSalvando(true);

      await api.post(
        '/formacoes',
        formularioParaPayload(form)
      );

      toast('Formação criada!');
      setForm(criarFormularioFormacaoVazio());
    } catch (err) {
      toast(
        err.response?.data?.erro ||
          'Erro ao salvar formação.',
        'erro'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PainelLayout titulo="Agendar Formação">
      <div className="page-header mb-24">
        <div style={{ marginBottom: '16px' }}>
  <div style={{ marginBottom: '16px' }}>
  <Link
    className="btn btn-outline"
    to={rotaAgenda}
    aria-label="Voltar para a Agenda Semanal"
  >
    ← Voltar
  </Link>
</div>
</div>
        <h2>Agendar Encontro Formativo</h2>
        <p
          style={{
            color: 'var(--cinza-600)',
            fontSize: '.9rem'
          }}
        >
          O formulário possui os mesmos campos utilizados na edição e nas
          solicitações da equipe.
        </p>
      </div>

      <form
        className="card"
        onSubmit={salvar}
        noValidate
      >
        <FormularioFormacaoCampos
          form={form}
          onChange={setForm}
          mostrarStatus
        />

        <div
          className="d-flex gap-12 justify-end"
          style={{ flexWrap: 'wrap' }}
        >
          <Link
  className="btn btn-outline"
  to={rotaAgenda}
  aria-label="Cancelar agendamento"
>
  Cancelar
</Link>

          <button
            type="submit"
            className="btn btn-primario"
            disabled={salvando}
          >
            {salvando
              ? 'Salvando...'
              : 'Agendar formação'}
          </button>
        </div>
      </form>
    </PainelLayout>
  );
}