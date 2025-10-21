(() => {
  // ==== TUS CONSTANTES (RESPETADAS) ====
  const SITE_KEY  = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81'; // v3 (pública)
  const FORM_ID   = 'mc-embedded-subscribe-form';
  const BTN_ID    = 'mc-embedded-subscribe';
  const STATUS_ID = 'form-status';
  const THANK_YOU_URL = 'https://xilin-landing.netlify.app/thank-you62433527';
  const MC_IFRAME_NAME = 'mc-submit-bridge';
  const BADGE_SLOT_ID  = 'recaptcha-badge-slot';

  const $   = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').trim();

  // ==== REQUERIDOS EXACTOS DEL FORM PRESENTE ====
  const REQUIRED = [
    'mce-FNAME',     // name
    'mce-EMAIL',     // email
    'mce-PHONE',     // phone
    'mce-CONFIRNUM', // phoneConfirm
    'mce-MMERGE15',  // estado
    'mce-PUESTOEMP', // puesto
    'mce-EQUIPO',    // equipo
    'mce-MMERGE18',  // define
    'mce-TIPO',      // tipo
    'mce-MENSAJE'    // mensaje
  ];

  // ---------- estilos / status ----------
  function injectStyles(){
    if (document.getElementById('leadform-styles')) return;
    const s = document.createElement('style');
    s.id='leadform-styles';
    s.textContent=`
      .lf-row{display:flex;align-items:center;gap:.6rem;margin-top:.75rem;font-size:.875rem}
      .lf-hidden{display:none}
      .lf-ring,.lf-btnring{width:22px;height:22px;border-radius:50%;display:inline-block;
        --c1:#e5e7eb;--c2:currentColor;background:
        conic-gradient(from 0turn,var(--c2) 0.0turn 0.25turn,transparent 0.25turn) content-box,
        conic-gradient(var(--c1),var(--c1)) border-box;
        -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 0) content-box,none;
        mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 0) content-box,none;
        padding:3px;animation:lf-rotate 1s linear infinite}
      .lf-btnring{width:24px;height:24px}
      @keyframes lf-rotate{to{transform:rotate(360deg)}}
      .lf-ok,.lf-x{display:inline-flex;align-items:center;justify-content:center}
      .lf-ok svg,.lf-x svg{width:22px;height:22px}
      .lf-success{color:#22c55e}.lf-error{color:#ef4444}
      iframe[name="${MC_IFRAME_NAME}"]{display:none;width:0;height:0;border:0}
      #${BADGE_SLOT_ID} { margin-top:.5rem; }
      #${BADGE_SLOT_ID} .grecaptcha-badge{
        position: static !important; right:auto !important; bottom:auto !important;
        box-shadow:none !important; transform:none !important;
      }
      #${BADGE_SLOT_ID} .grecaptcha-badge iframe{ transform:scale(.95); transform-origin:left top; }
    `;
    document.head.appendChild(s);
  }

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
  function setStatus(msg,type='info'){
    const el=ensureStatusEl(); el.classList.remove('lf-hidden');
    const icon=el.children[0], text=el.children[1];
    icon.className=''; icon.innerHTML=''; el.classList.remove('lf-success','lf-error');
    if(type==='loading'){icon.className='lf-ring';}
    else if(type==='success'){el.classList.add('lf-success');icon.className='lf-ok';
      icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;}
    else if(type==='error'){el.classList.add('lf-error');icon.className='lf-x';
      icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;}
    text.textContent=msg||'';
  }

  // ---------- validación ----------
  function markField(id,ok){const el=$(id); if(!el) return;
    el.style.borderWidth='1px'; el.style.borderStyle='solid';
    el.style.transition='border-color .3s, box-shadow .3s';
    if(ok===false){el.style.borderColor='#ef4444'; el.style.boxShadow='0 0 4px #ef4444';}
    else if(ok===true){el.style.borderColor='#22c55e'; el.style.boxShadow='0 0 4px #22c55e';}
    else {el.style.borderColor=''; el.style.boxShadow='';}}
  const rxEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/; const rxPhone=/^[0-9]{7,15}$/;

  function checkField(id){
    const el=$(id); if(!el) return true; const vv=val(id); let ok=!!vv;
    if(ok && el.type==='email') ok=rxEmail.test(vv);
    if(ok && (id==='mce-PHONE' || id==='mce-CONFIRNUM')) ok=rxPhone.test(vv.replace(/\s+/g,''));
    markField(id,ok); return ok;
  }

  function validateFields(){
    let all=true; REQUIRED.forEach(id=>{ if(!checkField(id)) all=false; });
    // Comparación estricta de teléfono
    if (all) {
      const p = val('mce-PHONE').replace(/\s+/g,'');
      const c = val('mce-CONFIRNUM').replace(/\s+/g,'');
      if (p !== c) { alert('Por favor, compruebe nuevamente su número de teléfono'); all=false; }
    }
    console.log('[LeadForm] validate ->', all?'OK':'ERRORES');
    return all;
  }
  function enableLiveValidation(){
    REQUIRED.forEach(id=>{
      const el=$(id); if(!el) return;
      ['input','change','blur'].forEach(evt=>el.addEventListener(evt,()=>checkField(id)));
    });
  }

  // ---------- Mailchimp bridge ----------
  function ensureMcIframe(){
    let iframe=document.querySelector(`iframe[name="${MC_IFRAME_NAME}"]`);
    if(!iframe){iframe=document.createElement('iframe'); iframe.name=MC_IFRAME_NAME; document.body.appendChild(iframe);}
    return iframe;
  }
  function submitToMailchimp(form){
    const originalTarget=form.getAttribute('target');
    try{ensureMcIframe(); form.setAttribute('target',MC_IFRAME_NAME); form.submit();}
    finally{originalTarget?form.setAttribute('target',originalTarget):form.removeAttribute('target');}
  }

  // ---------- botón ----------
  function showButtonLoading(btn){injectStyles(); btn.disabled=true; btn.innerHTML=`<span class="lf-btnring" aria-hidden="true"></span>`;}
  function showButtonSuccess(btn){btn.innerHTML=`<span class="lf-ok lf-success" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>`;
    setTimeout(()=>{btn.disabled=false; btn.textContent='Suscribirme';},1200);}
  function showButtonError(btn){btn.innerHTML=`<span class="lf-x lf-error" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></span>`;
    setTimeout(()=>{btn.disabled=false; btn.textContent='Suscribirme';},1200);}

  // ---------- reCAPTCHA v3: badge estático ----------
  function ensureBadgeSlot(){
    if ($(BADGE_SLOT_ID)) return $(BADGE_SLOT_ID);
    const btn = $(BTN_ID); if (!btn) return null;
    const slot = document.createElement('div'); slot.id = BADGE_SLOT_ID;
    btn.insertAdjacentElement('afterend', slot); return slot;
  }
  function placeV3Badge(){
    const slot = ensureBadgeSlot(); if (!slot) return;
    const tryMove = () => {
      const badge = document.querySelector('.grecaptcha-badge');
      if (badge && slot.firstChild !== badge) {
        slot.appendChild(badge);
        badge.style.position = 'static'; badge.style.right = 'auto'; badge.style.bottom = 'auto';
        console.log('[reCAPTCHA v3] badge movido al slot'); return true;
      }
      return false;
    };
    if (tryMove()) return; let n=0; const id=setInterval(()=>{ if (tryMove() || ++n>30) clearInterval(id); },100);
  }

  // ---------- envío ----------
  let isSubmitting=false;

  function handleSubmitForm(token) {
    const form = $(FORM_ID);

    // Leer campos EXACTOS del formulario actual
    const name        = val('mce-FNAME');
    const email       = val('mce-EMAIL');
    const phone       = val('mce-PHONE');
    const phoneConfirm= val('mce-CONFIRNUM');
    const estado      = val('mce-MMERGE15');
    const equipo      = val('mce-EQUIPO');
    const define      = val('mce-MMERGE18');
    const tipo        = val('mce-TIPO');
    const mensaje     = val('mce-MENSAJE');
    const puesto      = val('mce-PUESTOEMP');

    // Doble seguridad con teléfonos
    if (phone.replace(/\s+/g,'') !== phoneConfirm.replace(/\s+/g,'')) {
      alert('Por favor, compruebe nuevamente su número de teléfono');
      const btn=$(BTN_ID); showButtonError(btn); setStatus('Hay errores en el formulario.','error');
      isSubmitting=false; return;
    }

    // Payload EXACTO que pediste
    const payload = {
      name, email, phone, puesto, estado, equipo, define, tipo, mensaje,
      recaptcha_token: token,
      _meta: { origen: location.href, agente: navigator.userAgent, marcaDeTiempo: new Date().toISOString() }
    };

    console.log('[LeadForm] -> Netlify payload', payload);

    fetch('/.netlify/functions/submitEficiencia', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })
    .then(async (r) => {
      if (!r.ok) throw new Error(await r.text().catch(()=> 'Error en función'));
      return r.json().catch(()=> ({}));
    })
    .then((data)=>{
      console.log('[LeadForm] función OK:', data);
      setStatus('¡Enviado correctamente! Redirigiendo…','success');
      showButtonSuccess($(BTN_ID));
      // Envío paralelo a Mailchimp (mantiene tus registros en la lista)
      submitToMailchimp(form);
      setTimeout(()=>{window.location.href=THANK_YOU_URL;},700);
    })
    .catch((err)=>{
      console.error('[LeadForm] función ERROR:', err);
      alert('No fue posible enviar tu información. Intenta nuevamente.');
      showButtonError($(BTN_ID));
      setStatus('Ocurrió un error al enviar.','error');
      isSubmitting=false;
    });
  }

  function handleSubmit(ev){
    ev.preventDefault();
    if(isSubmitting) return;
    if(!validateFields()){
      alert('Por favor revisa los campos marcados en rojo.');
      setStatus('Hay errores en el formulario.','error'); showButtonError($(BTN_ID)); return;
    }
    isSubmitting=true; showButtonLoading($(BTN_ID)); setStatus('Enviando datos…','loading');

    try{
      if(typeof grecaptcha==='undefined') throw new Error('reCAPTCHA no cargó');
      grecaptcha.ready(()=>{grecaptcha.execute(SITE_KEY,{action:'submit'})
        .then(token=>handleSubmitForm(token))
        .catch(err=>{console.error('[LeadForm] reCAPTCHA error:',err); handleSubmitForm('');});});
    }catch(err){console.error('[LeadForm] Captcha no disponible:',err); handleSubmitForm('');}
  }

  // ---------- montaje ----------
  function mount(){
    const form=$(FORM_ID); if(!form) return;
    ensureStatusEl(); ensureMcIframe(); ensureBadgeSlot();
    form.setAttribute('novalidate',''); // UX consistente
    form.addEventListener('submit',handleSubmit);
    const ready = () => (window.grecaptcha && grecaptcha.ready)
      ? grecaptcha.ready(placeV3Badge)
      : setTimeout(ready,100);
    ready();
    enableLiveValidation();
    console.log('[LeadForm] listo (IDs exactos, v3 con badge estático)');
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();
