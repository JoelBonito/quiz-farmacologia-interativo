import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileContent, fileType, materiaId, arquivoId } = await req.json()

    // Validar entrada
    if (!fileContent || !fileType || !materiaId || !arquivoId) {
      throw new Error('Parâmetros obrigatórios: fileContent, fileType, materiaId, arquivoId')
    }

    // Pegar API key do ambiente (configurada no Supabase)
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurada')
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Processar com Gemini
    console.log('Processando arquivo com Gemini...')
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    const prompt = `Analise o seguinte conteúdo educacional e gere perguntas de múltipla escolha, flashcards e um resumo.

CONTEÚDO:
${fileContent.substring(0, 30000)}

Gere uma resposta JSON com:
1. "perguntas": array de objetos com {pergunta, tipo: "multipla_escolha", opcoes: ["A)", "B)", "C)", "D)"], resposta_correta, dica, justificativa, topico, dificuldade}
2. "flashcards": array de objetos com {frente, verso, topico, dificuldade}
3. "resumo": {titulo, conteudo_html, topicos_cobertos: []}

RESPONDA APENAS COM JSON VÁLIDO, SEM MARKDOWN.`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      throw new Error(`Gemini API error: ${errorText}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates[0].content.parts[0].text
    
    // Limpar markdown se houver
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const aiResponse = JSON.parse(cleanedText)

    // Salvar perguntas no banco
    if (aiResponse.perguntas && aiResponse.perguntas.length > 0) {
      const perguntasToInsert = aiResponse.perguntas.map((p: any) => ({
        materia_id: materiaId,
        arquivo_id: arquivoId,
        pergunta: p.pergunta,
        tipo: p.tipo || 'multipla_escolha',
        opcoes: p.opcoes,
        resposta_correta: p.resposta_correta,
        dica: p.dica,
        justificativa: p.justificativa,
        dificuldade: p.dificuldade || 'médio',
        topico: p.topico,
        subtopico: p.subtopico || null,
        conceitos: p.conceitos || null
      }))

      const { error: perguntasError } = await supabase
        .from('perguntas')
        .insert(perguntasToInsert)

      if (perguntasError) throw perguntasError
    }

    // Salvar flashcards no banco
    if (aiResponse.flashcards && aiResponse.flashcards.length > 0) {
      const flashcardsToInsert = aiResponse.flashcards.map((f: any) => ({
        materia_id: materiaId,
        arquivo_origem_id: arquivoId,
        frente: f.frente,
        verso: f.verso,
        topico: f.topico,
        subtopico: f.subtopico || null,
        dificuldade: f.dificuldade || 'médio',
        conceitos: f.conceitos || null
      }))

      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert)

      if (flashcardsError) throw flashcardsError
    }

    // Salvar resumo no banco
    if (aiResponse.resumo) {
      const { error: resumoError } = await supabase
        .from('resumos')
        .insert([{
          materia_id: materiaId,
          user_id: null, // Resumo geral
          tipo: 'geral',
          titulo: aiResponse.resumo.titulo || 'Resumo',
          conteudo_html: aiResponse.resumo.conteudo_html,
          conteudo_markdown: aiResponse.resumo.conteudo_markdown || null,
          topicos_cobertos: aiResponse.resumo.topicos_cobertos || [],
          arquivo_origem_id: arquivoId
        }])

      if (resumoError) throw resumoError
    }

    // Atualizar status do arquivo
    await supabase
      .from('arquivos')
      .update({ status: 'processed' })
      .eq('id', arquivoId)

    return new Response(
      JSON.stringify({
        success: true,
        perguntas: aiResponse.perguntas?.length || 0,
        flashcards: aiResponse.flashcards?.length || 0,
        resumo: !!aiResponse.resumo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})