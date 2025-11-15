-- ============================================
-- FASE 4: RESUMOS INTERATIVOS
-- ============================================
-- Execute este script no Supabase SQL Editor

-- ============================================
-- TABELA: resumos
-- ============================================

CREATE TABLE IF NOT EXISTS resumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,

  -- Metadados
  titulo TEXT NOT NULL,
  tipo_resumo VARCHAR(20) DEFAULT 'geral' CHECK (tipo_resumo IN ('geral', 'personalizado')),

  -- Conteúdo
  conteudo TEXT NOT NULL,
  conteudo_estruturado JSONB, -- Para resumos com seções/parágrafos

  -- Origem
  arquivo_origem_id UUID REFERENCES arquivos(id) ON DELETE SET NULL,
  gerado_por VARCHAR(20) DEFAULT 'ia' CHECK (gerado_por IN ('ia', 'manual', 'upload')),

  -- Dificuldades relacionadas
  baseado_em_dificuldades BOOLEAN DEFAULT false,
  dificuldades_ids UUID[],

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_resumos_user_materia ON resumos(user_id, materia_id);
CREATE INDEX IF NOT EXISTS idx_resumos_tipo ON resumos(tipo_resumo);
CREATE INDEX IF NOT EXISTS idx_resumos_created ON resumos(created_at DESC);

-- RLS
ALTER TABLE resumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own resumos" ON resumos;
CREATE POLICY "Users can view own resumos" ON resumos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resumos" ON resumos;
CREATE POLICY "Users can insert own resumos" ON resumos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resumos" ON resumos;
CREATE POLICY "Users can update own resumos" ON resumos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumos" ON resumos;
CREATE POLICY "Users can delete own resumos" ON resumos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABELA: resumos_marcacoes
-- ============================================

CREATE TABLE IF NOT EXISTS resumos_marcacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resumo_id UUID REFERENCES resumos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Localização da marcação
  texto_selecionado TEXT NOT NULL,
  posicao_inicio INTEGER,
  posicao_fim INTEGER,
  paragrafo_id TEXT, -- ID do parágrafo/seção no conteúdo_estruturado

  -- Tipo de marcação
  tipo_marcacao VARCHAR(20) DEFAULT 'nao_entendi' CHECK (tipo_marcacao IN ('nao_entendi', 'importante', 'duvida', 'anotacao')),

  -- Dados adicionais
  nota_aluno TEXT,
  cor_destaque VARCHAR(20) DEFAULT 'yellow',

  -- Link com dificuldade
  dificuldade_id UUID REFERENCES dificuldades_aluno(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_resumos_marcacoes ON resumos_marcacoes(resumo_id);
CREATE INDEX IF NOT EXISTS idx_marcacoes_user ON resumos_marcacoes(user_id);
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
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_resumo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_resumo_updated_at ON resumos;
CREATE TRIGGER trigger_update_resumo_updated_at
  BEFORE UPDATE ON resumos
  FOR EACH ROW
  EXECUTE FUNCTION update_resumo_updated_at();

-- Função para contar marcações "não entendi" por resumo
CREATE OR REPLACE FUNCTION count_nao_entendi_marcacoes(p_resumo_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM resumos_marcacoes
    WHERE resumo_id = p_resumo_id
      AND tipo_marcacao = 'nao_entendi'
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE resumos IS 'Resumos de estudo gerados por IA ou manualmente';
COMMENT ON TABLE resumos_marcacoes IS 'Marcações e anotações do aluno nos resumos';
COMMENT ON FUNCTION count_nao_entendi_marcacoes IS 'Conta marcações "não entendi" em um resumo';
