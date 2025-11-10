// ============================================================================
// ESTADO GLOBAL E CONFIGURAÇÕES
// ============================================================================

let quizData = null;
let allQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = []; // Array para guardar respostas do usuário
let questionStartTime = 0;
let questionTimes = [];

// Estatísticas em tempo real
let stats = {
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalAnswered: 0
};

// ============================================================================
// LOCALSTORAGE - PERSISTÊNCIA DE DADOS
// ============================================================================

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return null;
    }
}

function clearQuizProgress() {
    localStorage.removeItem('quiz_progress');
    localStorage.removeItem('quiz_answers');
}

function saveQuizProgress() {
    saveToLocalStorage('quiz_progress', {
        currentQuestionIndex,
        stats,
        questionTimes,
        timestamp: Date.now()
    });
    saveToLocalStorage('quiz_answers', userAnswers);
}

function loadQuizProgress() {
    const progress = loadFromLocalStorage('quiz_progress');
    const answers = loadFromLocalStorage('quiz_answers');

    if (progress && answers) {
        currentQuestionIndex = progress.currentQuestionIndex;
        stats = progress.stats;
        questionTimes = progress.questionTimes;
        userAnswers = answers;
        return true;
    }
    return false;
}

// Bookmarks
function toggleBookmark() {
    const question = currentQuestions[currentQuestionIndex];
    const bookmarks = loadFromLocalStorage('quiz_bookmarks') || [];
    const questionId = question.id;

    const index = bookmarks.indexOf(questionId);
    if (index > -1) {
        bookmarks.splice(index, 1);
        document.getElementById('bookmark-icon').textContent = '⭐';
    } else {
        bookmarks.push(questionId);
        document.getElementById('bookmark-icon').textContent = '★';
    }

    saveToLocalStorage('quiz_bookmarks', bookmarks);
}

function isBookmarked(questionId) {
    const bookmarks = loadFromLocalStorage('quiz_bookmarks') || [];
    return bookmarks.includes(questionId);
}

// Histórico de perguntas erradas
function addToWrongQuestions(questionId) {
    const wrongQuestions = loadFromLocalStorage('quiz_wrong_questions') || [];
    if (!wrongQuestions.includes(questionId)) {
        wrongQuestions.push(questionId);
        saveToLocalStorage('quiz_wrong_questions', wrongQuestions);
    }
}

function removeFromWrongQuestions(questionId) {
    const wrongQuestions = loadFromLocalStorage('quiz_wrong_questions') || [];
    const index = wrongQuestions.indexOf(questionId);
    if (index > -1) {
        wrongQuestions.splice(index, 1);
        saveToLocalStorage('quiz_wrong_questions', wrongQuestions);
    }
}

// Histórico de tentativas
function saveQuizAttempt(result) {
    const history = loadFromLocalStorage('quiz_history') || [];
    history.unshift({
        ...result,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('pt-BR')
    });

    // Manter apenas as últimas 10 tentativas
    if (history.length > 10) {
        history.pop();
    }

    saveToLocalStorage('quiz_history', history);
}

function displayQuizHistory() {
    const history = loadFromLocalStorage('quiz_history') || [];
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');

    if (history.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }

    historyContainer.style.display = 'block';
    historyList.innerHTML = history.map((attempt, index) => `
        <div class="history-item">
            <div class="history-date">${attempt.date}</div>
            <div class="history-stats">
                <span class="history-accuracy">${attempt.accuracy}% acerto</span>
                <span class="history-score">${attempt.correctCount}/${attempt.totalQuestions} corretas</span>
            </div>
        </div>
    `).join('');
}

// ============================================================================
// MODO NOTURNO / DARK MODE
// ============================================================================

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';

    saveToLocalStorage('quiz_theme', newTheme);
}

