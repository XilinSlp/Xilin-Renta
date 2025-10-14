(() => {
  const SITE_KEY = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81';
  const FORM_ID = 'mc-embedded-subscribe-form';

  function val(id){ return (document.getElementById(id)?.value || '').trim(); }
  function validateRequired(){
    const req = ['mce-FNAME','mce-EMAIL','mce-PHONE','mce-SELECSTADO','mce-REQUIERE',
                 'mce-EQUIPO','mce-ASESORIA','mce-TIPO','mce-ADITAMIENT','mce-MENSAJE','mce-PUESTOEMP'];
    return req.every(id => val(id));
  }

  async function handleSubmit(e){
    e.preventDefault();
    if (!validateRequired()){ alert('Completa los campos requeridos.'); return; }

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

      if (!res.ok) {
        console.error(await res.text());
        alert('No pudimos enviar tu solicitud. Intenta de nuevo.');
        return;
      }
      window.location.href = 'https://www.xilinslp.com.mx/gracias-renta-montacarga';
    });
  }

  // Montaje seguro
  const formEl = document.getElementById(FORM_ID);
  if (!formEl) {
    // Si llegas aquí, el script se ejecutó antes del DOM o el ID no coincide
    document.addEventListener('DOMContentLoaded', () => {
      const f2 = document.getElementById(FORM_ID);
      if (!f2) { console.warn('Form no encontrado:', FORM_ID); return; }
      f2.addEventListener('submit', handleSubmit);
    });
  } else {
    formEl.addEventListener('submit', handleSubmit);
  }
})();
