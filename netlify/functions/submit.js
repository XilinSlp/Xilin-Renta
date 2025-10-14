// netlify/functions/submit.js
exports.config = { path: "/api/submit" };

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const ct = event.headers['content-type'] || '';
    let data = {};
    if (ct.includes('application/json')) {
      data = JSON.parse(event.body || '{}');
    } else {
      // x-www-form-urlencoded
      data = Object.fromEntries(new URLSearchParams(event.body || ''));
    }

    const {
      FNAME, EMAIL, PHONE, SELECSTADO, PUESTOEMP, REQUIERE, EQUIPO,
      ASESORIA, TIPO, ADITAMIENT, MENSAJE, recaptcha_token
    } = data;

    // 1) Validar reCAPTCHA (usa tu RECAPTCHA_SECRET en Netlify)
    const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET,
        response: recaptcha_token
      })
    }).then(r => r.json());

    if (!verify.success || (verify.score !== undefined && verify.score < 0.5)) {
      return { statusCode: 400, body: 'Fallo reCAPTCHA' };
    }

    // 2) Reenviar a Google Apps Script (oculto en env)
    if (process.env.GS_WEBAPP_URL) {
      await fetch(process.env.GS_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          name: FNAME,
          email: EMAIL,
          phone: PHONE,
          puesto: PUESTOEMP,
          estado: SELECSTADO,
          requiere: REQUIERE,
          equipo: EQUIPO,
          asesoria: ASESORIA,
          tipo: TIPO,
          aditamento: ADITAMIENT,
          mensaje: MENSAJE
        })
      });
    }

    // 3) (OPCIONAL) Suscribir a Mailchimp vía API (si configuras envs)
    if (process.env.MC_API_KEY && process.env.MC_SERVER_PREFIX && process.env.MC_LIST_ID) {
      const mcServer = process.env.MC_SERVER_PREFIX;
      const mcListId = process.env.MC_LIST_ID;

      const mcRes = await fetch(`https://${mcServer}.api.mailchimp.com/3.0/lists/${mcListId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `apikey ${process.env.MC_API_KEY}`
        },
        body: JSON.stringify({
          email_address: EMAIL,
          status: 'subscribed',
          merge_fields: {
            FNAME: FNAME || '',
            PHONE: PHONE || '',
            PUESTOEMP: PUESTOEMP || '',
            ESTADO: SELECSTADO || '',
            REQUIERE: REQUIERE || '',
            EQUIPO: EQUIPO || '',
            ASESORIA: ASESORIA || '',
            TIPO: TIPO || '',
            ADITAMIENT: ADITAMIENT || '',
            MENSAJE: MENSAJE || ''
          },
          tags: ['7325519']
        })
      });

      if (!mcRes.ok) {
        const txt = await mcRes.text();
        console.error('Mailchimp error:', txt);
        // Decide si abortar o continuar; aquí continuamos.
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Server error' };
  }
};
