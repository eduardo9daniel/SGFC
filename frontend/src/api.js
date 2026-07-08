import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    const status = err.response?.status;
    const data = err.response?.data;

    // 🔒 Token inválido ou expirado
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

    // 🔑 Primeiro acesso pendente
    if (status === 403 && data?.primeiro_acesso) {
      window.location.href = '/primeiro-acesso';
    }

    return Promise.reject(err);
  }
);

export default api;