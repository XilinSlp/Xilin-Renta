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

  // -------------------------------------------------
  // 🔧 Estilos del indicador de estado (inyectados 1 vez)
  // -------------------------------------------------
  function ensureStatusStyles(){
    if (document.getElementById('form-status-styles')) return;
    const css = `
    .fs-wrap{display:flex;align-items:center;gap:.5rem;margin-top:.75rem;font-size:.875rem}
    .fs-ind{width:24px;height:24px;position:relative;display:inline-flex}
    .fs-ind svg{width:100%;height:100%;transform-origin:50% 50%}
    .fs-track{stroke:#D1D5DB;stroke-width:4;fill:none;opacity:.6}
    .fs-spin{stroke:currentColor;stroke-width:4;fill:none;stroke-linecap:round;
             stroke-dasharray:126;stroke-dashoffset:90}
    .fs-check,.fs-cross{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;
                        stroke-dasharray:60;stroke-dashoffset:60;opacity:0}
    /* Estados */
    #${STATUS_ID}[data-state="idle"] .fs-spin{display:none}
    #${STATUS_ID}[data-state="idle"] .fs-check,
    #${STATUS_ID}[data-state="idle"] .fs-cross{display:none}
    #${STATUS_ID}[data-state="loading"] .fs-spin{animation:fs-rotate 1s linear infinite,
                                                 fs-dash 1.4s ease-in-out infinite}
    #${STATUS_ID}[data-state="success"]{color:#34D399}
    #${STATUS_ID}[data-state="success"] .fs-spin{display:none}
    #${STATUS_ID}[data-state="success"] .fs-check{stroke:currentColor;opacity:1;
      animation:fs-draw .6s ease forwards}
    #${STATUS_ID}[data-state="error"]{color:#F87171}
    #${STATUS_ID}[data-state="error"] .fs-spin{display:none}
    #${STATUS_ID}[data-state="error"] .fs-cross{stroke:currentColor;opacity:1;
      animation:fs-draw .6s ease forwards}
    /* Animaciones */
    @keyframes fs-rotate{to{transform:rotate(360deg)}}
    @keyframes fs-dash{
      0%{stroke-dasharray:1,126;stroke-dashoffset:0}
      50%{stroke-dasharray:90,126;stroke-dashoffset:-35}
      100%{stroke-dasharray:1,126;stroke-dashoffset:-125}
    }
    @keyframes fs-draw{to{stroke-dashoffset:0}}
    `;
    const style = document.createElement('style');
    style.id = 'form-status-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // -------------------------------------------------
  // 🧩 Contenedor de estado con círculo animado
  // -------------------------------------------------
  function ensureStatusEl(){
    ensureStatusStyles();
    let el = $(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      el.setAttribute('role','status');
      el.setAttribute('aria-live','polite');
      el.className = 'fs-wrap';
      el.dataset.state = 'idle';
      el.innerHTML = `
        <span class="fs-ind" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <circle class="fs-track"   cx="24" cy="24" r="20"></circle>
            <circle class="fs-spin"    cx="24" cy="24" r="20"></circle>
            <polyline class="fs-check" points="14,26 21,33 34,18"></polyline>
            <g class="fs-cross">
              <line x1="16" y1="16" x2="32" y2="32"></line>
              <line x1="32" y1="16" x2="16" y2="32"></line>
            </g>
          </svg>
        </span>
        <span class="fs-text">Listo.</span>
      `;
      $(FORM_ID)?.appendChild(el);
    }
    return el;
  }

  function setStatus(message, type='info'){
    const el = ensureStatusEl();
    // tipo → estado visual
    let state = 'idle';
    if (type === 'success') state = 'success';
    else if (type === 'error') state = 'error';
    else if (type === 'loading' || /enviando/i.test(message)) state = 'loading';
    el.dataset.state = state;
    el.querySelector('.fs-text').textContent = message;
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
  // 🎯 Animación circular del botón
  // ---------------------------
  function showButtonLoading(btn) {
    btn.disabled = true;
    btn.classList.add('relative','cursor-not-allowed','opacity-80');
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
      btn.classList.remove('cursor-not-allowed','opacity-80');
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
      btn.classList.remove('cursor-not-allowed','opacity-80');
      btn.innerHTML = 'Suscribirme';
    }, 1500);
  }

  // ---------------------------
  // 🚀 Envío principal
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
    setStatus('Enviando datos…', 'loading');

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
  // 🧰 Montaje
  // ---------------------------
  function mount(){
    const form = $(FORM_ID);
    if (!form) { LOG('Form no encontrado:', FORM_ID); return; }
    form.addEventListener('submit', handleSubmit);
    ensureStatusEl();           // crea el estado con el círculo
    enableLiveValidation();
    LOG('Formulario listo con validación y spinner circular');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();