(() => {
  const SITE_KEY = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81';
  const FORM_ID  = 'mc-embedded-subscribe-form';
  const BTN_ID   = 'mc-embedded-subscribe';
  const STATUS_ID = 'form-status';

  const $ = (id) => document.getElementById(id);
  const val = (id) => ($(id)?.value || '').trim();
  const LOG = (...a) => console.log('[LeadForm]', ...a);

  const REQUIRED = [
    'mce-FNAME','mce-EMAIL','mce-PHONE','mce-SELECSTADO','mce-REQUIERE',
    'mce-EQUIPO','mce-ASESORIA','mce-TIPO','mce-ADITAMIENT','mce-MENSAJE','mce-PUESTOEMP'
  ];

  // Contenedor de estado
  function ensureStatusEl(){
    let el = $(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      el.setAttribute('aria-live', 'polite');
      el.className = 'mt-3 text-sm text-white/80';
      $(FORM_ID)?.appendChild(el);
    }
    return el;
  }

  function setStatus(message, type='info'){
    const el = ensureStatusEl();
    const color =
      type === 'success' ? 'text-green-400' :
      type === 'error'   ? 'text-red-400'   :
                           'text-white/80';
    el.className = `mt-3 text-sm ${color}`;
    el.textContent = message;
  }

  // ---------------------------
  // 🔥 Validación visual
  // ---------------------------
  function markField(id, isValid) {
    const el = $(id);
    if (!el) return;
    el.style.borderWidth = '1px';
    el.style.borderStyle = 'solid';
    el.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';
    if (isValid === false) {
      el.style.borderColor = '#ef4444';
      el.style.boxShadow = '0 0 4px #ef4444';
    } else if (isValid === true) {
      el.style.borderColor = '#22c55e';
      el.style.boxShadow = '0 0 4px #22c55e';
    } else {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }
  }

  function checkField(id) {
    const el = $(id);
    if (!el) return true;
    const value = val(id);
    let isValid = true;
    if (!value) isValid = false;
    else if (el.type === 'email')
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    else if (id === 'mce-PHONE')
      isValid = /^[0-9]{7,15}$/.test(value.replace(/\s+/g, ''));
    markField(id, isValid);
    return isValid;
  }

  function validateFields() {
    let allValid = true;
    REQUIRED.forEach(id => {
      if (!checkField(id)) allValid = false;
    });
    return allValid;
  }

  function enableLiveValidation() {
    REQUIRED.forEach(id => {
      const el = $(id);
      if (!el) return;
      ['input', 'change', 'blur'].forEach(evt => {
        el.addEventListener(evt, () => checkField(id));
      });
    });
  }

  // ---------------------------
  // Animación circular del botón
  // ---------------------------
  function showButtonLoading(btn) {
    btn.disabled = true;
    btn.classList.add('relative', 'cursor-not-allowed', 'opacity-80');

    // Elimina texto y pone spinner circular SVG
    btn.innerHTML = `
      <span class="absolute inset-0 flex items-center justify-center">
        <svg class="animate-spin h-6 w-6 text-white" viewBox="0 0 50 50">
          <circle class="opacity-20" cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" fill="none"></circle>
          <circle class="opacity-80" cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" fill="none"
            stroke-linecap="round" stroke-dasharray="80" stroke-dashoffset="60"></circle>
        </svg>
      </span>
    `;
  }

  function showButtonSuccess(btn) {
    btn.innerHTML = `
      <span class="absolute inset-0 flex items-center justify-center text-green-400 transition-transform scale-110">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </span>
    `;
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('cursor-not-allowed', 'opacity-80');
      btn.innerHTML = 'Suscribirme';
    }, 1500);
  }

  function showButtonError(btn) {
    btn.innerHTML = `
      <span class="absolute inset-0 flex items-center justify-center text-red-400 transition-transform scale-110">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </span>
    `;
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('cursor-not-allowed', 'opacity-80');
      btn.innerHTML = 'Suscribirme';
    }, 1500);
  }

  // ---------------------------
  // Envío principal
  // ---------------------------
  async function handleSubmit(e){
    e.preventDefault();
    const btn = $(BTN_ID);
    const form = $(FORM_ID);

    if (!validateFields()) {
      alert('Por favor revisa los campos marcados en rojo.');
      setStatus('Hay errores en el formulario.', 'error');
      showButtonError(btn);
      return;
    }

    showButtonLoading(btn);
    setStatus('Enviando datos…');

    try {
      if (typeof grecaptcha === 'undefined') throw new Error('reCAPTCHA no cargó');

      await grecaptcha.ready(async () => {
        const token = await grecaptcha.execute(SITE_KEY, { action: 'submit' });

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

        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        if (!res.ok) throw new Error('Error al enviar');

        setStatus('¡Enviado correctamente! Redirigiendo…', 'success');
        showButtonSuccess(btn);
        setTimeout(() => {
          window.location.href = 'https://www.xilinslp.com.mx/gracias-renta-montacarga';
        }, 700);
      });
    } catch (err) {
      console.error(err);
      setStatus('Error al enviar. Intenta de nuevo.', 'error');
      showButtonError(btn);
    }
  }

  // ---------------------------
  // Montaje
  // ---------------------------
  function mount(){
    const form = $(FORM_ID);
    if (!form) { LOG('Form no encontrado:', FORM_ID); return; }
    form.addEventListener('submit', handleSubmit);
    enableLiveValidation();
    LOG('Formulario listo con validación y spinner circular');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
