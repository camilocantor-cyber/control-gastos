document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginBtn.textContent = 'AUTHENTICATING...';
            loginBtn.disabled = true;
            errorMsg.style.display = 'none';

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('cyber_token', data.token);
                    localStorage.setItem('cyber_user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    const error = await response.json();
                    errorMsg.textContent = error.error || 'Access Denied';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                errorMsg.textContent = 'Exception: ' + err.message;
                errorMsg.style.display = 'block';
            } finally {
                loginBtn.textContent = 'INITIALIZE ACCESS';
                loginBtn.disabled = false;
            }
        });
    }
});
