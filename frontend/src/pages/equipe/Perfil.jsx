import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

export default function EquipePerfil() {
  const toast = useToast();

  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: ''
  });

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const { data } = await api.get('/auth/me');
        const usuario = data.user || {};

        setForm({
          nome_completo: usuario.nome_completo || usuario.nome || '',
          email: usuario.email || '',
          cpf: usuario.cpf || '',
          telefone: usuario.telefone || '',
          data_nascimento: usuario.data_nascimento
            ? String(usuario.data_nascimento).slice(0, 10)
            : ''
        });
      } catch (erro) {
        console.error('Erro ao carregar perfil:', erro);
        toast('Erro ao carregar os dados do perfil.', 'erro');
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, [toast]);

  async function salvarPerfil(evento) {
    evento.preventDefault();

    if (!form.nome_completo.trim()) {
      toast('Informe o nome completo.', 'erro');
      return;
    }

    setSalvando(true);

    try {
      await api.put('/usuarios/me', {
        nome_completo: form.nome_completo.trim(),
        telefone: form.telefone || null,
        data_nascimento: form.data_nascimento || null
      });

      toast('Perfil atualizado com sucesso!', 'sucesso');
    } catch (erro) {
      toast(
        erro.response?.data?.erro || 'Erro ao atualizar o perfil.',
        'erro'
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <PainelLayout titulo="Meu Perfil">
        <div className="card">Carregando perfil...</div>
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Meu Perfil">
      <div className="card">
        <div className="card-titulo">
          <span className="icone">👤</span>
          Dados Pessoais
        </div>

        <form onSubmit={salvarPerfil}>
          <div className="campo">
            <label>Nome Completo</label>
            <input
              type="text"
              value={form.nome_completo}
              onChange={e =>
                setForm({ ...form, nome_completo: e.target.value })
              }
              required
            />
          </div>

          <div className="campo">
            <label>E-mail</label>
            <input type="email" value={form.email} disabled />
          </div>

          <div className="campo">
            <label>CPF</label>
            <input type="text" value={form.cpf} disabled />
          </div>

          <div className="campo">
            <label>Telefone</label>
            <input
              type="text"
              value={form.telefone}
              onChange={e =>
                setForm({ ...form, telefone: e.target.value })
              }
            />
          </div>

          <div className="campo">
            <label>Data de Nascimento</label>
            <input
              type="date"
              value={form.data_nascimento}
              onChange={e =>
                setForm({
                  ...form,
                  data_nascimento: e.target.value
                })
              }
            />
          </div>

          <button
            type="submit"
            className="btn btn-primario"
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </form>
      </div>
    </PainelLayout>
  );
}