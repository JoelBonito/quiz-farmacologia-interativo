// Estado global do quiz
let quizData = null;
let currentMode = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let hintUsed = false;

// Carregar dados do quiz
async function loadQuizData() {
    try {
        const response = await fetch('quiz_database.json');
        quizData = await response.json();
        document.getElementById('total-questions').textContent = quizData.total_questions;
    } catch (error) {
        console.error('Erro ao carregar dados do quiz:', error);
        alert('Erro ao carregar o quiz. Por favor, recarregue a página.');
    }
}

// Iniciar quiz
function startQuiz(mode) {
    currentMode = mode;
    currentQuestionIndex = 0;
    score = 0;
    correctAnswers = 0;
    incorrectAnswers = 0;
    
    // Selecionar perguntas baseado no modo
    if (mode === 'quick') {
        // Modo rápido: 20 perguntas aleatórias
        currentQuestions = shuffleArray([...quizData.questions]).slice(0, 20);
    } else if (mode === 'clinical') {
        // Modo clínico: filtrar perguntas de casos clínicos
        const clinicalQuestions = quizData.questions.filter(q => 
            q.category === 'Casos Clínicos' || 
            q.question.toLowerCase().includes('caso') ||
            q.question.toLowerCase().includes('paciente')
        );
        currentQuestions = clinicalQuestions.length > 0 ? 
            shuffleArray(clinicalQuestions).slice(0, 15) : 
            shuffleArray([...quizData.questions]).slice(0, 15);
    }
    
    // Mostrar tela do quiz
    showScreen('quiz-screen');
    loadQuestion();
}

// Embaralhar array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Carregar pergunta
function loadQuestion() {
    hintUsed = false;
    const question = currentQuestions[currentQuestionIndex];
    
    // Atualizar contador e progresso
    document.getElementById('question-counter').textContent = 
        `Pergunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
    document.getElementById('score-display').textContent = `Pontuação: ${score}`;
    
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    
    // Atualizar categoria
    document.getElementById('category-badge').textContent = question.category;
    
    // Atualizar pergunta
    document.getElementById('question-text').textContent = question.question;
    
    // Limpar e criar opções
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;
        optionDiv.onclick = () => selectOption(index);
        optionsContainer.appendChild(optionDiv);
    });
    
    // Resetar UI
    document.getElementById('hint-container').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'none';
    document.getElementById('hint-btn').style.display = 'inline-block';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('finish-btn').style.display = 'none';
}

// Selecionar opção
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
    
    // Verificar resposta
    const isCorrect = selectedIndex === question.correct;
    
    setTimeout(() => {
        // Mostrar resposta correta
        options[question.correct].classList.add('correct');
        
        if (!isCorrect) {
            options[selectedIndex].classList.remove('selected');
            options[selectedIndex].classList.add('incorrect');
        }
        
        // Atualizar pontuação
        if (isCorrect) {
            const points = hintUsed ? 5 : 10;
            score += points;
            correctAnswers++;
        } else {
            incorrectAnswers++;
        }
        
        // Mostrar feedback
        showFeedback(isCorrect, question);
        
        // Esconder botão de dica
        document.getElementById('hint-btn').style.display = 'none';
        
        // Mostrar botão de próxima ou finalizar
        if (currentQuestionIndex < currentQuestions.length - 1) {
            document.getElementById('next-btn').style.display = 'inline-block';
        } else {
            document.getElementById('finish-btn').style.display = 'inline-block';
        }
    }, 500);
}

// Mostrar dica
function showHint() {
    hintUsed = true;
    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('hint-text').textContent = question.hint;
    document.getElementById('hint-container').style.display = 'block';
    document.getElementById('hint-btn').style.display = 'none';
}

// Mostrar feedback
function showFeedback(isCorrect, question) {
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    
    if (isCorrect) {
        feedbackContainer.className = 'feedback-container';
        feedbackIcon.textContent = '✅';
        feedbackTitle.textContent = 'Correto!';
    } else {
        feedbackContainer.className = 'feedback-container incorrect';
        feedbackIcon.textContent = '❌';
        feedbackTitle.textContent = 'Incorreto';
    }
    
    feedbackText.textContent = question.justification;
    feedbackContainer.style.display = 'block';
}

// Próxima pergunta
function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

// Finalizar quiz
function finishQuiz() {
    // Calcular estatísticas
    const totalQuestions = currentQuestions.length;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Atualizar tela de resultado
    document.getElementById('final-score').textContent = score;
    document.getElementById('correct-answers').textContent = correctAnswers;
    document.getElementById('incorrect-answers').textContent = incorrectAnswers;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    
    // Mensagem de desempenho
    let performanceMessage = '';
    if (accuracy >= 90) {
        performanceMessage = '🌟 Excelente! Você domina o conteúdo de farmacologia!';
    } else if (accuracy >= 70) {
        performanceMessage = '👍 Muito bom! Continue estudando para aperfeiçoar seus conhecimentos.';
    } else if (accuracy >= 50) {
        performanceMessage = '📚 Bom esforço! Revise os tópicos e tente novamente.';
    } else {
        performanceMessage = '💪 Continue praticando! A repetição é a chave do aprendizado.';
    }
    
    document.getElementById('performance-message').textContent = performanceMessage;
    
    // Mostrar tela de resultado
    showScreen('result-screen');
}

// Reiniciar quiz
function restartQuiz() {
    showScreen('start-screen');
}

// Mostrar tela
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Inicializar ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    loadQuizData();
});
