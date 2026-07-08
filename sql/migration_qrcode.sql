-- ============================================================
-- MIGRAÇÃO: Sistema de Autenticidade via QR Code
-- Centro de Formação Darcy Ribeiro
-- Executar: mysql -u root -p centro_formacao_darcy_ribeiro < migration_qrcode.sql
-- ============================================================

USE centro_formacao_darcy_ribeiro;

-- ────────────────────────────────────────────────────────────
-- 1. EVOLUIR tabela `certificados` existente
-- ────────────────────────────────────────────────────────────

ALTER TABLE certificados
  -- Hash UUID para o QR Code (imutável, criptograficamente seguro)
  ADD COLUMN hash_unico        VARCHAR(36)  UNIQUE        AFTER codigo_validacao,
  -- Status do certificado (ativo | cancelado | substituido)
  ADD COLUMN status            ENUM('ativo','cancelado','substituido')
                                            NOT NULL DEFAULT 'ativo' AFTER hash_unico,
  -- Snapshot JSON de todos os dados no momento da emissão
  ADD COLUMN dados_completos   JSON                       AFTER status,
  -- Data de validade (NULL = não expira)
  ADD COLUMN data_validade     DATE         DEFAULT NULL  AFTER data_emissao,
  -- Motivo de cancelamento ou substituição
  ADD COLUMN motivo_status     TEXT         DEFAULT NULL  AFTER data_validade,
  -- Referência ao certificado que substituiu este (histórico de substituições)
  ADD COLUMN substituido_por   INT          DEFAULT NULL  AFTER motivo_status,
  -- Contador de consultas
  ADD COLUMN total_consultas   INT UNSIGNED NOT NULL DEFAULT 0 AFTER substituido_por,
  -- Índice no hash para busca rápida pelo QR
  ADD INDEX idx_hash_unico (hash_unico),
  ADD FOREIGN KEY fk_cert_substituto (substituido_por)
    REFERENCES certificados(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Gerar hash_unico para certificados EXISTENTES (backfill)
--    O UUID() do MySQL gera RFC 4122 v1 (baseado em timestamp + MAC).
--    Para novos certificados o backend usa crypto.randomUUID() (v4).
-- ────────────────────────────────────────────────────────────

UPDATE certificados SET hash_unico = UUID() WHERE hash_unico IS NULL;

-- Tornar hash_unico NOT NULL após o backfill
ALTER TABLE certificados MODIFY COLUMN hash_unico VARCHAR(36) NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. NOVA tabela: logs de consultas via QR Code
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS logs_consultas_certificados (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  certificado_id  INT           NOT NULL,
  hash_consultado VARCHAR(36)   NOT NULL,
  ip              VARCHAR(45)   DEFAULT NULL,  -- suporta IPv6
  user_agent      VARCHAR(500)  DEFAULT NULL,
  referer         VARCHAR(500)  DEFAULT NULL,
  resultado       ENUM('encontrado','nao_encontrado','cancelado') NOT NULL DEFAULT 'encontrado',
  data_consulta   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_cert_id   (certificado_id),
  INDEX idx_data      (data_consulta),
  INDEX idx_hash_log  (hash_consultado),

  FOREIGN KEY fk_log_cert (certificado_id)
    REFERENCES certificados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Log de todas as consultas de validação de certificados';

-- ────────────────────────────────────────────────────────────
-- 4. NOVA tabela: chaves de API para validação em massa
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys_certificados (
  id          INT           NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(150)  NOT NULL COMMENT 'Nome da empresa/parceiro',
  api_key     VARCHAR(64)   NOT NULL UNIQUE,
  ativo       TINYINT(1)    NOT NULL DEFAULT 1,
  criado_em   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso  TIMESTAMP     DEFAULT NULL,

  PRIMARY KEY (id),
  INDEX idx_api_key (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Chaves para API de validação em massa';

-- ────────────────────────────────────────────────────────────
-- 5. VIEW de apoio: certificados com dados completos para relatórios
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_certificados_completos AS
SELECT
  c.id,
  c.hash_unico,
  c.codigo_validacao,
  c.status,
  c.data_emissao,
  c.data_validade,
  c.carga_horaria_cursada,
  c.total_consultas,
  c.substituido_por,
  c.dados_completos,
  u.id           AS usuario_id,
  u.nome_completo,
  u.email,
  u.cpf,
  f.id           AS formacao_id,
  f.titulo       AS formacao_titulo,
  f.carga_horaria,
  f.data_inicio,
  f.data_fim,
  f.instrutor,
  i.id           AS inscricao_id
FROM certificados c
JOIN inscricoes i  ON i.id  = c.inscricao_id
JOIN usuarios   u  ON u.id  = i.usuario_id
JOIN formacoes  f  ON f.id  = i.formacao_id;

-- ────────────────────────────────────────────────────────────
-- 6. PROCEDURE para revogar/substituir certificado com histórico
-- ────────────────────────────────────────────────────────────

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS sp_revogar_certificado(
  IN p_cert_id     INT,
  IN p_status      ENUM('cancelado','substituido'),
  IN p_motivo      TEXT,
  IN p_novo_hash   VARCHAR(36)  -- NULL se for apenas cancelamento
)
BEGIN
  UPDATE certificados
     SET status       = p_status,
         motivo_status = p_motivo
   WHERE id = p_cert_id;

  -- Se for substituição, cria novo vínculo
  IF p_novo_hash IS NOT NULL THEN
    UPDATE certificados AS novo
    JOIN certificados AS antigo ON antigo.id = p_cert_id
      SET novo.substituido_por = NULL   -- novo não tem antecessor
    WHERE novo.hash_unico = p_novo_hash;

    UPDATE certificados SET substituido_por = (
      SELECT id FROM certificados WHERE hash_unico = p_novo_hash
    ) WHERE id = p_cert_id;
  END IF;
END$$

DELIMITER ;
