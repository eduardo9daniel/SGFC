const jwt = require('jsonwebtoken');
const db = require('../config/db');

function authMiddleware(...allowedTypes) {
  return async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        erro: 'Não autenticado.'
      });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const [rows] = await db.query(
  `SELECT 
    u.id,
    u.nome_completo,
    u.email,
    u.cpf,
    u.telefone,
    u.data_nascimento,
    u.tipo_usuario,
    u.primeiro_acesso,
    u.status,
    u.regiao_id,
    r.nome AS regiao_nome
   FROM usuarios u
   LEFT JOIN regioes r ON r.id = u.regiao_id
   WHERE u.id = ? AND u.status = 1
   LIMIT 1`,
  [payload.id]
);

      const user = rows[0];

      if (!user) {
        return res.status(401).json({
          ok: false,
          erro: 'Usuário inválido ou inativo.'
        });
      }

      req.user = {
  id: user.id,
  nome: user.nome_completo,
  nome_completo: user.nome_completo,
  email: user.email,
  cpf: user.cpf,
  telefone: user.telefone,
  data_nascimento: user.data_nascimento,
  tipo: user.tipo_usuario,
  primeiro_acesso: !!user.primeiro_acesso,
  regiao_id: user.regiao_id,
  regiao_nome: user.regiao_nome
};
      const rotasPermitidasNoPrimeiroAcesso = [
        '/auth/primeiro-acesso',
        '/auth/gerar-codigo-primeiro-acesso',
        '/auth/me'
      ];

      const rotaLiberadaNoPrimeiroAcesso =
        rotasPermitidasNoPrimeiroAcesso.some(rota =>
          req.originalUrl.includes(rota)
        );

      if (req.user.primeiro_acesso && !rotaLiberadaNoPrimeiroAcesso) {
        return res.status(403).json({
          ok: false,
          erro: 'Primeiro acesso pendente.',
          primeiro_acesso: true
        });
      }

      if (allowedTypes.length && !allowedTypes.includes(req.user.tipo)) {
        return res.status(403).json({
          ok: false,
          erro: 'Acesso negado.'
        });
      }

      next();

    } catch (err) {
      return res.status(401).json({
        ok: false,
        erro: 'Token inválido ou expirado.'
      });
    }
  };
}

module.exports = authMiddleware;