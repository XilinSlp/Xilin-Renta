(() => {
  const SITE_KEY  = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81'; // pública (ok en cliente)
  const FORM_ID   = 'mc-embedded-subscribe-form';
  const BTN_ID    = 'mc-embedded-subscribe';
  const STATUS_ID = 'form-status';
  const THANK_YOU_URL = '/gracias-renta-montacarga';
  const MC_IFRAME_NAME = 'mc-submit-bridge'; // Mailchimp en iframe oculto

  const $   = (id) => document.getElementById(id);
  const val = (id) => ($(id)?.value || '').trim();
  const REQUIRED = [
    'mce-FNAME','mce-EMAIL','mce-PHONE','mce-SELECSTADO','mce-REQUIERE',
    'mce-EQUIPO','mce-ASESORIA','mce-TIPO','mce-ADITAMIENT','mce-MENSAJE','mce-PUESTOEMP'
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
        padding:3px;animation:lf-rotate 1s linear infinite;}
      .lf-btnring{width:24px;height:24px}
      @keyframes lf-rotate{to{transform:rotate(360deg)}}
      .lf-ok,.lf-x{display:inline-flex;align-items:center;justify-content:center}
      .lf-ok svg,.lf-x svg{width:22px;height:22px}
      .lf-success{color:#22c55e}.lf-error{color:#ef4444}
      iframe[name="${MC_IFRAME_NAME}"]{display:none;width:0;height:0;border:0}
    `;
    document.head.appendChild(s);
  }
  function ensureStatusEl(){
    injectStyles();
    let el = $(STATUS_ID);
    if(!el){
      el=document.createElement('div'); el.id=STATUS_ID; el.setAttribute('aria-live','polite');
      el.className='lf-row lf-hidden'; el.innerHTML=`<span></span><span></span>`;
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
  function checkField(id){
    const el=$(id); if(!el) return true; const v=val(id); let ok=!!v;
    if(ok && el.type==='email') ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if(ok && id==='mce-PHONE') ok=/^[0-9]{7,15}$/.test(v.replace(/\s+/g,''));
    markField(id,ok); return ok;
  }
  function validateFields(){let all=true; REQUIRED.forEach(id=>{if(!checkField(id)) all=false;}); return all;}
  function enableLiveValidation(){REQUIRED.forEach(id=>{const el=$(id); if(!el) return;
    ['input','change','blur'].forEach(evt=>el.addEventListener(evt,()=>checkField(id)));});}

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

  // ---------- envío ----------
  let isSubmitting=false;
  function handleSubmit(ev){
    ev.preventDefault();
    if(isSubmitting) return;
    const btn=$(BTN_ID), form=$(FORM_ID);
    if(!validateFields()){alert('Por favor revisa los campos marcados en rojo.');
      setStatus('Hay errores en el formulario.','error'); showButtonError(btn); return;}

    isSubmitting=true; showButtonLoading(btn); setStatus('Enviando datos…','loading');

    const sendBoth=(token)=>{
      // payload para la Function (NO expone secretos)
      const params = new URLSearchParams({
        FNAME: val('mce-FNAME'), EMAIL: val('mce-EMAIL'), PHONE: val('mce-PHONE'),
        SELECSTADO: val('mce-SELECSTADO'), PUESTOEMP: val('mce-PUESTOEMP'),
        REQUIERE: val('mce-REQUIERE'), EQUIPO: val('mce-EQUIPO'),
        ASESORIA: val('mce-ASESORIA'), TIPO: val('mce-TIPO'),
        ADITAMIENT: val('mce-ADITAMIENT'), MENSAJE: val('mce-MENSAJE'),
        recaptcha_token: token
      });

      // 1) Enviar a Netlify Function (procesa reCAPTCHA + reenvía a Apps Script)
      fetch('/api/submit', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body: params.toString()
      }).catch(err=>console.error('[LeadForm] Function error:',err));

      // 2) Enviar a Mailchimp en iframe (action HTML original)
      submitToMailchimp(form);

      // UX local
      setStatus('¡Enviado correctamente! Redirigiendo…','success');
      showButtonSuccess(btn);
      setTimeout(()=>{window.location.href=THANK_YOU_URL;},700);
      setTimeout(()=>{isSubmitting=false;},1200);
    };

    try{
      if(typeof grecaptcha==='undefined') throw new Error('reCAPTCHA no cargó');
      grecaptcha.ready(()=>{grecaptcha.execute(SITE_KEY,{action:'submit'})
        .then(token=>sendBoth(token))
        .catch(err=>{console.error('[LeadForm] reCAPTCHA error:',err); sendBoth('');});});
    }catch(err){console.error('[LeadForm] Captcha no disponible:',err); sendBoth('');}
  }

  function mount(){
    const form=$(FORM_ID); if(!form) return;
    ensureStatusEl(); ensureMcIframe();
    form.addEventListener('submit',handleSubmit); enableLiveValidation();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();