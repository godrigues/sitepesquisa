// start.js
function generateUserId() {
    const timestamp = new Date().getTime();
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${randomPart}`;
}

document.addEventListener('DOMContentLoaded', function() {
    // Lógica para o Acordeão
    document.querySelectorAll('.accordion-title').forEach(title => {
        title.addEventListener('click', () => {
            const content = title.nextElementSibling;
            const icon = title.querySelector('.accordion-icon');
            
            content.classList.toggle('active');
            title.classList.toggle('active');
            
            if (content.classList.contains('active')) {
                icon.textContent = '-';
            } else {
                icon.textContent = '+';
            }
        });
    });

    // Lógica para o formulário de informações do usuário
    const userInfoForm = document.getElementById('user-info-form');
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userId = generateUserId();
            const gender = document.getElementById('gender').value;
            const age = document.getElementById('age').value;
            const education = document.getElementById('education').value;
            const experience = document.getElementById('experience').value;
            
            if (gender && age && education && experience) {
                const userInfo = { 
                    userId, 
                    gender, 
                    age, 
                    education, 
                    experience, 
                    surveyStartTime: new Date().toISOString() 
                };
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                
                window.location.href = 'tutorial.html';
            } else {
                alert('Por favor, preencha todos os campos.');
            }
        });
    }
});