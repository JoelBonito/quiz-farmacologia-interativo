-- ============================================
-- FASE 1: TRACKING DE DIFICULDADES - CORRIGIDO
-- ============================================
-- Execute este script no Supabase SQL Editor

-- ============================================
-- 1. CRIAR TABELA: progresso_usuario (se não existir)
-- ============================================

CREATE TABLE IF NOT EXISTS progresso_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pergunta_id UUID REFERENCES perguntas(id) ON DELETE CASCADE NOT NULL,
  acertou BOOLEAN NOT NULL,
  tempo_resposta INTEGER,
  resposta_tipo VARCHAR(20) CHECK (resposta_tipo IN ('correta', 'incorreta', 'nao_sei', 'pulada')),
  topico_relacionado TEXT,
  conceitos_testados JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_progresso_user_id ON progresso_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_progresso_pergunta_id ON progresso_usuario(pergunta_id);

-- RLS
ALTER TABLE progresso_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON progresso_usuario;
CREATE POLICY "Users can view own progress" ON progresso_usuario
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON progresso_usuario;
CREATE POLICY "Users can insert own progress" ON progresso_usuario
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. ADICIONAR COLUNAS EM TABELAS EXISTENTES
-- ============================================

-- Adicionar colunas em perguntas (se não existirem)
DO $$
BEGIN
  -- topico
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perguntas' AND column_name = 'topico'
  ) THEN
    ALTER TABLE perguntas ADD COLUMN topico TEXT;
    CREATE INDEX idx_perguntas_topico ON perguntas(topico);
  END IF;

  -- subtopico
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perguntas' AND column_name = 'subtopico'
  ) THEN
    ALTER TABLE perguntas ADD COLUMN subtopico TEXT;
  END IF;

  -- conceitos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'perguntas' AND column_name = 'conceitos'
  ) THEN
    ALTER TABLE perguntas ADD COLUMN conceitos JSONB;
  END IF;
END $$;

-- ============================================
-- 3. TABELA: dificuldades_aluno
-- ============================================

CREATE TABLE IF NOT EXISTS dificuldades_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,

  -- Origem da dificuldade
  tipo_origem VARCHAR(20) NOT NULL CHECK (tipo_origem IN ('quiz', 'flashcard', 'resumo')),
  origem_id UUID,

  -- Conteúdo da dificuldade
  topico TEXT NOT NULL,
  subtopico TEXT,
  conceito_especifico TEXT,

  -- Contexto
  texto_original TEXT,
  pergunta_relacionada TEXT,
  pergunta_id UUID REFERENCES perguntas(id) ON DELETE SET NULL,
  flashcard_id UUID,

  -- Métricas
  nivel_dificuldade INTEGER DEFAULT 1 CHECK (nivel_dificuldade BETWEEN 1 AND 5),
  frequencia INTEGER DEFAULT 1,
  resolvido BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dificuldades_user_materia ON dificuldades_aluno(user_id, materia_id);
CREATE INDEX IF NOT EXISTS idx_dificuldades_tipo_origem ON dificuldades_aluno(tipo_origem);
CREATE INDEX IF NOT EXISTS idx_dificuldades_resolvido ON dificuldades_aluno(resolvido);
CREATE INDEX IF NOT EXISTS idx_dificuldades_nivel ON dificuldades_aluno(nivel_dificuldade DESC);
CREATE INDEX IF NOT EXISTS idx_dificuldades_topico ON dificuldades_aluno(topico);

-- RLS
ALTER TABLE dificuldades_aluno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dificuldades" ON dificuldades_aluno;
CREATE POLICY "Users can view own dificuldades" ON dificuldades_aluno
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dificuldades" ON dificuldades_aluno;
CREATE POLICY "Users can insert own dificuldades" ON dificuldades_aluno
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dificuldades" ON dificuldades_aluno;
CREATE POLICY "Users can update own dificuldades" ON dificuldades_aluno
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dificuldades" ON dificuldades_aluno;
CREATE POLICY "Users can delete own dificuldades" ON dificuldades_aluno
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. TABELA: resumos
-- ============================================

