// ============================================
// TESTES - SISTEMA DE DIFICULDADES
// ============================================
// Testes unitários simples para funções críticas

/**
 * Framework de teste simples
 */
class SimpleTest {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  assert(condition, message) {
    if (condition) {
      this.passed++;
      console.log(`  ✅ ${message}`);
      this.tests.push({ message, passed: true });
    } else {
      this.failed++;
      console.error(`  ❌ ${message}`);
      this.tests.push({ message, passed: false });
    }
  }

  assertEquals(actual, expected, message) {
    const condition = actual === expected;
    if (!condition) {
      console.error(`    Expected: ${expected}, Got: ${actual}`);
    }
    this.assert(condition, message);
  }

  assertNotNull(value, message) {
    this.assert(value !== null && value !== undefined, message);
  }

  summary() {
    const total = this.passed + this.failed;
    console.log(`\n📊 ${this.name}: ${this.passed}/${total} testes passaram`);
    return this.failed === 0;
  }
}

// ============================================
// TESTES DE VALIDAÇÃO
// ============================================

async function testValidacaoDificuldadeQuiz() {
  console.log('\n🧪 Testando Validação - registrarDificuldadeQuiz\n');
  const test = new SimpleTest('Validação Quiz');

  // Mock de dados
  const materiaId = 'test-materia-id';

  // Teste 1: Rejeitar pergunta nula
  try {
    await registrarDificuldadeQuiz(null, materiaId);
    test.assert(false, 'Deve rejeitar pergunta nula');
  } catch (error) {
    test.assert(error.message.includes('inválida'), 'Rejeita pergunta nula');
  }

  // Teste 2: Rejeitar materia_id vazio
  try {
    await registrarDificuldadeQuiz({ id: '123', pergunta: 'Teste' }, null);
    test.assert(false, 'Deve rejeitar materia_id nulo');
  } catch (error) {
    test.assert(error.message.includes('obrigatório'), 'Rejeita materia_id nulo');
  }

  // Teste 3: Rejeitar pergunta sem texto
  try {
    await registrarDificuldadeQuiz({ id: '123', pergunta: '' }, materiaId);
    test.assert(false, 'Deve rejeitar pergunta vazia');
  } catch (error) {
    test.assert(error.message.includes('vazio'), 'Rejeita pergunta vazia');
  }

  return test.summary();
}

async function testValidacaoDificuldadeFlashcard() {
  console.log('\n🧪 Testando Validação - registrarDificuldadeFlashcard\n');
  const test = new SimpleTest('Validação Flashcard');

  const materiaId = 'test-materia-id';

  // Teste 1: Rejeitar flashcard nulo
  try {
    await registrarDificuldadeFlashcard(null, materiaId);
    test.assert(false, 'Deve rejeitar flashcard nulo');
  } catch (error) {
    test.assert(error.message.includes('inválido'), 'Rejeita flashcard nulo');
  }

  // Teste 2: Rejeitar flashcard sem texto
  try {
    await registrarDificuldadeFlashcard({ id: '123', pergunta: '' }, materiaId);
    test.assert(false, 'Deve rejeitar flashcard vazio');
  } catch (error) {
    test.assert(error.message.includes('vazio'), 'Rejeita flashcard vazio');
  }

  return test.summary();
}

async function testValidacaoDificuldadeResumo() {
  console.log('\n🧪 Testando Validação - registrarDificuldadeResumo\n');
  const test = new SimpleTest('Validação Resumo');

  const resumoId = 'test-resumo-id';
  const materiaId = 'test-materia-id';

  // Teste 1: Rejeitar texto vazio
  try {
    await registrarDificuldadeResumo(resumoId, materiaId, { texto: '' });
    test.assert(false, 'Deve rejeitar texto vazio');
  } catch (error) {
    test.assert(error.message.includes('vazio'), 'Rejeita texto vazio');
  }

  // Teste 2: Rejeitar texto muito curto
  try {
    await registrarDificuldadeResumo(resumoId, materiaId, { texto: 'abc' });
    test.assert(false, 'Deve rejeitar texto muito curto');
  } catch (error) {
    test.assert(error.message.includes('curto'), 'Rejeita texto muito curto');
  }

  return test.summary();
}

// ============================================
// TESTES DE EXTRAÇÃO DE TÓPICO
// ============================================

function testExtrairTopicoTexto() {
  console.log('\n🧪 Testando Extração de Tópico\n');
  const test = new SimpleTest('Extração de Tópico');

  // Teste 1: Extrair de texto com palavra-chave médica
  const topico1 = extrairTopicoTexto('Qual é o mecanismo de ação do paracetamol?');
  test.assert(topico1.includes('mecanismo'), 'Extrai palavra-chave médica');

  // Teste 2: Extrair de texto com "agonista"
  const topico2 = extrairTopicoTexto('O propranolol é um agonista beta-adrenérgico?');
  test.assert(topico2.includes('agonista'), 'Extrai "agonista"');

  // Teste 3: Não retornar vazio
  const topico3 = extrairTopicoTexto('Teste simples de texto qualquer');
  test.assert(topico3.length > 0, 'Nunca retorna vazio');

  // Teste 4: Limitar tamanho do tópico
  const topico4 = extrairTopicoTexto('Uma pergunta muito longa com muitas palavras que não deve retornar tudo');
  test.assert(topico4.split(' ').length <= 4, 'Limita tamanho do tópico');

  return test.summary();
}

// ============================================
// TESTES DE ANÁLISE
// ============================================

function testCalcularSeveridade() {
  console.log('\n🧪 Testando Cálculo de Severidade\n');
  const test = new SimpleTest('Cálculo de Severidade');

  // Teste 1: Severidade crítica
  const sev1 = calcularSeveridade(5, 10);
  test.assertEquals(sev1, 'crítica', 'Nível 5 + frequência 10 = crítica');

  // Teste 2: Severidade alta
  const sev2 = calcularSeveridade(4, 3);
  test.assertEquals(sev2, 'alta', 'Nível 4 + frequência 3 = alta');

  // Teste 3: Severidade média
  const sev3 = calcularSeveridade(2, 5);
  test.assertEquals(sev3, 'média', 'Nível 2 + frequência 5 = média');

  // Teste 4: Severidade baixa
  const sev4 = calcularSeveridade(1, 1);
  test.assertEquals(sev4, 'baixa', 'Nível 1 + frequência 1 = baixa');

  return test.summary();
}

// ============================================
// EXECUTAR TODOS OS TESTES
// ============================================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  TESTES - SISTEMA DE DIFICULDADES  ║');
  console.log('╚═══════════════════════════════════════╝');

  const results = [];

  // Testes síncronos
  results.push(testExtrairTopicoTexto());
  results.push(testCalcularSeveridade());

  // Testes assíncronos (apenas se funções estiverem disponíveis)
  if (typeof registrarDificuldadeQuiz === 'function') {
    results.push(await testValidacaoDificuldadeQuiz());
    results.push(await testValidacaoDificuldadeFlashcard());
    results.push(await testValidacaoDificuldadeResumo());
  } else {
    console.warn('\n⚠️ Funções de registro não disponíveis - pulando testes assíncronos');
  }

  // Resumo final
  const allPassed = results.every(r => r === true);
  console.log('\n' + '='.repeat(50));
  console.log(allPassed ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM');
  console.log('='.repeat(50) + '\n');

  return allPassed;
}

// Exportar para uso em Node.js ou navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
} else if (typeof window !== 'undefined') {
  window.DificuldadesTests = { runAllTests };
}

// Auto-executar se chamado diretamente
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Para executar os testes, execute: DificuldadesTests.runAllTests()');
  });
}
