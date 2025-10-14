// formulario.js
(() => {
  const SITE_KEY = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81';
  const FORM_ID  = 'mc-embedded-subscribe-form';
  const BTN_ID   = 'mc-embedded-subscribe';
  const STATUS_ID = 'form-status';

  const $  = (id) => document.getElementById(id);
  const val = (id) => ( $(id)?.value || '' ).trim();
  const LOG = (...a) => console.log('[LeadForm]', ...a);

  const REQUIRED = [
    'mce-FNAME','mce-EMAIL','mce-PHONE','mce-SELECSTADO','mce-REQUIERE',
    'mce-EQUIPO','mce-ASESORIA','mce-TIPO','mce-ADITAMIENT','mce-MENSAJE','mce-PUESTOEMP'
  ];

  function validateRequired(){
    const ok = REQUIRED.every(id => val(id));
    if (!ok) LOG('Validación: faltan campos requeridos');
    return ok;
  }

  // crea / obtiene el contenedor de estado
  function ensureStatusEl(){
    let el = $(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      el.setAttribute('aria-live', 'polite');
      el.className = 'mt-3 text-sm';
      // lo insertamos justo después del botón si existe, o al final del form
      const btn = $(BTN_ID);
      if (btn?.parentElement) btn.parentElement.appendChild(el);
      else $(FORM_ID)?.appendChild(el);
    }
    return el;
  }

  function setStatus(message, type='info'){
    const el = ensureStatusEl();
    const base = 'mt-3 text-sm';
    const color =
      type === 'success' ? 'text-green-400' :
      type === 'error'   ? 'text-red-400'   :
                           'text-white/80';
    el.className = `${base} ${color}`;
    el.textContent = message;
  }

  // Spinner inline para el botón
  function makeSpinner(){
    const span = document.createElement('span');
    span.className = 'inline-block h-4 w-4 mr-2 align-[-2px] animate-spin';
    span.innerHTML = `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
      </svg>`;
    return span;
  }

  let originalBtnText = null;
  function setLoading(loading){
    const form = $(FORM_ID);
    const btn  = $(BTN_ID);
    if (!form || !btn) return;

    if (loading) {
      originalBtnText = btn.value || btn.textContent;
      btn.disabled = true;
      btn.classList.add('opacity-60','cursor-not-allowed');
      // texto + spinner
      const wrap = document.createElement('span');
      wrap.className = 'inline-flex items-center';
      wrap.appendChild(makeSpinner());
      wrap.appendChild(document.createTextNode(' Enviando…'));
      if (btn.tagName === 'INPUT') btn.value = 'Enviando…';
      else { btn.textContent = ''; btn.appendChild(wrap); }
      form.setAttribute('aria-busy', 'true');
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-60','cursor-not-allowed');
      if (btn.tagName === 'INPUT') btn.value = originalBtnText || 'Enviar';
      else btn.textContent = originalBtnText || 'Enviar';
      form.removeAttribute('aria-busy');
    }
  }

  async function handleSubmit(e){
    e.preventDefault();
    LOG('Submit iniciado');

    if (!validateRequired()){
      setStatus('Completa los campos requeridos.', 'error');
      return;
    }

    setLoading(true);
    setStatus('Preparando verificación…');
    try {
      if (typeof grecaptcha === 'undefined') {
        throw new Error('reCAPTCHA no cargó');
      }

      LOG('Solicitando token reCAPTCHA…');
      await grecaptcha.ready(async () => {
        const token = await grecaptcha.execute(SITE_KEY, { action: 'submit' });
        LOG('Token reCAPTCHA obtenido');

        setStatus('Verificando seguridad…');

        // Construimos payload (no logeamos datos sensibles)
        const params = new URLSearchParams({
          FNAME: val('mce-FNAME'),
          EMAIL: val('mce-EMAIL'),
          PHONE: val('mce-PHONE'),
          SELECSTADO: val('mce-SELECSTADO'),
          PUESTOEMP: val('mce-PUESTOEMP'),
          REQUIERE: val('mce-REQUIERE'),
          EQUIPO: val('mce-EQUIPO'),
          ASESORIA: val('mce-ASESORIA'),
          TIPO: val('mce-TIPO'),
          ADITAMIENT: val('mce-ADITAMIENT'),
          MENSAJE: val('mce-MENSAJE'),
          recaptcha_token: token
        });

        LOG('Payload listo (campos presentes):', {
          FNAME: !!val('mce-FNAME'),
          EMAIL: !!val('mce-EMAIL'),
          PHONE: !!val('mce-PHONE'),
          // …resto omitidos por privacidad
        });

        setStatus('Enviando datos…');
        LOG('Llamando /api/submit …');

        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        LOG('Respuesta backend:', res.status, res.statusText);

        if (!res.ok) {
          const txt = await res.text();
          LOG('Error backend:', txt);
          setStatus('No pudimos enviar tu solicitud. Intenta de nuevo.', 'error');
          setLoading(false);
          return;
        }

        setStatus('¡Enviado correctamente! Redirigiendo…', 'success');
        LOG('OK → redirigiendo a página de gracias');
        setTimeout(() => {
          window.location.href = 'https://www.xilinslp.com.mx/gracias-renta-montacarga';
        }, 400);
      });
    } catch (err) {
      LOG('Excepción durante el envío:', err);
      setStatus('Ocurrió un problema. Intenta de nuevo.', 'error');
      setLoading(false);
    }
  }

  function mount(){
    const form = $(FORM_ID);
    if (!form) { LOG('Form no encontrado:', FORM_ID); return; }
    form.addEventListener('submit', handleSubmit);
    LOG('Listener de submit montado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
