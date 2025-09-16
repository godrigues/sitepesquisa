document.addEventListener("DOMContentLoaded", function() {
    const tutorialForm = document.getElementById("tutorial-form");
    const questions = document.querySelectorAll(".question[data-question-id]");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const submitButton = document.getElementById("submit-button");
    const totalQuestions = questions.length;
    let currentQuestionIndex = 0;
    
    // Variável para armazenar o tempo de início de cada pergunta
    let questionStartTime = 0;

    const pageAnswers = [];
    const loadingOverlay = document.getElementById("loading-overlay");

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

    function updateProgress() {
        const currentQuestionSpan = document.getElementById("current-question");
        const totalQuestionsSpan = document.getElementById("total-questions");
        if (currentQuestionSpan && totalQuestionsSpan) {
            currentQuestionSpan.textContent = (currentQuestionIndex + 1);
            totalQuestionsSpan.textContent = totalQuestions;
        }
        
        const progressBar = document.querySelector(".progress-bar");
        if (progressBar) {
            const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;
            progressBar.style.width = progressPercentage + "%";
        }
    }

    function showQuestion(index) {
        questions.forEach((q, i) => {
            q.classList.remove('active');
        });
        questions[index].classList.add('active');
        
        questionStartTime = new Date().getTime();
        
        prevButton.style.display = 'none';
        nextButton.style.display = index === totalQuestions - 1 ? 'none' : 'block';
        submitButton.style.display = index === totalQuestions - 1 ? 'block' : 'none';
    }

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
        
        const responseTime = new Date().getTime() - questionStartTime;

        pageAnswers[currentQuestionIndex] = {
            questionId: questionId,
            answer: answer,
            timestamp: new Date().toISOString(),
            responseTime: responseTime
        };
    }
    
    if (tutorialForm) {
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
        
        submitButton.addEventListener("click", async function(e) {
            e.preventDefault();
            
            if (!validateAnswer()) {
                return;
            }

            collectAnswer();
            
            // Salva as respostas do tutorial para a próxima página
            localStorage.setItem("tutorialAnswers", JSON.stringify(pageAnswers));
            
            // Inicia a lógica para buscar a próxima pesquisa
            const gasUrl = 'https://script.google.com/macros/s/AKfycbx_BSeYfATPGj4lzJImTnB8oyXCFRkznmfaHEbN7OscX-xEpfXG_9Vk8cz98USiD24SjA/exec';
            
            loadingOverlay.classList.add("visible");
            submitButton.disabled = true;

            const postData = { action: 'getNextSurvey' };
            const formData = new FormData();
            formData.append('data', JSON.stringify(postData));

            try {
                // Tenta a requisição POST para obter a próxima pesquisa
                await fetch(gasUrl, {
                    method: 'POST',
                    body: formData,
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Tenta a requisição GET para obter o resultado
                const getResponse = await fetch(gasUrl + '?action=getNextSurvey', {
                    method: 'GET',
                });
                
                if (getResponse.ok) {
                    const result = await getResponse.json();
                    if (result.nextSurvey) {
                        localStorage.setItem('selectedSurvey', result.nextSurvey);
                        window.location.href = result.nextSurvey;
                    } else {
                        throw new Error('Resposta inválida do servidor');
                    }
                } else {
                    throw new Error('Erro na resposta do servidor');
                }
                
            } catch (error) {
                console.error('Erro ao conectar ao servidor:', error);
                
                // Fallback: seleciona uma pesquisa aleatória se houver erro
                const surveyPages = ['survey.html', 'survey1.html', 'survey2.html'];
                const randomSurvey = surveyPages[Math.floor(Math.random() * surveyPages.length)];
                localStorage.setItem('selectedSurvey', randomSurvey);
                window.location.href = randomSurvey;
                
            } finally {
                loadingOverlay.classList.remove("visible");
                submitButton.disabled = false;
            }
        });
    }
});