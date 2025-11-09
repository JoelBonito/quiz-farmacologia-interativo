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
        const questions = await response.json();
        quizData = { questions: questions };
        document.getElementById('total-questions').textContent = questions.length;
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
            q.type === 'clinical_case' || 
            q.category === 'Caso Clínico' || 
            q.category === 'Casos Clínicos'
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
    
    // Extrair índice correto da resposta se ainda não existir
    if (question.correct === undefined && question.correct_answer) {
        // Tentar extrair letra da resposta (a), b), c), d))
        const match = question.correct_answer.match(/^([a-d])\)/i);
        if (match) {
            const letter = match[1].toLowerCase();
            question.correct = {'a': 0, 'b': 1, 'c': 2, 'd': 3}[letter];
        } else {
            // Se não tiver letra, tentar encontrar a resposta nas opções
            question.correct = question.options.findIndex(opt => 
                question.correct_answer.toLowerCase().includes(opt.toLowerCase())
            );
        }
    }
    
    // Atualizar contador e progresso
    document.getElementById('question-counter').textContent = 
        `Pergunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
    document.getElementById('score-display').textContent = `Pontuação: ${score}`;
    
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    
    // Atualizar categoria
    document.getElementById('category-badge').textContent = question.category;
    
    // Atualizar pergunta (com formatação especial para casos clínicos)
    const questionText = document.getElementById('question-text');
    if (question.type === 'clinical_case') {
        // Formatar caso clínico com destaque
        questionText.innerHTML = question.question.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        questionText.style.backgroundColor = '#fff3cd';
        questionText.style.padding = '20px';
        questionText.style.borderLeft = '4px solid #ffc107';
        questionText.style.borderRadius = '8px';
    } else {
        questionText.textContent = question.question;
        questionText.style.backgroundColor = '';
        questionText.style.padding = '';
        questionText.style.borderLeft = '';
        questionText.style.borderRadius = '';
    }
    
    // Limpar e criar opções ou campo de texto
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    // Verificar tipo de pergunta
    if (question.type === 'true_false') {
        // Criar botões Verdadeiro/Falso
        const trueFalseDiv = document.createElement('div');
        trueFalseDiv.style.display = 'flex';
        trueFalseDiv.style.gap = '20px';
        trueFalseDiv.style.justifyContent = 'center';
        trueFalseDiv.style.marginTop = '20px';
        trueFalseDiv.innerHTML = `
            <button onclick="selectTrueFalse(true)" 
                    class="true-false-btn"
                    style="flex: 1; max-width: 300px; padding: 20px 40px; background: #27ae60; 
                           color: white; border: none; border-radius: 12px; 
                           font-size: 18px; cursor: pointer; font-weight: 700;
                           transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ✓ VERDADEIRO
            </button>
            <button onclick="selectTrueFalse(false)" 
                    class="true-false-btn"
                    style="flex: 1; max-width: 300px; padding: 20px 40px; background: #e74c3c; 
                           color: white; border: none; border-radius: 12px; 
                           font-size: 18px; cursor: pointer; font-weight: 700;
                           transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ✗ FALSO
            </button>
        `;
        optionsContainer.appendChild(trueFalseDiv);
    } else if (question.type === 'fill_in' || question.type === 'list' || question.options.length === 0) {
        // Criar campo de texto para resposta aberta
        const textareaDiv = document.createElement('div');
        textareaDiv.style.width = '100%';
        textareaDiv.innerHTML = `
            <textarea id="open-answer" 
                      placeholder="Digite sua resposta aqui..."
                      style="width: 100%; min-height: 120px; padding: 15px; 
                             border: 2px solid #ddd; border-radius: 8px; 
                             font-size: 16px; font-family: inherit; resize: vertical;">
            </textarea>
            <button onclick="submitOpenAnswer()" 
                    style="margin-top: 15px; padding: 12px 30px; background: #4a69bd; 
                           color: white; border: none; border-radius: 8px; 
                           font-size: 16px; cursor: pointer; font-weight: 600;">
                Enviar Resposta
            </button>
        `;
        optionsContainer.appendChild(textareaDiv);
    } else {
        // Criar opções de múltipla escolha
        question.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = option;
            optionDiv.onclick = () => selectOption(index);
            optionsContainer.appendChild(optionDiv);
        });
    }
    
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

// Submeter resposta aberta
function submitOpenAnswer() {
    const question = currentQuestions[currentQuestionIndex];
    const userAnswer = document.getElementById('open-answer').value.trim();
    
    if (!userAnswer) {
        alert('Por favor, digite sua resposta antes de enviar.');
        return;
    }
    
    // Desabilitar textarea e botão
    document.getElementById('open-answer').disabled = true;
    document.querySelector('button[onclick="submitOpenAnswer()"]').disabled = true;
    document.querySelector('button[onclick="submitOpenAnswer()"]').style.opacity = '0.5';
    
    // Mostrar resposta esperada
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    
    feedbackContainer.className = 'feedback-container';
    feedbackIcon.textContent = '📝';
    feedbackTitle.textContent = 'Resposta Esperada:';
    feedbackText.innerHTML = `<strong>Sua resposta:</strong><br>${userAnswer}<br><br><strong>Resposta esperada:</strong><br>${question.correct_answer}`;
    feedbackContainer.style.display = 'block';
    
    // Ocultar botão de dica
    document.getElementById('hint-btn').style.display = 'none';
    
    // Mostrar botão de próxima pergunta
    if (currentQuestionIndex < currentQuestions.length - 1) {
        document.getElementById('next-btn').style.display = 'inline-block';
    } else {
        document.getElementById('finish-btn').style.display = 'inline-block';
    }
    
    // Pontuar (sempre 5 pontos para resposta aberta)
    score += 5;
    correctAnswers++;
    document.getElementById('score-display').textContent = `Pontuação: ${score}`;
}

// Selecionar Verdadeiro/Falso
function selectTrueFalse(userAnswer) {
    const question = currentQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.true-false-btn');
    
    // Desabilitar botões
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
    
    // Determinar resposta correta (pode estar em correct_answer como "Verdadeiro", "Falso", "V", "F", etc)
    let correctAnswer = false;
    const answerText = question.correct_answer.toLowerCase();
    if (answerText.includes('verdadeiro') || answerText === 'v' || answerText === 'true') {
        correctAnswer = true;
    }
    
    // Verificar se está correto
    const isCorrect = userAnswer === correctAnswer;
    
    // Atualizar pontuação
    if (isCorrect) {
        const points = hintUsed ? 5 : 10;
        score += points;
        correctAnswers++;
    } else {
        incorrectAnswers++;
    }
    document.getElementById('score-display').textContent = `Pontuação: ${score}`;
    
    // Mostrar feedback
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
    
    const correctText = correctAnswer ? 'VERDADEIRO' : 'FALSO';
    feedbackText.innerHTML = `<strong>Resposta correta:</strong> ${correctText}<br><br>${question.justification || 'Sem justificativa disponível.'}`;
    feedbackContainer.style.display = 'block';
    
    // Ocultar botão de dica
    document.getElementById('hint-btn').style.display = 'none';
    
    // Mostrar botão de próxima pergunta
    if (currentQuestionIndex < currentQuestions.length - 1) {
        document.getElementById('next-btn').style.display = 'inline-block';
    } else {
        document.getElementById('finish-btn').style.display = 'inline-block';
    }
}

// Voltar pergunta anterior
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// Voltar para home
function goHome() {
    if (confirm('Deseja realmente voltar ao início? Seu progresso será perdido.')) {
        showScreen('home-screen');
        currentMode = null;
        currentQuestions = [];
        currentQuestionIndex = 0;
        score = 0;
        correctAnswers = 0;
        incorrectAnswers = 0;
    }
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
