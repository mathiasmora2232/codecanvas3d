'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const btn = form?.querySelector('button[type="submit"]');
  if (!form) return;

  async function send(data) {
    const res = await fetch('api/contact.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim(),
      mensaje: form.mensaje.value.trim()
    };
    btn.disabled = true;
    try {
      const out = await send(payload);
      if (out.error) {
        alert('No se pudo enviar: ' + out.error + (out.detail ? ('\n' + out.detail) : ''));
      } else {
        alert('Gracias por tu mensaje. ID referencia: ' + out.id);
        form.reset();
      }
    } catch (err) {
      alert('Error inesperado: ' + (err?.message || err));
    } finally {
      btn.disabled = false;
    }
  });
});
