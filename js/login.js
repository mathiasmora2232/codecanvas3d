// Manejo de login y registro separado de account
(function() {
  const $ = (sel) => document.querySelector(sel);
  const loginView = $('#login-view');
  const registerView = $('#register-view');
  const loginForm = $('#login-form');
  const registerForm = $('#register-form');
  const showRegister = $('#show-register');
  const showLogin = $('#show-login');
  const loginMsg = $('#login-msg');
  const regMsg = $('#reg-msg');
  const regModal = $('#reg-modal');

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function toggleToRegister(e) { e?.preventDefault(); hide(loginView); show(registerView); }
  function toggleToLogin(e) { e?.preventDefault(); hide(registerView); show(loginView); }

  showRegister?.addEventListener('click', toggleToRegister);
  showLogin?.addEventListener('click', toggleToLogin);

  // Cerrar modal
  regModal?.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) {
      regModal.classList.add('hidden');
      regModal.setAttribute('aria-hidden', 'true');
    }
  });

  // Login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = '';
    const usuario = document.getElementById('login-usuario').value.trim();
    const password = document.getElementById('login-pass').value.trim();
    if (!usuario || !password) {
      loginMsg.textContent = 'Ingresa usuario/email y contraseña.';
      return;
    }
    try {
      const res = await fetch('api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        // El backend espera la clave "email" para email o usuario
        body: JSON.stringify({ action: 'login', email: usuario, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        loginMsg.textContent = data.detail || 'Error al iniciar sesión.';
        return;
      }
      // Exitoso: redirigir a account
      window.location.href = 'account.html';
    } catch (err) {
      loginMsg.textContent = 'Error de red: ' + err.message;
    }
  });

  // Registro
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    regMsg.textContent = '';
    const nombre = document.getElementById('reg-nombre').value.trim();
    const usuario = document.getElementById('reg-usuario').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value.trim();
    if (!nombre || !usuario || !email || !password) {
      regMsg.textContent = 'Completa todos los campos.';
      return;
    }
    try {
      const res = await fetch('api/auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', nombre, usuario, email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        regMsg.textContent = data.detail || 'Error al registrar.';
        return;
      }
      // Mostrar modal de éxito y volver a login
      regModal.classList.remove('hidden');
      regModal.setAttribute('aria-hidden', 'false');
      toggleToLogin();
    } catch (err) {
      regMsg.textContent = 'Error de red: ' + err.message;
    }
  });
})();
