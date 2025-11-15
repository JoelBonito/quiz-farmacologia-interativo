-- ============================================
-- SCHEMA DO BANCO DE DADOS - QUIZ INTERATIVO
-- ============================================
-- Execute este script no Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Cole e Execute)

-- ============================================
-- 1. TABELA: materias
-- ============================================
CREATE TABLE IF NOT EXISTS materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#3B82F6',
  icone TEXT DEFAULT '📚',
  total_arquivos INTEGER DEFAULT 0,
  total_perguntas INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_materias_user_id ON materias(user_id);
CREATE INDEX IF NOT EXISTS idx_materias_created_at ON materias(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Users can view own materias" ON materias;
CREATE POLICY "Users can view own materias" ON materias
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own materias" ON materias;
CREATE POLICY "Users can insert own materias" ON materias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own materias" ON materias;
CREATE POLICY "Users can update own materias" ON materias
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own materias" ON materias;
CREATE POLICY "Users can delete own materias" ON materias
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. TABELA: arquivos
-- ============================================
CREATE TABLE IF NOT EXISTS arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,
  nome_original TEXT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('pdf', 'txt', 'md', 'jpg', 'png')),
  tamanho BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  erro_mensagem TEXT,
  conteudo_extraido TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_arquivos_materia_id ON arquivos(materia_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_status ON arquivos(status);

-- RLS
ALTER TABLE arquivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view arquivos of own materias" ON arquivos;
CREATE POLICY "Users can view arquivos of own materias" ON arquivos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = arquivos.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert arquivos to own materias" ON arquivos;
CREATE POLICY "Users can insert arquivos to own materias" ON arquivos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = arquivos.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update arquivos of own materias" ON arquivos;
CREATE POLICY "Users can update arquivos of own materias" ON arquivos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = arquivos.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete arquivos from own materias" ON arquivos;
CREATE POLICY "Users can delete arquivos from own materias" ON arquivos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = arquivos.materia_id
      AND materias.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. TABELA: perguntas
-- ============================================
CREATE TABLE IF NOT EXISTS perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE NOT NULL,
  arquivo_id UUID REFERENCES arquivos(id) ON DELETE SET NULL,
  pergunta TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('multipla_escolha', 'verdadeiro_falso', 'caso_clinico')),
  opcoes JSONB NOT NULL,
  resposta_correta TEXT NOT NULL,
  dica TEXT,
  justificativa TEXT,
  dificuldade VARCHAR(10) DEFAULT 'médio' CHECK (dificuldade IN ('fácil', 'médio', 'difícil')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perguntas_materia_id ON perguntas(materia_id);
CREATE INDEX IF NOT EXISTS idx_perguntas_arquivo_id ON perguntas(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_perguntas_tipo ON perguntas(tipo);
CREATE INDEX IF NOT EXISTS idx_perguntas_dificuldade ON perguntas(dificuldade);

-- RLS
ALTER TABLE perguntas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view perguntas of own materias" ON perguntas;
CREATE POLICY "Users can view perguntas of own materias" ON perguntas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = perguntas.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert perguntas to own materias" ON perguntas;
CREATE POLICY "Users can insert perguntas to own materias" ON perguntas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = perguntas.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update perguntas of own materias" ON perguntas;
CREATE POLICY "Users can update perguntas of own materias" ON perguntas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = perguntas.materia_id
      AND materias.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete perguntas from own materias" ON perguntas;
CREATE POLICY "Users can delete perguntas from own materias" ON perguntas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM materias
      WHERE materias.id = perguntas.materia_id
      AND materias.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. TRIGGERS - Atualizar contadores
-- ============================================

-- Trigger: Atualizar total_arquivos
CREATE OR REPLACE FUNCTION update_materia_arquivos_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE materias
    SET total_arquivos = total_arquivos + 1,
        updated_at = NOW()
    WHERE id = NEW.materia_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE materias
    SET total_arquivos = GREATEST(total_arquivos - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.materia_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_arquivos_count ON arquivos;
CREATE TRIGGER trigger_update_arquivos_count
AFTER INSERT OR DELETE ON arquivos
FOR EACH ROW EXECUTE FUNCTION update_materia_arquivos_count();

-- Trigger: Atualizar total_perguntas
CREATE OR REPLACE FUNCTION update_materia_perguntas_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE materias
    SET total_perguntas = total_perguntas + 1,
        updated_at = NOW()
    WHERE id = NEW.materia_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE materias
    SET total_perguntas = GREATEST(total_perguntas - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.materia_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_perguntas_count ON perguntas;
CREATE TRIGGER trigger_update_perguntas_count
AFTER INSERT OR DELETE ON perguntas
FOR EACH ROW EXECUTE FUNCTION update_materia_perguntas_count();

-- ============================================
-- 5. TABELA: progresso_usuario (OPCIONAL - para tracking futuro)
-- ============================================
CREATE TABLE IF NOT EXISTS progresso_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pergunta_id UUID REFERENCES perguntas(id) ON DELETE CASCADE NOT NULL,
  acertou BOOLEAN NOT NULL,
  tempo_resposta INTEGER, -- em segundos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pergunta_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_progresso_user_id ON progresso_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_progresso_pergunta_id ON progresso_usuario(pergunta_id);

ALTER TABLE progresso_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON progresso_usuario;
CREATE POLICY "Users can view own progress" ON progresso_usuario
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON progresso_usuario;
CREATE POLICY "Users can insert own progress" ON progresso_usuario
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. CONFIGURAÇÃO DO STORAGE BUCKET
-- ============================================
-- IMPORTANTE: Execute também no Supabase Dashboard:
-- Storage → Create bucket → Nome: "materias-arquivos"
-- Configurações:
--   - Public: NO (privado)
--   - Allowed MIME types: application/pdf, text/*, image/jpeg, image/png

-- Políticas de acesso ao Storage (execute após criar o bucket)
-- Permitir usuários fazerem upload apenas nas suas próprias pastas

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute para verificar se tudo foi criado corretamente:
SELECT
  'materias' as tabela,
  COUNT(*) as registros
FROM materias
UNION ALL
SELECT 'arquivos', COUNT(*) FROM arquivos
UNION ALL
SELECT 'perguntas', COUNT(*) FROM perguntas
UNION ALL
SELECT 'progresso_usuario', COUNT(*) FROM progresso_usuario;

-- ============================================
-- CONCLUÍDO!
-- ============================================
-- Próximo passo: Configurar Storage Bucket no Dashboard
-- Depois: Executar script de migração das 384 perguntas existentes
