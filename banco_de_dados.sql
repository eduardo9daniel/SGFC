-- ============================================================
-- BANCO DE DADOS: Centro de Formação Darcy Ribeiro
-- ============================================================

CREATE DATABASE IF NOT EXISTS centro_formacao_darcy_ribeiro
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE centro_formacao_darcy_ribeiro;

CREATE TABLE IF NOT EXISTS usuarios (
  id              INT            NOT NULL AUTO_INCREMENT,
  nome_completo   VARCHAR(150)   NOT NULL,
  email           VARCHAR(100)   NOT NULL UNIQUE,
  cpf             VARCHAR(14)    NOT NULL UNIQUE,
  telefone        VARCHAR(20),
  data_nascimento DATE,
  tipo_usuario    ENUM('admin','coordenador','participante') NOT NULL DEFAULT 'participante',
  senha_hash      VARCHAR(255)   NOT NULL,
  foto_perfil     VARCHAR(255)   DEFAULT NULL,
  data_cadastro   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status          TINYINT(1)     NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS formacoes (
  id                 INT            NOT NULL AUTO_INCREMENT,
  titulo             VARCHAR(200)   NOT NULL,
  descricao          TEXT,
  carga_horaria      INT            NOT NULL DEFAULT 0,
  data_inicio        DATE           NOT NULL,
  data_fim           DATE           NOT NULL,
  horario            VARCHAR(100),
  local              VARCHAR(200),
  vagas              INT            NOT NULL DEFAULT 0,
  vagas_disponiveis  INT            NOT NULL DEFAULT 0,
  instrutor          VARCHAR(150),
  status             ENUM('aberta','andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
  criado_em          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inscricoes (
  id            INT         NOT NULL AUTO_INCREMENT,
  usuario_id    INT         NOT NULL,
  formacao_id   INT         NOT NULL,
  data_inscricao TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('confirmada','cancelada','aguardando') NOT NULL DEFAULT 'confirmada',
  presenca      TINYINT(1)  NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inscricao (usuario_id, formacao_id),
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
  FOREIGN KEY (formacao_id) REFERENCES formacoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS frequencias (
  id              INT       NOT NULL AUTO_INCREMENT,
  inscricao_id    INT       NOT NULL,
  data_aula       DATE      NOT NULL,
  presente        TINYINT(1) NOT NULL DEFAULT 0,
  justificativa   TEXT,
  registrado_por  INT       NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_frequencia (inscricao_id, data_aula),
  FOREIGN KEY (inscricao_id)   REFERENCES inscricoes(id) ON DELETE CASCADE,
  FOREIGN KEY (registrado_por) REFERENCES usuarios(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS certificados (
  id                   INT          NOT NULL AUTO_INCREMENT,
  inscricao_id         INT          NOT NULL UNIQUE,
  codigo_validacao     VARCHAR(50)  NOT NULL UNIQUE,
  data_emissao         DATE         NOT NULL,
  url_pdf              VARCHAR(255),
  carga_horaria_cursada INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (inscricao_id) REFERENCES inscricoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS logs_atividades (
  id          INT           NOT NULL AUTO_INCREMENT,
  usuario_id  INT,
  acao        VARCHAR(100)  NOT NULL,
  descricao   TEXT,
  ip          VARCHAR(45),
  criado_em   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recuperacao_senha (
  id          INT          NOT NULL AUTO_INCREMENT,
  usuario_id  INT          NOT NULL,
  token       VARCHAR(100) NOT NULL UNIQUE,
  expiracao   DATETIME     NOT NULL,
  usado       TINYINT(1)   NOT NULL DEFAULT 0,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin padrão — Senha: Admin@2024 (hash bcryptjs cost 12)
INSERT INTO usuarios (nome_completo, email, cpf, telefone, tipo_usuario, senha_hash)
VALUES (
  'Administrador',
  'admin@centroformacao.edu.br',
  '000.000.000-00',
  '(00) 00000-0000',
  'admin',
  '$2a$12$o8pUOWoXQbW5MCNXRzH5l.cu4fFRHqKQsCBUR/KCTb4ZdvU6EaMTG'
);

INSERT INTO formacoes (titulo, descricao, carga_horaria, data_inicio, data_fim, horario, local, vagas, vagas_disponiveis, instrutor, status) VALUES
('Metodologias Ativas de Ensino', 'Capacitação docente para o uso de metodologias ativas.', 40, '2025-02-10', '2025-03-14', 'Sextas 18h–22h e Sábados 8h–12h', 'Auditório Central – Bloco A', 30, 28, 'Prof. Dr. Carlos Mendes', 'aberta'),
('Inclusão Digital para Educadores', 'Formação para uso de ferramentas digitais no ensino.', 20, '2025-02-17', '2025-03-07', 'Terças e Quintas 19h–21h', 'Laboratório de Informática', 25, 10, 'Prof.ª Ma. Fernanda Rocha', 'andamento'),
('Gestão da Sala de Aula', 'Estratégias para gestão eficaz do ambiente escolar.', 16, '2025-01-20', '2025-01-31', 'Diariamente 14h–18h', 'Sala 201 – Bloco B', 20, 0, 'Prof. Me. Rogério Lima', 'concluida');
