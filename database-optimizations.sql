-- ============================================
-- OTIMIZAÇÕES DE PERFORMANCE - ÍNDICES COMPOSTOS
-- ============================================
-- Execute este script após database-schema-fase1-fixed.sql

-- ============================================
-- ÍNDICES COMPOSTOS PARA DIFICULDADES
-- ============================================

-- Índice para buscar dificuldades não resolvidas por usuário e matéria (query mais comum)
CREATE INDEX IF NOT EXISTS idx_dificuldades_user_materia_resolvido
ON dificuldades_aluno(user_id, materia_id, resolvido);

-- Índice para agrupar por tipo de origem e usuário
CREATE INDEX IF NOT EXISTS idx_dificuldades_user_tipo
ON dificuldades_aluno(user_id, tipo_origem);

-- Índice para buscar por tópico e matéria (para análise)
CREATE INDEX IF NOT EXISTS idx_dificuldades_materia_topico
ON dificuldades_aluno(materia_id, topico) WHERE resolvido = false;

-- Índice para ordenar por data de criação
CREATE INDEX IF NOT EXISTS idx_dificuldades_created
ON dificuldades_aluno(user_id, created_at DESC);

-- ============================================
-- ÍNDICES COMPOSTOS PARA PROGRESSO
-- ============================================

-- Índice para buscar progresso por usuário e pergunta
CREATE INDEX IF NOT EXISTS idx_progresso_user_pergunta
ON progresso_usuario(user_id, pergunta_id);

-- Índice para buscar por tipo de resposta (erros, "não sei", etc)
CREATE INDEX IF NOT EXISTS idx_progresso_user_tipo
ON progresso_usuario(user_id, resposta_tipo)
WHERE resposta_tipo IN ('nao_sei', 'incorreta');

-- Índice para análise temporal de progresso
CREATE INDEX IF NOT EXISTS idx_progresso_user_date
ON progresso_usuario(user_id, created_at DESC);

-- ============================================
-- ÍNDICES PARA PERGUNTAS
-- ============================================

-- Índice para buscar perguntas por matéria e tópico
CREATE INDEX IF NOT EXISTS idx_perguntas_materia_topico
ON perguntas(materia_id, topico) WHERE topico IS NOT NULL;

-- Índice para buscar por dificuldade e tipo
CREATE INDEX IF NOT EXISTS idx_perguntas_materia_dificuldade
ON perguntas(materia_id, dificuldade);

-- ============================================
-- ÍNDICES PARA FLASHCARDS (futuro)
-- ============================================

-- Preparar para tabela de flashcards dedicada (Fase futura)
-- CREATE INDEX IF NOT EXISTS idx_flashcards_materia_topico
-- ON flashcards(materia_id, topico);

-- ============================================
-- ÍNDICES PARA RESUMOS (Fase 4)
-- ============================================

-- Preparar para tabela de resumos
-- CREATE INDEX IF NOT EXISTS idx_resumos_materia_user
-- ON resumos(materia_id, user_id);

-- CREATE INDEX IF NOT EXISTS idx_marcacoes_resumo_tipo
-- ON marcacoes_resumo(resumo_id, tipo_marcacao);

-- ============================================
-- ESTATÍSTICAS E VACUUM
-- ============================================

-- Atualizar estatísticas para otimizador de queries
ANALYZE dificuldades_aluno;
ANALYZE progresso_usuario;
ANALYZE perguntas;
ANALYZE materias;

-- ============================================
-- FUNÇÕES OTIMIZADAS
-- ============================================

