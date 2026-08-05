import { useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import FormularioFormacaoCampos from '../../components/FormularioFormacaoCampos';
import { useToast } from '../../context/ToastContext';
import {
  criarFormularioFormacaoVazio,
  formularioParaPayload,
  validarFormularioFormacao
} from '../../utils/formacaoForm';
import api from '../../api';

export default function AgendarFormacaoPage() {
  const toast = useToast();

  const [form, setForm] = useState(() =>
    criarFormularioFormacaoVazio()
  );

  const [salvando, setSalvando] = useState(false);

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
        '/propostas-formacao',
        formularioParaPayload(form)
      );

      toast('Proposta de formação enviada à Coordenação!');
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
    <PainelLayout titulo="Propor Formação">
      <div style={{ marginBottom: '16px' }}>
        <Link
          className="btn btn-outline"
          to="/equipe/agenda-semanal"
          aria-label="Voltar para a Agenda Semanal"
        >
          ← Voltar
        </Link>
      </div>

      <div className="page-header mb-24">
        <h2>Proposta de Encontro Formativo</h2>

        <p
          style={{
            color: 'var(--cinza-600)',
            fontSize: '.9rem'
          }}
        >
          Preencha os dados da formação. A proposta será enviada à Coordenação
          para análise, confirmação ou recusa.
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
        />

        <div
          className="d-flex gap-12 justify-end"
          style={{ flexWrap: 'wrap' }}
        >
          <button
            type="submit"
            className="btn btn-primario"
            disabled={salvando}
          >
            {salvando
              ? 'Salvando...'
              : 'Enviar proposta'}
          </button>
        </div>
      </form>
    </PainelLayout>
  );
}