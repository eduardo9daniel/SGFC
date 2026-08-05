import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,

  error => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Token inválido ou expirado
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const rotaAtual = window.location.pathname;

      const rotasPublicas = [
        '/',
        '/login',
        '/cadastro',
        '/biblioteca',
        '/validar-certificado',
        '/primeiro-acesso'
      ];

      const ehRotaPublica =
        rotasPublicas.includes(rotaAtual) ||
        rotaAtual.startsWith('/validar/');

      if (!ehRotaPublica) {
        window.location.href = '/login';
      }
    }

    // Primeiro acesso pendente
    if (status === 403 && data?.primeiro_acesso) {
      try {
        const usuarioSalvo = localStorage.getItem('user');

        if (usuarioSalvo) {
          const usuario = JSON.parse(usuarioSalvo);

          localStorage.setItem(
            'user',
            JSON.stringify({
              ...usuario,
              primeiro_acesso: true
            })
          );
        }
      } catch (erro) {
        console.error(
          'Erro ao atualizar o primeiro acesso local:',
          erro
        );
      }

      if (window.location.pathname !== '/primeiro-acesso') {
        window.location.href = '/primeiro-acesso';
      }
    }

    return Promise.reject(error);
  }
);

export default api;