-- Função otimizada para contar dificuldades por matéria
CREATE OR REPLACE FUNCTION count_dificuldades_materia(p_user_id UUID, p_materia_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM dificuldades_aluno
    WHERE user_id = p_user_id
      AND materia_id = p_materia_id
      AND resolvido = false
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Função otimizada para obter top 5 tópicos com mais dificuldade
CREATE OR REPLACE FUNCTION get_top_topicos_dificuldades(p_user_id UUID, p_materia_id UUID)
RETURNS TABLE(
  topico TEXT,
  total_ocorrencias BIGINT,
  nivel_medio NUMERIC,
  frequencia_total BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.topico,
    COUNT(*)::BIGINT as total_ocorrencias,
    ROUND(AVG(d.nivel_dificuldade)::NUMERIC, 2) as nivel_medio,
    SUM(d.frequencia)::BIGINT as frequencia_total
  FROM dificuldades_aluno d
  WHERE d.user_id = p_user_id
    AND d.materia_id = p_materia_id
    AND d.resolvido = false
  GROUP BY d.topico
  ORDER BY (AVG(d.nivel_dificuldade) * SUM(d.frequencia)) DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para verificar se deve gerar resumo (otimizada)
CREATE OR REPLACE FUNCTION should_generate_resumo(p_user_id UUID, p_materia_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_dificuldades INTEGER;
  dificuldades_altas INTEGER;
  topicos_unicos INTEGER;
BEGIN
  -- Contar dificuldades não resolvidas
  SELECT COUNT(*)::INTEGER INTO total_dificuldades
  FROM dificuldades_aluno
  WHERE user_id = p_user_id
    AND materia_id = p_materia_id
    AND resolvido = false;

  -- Se tem 3 ou mais, retornar true
  IF total_dificuldades >= 3 THEN
    RETURN true;
  END IF;

  -- Contar dificuldades de nível alto (>=3)
  SELECT COUNT(*)::INTEGER INTO dificuldades_altas
  FROM dificuldades_aluno
  WHERE user_id = p_user_id
    AND materia_id = p_materia_id
    AND resolvido = false
    AND nivel_dificuldade >= 3;

  -- Se tem pelo menos 1 dificuldade alta, retornar true
  IF dificuldades_altas >= 1 THEN
    RETURN true;
  END IF;

  -- Contar tópicos únicos
  SELECT COUNT(DISTINCT topico)::INTEGER INTO topicos_unicos
  FROM dificuldades_aluno
  WHERE user_id = p_user_id
    AND materia_id = p_materia_id
    AND resolvido = false;

  -- Se tem 2 ou mais tópicos diferentes, retornar true
  RETURN topicos_unicos >= 2;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- VIEWS MATERIALIZED (cache de queries complexas)
-- ============================================

-- View para estatísticas de dificuldades por matéria (cache)
-- Refresh periodicamente para melhor performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dificuldades_stats AS
SELECT
  materia_id,
  user_id,
  COUNT(*) as total_dificuldades,
  COUNT(*) FILTER (WHERE resolvido = false) as nao_resolvidas,
  COUNT(*) FILTER (WHERE nivel_dificuldade >= 4) as criticas,
  COUNT(DISTINCT topico) as topicos_unicos,
  AVG(nivel_dificuldade) as nivel_medio
FROM dificuldades_aluno
GROUP BY materia_id, user_id;

-- Índice na materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dificuldades_stats
ON mv_dificuldades_stats(materia_id, user_id);

-- ============================================
-- POLÍTICAS DE ATUALIZAÇÃO
-- ============================================

-- Comentário sobre refresh da materialized view:
-- Execute periodicamente (ex: via cron job ou trigger):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dificuldades_stats;

-- ============================================
-- MONITORAMENTO DE PERFORMANCE
-- ============================================

-- Query para identificar queries lentas (executar periodicamente)
-- SELECT query, calls, total_time, mean_time, rows
-- FROM pg_stat_statements
-- WHERE query LIKE '%dificuldades%'
-- ORDER BY mean_time DESC
-- LIMIT 10;

COMMENT ON INDEX idx_dificuldades_user_materia_resolvido IS
'Índice composto para queries de dificuldades não resolvidas por usuário e matéria';

COMMENT ON FUNCTION get_top_topicos_dificuldades IS
'Retorna os 5 tópicos com mais dificuldade para um usuário em uma matéria';

COMMENT ON FUNCTION should_generate_resumo IS
'Verifica se deve gerar resumo personalizado baseado em critérios de dificuldade';
