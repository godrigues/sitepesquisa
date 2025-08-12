// user_info.js
// Script para a página de informações do usuário
document.addEventListener('DOMContentLoaded', function() {
    const userInfoForm = document.getElementById('user-info-form');
    
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userId = document.getElementById('userId').value.trim();
            const gender = document.getElementById('gender').value;
            const age = document.getElementById('age').value;
            const education = document.getElementById('education').value;
            const experience = document.getElementById('experience').value;
            
            if (userId && gender && age && education && experience) {
                // Salva todas as informações em um único objeto no localStorage
                const userInfo = { userId, gender, age, education, experience };
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                
                // Redireciona para a próxima página, o tutorial
                window.location.href = 'tutorial.html';
            } else {
                alert('Por favor, preencha todos os campos.');
            }
        });
    }
});