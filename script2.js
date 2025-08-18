document.addEventListener("DOMContentLoaded", function() {
    const survey2Form = document.getElementById("survey2-form");
    const questions = document.querySelectorAll(".question[data-question-id]");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const submitButton = document.getElementById("submit-button");
    const totalQuestions = questions.length;
    let currentQuestionIndex = 0;

    let messageDiv = document.getElementById("message");
    if (!messageDiv) {
        messageDiv = document.createElement("div");
        messageDiv.id = "message";
        messageDiv.className = "message";
        survey2Form.parentElement.appendChild(messageDiv);
    }
    
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
    }


    function showQuestion(index) {
        questions.forEach((q, i) => {
            q.classList.remove('active');
        });
        questions[index].classList.add('active');
        
        prevButton.style.display = 'none';
        nextButton.style.display = index === totalQuestions - 1 ? 'none' : 'block';
        submitButton.style.display = index === totalQuestions - 1 ? 'block' : 'none';
    }

    const pageAnswers = [];
    

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

    if (survey2Form) {
        const userInfoString = localStorage.getItem("userInfo");
        if (!userInfoString) {
            alert("Informações do usuário não encontradas. Redirecionando para a página de identificação.");
            window.location.href = "user_info.html";
            return;
        }
        const userInfo = JSON.parse(userInfoString);

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

            loadingOverlay.classList.add('visible');

            collectAnswer();

            let allAnswers = [];

            for (const key in userInfo) {
                allAnswers.push({
                    userId: userInfo.userId,
                    questionId: key,
                    answer: userInfo[key],
                    timestamp: new Date().toISOString()
                });
            }

            const tutorialAnswersString = localStorage.getItem("tutorialAnswers");
            if (tutorialAnswersString) {
                try {
                    const tutorialAnswers = JSON.parse(tutorialAnswersString);
                    tutorialAnswers.forEach(answer => {
                        allAnswers.push({
                            userId: userInfo.userId,
                            questionId: answer.questionId,
                            answer: answer.answer,
                            timestamp: answer.timestamp
                        });
                    });
                    localStorage.removeItem("tutorialAnswers");
                } catch (e) {
                    console.error("Erro ao parsear respostas do tutorial do localStorage:", e);
                }
            }

            const survey1AnswersString = localStorage.getItem("survey1Answers");
            if (survey1AnswersString) {
                try {
                    const survey1Answers = JSON.parse(survey1AnswersString);
                    survey1Answers.forEach(answer => {
                         allAnswers.push({
                            userId: userInfo.userId,
                            questionId: answer.questionId,
                            answer: answer.answer,
                            timestamp: answer.timestamp
                        });
                    });
                    localStorage.removeItem("survey1Answers");
                } catch (e) {
                    console.error("Erro ao parsear respostas da survey1 do localStorage:", e);
                }
            }
            
            pageAnswers.forEach(answer => {
                allAnswers.push({
                    userId: userInfo.userId,
                    questionId: answer.questionId,
                    answer: answer.answer,
                    timestamp: answer.timestamp
                });
            });

            const validAnswers = allAnswers.filter(answer => answer.answer.trim() !== "");

            const gasUrl = 'https://script.google.com/macros/s/AKfycbx_BSeYfATPGj4lzJImTnB8oyXCFRkznmfaHEbN7OscX-xEpfXG_9Vk8cz98USiD24SjA/exec';
            
            const formData = new FormData();
            formData.append('data', JSON.stringify(validAnswers));

            try {
                await fetch(gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: formData,
                });

                await new Promise(resolve => setTimeout(resolve, 5000));
                
                loadingOverlay.classList.remove('visible');
                localStorage.clear();
                window.location.href = 'thankyou.html';
            } catch (error) {
                console.error('Erro ao enviar as respostas:', error);
                
                loadingOverlay.classList.remove('visible');
                messageDiv.textContent = "Ocorreu um erro ao enviar as respostas. Por favor, tente novamente.";
                messageDiv.className = "message error";
                messageDiv.style.display = "block";
            }
        });
    }
});