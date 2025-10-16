(() => {
  const SITE_KEY  = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81';
  const FORM_ID   = 'mc-embedded-subscribe-form';
  const BTN_ID    = 'mc-embedded-subscribe';
  const STATUS_ID = 'form-status';

  // ENDPOINTS
  const ENDPOINT_GAS = 'https://script.google.com/macros/s/AKfycbz39RdJB11-tUgDKtseH2_y7O5n44JfZ_0maQDqm6MJfuBEMxMDWToVCidy7k6qPkTL/exec';
  // const ENDPOINT_NETLIFY = '/api/submit'; // si lo quieres usar después

  const $   = (id) => document.getElementById(id);
  const val = (id) => ($(id)?.value || '').trim();
  const LOG = (...a) => console.log('[LeadForm]', ...a);

  const REQUIRED = [
    'mce-FNAME','mce-EMAIL','mce-PHONE','mce-SELECSTADO','mce-REQUIERE',
    'mce-EQUIPO','mce-ASESORIA','mce-TIPO','mce-ADITAMIENT','mce-MENSAJE','mce-PUESTOEMP'
  ];

  // ---------- Estilos del spinner ----------
  function injectStyles(){
    if (document.getElementById('leadform-styles')) return;
    const style = document.createElement('style');
    style.id = 'leadform-styles';
    style.textContent = `
      .lf-row{display:flex;align-items:center;gap:.6rem;margin-top:.75rem;font-size:.875rem}
      .lf-hidden{display:none}
      .lf-ring, .lf-btnring{
        width:22px;height:22px;border-radius:50%;position:relative;display:inline-block;
        --c1:#e5e7eb; --c2: currentColor;
        background: conic-gradient(from 0turn,var(--c2) 0.0turn 0.25turn, transparent 0.25turn) content-box,
                    conic-gradient(var(--c1), var(--c1)) border-box;
        -webkit-mask: radial-gradient(farthest-side,transparent calc(100% - 3px),#000 0) content-box, none;
        mask: radial-gradient(farthest-side,transparent calc(100% - 3px),#000 0) content-box, none;
        padding:3px; animation:lf-rotate 1s linear infinite;
      }
      .lf-btnring{width:24px;height:24px}
      @keyframes lf-rotate{to{transform:rotate(360deg)}}
      .lf-ok, .lf-x{display:inline-flex;align-items:center;justify-content:center}
      .lf-ok svg, .lf-x svg{width:22px;height:22px}
      .lf-success{color:#22c55e}
      .lf-error{color:#ef4444}
    `;
    document.head.appendChild(style);
  }

  // ---------- Status lazy ----------
  function ensureStatusEl(){
    injectStyles();
    let el = $(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      el.setAttribute('aria-live','polite');
      el.className = 'lf-row lf-hidden';
      el.innerHTML = `<span></span><span></span>`;
      $(FORM_ID)?.appendChild(el);
    }
    return el;
  }
  function setStatus(message, type='info'){
    const el = ensureStatusEl();
    el.classList.remove('lf-hidden');
    const icon = el.children[0], text = el.children[1];
    icon.className = ''; icon.innerHTML = ''; el.classList.remove('lf-success','lf-error');

    if (type === 'loading') {
      icon.className = 'lf-ring';
    } else if (type === 'success') {
      el.classList.add('lf-success'); icon.className='lf-ok';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
      el.classList.add('lf-error'); icon.className='lf-x';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    }
    text.textContent = message || '';
  }

  // ---------- Validación ----------
  function markField(id, isValid) {
    const el = $(id); if (!el) return;
    el.style.borderWidth = '1px'; el.style.borderStyle='solid';
    el.style.transition='border-color .3s ease, box-shadow .3s ease';
    if (isValid === false) { el.style.borderColor='#ef4444'; el.style.boxShadow='0 0 4px #ef4444'; }
    else if (isValid === true) { el.style.borderColor='#22c55e'; el.style.boxShadow='0 0 4px #22c55e'; }
    else { el.style.borderColor=''; el.style.boxShadow=''; }
  }
  function checkField(id){
    const el = $(id); if (!el) return true;
    const v = val(id);
    let ok = !!v;
    if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (ok && id === 'mce-PHONE') ok = /^[0-9]{7,15}$/.test(v.replace(/\s+/g,''));
    markField(id, ok); return ok;
  }
  function validateFields(){
    let all = true; REQUIRED.forEach(id => { if (!checkField(id)) all = false; }); return all;
  }
  function enableLiveValidation(){
    REQUIRED.forEach(id => {
      const el = $(id); if (!el) return;
      ['input','change','blur'].forEach(evt => el.addEventListener(evt, () => checkField(id)));
    });
  }

  // ---------- Botón ----------
  function showButtonLoading(btn){
    injectStyles(); btn.disabled = true; btn.innerHTML = `<span class="lf-btnring" aria-hidden="true"></span>`;
  }
  function showButtonSuccess(btn){
    btn.innerHTML = `<span class="lf-ok lf-success" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>`;
    setTimeout(()=>{btn.disabled=false; btn.textContent='Suscribirme';},1200);
  }
  function showButtonError(btn){
    btn.innerHTML = `<span class="lf-x lf-error" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></span>`;
    setTimeout(()=>{btn.disabled=false; btn.textContent='Suscribirme';},1200);
  }

  // ---------- Envío ----------
  let isSubmitting = false; // anti doble click real

  function handleSubmit(e){
    e.preventDefault();
    if (isSubmitting) return;           // bloqueo doble envío
    const btn = $(BTN_ID);

    if (!validateFields()){
      alert('Por favor revisa los campos marcados en rojo.');
      setStatus('Hay errores en el formulario.', 'error');
      showButtonError(btn);
      return;
    }

    isSubmitting = true;
    showButtonLoading(btn);
    setStatus('Enviando datos…', 'loading');

    const send = (token) => {
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

      // Google Apps Script — usamos no-cors para evitar bloqueos; la petición sí llega.
      fetch(ENDPOINT_GAS, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type':'application/x-www-form-urlencoded' },
        body: params.toString()
      })
      .then((res) => {
        // Con no-cors, res.type === 'opaque' (no se puede leer). Lo consideramos éxito.
        const ok = res ? (res.ok || res.type === 'opaque') : false;
        if (!ok) throw new Error('Fallo al enviar');
        setStatus('¡Enviado correctamente! Redirigiendo…', 'success');
        showButtonSuccess(btn);
        setTimeout(()=>{ window.location.href='https://www.xilinslp.com.mx/gracias-renta-montacarga'; }, 700);
      })
      .catch((err) => {
        console.error('[LeadForm] Error envío GAS:', err);
        setStatus('Error al enviar. Intenta de nuevo.', 'error');
        showButtonError(btn);
      })
      .finally(() => { isSubmitting = false; });
    };

    try{
      if (typeof grecaptcha === 'undefined') throw new Error('reCAPTCHA no cargó');
      grecaptcha.ready(() => {
        grecaptcha.execute(SITE_KEY, { action: 'submit' })
          .then((token) => send(token))
          .catch((err) => {
            console.error('[LeadForm] reCAPTCHA error:', err);
            // En emergencia, enviamos sin token
            send('');
          });
      });
    } catch(err){
      console.error('[LeadForm] Captcha no disponible, envío sin token:', err);
      send('');
    }
  }

  // ---------- Montaje ----------
  function mount(){
    const form = $(FORM_ID);
    if (!form) { LOG('Form no encontrado:', FORM_ID); return; }
    ensureStatusEl(); // creado pero oculto
    form.addEventListener('submit', handleSubmit);
    enableLiveValidation();
    LOG('Formulario listo (anti-doble click + GAS endpoint)');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();

})();