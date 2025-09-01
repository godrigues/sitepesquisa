document.addEventListener("DOMContentLoaded", function() {
    // O ID do formulário em cada página deve ser único
    const surveyForm = document.getElementById("survey-form") || document.getElementById("survey1-form") || document.getElementById("survey2-form");
    const questions = document.querySelectorAll(".question[data-question-id]");
    const prevButton = document.getElementById("prev-button");
    const nextButton = document.getElementById("next-button");
    const submitButton = document.getElementById("submit-button");
    const totalQuestions = questions.length;
    let currentQuestionIndex = 0;
    
    const pageAnswers = [];
    const loadingOverlay = document.getElementById("loading-overlay");
    const messageDiv = document.getElementById("message");

    // Obter o nome do arquivo HTML atual (ex: survey.html, survey1.html, survey2.html)
    const currentSurveyName = window.location.pathname.split("/").pop();

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
            q.classList.remove("active");
        });
        questions[index].classList.add("active");
        
        prevButton.style.display = "none";
        nextButton.style.display = index === totalQuestions - 1 ? "none" : "block";
        submitButton.style.display = index === totalQuestions - 1 ? "block" : "none";
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

        pageAnswers[currentQuestionIndex] = {
            questionId: questionId,
            answer: answer,
            timestamp: new Date().toISOString()
        };
    }

    async function sendDataToGAS(data, actionType = "saveData") {
        const gasUrl = "https://script.google.com/macros/s/AKfycbx_BSeYfATPGj4lzJImTnB8oyXCFRkznmfaHEbN7OscX-xEpfXG_9Vk8cz98USiD24SjA/exec";

        loadingOverlay.classList.add("visible");

        const formData = new FormData();
        formData.append("data", JSON.stringify({ action: actionType, payload: data }));

        try {
            const response = await fetch(gasUrl, {
                method: "POST",
                mode: "no-cors", // Use no-cors para evitar problemas de CORS com FormData
                body: formData,
            });

            // Não é possível ler a resposta de uma requisição no-cors, mas podemos assumir sucesso
            // se não houver erro na rede.
            
            // Se a ação for para salvar dados, incrementa o contador após o envio bem-sucedido
            if (actionType === "saveData") {
                await incrementCounterGAS(currentSurveyName);
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
            
            loadingOverlay.classList.remove("visible");
            localStorage.clear();
            window.location.href = "thankyou.html";
        } catch (error) {
            console.error("Erro ao enviar as respostas:", error);
            
            loadingOverlay.classList.remove("visible");
            messageDiv.textContent = "Ocorreu um erro ao enviar as respostas. Por favor, tente novamente.";
            messageDiv.className = "message error";
            messageDiv.style.display = "block";
        }
    }

    async function incrementCounterGAS(surveyName) {
        const gasUrl = "https://script.google.com/macros/s/AKfycbx_BSeYfATPGj4lzJImTnB8oyXCFRkznmfaHEbN7OscX-xEpfXG_9Vk8cz98USiD24SjA/exec";
        const formData = new FormData();
        formData.append("data", JSON.stringify({ action: "incrementCounter", surveyName: surveyName }));

        try {
            await fetch(gasUrl, {
                method: "POST",
                mode: "no-cors",
                body: formData,
            });
            console.log("Contador incrementado para: ", surveyName);
        } catch (error) {
            console.error("Erro ao incrementar o contador:", error);
        }
    }

    if (surveyForm) {
        const userInfoString = localStorage.getItem("userInfo");
        if (!userInfoString) {
            alert("Informações do usuário não encontradas. Redirecionando para a página de identificação.");
            window.location.href = "user_info.html";
            return;
        }
        const userInfo = JSON.parse(userInfoString);
        
        updateProgress();
        showQuestion(currentQuestionIndex);

        nextButton.addEventListener("click", function() {
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

            let allAnswers = [];

            // 1. Adiciona as informações do perfil
            // Transforma o objeto userInfo em um array de objetos de resposta
            for (const key in userInfo) {
                if (userInfo.hasOwnProperty(key)) {
                    allAnswers.push({
                        userId: userInfo.userId, // Garante que o userId esteja em cada item
                        questionId: key,
                        answer: userInfo[key],
                        timestamp: userInfo.surveyStartTime // Ou um timestamp específico para cada campo, se necessário
                    });
                }
            }

            // 2. Recupera e adiciona as respostas do tutorial
            const tutorialAnswersString = localStorage.getItem("tutorialAnswers");
            if (tutorialAnswersString) {
                try {
                    const tutorialAnswers = JSON.parse(tutorialAnswersString);
                    // Adiciona o userId a cada resposta do tutorial
                    tutorialAnswers.forEach(ans => {
                        ans.userId = userInfo.userId;
                    });
                    allAnswers = allAnswers.concat(tutorialAnswers);
                    localStorage.removeItem("tutorialAnswers");
                } catch (e) {
                    console.error("Erro ao parsear respostas do tutorial do localStorage:", e);
                }
            }
            
            // 3. Adiciona as respostas da página atual
            // Adiciona o userId a cada resposta da página atual
            pageAnswers.forEach(ans => {
                ans.userId = userInfo.userId;
            });
            allAnswers = allAnswers.concat(pageAnswers);
            
            const validAnswers = allAnswers.filter(answer => answer.answer.trim() !== "");

            sendDataToGAS(validAnswers, "saveData");
        });
    }
});