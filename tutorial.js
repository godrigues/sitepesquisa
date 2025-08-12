// tutorial.js
// Script para a página do tutorial
document.addEventListener("DOMContentLoaded", function() {
    const tutorialForm = document.getElementById("tutorial-form");

    if (tutorialForm) {
        tutorialForm.addEventListener("submit", function(e) {
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
                    questionId: questionId,
                    answer: answer,
                    timestamp: new Date().toISOString()
                });
            });

            // Salva as respostas do tutorial no localStorage
            localStorage.setItem("tutorialAnswers", JSON.stringify(answers));
            window.location.href = 'start_real_survey.html'; // Redireciona para a próxima página
        });
    }
});