function loadTheme() {
    const savedTheme = loadFromLocalStorage('quiz_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// ============================================================================
// CARREGAR DADOS DO QUIZ
// ============================================================================

async function loadQuizData() {
    try {
        console.log('🔄 Iniciando carregamento do quiz...');
        const response = await fetch('quiz_database.json');
        console.log('📥 Resposta recebida:', response.status);

        const questions = await response.json();
        console.log('📊 JSON parseado:', questions.length, 'questões');
        console.log('📝 Primeira questão (antes):', questions[0]);

        // Normalizar campos português → inglês
        const normalizedQuestions = questions.map(q => ({
            id: q.id,
            question: q.pergunta || q.question,
            type: normalizeType(q.tipo || q.type),
            options: q.opcoes || q.options,
            correct_answer: q.resposta_correta || q.correct_answer,
            hint: q.dica || q.hint,
            difficulty: normalizeDifficulty(q.dificuldade || q.difficulty),
            category: q.categoria || q.category,
            justification: q.justificativa || q.justification
        }));

        console.log('✨ Primeira questão (depois):', normalizedQuestions[0]);

        quizData = { questions: normalizedQuestions };
        allQuestions = normalizedQuestions;

        console.log('💾 allQuestions atualizado:', allQuestions.length);

        // Atualizar contador total na tela inicial
        document.getElementById('total-questions').textContent = normalizedQuestions.length;

        // Atualizar contadores dos filtros
        updateFilterCounts();

        // Carregar histórico
        displayQuizHistory();

        console.log(`✅ ${normalizedQuestions.length} perguntas carregadas com sucesso`);
    } catch (error) {
        console.error('❌ Erro ao carregar dados do quiz:', error);
        alert('Erro ao carregar o quiz. Por favor, recarregue a página.');
    }
}

// Normalizar tipos de questão português → inglês
function normalizeType(tipo) {
    const typeMap = {
        'multipla_escolha': 'multiple_choice',
        'verdadeiro_falso': 'true_false',
        'caso_clinico': 'clinical_case'
    };
    return typeMap[tipo] || tipo;
}

// Normalizar níveis de dificuldade
function normalizeDifficulty(dificuldade) {
    const difficultyMap = {
        'fácil': 'baixo',
        'facil': 'baixo'
    };
    return difficultyMap[dificuldade] || dificuldade;
}

// ============================================================================
// FILTROS E SELEÇÃO DE PERGUNTAS
// ============================================================================

function updateFilterCounts() {
    // Atualizar contador no modo de estudo
    const studyMode = document.getElementById('study-mode');
    const bookmarks = loadFromLocalStorage('quiz_bookmarks') || [];
    const wrongQuestions = loadFromLocalStorage('quiz_wrong_questions') || [];
    const answeredQuestions = loadFromLocalStorage('quiz_answered_questions') || [];

    studyMode.options[0].text = `Todas as Perguntas (${allQuestions.length})`;
    studyMode.options[1].text = `Apenas Marcadas para Revisão (${bookmarks.length})`;
    studyMode.options[2].text = `Apenas Perguntas Erradas Anteriormente (${wrongQuestions.length})`;
    studyMode.options[3].text = `Apenas Não Respondidas (${allQuestions.length - answeredQuestions.length})`;
}

function getFilteredQuestions() {
    const studyMode = document.getElementById('study-mode').value;
    const categoryFilter = document.getElementById('category-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const difficultyFilter = document.getElementById('difficulty-filter').value;

    let filtered = [...allQuestions];

    // Filtro por modo de estudo
    if (studyMode === 'review') {
        const bookmarks = loadFromLocalStorage('quiz_bookmarks') || [];
        filtered = filtered.filter(q => bookmarks.includes(q.id));
    } else if (studyMode === 'wrong') {
        const wrongQuestions = loadFromLocalStorage('quiz_wrong_questions') || [];
        filtered = filtered.filter(q => wrongQuestions.includes(q.id));
    } else if (studyMode === 'unanswered') {
        const answeredQuestions = loadFromLocalStorage('quiz_answered_questions') || [];
        filtered = filtered.filter(q => !answeredQuestions.includes(q.id));
    }

    // Filtro por categoria
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(q => q.category === categoryFilter);
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
        filtered = filtered.filter(q => q.type === typeFilter);
    }

    // Filtro por dificuldade
    if (difficultyFilter !== 'all') {
        filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }

    return filtered;
}

// ============================================================================
// INICIAR QUIZ
// ============================================================================

function startQuiz() {
    // Obter perguntas filtradas
    const filteredQuestions = getFilteredQuestions();

    if (filteredQuestions.length === 0) {
        alert('Nenhuma pergunta disponível com os filtros selecionados. Por favor, ajuste os filtros.');
        return;
    }

    // Resetar estado
    currentQuestions = shuffleArray([...filteredQuestions]);
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    questionTimes = [];

    stats = {
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalAnswered: 0
    };

    // Limpar progresso anterior
    clearQuizProgress();

    // Atualizar UI
    updateStatsDisplay();
    showScreen('quiz-screen');
    loadQuestion();
}

// ============================================================================
// EMBARALHAR PERGUNTAS (Fisher-Yates Shuffle)
// ============================================================================

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================================================
// CARREGAR PERGUNTA
// ============================================================================

function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    questionStartTime = Date.now();

    // Processar correct_answer se ainda não processado
    if (question.correct === undefined && question.correct_answer) {
        // Extrair letra da resposta (a), b), c), d))
        const match = question.correct_answer.match(/^([a-d])\)/i);
        if (match) {
            const letter = match[1].toLowerCase();
            question.correct = {'a': 0, 'b': 1, 'c': 2, 'd': 3}[letter];
        } else {
            // Tentar encontrar a resposta nas opções
            if (question.options && question.options.length > 0) {
                question.correct = question.options.findIndex(opt =>
                    question.correct_answer.toLowerCase().includes(opt.toLowerCase())
                );
            }
        }
    }

    // Atualizar contador de perguntas
    document.getElementById('question-counter').textContent =
        `Pergunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;

    // Atualizar barra de progresso
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${Math.round(progress)}%`;

    // Atualizar categoria
    const categoryBadge = document.getElementById('category-badge');
    categoryBadge.textContent = question.category || 'Farmacologia';

    // Atualizar dificuldade
    const difficultyBadge = document.getElementById('difficulty-badge');
    const difficulty = question.difficulty || 'médio';
    const difficultyIcons = {
        'baixo': '🟢',
        'médio': '🟡',
        'difícil': '🔴'
    };
    difficultyBadge.textContent = `${difficultyIcons[difficulty]} ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
    difficultyBadge.className = `difficulty-badge difficulty-${difficulty}`;

    // Atualizar bookmark
    const bookmarkIcon = document.getElementById('bookmark-icon');
    bookmarkIcon.textContent = isBookmarked(question.id) ? '★' : '⭐';

    // Atualizar pergunta
    const questionText = document.getElementById('question-text');
    if (question.type === 'clinical_case') {
        questionText.innerHTML = question.question
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    } else {
        questionText.textContent = question.question;
    }

    // Renderizar opções baseado no tipo de pergunta
    renderOptions(question);

    // Resetar UI
    document.getElementById('hint-container').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'none';
    document.getElementById('hint-btn').style.display = 'inline-block';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'none';

    // Atualizar botão anterior
    document.getElementById('prev-btn').disabled = currentQuestionIndex === 0;

    // Se já foi respondida, mostrar resposta anterior
    if (userAnswers[currentQuestionIndex] !== null) {
        showPreviousAnswer();
    }

    // Salvar progresso
    saveQuizProgress();
}

// ============================================================================
// RENDERIZAR OPÇÕES
// ============================================================================

function renderOptions(question) {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    if (question.type === 'true_false') {
        // Botões Verdadeiro/Falso
        const trueFalseDiv = document.createElement('div');
        trueFalseDiv.className = 'true-false-container';
        trueFalseDiv.innerHTML = `
            <button onclick="selectTrueFalse(true)" class="true-false-btn true-btn">
                <span class="btn-icon">✓</span>
                <span class="btn-text">VERDADEIRO</span>
            </button>
            <button onclick="selectTrueFalse(false)" class="true-false-btn false-btn">
                <span class="btn-icon">✗</span>
                <span class="btn-text">FALSO</span>
            </button>
        `;
        optionsContainer.appendChild(trueFalseDiv);
    } else if (question.options && question.options.length > 0) {
        // Opções de múltipla escolha
        question.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = option;
            optionDiv.onclick = () => selectOption(index);
            optionsContainer.appendChild(optionDiv);
        });
    }
}

// ============================================================================
// SELECIONAR OPÇÃO (MÚLTIPLA ESCOLHA)
// ============================================================================

function selectOption(selectedIndex) {
    const question = currentQuestions[currentQuestionIndex];
    const options = document.querySelectorAll('.option');

    // Desabilitar todas as opções
    options.forEach(option => {
        option.classList.add('disabled');
        option.onclick = null;
    });

    // Marcar resposta selecionada
    options[selectedIndex].classList.add('selected');

    // Calcular tempo de resposta
    const responseTime = Math.round((Date.now() - questionStartTime) / 1000);
    questionTimes.push(responseTime);

    // Verificar se está correto
    const isCorrect = question.correct !== undefined &&
                      question.correct >= 0 &&
                      selectedIndex === question.correct;

    // Guardar resposta do usuário
    userAnswers[currentQuestionIndex] = {
        selectedIndex,
        isCorrect,
        timeSpent: responseTime,
        hintUsed: document.getElementById('hint-container').style.display === 'block'
    };

    // Processar resposta
    setTimeout(() => {
        processAnswer(isCorrect, question, options, selectedIndex);
    }, 300);
}

// ============================================================================
// SELECIONAR VERDADEIRO/FALSO
// ============================================================================

function selectTrueFalse(userAnswer) {
    const question = currentQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.true-false-btn');

    // Desabilitar botões
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
    });

    // Determinar resposta correta
    let correctAnswer = false;
    const answerText = question.correct_answer.toLowerCase();
    if (answerText.includes('verdadeiro') || answerText === 'v' || answerText === 'true') {
        correctAnswer = true;
    }

    // Calcular tempo de resposta
    const responseTime = Math.round((Date.now() - questionStartTime) / 1000);
    questionTimes.push(responseTime);

    // Verificar se está correto
    const isCorrect = userAnswer === correctAnswer;

    // Guardar resposta do usuário
    userAnswers[currentQuestionIndex] = {
        selectedAnswer: userAnswer,
        isCorrect,
        timeSpent: responseTime,
        hintUsed: document.getElementById('hint-container').style.display === 'block'
    };

    // Processar resposta
    processAnswerTrueFalse(isCorrect, question, correctAnswer);
}

// ============================================================================
// PROCESSAR RESPOSTA
// ============================================================================

function processAnswer(isCorrect, question, options, selectedIndex) {
    // Marcar resposta correta visualmente
    if (question.correct !== undefined && question.correct >= 0 && options[question.correct]) {
        options[question.correct].classList.add('correct');
    }

    if (!isCorrect && selectedIndex !== question.correct) {
        options[selectedIndex].classList.remove('selected');
        options[selectedIndex].classList.add('incorrect');
    }

    // Atualizar estatísticas
    updateStatsAfterAnswer(isCorrect, question);

    // Mostrar feedback
    showFeedback(isCorrect, question);

    // Mostrar botões de navegação
    showNavigationButtons();
}

function processAnswerTrueFalse(isCorrect, question, correctAnswer) {
    // Atualizar estatísticas
    updateStatsAfterAnswer(isCorrect, question);

    // Mostrar feedback
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');

    feedbackContainer.className = isCorrect ? 'feedback-container correct' : 'feedback-container incorrect';
    feedbackIcon.textContent = isCorrect ? '✅' : '❌';
    feedbackTitle.textContent = isCorrect ? 'Correto!' : 'Incorreto';

    const correctText = correctAnswer ? 'VERDADEIRO' : 'FALSO';
    feedbackText.innerHTML = `
        <strong>Resposta correta:</strong> ${correctText}<br><br>
        ${question.justification || 'Sem justificativa disponível.'}
    `;
    feedbackContainer.style.display = 'block';

    // Mostrar botões de navegação
    showNavigationButtons();
}

// ============================================================================
// ATUALIZAR ESTATÍSTICAS
// ============================================================================

function updateStatsAfterAnswer(isCorrect, question) {
    stats.totalAnswered++;

    if (isCorrect) {
        stats.correctCount++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
        // Remover da lista de erradas se acertou
        removeFromWrongQuestions(question.id);
    } else {
        stats.incorrectCount++;
        stats.currentStreak = 0;
        // Adicionar à lista de erradas
        addToWrongQuestions(question.id);
    }

    // Marcar como respondida
    const answeredQuestions = loadFromLocalStorage('quiz_answered_questions') || [];
    if (!answeredQuestions.includes(question.id)) {
        answeredQuestions.push(question.id);
        saveToLocalStorage('quiz_answered_questions', answeredQuestions);
    }

    // Atualizar displays
    updateStatsDisplay();
    saveQuizProgress();
}

function updateStatsDisplay() {
    // Taxa de acerto
    const accuracy = stats.totalAnswered > 0
        ? Math.round((stats.correctCount / stats.totalAnswered) * 100)
        : 0;
    document.getElementById('accuracy-percent').textContent = `${accuracy}%`;

    // Perguntas respondidas
    document.getElementById('questions-answered').textContent =
        `${stats.totalAnswered}/${currentQuestions.length}`;

    // Sequência atual
    document.getElementById('streak-counter').textContent = stats.currentStreak;

    // Tempo médio
    const avgTime = questionTimes.length > 0
        ? Math.round(questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length)
        : 0;
    document.getElementById('avg-time').textContent = `${avgTime}s`;
}

// ============================================================================
// MOSTRAR FEEDBACK
// ============================================================================

function showFeedback(isCorrect, question) {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');

    feedbackContainer.className = isCorrect ? 'feedback-container correct' : 'feedback-container incorrect';
    feedbackIcon.textContent = isCorrect ? '✅' : '❌';
    feedbackTitle.textContent = isCorrect ? 'Correto!' : 'Incorreto';
    feedbackText.innerHTML = question.justification || 'Sem justificativa disponível.';
    feedbackContainer.style.display = 'block';
}

// ============================================================================
// MOSTRAR DICA
// ============================================================================

function showHint() {
    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('hint-text').textContent = question.hint || 'Nenhuma dica disponível para esta pergunta.';
    document.getElementById('hint-container').style.display = 'block';
    document.getElementById('hint-btn').style.display = 'none';
}

// ============================================================================
// NAVEGAÇÃO
// ============================================================================

function showNavigationButtons() {
    document.getElementById('hint-btn').style.display = 'none';

    if (currentQuestionIndex < currentQuestions.length - 1) {
        document.getElementById('next-btn').style.display = 'inline-block';
        document.getElementById('finish-btn').style.display = 'none';
    } else {
        document.getElementById('next-btn').style.display = 'none';
        document.getElementById('finish-btn').style.display = 'inline-block';
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function skipQuestion() {
    const question = currentQuestions[currentQuestionIndex];

    // Marcar como pulada se ainda não foi respondida
    if (userAnswers[currentQuestionIndex] === null) {
        stats.skippedCount++;
        userAnswers[currentQuestionIndex] = { skipped: true };
        saveQuizProgress();
    }

    // Avançar para próxima pergunta
    nextQuestion();
}

function showPreviousAnswer() {
    const answer = userAnswers[currentQuestionIndex];
    const question = currentQuestions[currentQuestionIndex];

    if (answer && !answer.skipped) {
        // Desabilitar interação
        const options = document.querySelectorAll('.option, .true-false-btn');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
        });

        // Mostrar resposta anterior
        if (answer.selectedIndex !== undefined) {
            const optionElements = document.querySelectorAll('.option');
            optionElements[answer.selectedIndex].classList.add(answer.isCorrect ? 'correct' : 'incorrect');
            if (!answer.isCorrect && question.correct !== undefined && question.correct >= 0) {
                optionElements[question.correct].classList.add('correct');
            }
        }

        // Mostrar feedback
        showFeedback(answer.isCorrect, question);
        showNavigationButtons();
    }
}

// ============================================================================
// FINALIZAR QUIZ
// ============================================================================

function finishQuizEarly() {
    // Verificar se o usuário respondeu pelo menos uma pergunta
    if (stats.totalAnswered === 0) {
        alert('Você precisa responder pelo menos uma pergunta antes de finalizar o quiz.');
        return;
    }

    // Confirmar se o usuário realmente quer finalizar
    const confirmation = confirm(`Você respondeu ${stats.totalAnswered} de ${currentQuestions.length} perguntas. Deseja realmente finalizar e ver os resultados?`);

    if (confirmation) {
        finishQuiz();
    }
}

function finishQuiz() {
    // Calcular estatísticas finais
    const totalQuestions = currentQuestions.length;
    const accuracy = Math.round((stats.correctCount / stats.totalAnswered) * 100) || 0;
    const finalPercentage = Math.round((stats.correctCount / totalQuestions) * 100) || 0;

    // Atualizar tela de resultado
    document.getElementById('final-score').textContent = stats.correctCount * 10;
    document.getElementById('final-percentage').textContent = `${finalPercentage}%`;
    document.getElementById('correct-answers').textContent = stats.correctCount;
    document.getElementById('incorrect-answers').textContent = stats.incorrectCount;
    document.getElementById('skipped-answers').textContent = stats.skippedCount;
    document.getElementById('best-streak').textContent = stats.bestStreak;

    // Mensagem de desempenho
    let performanceMessage = '';
    let performanceClass = '';

    if (finalPercentage >= 90) {
        performanceMessage = '🌟 Excelente! Você domina o conteúdo de farmacologia!';
        performanceClass = 'excellent';
    } else if (finalPercentage >= 70) {
        performanceMessage = '👍 Muito bom! Continue estudando para aperfeiçoar seus conhecimentos.';
        performanceClass = 'good';
    } else if (finalPercentage >= 50) {
        performanceMessage = '📚 Bom esforço! Revise os tópicos e tente novamente.';
        performanceClass = 'average';
    } else {
        performanceMessage = '💪 Continue praticando! A repetição é a chave do aprendizado.';
        performanceClass = 'needs-improvement';
    }

    const performanceDiv = document.getElementById('performance-message');
    performanceDiv.textContent = performanceMessage;
    performanceDiv.className = `performance-message ${performanceClass}`;

    // Desempenho por categoria
    displayCategoryPerformance();

    // Desempenho por dificuldade
    displayDifficultyPerformance();

    // Perguntas erradas para revisão
    displayWrongQuestions();

    // Salvar tentativa no histórico
    saveQuizAttempt({
        totalQuestions,
        correctCount: stats.correctCount,
        incorrectCount: stats.incorrectCount,
        skippedCount: stats.skippedCount,
        accuracy: finalPercentage,
        bestStreak: stats.bestStreak
    });

    // Limpar progresso
    clearQuizProgress();

    // Mostrar tela de resultado
    showScreen('result-screen');
}

// ============================================================================
// DESEMPENHO POR CATEGORIA
// ============================================================================

function displayCategoryPerformance() {
    const categoryStats = {};

    currentQuestions.forEach((question, index) => {
        const answer = userAnswers[index];
        const category = question.category || 'Sem categoria';

        if (!categoryStats[category]) {
            categoryStats[category] = { correct: 0, total: 0 };
        }

        if (answer && !answer.skipped) {
            categoryStats[category].total++;
            if (answer.isCorrect) {
                categoryStats[category].correct++;
            }
        }
    });

    const categoryStatsDiv = document.getElementById('category-stats');
    categoryStatsDiv.innerHTML = Object.entries(categoryStats)
        .map(([category, stats]) => {
            const percentage = Math.round((stats.correct / stats.total) * 100) || 0;
            return `
                <div class="category-stat-item">
                    <div class="category-stat-name">${category}</div>
                    <div class="category-stat-bar">
                        <div class="category-stat-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="category-stat-text">${stats.correct}/${stats.total} (${percentage}%)</div>
                </div>
            `;
        })
        .join('');
}

// ============================================================================
// DESEMPENHO POR DIFICULDADE
// ============================================================================

function displayDifficultyPerformance() {
    const difficultyStats = {};
    const difficultyOrder = ['baixo', 'médio', 'difícil'];
    const difficultyIcons = {
        'baixo': '🟢',
        'médio': '🟡',
        'difícil': '🔴'
    };

    currentQuestions.forEach((question, index) => {
        const answer = userAnswers[index];
        const difficulty = question.difficulty || 'médio';

        if (!difficultyStats[difficulty]) {
            difficultyStats[difficulty] = { correct: 0, total: 0 };
        }

        if (answer && !answer.skipped) {
            difficultyStats[difficulty].total++;
            if (answer.isCorrect) {
                difficultyStats[difficulty].correct++;
            }
        }
    });

    const difficultyStatsDiv = document.getElementById('difficulty-stats');
    difficultyStatsDiv.innerHTML = difficultyOrder
        .filter(difficulty => difficultyStats[difficulty] && difficultyStats[difficulty].total > 0)
        .map(difficulty => {
            const stats = difficultyStats[difficulty];
            const percentage = Math.round((stats.correct / stats.total) * 100) || 0;
            const difficultyName = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            return `
                <div class="category-stat-item">
                    <div class="category-stat-name">${difficultyIcons[difficulty]} ${difficultyName}</div>
                    <div class="category-stat-bar">
                        <div class="category-stat-fill difficulty-fill-${difficulty}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="category-stat-text">${stats.correct}/${stats.total} (${percentage}%)</div>
                </div>
            `;
        })
        .join('');
}

// ============================================================================
// PERGUNTAS ERRADAS PARA REVISÃO
// ============================================================================

function displayWrongQuestions() {
    const wrongAnswers = userAnswers
        .map((answer, index) => ({ answer, question: currentQuestions[index], index }))
        .filter(item => item.answer && !item.answer.skipped && !item.answer.isCorrect);

    if (wrongAnswers.length === 0) {
        document.getElementById('review-section').style.display = 'none';
        return;
    }

    document.getElementById('review-section').style.display = 'block';

    const wrongQuestionsList = document.getElementById('wrong-questions-list');
    wrongQuestionsList.innerHTML = wrongAnswers
        .map(item => `
            <div class="wrong-question-item">
                <div class="wrong-question-number">Pergunta ${item.index + 1}</div>
                <div class="wrong-question-text">${item.question.question}</div>
                <div class="wrong-question-category">${item.question.category}</div>
            </div>
        `)
        .join('');
}

// ============================================================================
// REVISAR PERGUNTAS ERRADAS
// ============================================================================

function reviewWrongQuestions() {
    // Configurar filtro para perguntas erradas
    document.getElementById('study-mode').value = 'wrong';

    // Voltar para tela inicial
    showScreen('start-screen');
}

// ============================================================================
// COMPARTILHAR RESULTADOS
// ============================================================================

function shareResults() {
    const totalQuestions = currentQuestions.length;
    const finalPercentage = Math.round((stats.correctCount / totalQuestions) * 100) || 0;

    document.getElementById('share-score').textContent = stats.correctCount * 10;
    document.getElementById('share-accuracy').textContent = `${finalPercentage}%`;
    document.getElementById('share-correct').textContent = stats.correctCount;
    document.getElementById('share-total').textContent = totalQuestions;

    document.getElementById('share-modal').style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('share-modal').style.display = 'none';
}

function copyShareLink() {
    const url = window.location.href;
    const shareText = `Consegui ${stats.correctCount} corretas de ${currentQuestions.length} no Quiz de Farmacologia! 🎓 Taxa de acerto: ${Math.round((stats.correctCount / currentQuestions.length) * 100)}%`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(`${shareText}\n${url}`)
            .then(() => alert('Link copiado para a área de transferência!'))
            .catch(() => alert('Erro ao copiar link.'));
    } else {
        alert('Copie este link: ' + url);
    }
}

function downloadResultImage() {
    alert('Funcionalidade de download de imagem em desenvolvimento. Use a captura de tela do seu dispositivo por enquanto.');
}

// ============================================================================
// REINICIAR E NAVEGAÇÃO DE TELAS
// ============================================================================

function restartQuiz() {
    clearQuizProgress();
    showScreen('start-screen');
    updateFilterCounts();
    displayQuizHistory();
}

function goHome() {
    if (stats.totalAnswered > 0) {
        if (confirm('Deseja realmente voltar ao início? Seu progresso será perdido.')) {
            clearQuizProgress();
            showScreen('start-screen');
            updateFilterCounts();
        }
    } else {
        showScreen('start-screen');
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
    // Carregar tema
    loadTheme();

    // Carregar dados do quiz
    await loadQuizData();

    // Atualizar filtros
    updateFilterCounts();

    // Verificar se há progresso salvo
    const hasProgress = loadQuizProgress();
    if (hasProgress) {
        const resume = confirm('Você tem um quiz em andamento. Deseja continuar de onde parou?');
        if (resume) {
            showScreen('quiz-screen');
            loadQuestion();
            updateStatsDisplay();
        } else {
            clearQuizProgress();
        }
    }
});

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('share-modal');
    if (event.target === modal) {
        closeShareModal();
    }
};

// ============================================================================
// MELHORIAS MOBILE - RESPONSIVIDADE E UX
// ============================================================================

// Toggle Stats Dashboard (Mobile)
function toggleStats() {
    const dashboard = document.getElementById('stats-dashboard');
    const toggleText = document.getElementById('stats-toggle-text');
    
    if (dashboard.classList.contains('collapsed')) {
        dashboard.classList.remove('collapsed');
        toggleText.textContent = '📊 Ocultar Estatísticas';
    } else {
        dashboard.classList.add('collapsed');
        toggleText.textContent = '📊 Mostrar Estatísticas';
    }
}

// Inicializar dashboard colapsado em mobile
function initMobileOptimizations() {
    if (window.innerWidth <= 480) {
        const dashboard = document.getElementById('stats-dashboard');
        const toggleBtn = document.querySelector('.stats-toggle-btn');
        
        // Mostrar botão toggle apenas em mobile
        if (toggleBtn) {
            toggleBtn.style.display = 'block';
        }
        
        // Iniciar com dashboard colapsado em mobile
        if (dashboard && !dashboard.classList.contains('collapsed')) {
            dashboard.classList.add('collapsed');
        }
    }
}

// Suporte a Gestos Swipe
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

function handleGesture() {
    const horizontalSwipe = touchEndX - touchStartX;
    const verticalSwipe = Math.abs(touchEndY - touchStartY);
    
    // Apenas processar swipe se for predominantemente horizontal
    if (Math.abs(horizontalSwipe) > verticalSwipe && Math.abs(horizontalSwipe) > 50) {
        // Swipe left - próxima pergunta
        if (horizontalSwipe < -50) {
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn && nextBtn.style.display !== 'none') {
                vibrateFeedback([10]);
                nextQuestion();
            } else {
                // Se não houver botão próxima, tentar pular
                vibrateFeedback([5]);
                skipQuestion();
            }
        }
        
        // Swipe right - pergunta anterior
        if (horizontalSwipe > 50) {
            vibrateFeedback([10]);
            previousQuestion();
        }
    }
}

// Feedback Háptico
function vibrateFeedback(pattern = [10]) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// Event Listeners para Swipe
function initSwipeGestures() {
    const questionContainer = document.querySelector('.question-container');
    
    if (questionContainer && window.innerWidth <= 480) {
        questionContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        questionContainer.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleGesture();
        }, { passive: true });
    }
}

// Detectar mudança de orientação
function handleOrientationChange() {
    initMobileOptimizations();
    
    // Reajustar layout após mudança de orientação
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 300);
}

// Event listeners para orientação
window.addEventListener('orientationchange', handleOrientationChange);
window.addEventListener('resize', () => {
    if (window.innerWidth <= 480) {
        initMobileOptimizations();
    } else {
        // Remover otimizações mobile em telas maiores
        const dashboard = document.getElementById('stats-dashboard');
        const toggleBtn = document.querySelector('.stats-toggle-btn');
        
        if (dashboard) {
            dashboard.classList.remove('collapsed');
        }
        if (toggleBtn) {
            toggleBtn.style.display = 'none';
        }
    }
});

// Prevenir scroll indesejado durante swipe
let scrollY = 0;
function preventScrollOnSwipe() {
    if (window.innerWidth <= 480) {
        document.body.style.overflowY = 'auto';
        document.body.style.position = 'relative';
    }
}

// Melhorar performance em mobile reduzindo animações
function optimizeMobilePerformance() {
    if (window.innerWidth <= 480) {
        // Reduzir animações
        document.documentElement.style.setProperty('--transition-speed', '0.2s');
        
        // Lazy load de imagens se houver
        if ('loading' in HTMLImageElement.prototype) {
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }
}

// Inicializar melhorias mobile quando o DOM estiver pronto
function initMobileEnhancements() {
    initMobileOptimizations();
    initSwipeGestures();
    preventScrollOnSwipe();
    optimizeMobilePerformance();
}

// Adicionar ao DOMContentLoaded existente
(function() {
    const originalDOMContentLoaded = window.addEventListener;
    window.addEventListener('DOMContentLoaded', () => {
        // Aguardar um pouco para garantir que tudo foi carregado
        setTimeout(() => {
            initMobileEnhancements();
        }, 100);
    });
})();

// Melhorar feedback visual ao tocar em opções
function enhanceTouchFeedback() {
    if (window.innerWidth <= 480) {
        document.addEventListener('touchstart', function(e) {
            if (e.target.classList.contains('option') || 
                e.target.classList.contains('btn') ||
                e.target.classList.contains('true-false-btn')) {
                e.target.style.opacity = '0.8';
            }
        }, { passive: true });

        document.addEventListener('touchend', function(e) {
            if (e.target.classList.contains('option') || 
                e.target.classList.contains('btn') ||
                e.target.classList.contains('true-false-btn')) {
                setTimeout(() => {
                    e.target.style.opacity = '1';
                }, 100);
            }
        }, { passive: true });
    }
}

// Inicializar feedback de toque
setTimeout(() => {
    enhanceTouchFeedback();
}, 500);
