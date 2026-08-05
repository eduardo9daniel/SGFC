-- ============================================================
-- CFDR — Índices para auditoria completa
-- Execute uma única vez no MySQL Workbench, no banco do sistema.
-- Não apaga registros e não altera o conteúdo dos logs existentes.
-- ============================================================

SET @schema_atual = DATABASE();

-- ============================================================
-- ÍNDICE POR DATA
-- Melhora ordenação e filtros pelo período do log
-- ============================================================

SET @existe = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_atual
    AND table_name = 'logs_atividades'
    AND index_name = 'idx_logs_criado_em'
);

SET @sql = IF(
  @existe = 0,
  'ALTER TABLE logs_atividades ADD INDEX idx_logs_criado_em (criado_em, id)',
  'SELECT ''idx_logs_criado_em já existe'' AS aviso'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- ÍNDICE POR AÇÃO E DATA
-- Melhora filtros como LOGIN, INSCRICAO_REALIZADA etc.
-- ============================================================

SET @existe = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_atual
    AND table_name = 'logs_atividades'
    AND index_name = 'idx_logs_acao_criado_em'
);

SET @sql = IF(
  @existe = 0,
  'ALTER TABLE logs_atividades ADD INDEX idx_logs_acao_criado_em (acao, criado_em)',
  'SELECT ''idx_logs_acao_criado_em já existe'' AS aviso'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- ÍNDICE POR USUÁRIO E DATA
-- Melhora consulta das ações realizadas por um usuário
-- ============================================================

SET @existe = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_atual
    AND table_name = 'logs_atividades'
    AND index_name = 'idx_logs_usuario_criado_em'
);

SET @sql = IF(
  @existe = 0,
  'ALTER TABLE logs_atividades ADD INDEX idx_logs_usuario_criado_em (usuario_id, criado_em)',
  'SELECT ''idx_logs_usuario_criado_em já existe'' AS aviso'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- ÍNDICE POR IP E DATA
-- Melhora consultas de auditoria por endereço IP
-- ============================================================

SET @existe = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @schema_atual
    AND table_name = 'logs_atividades'
    AND index_name = 'idx_logs_ip_criado_em'
);

SET @sql = IF(
  @existe = 0,
  'ALTER TABLE logs_atividades ADD INDEX idx_logs_ip_criado_em (ip, criado_em)',
  'SELECT ''idx_logs_ip_criado_em já existe'' AS aviso'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- CONFERÊNCIA DOS ÍNDICES
-- ============================================================

SELECT
  index_name,
  column_name,
  seq_in_index
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'logs_atividades'
  AND index_name IN (
    'idx_logs_criado_em',
    'idx_logs_acao_criado_em',
    'idx_logs_usuario_criado_em',
    'idx_logs_ip_criado_em'
  )
ORDER BY
  index_name,
  seq_in_index;