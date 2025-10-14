
  const SITE_KEY = '6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81';
  const form = document.getElementById('mc-embedded-subscribe-form');

  function v(id){ return (document.getElementById(id)?.value || '').trim(); }

  function validateRequired(){
    const req = [
      'mce-FNAME','mce-EMAIL','mce-PHONE','mce-SELECSTADO','mce-REQUIERE',
      'mce-EQUIPO','mce-ASESORIA','mce-TIPO','mce-ADITAMIENT','mce-MENSAJE','mce-PUESTOEMP'
    ];
    return req.every(id => v(id));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateRequired()){
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }

    grecaptcha.ready(async () => {
      try {
        const token = await grecaptcha.execute(SITE_KEY, { action: 'submit' });

        // Construimos x-www-form-urlencoded para la Function
        const params = new URLSearchParams({
          FNAME: v('mce-FNAME'),
          EMAIL: v('mce-EMAIL'),
          PHONE: v('mce-PHONE'),
          SELECSTADO: v('mce-SELECSTADO'),
          PUESTOEMP: v('mce-PUESTOEMP'),
          REQUIERE: v('mce-REQUIERE'),
          EQUIPO: v('mce-EQUIPO'),
          ASESORIA: v('mce-ASESORIA'),
          TIPO: v('mce-TIPO'),
          ADITAMIENT: v('mce-ADITAMIENT'),
          MENSAJE: v('mce-MENSAJE'),
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

        // Éxito: redirige a tu página de gracias
        window.location.href = 'https://www.xilinslp.com.mx/gracias-renta-montacarga';
      } catch (err) {
        console.error(err);
        alert('Ocurrió un error. Intenta nuevamente.');
      }
    });
  });
