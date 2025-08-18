// survey.js
document.addEventListener("DOMContentLoaded", function() {
    const surveyForm = document.getElementById("survey-form");
    const questions = document.querySelectorAll(".question[data-question-id]");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const submitButton = document.getElementById("submit-button");
    const totalQuestions = questions.length;
    let currentQuestionIndex = 0;
    
    const pageAnswers = [];

    // Função para validar a resposta da pergunta ativa
    function validateAnswer() {
        const currentQuestionDiv = questions[currentQuestionIndex];
        const questionId = currentQuestionDiv.dataset.questionId;
        const messageDiv = currentQuestionDiv.querySelector(".question-message");

        messageDiv.textContent = "";
        messageDiv.classList.remove("visible");
        
        if (currentQuestionDiv.querySelector("input[type=\"radio\"]")) {
            const selectedOption = currentQuestionDiv.querySelector(`input[name="${questionId}"]:checked`);
            if (!selectedOption) {
                messageDiv.textContent = "Por favor, selecione uma opção antes de prosseguir.";
                messageDiv.classList.add("visible");
                return false;
            }
        } else if (currentQuestionDiv.querySelector("textarea")) {
            const answer = currentQuestionDiv.querySelector("textarea").value.trim();
            if (answer === "") {
                messageDiv.textContent = "Por favor, preencha o campo de texto antes de prosseguir.";
                messageDiv.classList.add("visible");
                return false;
            }
        }
        return true;
    }

    // Função para atualizar o contador de progresso
    function updateProgress() {
        const currentQuestionSpan = document.getElementById("current-question");
        const totalQuestionsSpan = document.getElementById("total-questions");
        if (currentQuestionSpan && totalQuestionsSpan) {
            currentQuestionSpan.textContent = (currentQuestionIndex + 1);
            totalQuestionsSpan.textContent = totalQuestions;
        }
    }

    // Função para mostrar a pergunta atual e esconder as outras
    function showQuestion(index) {
        questions.forEach((q, i) => {
            q.classList.remove('active');
        });
        questions[index].classList.add('active');
        
        prevButton.style.display = 'none';
        nextButton.style.display = index === totalQuestions - 1 ? 'none' : 'block';
        submitButton.style.display = index === totalQuestions - 1 ? 'block' : 'none';
    }

    // Função para coletar a resposta da pergunta ativa
    function collectAnswer() {
        const currentQuestionDiv = questions[currentQuestionIndex];
        const questionId = currentQuestionDiv.dataset.questionId;
        let answer = "";
        
        if (currentQuestionDiv.querySelector("input[type=\"radio\"]")) {
            const selectedOption = currentQuestionDiv.querySelector(`input[name="${questionId}"]:checked`);
            if (selectedOption) {
                answer = selectedOption.value;
            }
        } else if (currentQuestionDiv.querySelector("textarea")) {
            answer = currentQuestionDiv.querySelector("textarea").value.trim();
        }

        pageAnswers[currentQuestionIndex] = {
            questionId: questionId,
            answer: answer,
            timestamp: new Date().toISOString()
        };
    }

    if (surveyForm) {
        const userInfoString = localStorage.getItem("userInfo");
        if (!userInfoString) {
            alert("Informações do usuário não encontradas. Redirecionando para a página de identificação.");
            window.location.href = "user_info.html";
            return;
        }
        const userInfo = JSON.parse(userInfoString);
        const userId = userInfo.userId;
        
        updateProgress();
        showQuestion(currentQuestionIndex);

        nextButton.addEventListener('click', function() {
            if (!validateAnswer()) {
                return;
            }
            
            collectAnswer();

            if (currentQuestionIndex < totalQuestions - 1) {
                currentQuestionIndex++;
                showQuestion(currentQuestionIndex);
                updateProgress();
            }
        });
        
        submitButton.addEventListener("click", function(e) {
            e.preventDefault();
            
            if (!validateAnswer()) {
                return;
            }
            
            collectAnswer();
            
            pageAnswers.forEach(answer => {
                answer.userId = userId;
            });

            localStorage.setItem("survey1Answers", JSON.stringify(pageAnswers));
            window.location.href = 'survey2.html';
        });
    }
});