CREATE TABLE IF NOT EXISTS resumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('geral', 'personalizado', 'topico')),

  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL,
  conteudo_markdown TEXT,

  -- Estrutura do resumo
  topicos_cobertos JSONB,
  dificuldades_abordadas UUID[],

  -- Metadata
  arquivo_origem_id UUID REFERENCES arquivos(id) ON DELETE SET NULL,
  gerado_apos_quiz BOOLEAN DEFAULT false,
  gerado_apos_flashcard BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_resumos_materia ON resumos(materia_id);
CREATE INDEX IF NOT EXISTS idx_resumos_user ON resumos(user_id);
CREATE INDEX IF NOT EXISTS idx_resumos_tipo ON resumos(tipo);

-- RLS
ALTER TABLE resumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view resumos" ON resumos;
CREATE POLICY "Users can view resumos" ON resumos
  FOR SELECT USING (
    user_id IS NULL OR user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM materias WHERE materias.id = resumos.materia_id AND materias.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert resumos" ON resumos;
CREATE POLICY "Users can insert resumos" ON resumos
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM materias WHERE materias.id = resumos.materia_id AND materias.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update resumos" ON resumos;
CREATE POLICY "Users can update resumos" ON resumos
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete resumos" ON resumos;
CREATE POLICY "Users can delete resumos" ON resumos
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 5. TABELA: resumos_marcacoes
-- ============================================

CREATE TABLE IF NOT EXISTS resumos_marcacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resumo_id UUID REFERENCES resumos(id) ON DELETE CASCADE NOT NULL,

  -- Seleção no texto
  texto_selecionado TEXT NOT NULL,
  posicao_inicio INTEGER,
  posicao_fim INTEGER,
  paragrafo_id TEXT,

  -- Classificação
  tipo_marcacao VARCHAR(20) DEFAULT 'nao_entendi' CHECK (tipo_marcacao IN ('nao_entendi', 'importante', 'duvida')),

  nota_aluno TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_marcacoes_user_resumo ON resumos_marcacoes(user_id, resumo_id);
CREATE INDEX IF NOT EXISTS idx_marcacoes_tipo ON resumos_marcacoes(tipo_marcacao);

-- RLS
ALTER TABLE resumos_marcacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own marcacoes" ON resumos_marcacoes;
CREATE POLICY "Users can view own marcacoes" ON resumos_marcacoes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own marcacoes" ON resumos_marcacoes;
CREATE POLICY "Users can insert own marcacoes" ON resumos_marcacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own marcacoes" ON resumos_marcacoes;
CREATE POLICY "Users can update own marcacoes" ON resumos_marcacoes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own marcacoes" ON resumos_marcacoes;
CREATE POLICY "Users can delete own marcacoes" ON resumos_marcacoes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. TABELA: flashcards
-- ============================================

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,

  frente TEXT NOT NULL,
  verso TEXT NOT NULL,

  topico TEXT NOT NULL,
  subtopico TEXT,
  conceitos JSONB,
  dificuldade VARCHAR(10) DEFAULT 'médio' CHECK (dificuldade IN ('fácil', 'médio', 'difícil')),

  arquivo_origem_id UUID REFERENCES arquivos(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_flashcards_materia ON flashcards(materia_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topico ON flashcards(topico);
CREATE INDEX IF NOT EXISTS idx_flashcards_dificuldade ON flashcards(dificuldade);

-- RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view flashcards of own materias" ON flashcards;
CREATE POLICY "Users can view flashcards of own materias" ON flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = flashcards.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert flashcards to own materias" ON flashcards;
CREATE POLICY "Users can insert flashcards to own materias" ON flashcards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = flashcards.materia_id
      AND materias.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. TABELA: flashcards_sessoes
-- ============================================

CREATE TABLE IF NOT EXISTS flashcards_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,

  inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fim TIMESTAMP WITH TIME ZONE,

  total_cards INTEGER DEFAULT 0,
  cards_lembrei INTEGER DEFAULT 0,
  cards_nao_soube INTEGER DEFAULT 0,
  cards_quase INTEGER DEFAULT 0,

  dificuldades_identificadas UUID[]
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_flashcard_sessoes_user ON flashcards_sessoes(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessoes_materia ON flashcards_sessoes(materia_id);

-- RLS
ALTER TABLE flashcards_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessoes" ON flashcards_sessoes;
CREATE POLICY "Users can view own sessoes" ON flashcards_sessoes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessoes" ON flashcards_sessoes;
CREATE POLICY "Users can insert own sessoes" ON flashcards_sessoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessoes" ON flashcards_sessoes;
CREATE POLICY "Users can update own sessoes" ON flashcards_sessoes
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 8. TABELA: flashcards_progresso
-- ============================================

CREATE TABLE IF NOT EXISTS flashcards_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE NOT NULL,
  sessao_id UUID REFERENCES flashcards_sessoes(id) ON DELETE CASCADE,

  resposta VARCHAR(20) NOT NULL CHECK (resposta IN ('lembrei', 'nao_sei', 'quase')),
  tempo_resposta INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_flashcard_progresso_user ON flashcards_progresso(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progresso_card ON flashcards_progresso(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progresso_sessao ON flashcards_progresso(sessao_id);

-- RLS
ALTER TABLE flashcards_progresso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progresso" ON flashcards_progresso;
CREATE POLICY "Users can view own progresso" ON flashcards_progresso
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progresso" ON flashcards_progresso;
CREATE POLICY "Users can insert own progresso" ON flashcards_progresso
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. FUNÇÕES ÚTEIS
-- ============================================

-- Função para incrementar frequência de dificuldade
CREATE OR REPLACE FUNCTION incrementar_dificuldade(
  p_user_id UUID,
  p_materia_id UUID,
  p_topico TEXT,
  p_tipo_origem VARCHAR(20)
)
RETURNS UUID AS $$
DECLARE
  v_dificuldade_id UUID;
  v_nivel INTEGER;
BEGIN
  -- Verificar se já existe dificuldade para este tópico
  SELECT id, nivel_dificuldade INTO v_dificuldade_id, v_nivel
  FROM dificuldades_aluno
  WHERE user_id = p_user_id
    AND materia_id = p_materia_id
    AND topico = p_topico
    AND tipo_origem = p_tipo_origem
    AND resolvido = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_dificuldade_id IS NOT NULL THEN
    -- Atualizar existente
    UPDATE dificuldades_aluno
    SET frequencia = frequencia + 1,
        nivel_dificuldade = LEAST(nivel_dificuldade + 1, 5),
        updated_at = NOW()
    WHERE id = v_dificuldade_id;

    RETURN v_dificuldade_id;
  ELSE
    -- Criar nova
    INSERT INTO dificuldades_aluno (
      user_id, materia_id, topico, tipo_origem
    ) VALUES (
      p_user_id, p_materia_id, p_topico, p_tipo_origem
    ) RETURNING id INTO v_dificuldade_id;

    RETURN v_dificuldade_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar dificuldade como resolvida
CREATE OR REPLACE FUNCTION resolver_dificuldade(p_dificuldade_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE dificuldades_aluno
  SET resolvido = true,
      resolved_at = NOW()
  WHERE id = p_dificuldade_id;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de dificuldades
CREATE OR REPLACE FUNCTION get_dificuldades_stats(
  p_user_id UUID,
  p_materia_id UUID
)
RETURNS TABLE (
  topico TEXT,
  total_dificuldades BIGINT,
  nivel_medio NUMERIC,
  tipo_origem_principal VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.topico,
    COUNT(*) as total_dificuldades,
    AVG(d.nivel_dificuldade) as nivel_medio,
    MODE() WITHIN GROUP (ORDER BY d.tipo_origem) as tipo_origem_principal
  FROM dificuldades_aluno d
  WHERE d.user_id = p_user_id
    AND d.materia_id = p_materia_id
    AND d.resolvido = false
  GROUP BY d.topico
  ORDER BY nivel_medio DESC, total_dificuldades DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'progresso_usuario',
      'dificuldades_aluno',
      'resumos',
      'resumos_marcacoes',
      'flashcards',
      'flashcards_sessoes',
      'flashcards_progresso'
    );

  RAISE NOTICE '✅ FASE 1 instalada! % de 7 tabelas criadas.', v_count;
END $$;
