// script2.js
// Script para a página de pesquisa survey2.html
document.addEventListener("DOMContentLoaded", function() {
    const survey2Form = document.getElementById("survey2-form");
    
    let messageDiv = document.getElementById("message");
    if (!messageDiv) {
        messageDiv = document.createElement("div");
        messageDiv.id = "message";
        messageDiv.className = "message";
        survey2Form.parentElement.appendChild(messageDiv);
    }
    
    if (survey2Form) {
        const userInfoString = localStorage.getItem("userInfo");
        if (!userInfoString) {
            alert("Informações do usuário não encontradas. Redirecionando para a página de identificação.");
            window.location.href = "user_info.html";
            return;
        }
        const userInfo = JSON.parse(userInfoString);
        
        survey2Form.addEventListener("submit", async function(e) {
            e.preventDefault();
            
            showMessage("Enviando suas respostas...", "info");
            
            let allAnswers = [];

            // Adiciona as informações do usuário ao array de respostas
            for (const key in userInfo) {
                allAnswers.push({
                    userId: userInfo.userId,
                    questionId: key,
                    answer: userInfo[key],
                    timestamp: new Date().toISOString() // Captura o timestamp para cada item do perfil
                });
            }

            // Recupera e adiciona as respostas do tutorial
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

            // Recupera e adiciona as respostas da pesquisa 1
            const survey1AnswersString = localStorage.getItem("survey1Answers");
            if (survey1AnswersString) {
                try {
                    const survey1Answers = JSON.parse(survey1AnswersString);
                    allAnswers = allAnswers.concat(survey1Answers);
                    localStorage.removeItem("survey1Answers");
                } catch (e) {
                    console.error("Erro ao parsear respostas da survey1 do localStorage:", e);
                }
            }
            
            // Coleta respostas da página atual (survey2.html)
            document.querySelectorAll(".question[data-question-id]").forEach(questionDiv => {
                const questionId = questionDiv.dataset.questionId;
                let answer = "";
                
                if (questionDiv.querySelector("input[type=\"radio\"]")) {
                    const selectedOption = questionDiv.querySelector(`input[name="${questionId}"]:checked`);
                    if (selectedOption) {
                        answer = selectedOption.value;
                    }
                } else if (questionDiv.querySelector("textarea")) {
                    answer = questionDiv.querySelector("textarea").value.trim();
                }

                allAnswers.push({
                    userId: userInfo.userId,
                    questionId: questionId,
                    answer: answer,
                    timestamp: new Date().toISOString()
                });
            });

            const validAnswers = allAnswers.filter(answer => answer.answer.trim() !== "");

            const gasUrl = 'https://script.google.com/macros/s/AKfycbx_BSeYfATPGj4lzJImTnB8oyXCFRkznmfaHEbN7OscX-xEpfXG_9Vk8cz98USiD24SjA/exec';
            
            const formData = new FormData();
            formData.append('data', JSON.stringify(validAnswers));

            try {
                const response = await fetch(gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: formData,
                });
                
                // Limpa o userInfo do localStorage após o envio
                localStorage.removeItem('userInfo');
                window.location.href = 'thankyou.html';
            } catch (error) {
                console.error('Erro ao enviar as respostas:', error);
                showMessage("Ocorreu um erro ao enviar as respostas. Por favor, tente novamente.", "error");
            }
        });
    }

    function showMessage(message, type) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = "block";
        }
    }
});