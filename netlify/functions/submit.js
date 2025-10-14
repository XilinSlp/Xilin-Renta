// netlify/functions/submit.js
import fetch from 'node-fetch';

export const config = { path: "/api/submit" };

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Parse multipart/form-data o x-www-form-urlencoded
    const contentType = event.headers['content-type'] || '';
    let data = {};
    if (contentType.includes('multipart/form-data')) {
      // Netlify parse no built-in: usa URLSearchParams con body crudo no sirve para multipart.
      // Truco simple: convierte FormData en x-www-form-urlencoded desde el cliente (opción) o usa un parser.
      // Para mantenerlo simple aquí, asumiremos x-www-form-urlencoded en el cliente.
      return { statusCode: 400, body: 'Envia como application/x-www-form-urlencoded o JSON' };
    } else if (contentType.includes('application/json')) {
      data = JSON.parse(event.body || '{}');
    } else {
      // asume x-www-form-urlencoded
      data = Object.fromEntries(new URLSearchParams(event.body));
    }

    // Campos del form
    const {
      FNAME, EMAIL, PHONE, SELECSTADO, PUESTOEMP, REQUIERE, EQUIPO,
      ASESORIA, TIPO, ADITAMIENT, MENSAJE, recaptcha_token
    } = data;

    // 1) Validar reCAPTCHA
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET,  // <-- ENV
        response: recaptcha_token
      })
    }).then(res => res.json());

    if (!r.success || (r.score !== undefined && r.score < 0.5)) {
      return { statusCode: 400, body: 'Fallo reCAPTCHA' };
    }

    // 2) Enviar a Google Apps Script (si sigues usando tu WebApp)
    // Guardas la URL en env y NO la expones en el cliente.
    if (process.env.GS_WEBAPP_URL) {
      await fetch(process.env.GS_WEBAPP_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
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

    // 3) Suscribir a Mailchimp vía API (recomendado en vez del <form action>)
    if (process.env.MC_API_KEY && process.env.MC_SERVER_PREFIX && process.env.MC_LIST_ID) {
      const mcServer = process.env.MC_SERVER_PREFIX; // ej. "us14"
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
          tags: ['7325519'] // si quieres mantener tag
        })
      });

      if (!mcRes.ok) {
        const txt = await mcRes.text();
        console.error('Mailchimp error:', txt);
        // no abortamos si solo falla Mailchimp; decide tu política:
        // return { statusCode: 502, body: 'Mailchimp error' };
      }
    }

    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Server error' };
  }
}
