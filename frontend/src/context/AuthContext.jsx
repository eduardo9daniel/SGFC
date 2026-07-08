import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const salvo = localStorage.getItem('user');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });

    if (data.ok) {
      localStorage.setItem('token', data.token);

      const u = {
        id: data.id,
        nome: data.nome,
        email: data.email || email,
        tipo: data.tipo,
        primeiro_acesso: !!data.primeiro_acesso
      };

      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
    }

    return data;
  }, []);

  const concluirPrimeiroAcesso = useCallback((dadosAtualizados = {}) => {
  setUser(prev => {
    if (!prev) return prev;

    const atualizado = {
      ...prev,
      ...dadosAtualizados,
      primeiro_acesso: false
    };

    localStorage.setItem('user', JSON.stringify(atualizado));

    return atualizado;
  });
}, []);

const concluirLoginCadastro = useCallback((data) => {
  localStorage.setItem('token', data.token);

  const u = {
    id: data.id,
    nome: data.nome,
    email: data.email,
    tipo: data.tipo,
    primeiro_acesso: true
  };

  localStorage.setItem('user', JSON.stringify(u));
  setUser(u);
}, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    concluirPrimeiroAcesso,
    concluirLoginCadastro,
    isAdmin: user?.tipo === 'admin',
    isCoordenador: user?.tipo === 'coordenador',
    isEquipe: user?.tipo === 'equipe',
    isParticipante: user?.tipo === 'participante',
    isPrimeiroAcesso: !!user?.primeiro_acesso
  }), [user, login, logout, concluirPrimeiroAcesso]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}