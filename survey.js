// survey.js
// Script para a primeira página de pesquisa real
document.addEventListener("DOMContentLoaded", function() {
    const surveyForm = document.getElementById("survey-form");

    if (surveyForm) {
        const userInfoString = localStorage.getItem("userInfo");
        if (!userInfoString) {
            alert("Informações do usuário não encontradas. Redirecionando para a página de identificação.");
            window.location.href = "user_info.html";
            return;
        }
        const userInfo = JSON.parse(userInfoString);
        const userId = userInfo.userId;

        surveyForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const answers = [];
            
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

                answers.push({
                    userId: userId,
                    questionId: questionId,
                    answer: answer,
                    timestamp: new Date().toISOString()
                });
            });

            localStorage.setItem("survey1Answers", JSON.stringify(answers));
            window.location.href = 'survey2.html';
        });
    }
});