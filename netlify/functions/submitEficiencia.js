// netlify/functions/submitEficiencia.js
/* eslint-disable no-console */

exports.handler = async (event) => {
  // --- CORS / preflight ---
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
      },
      body: '',
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'Method Not Allowed',
      };
    }

    // --- ENV secrets ---
    const APPS_SCRIPT_ENDPOINT_EFICIENCIA = process.env.APPS_SCRIPT_ENDPOINT_EFICIENCIA; // URL /exec
    const RECAPTCHA_SECRET     = process.env.RECAPTCHA_SECRET;     // secret v3

    // --- Parse body (x-www-form-urlencoded | json) ---
    const ct = (event.headers['content-type'] || '').toLowerCase();
    let data = {};
    if (ct.includes('application/json')) {
      try { data = JSON.parse(event.body || '{}'); }
      catch { data = {}; }
    } else {
      data = Object.fromEntries(new URLSearchParams(event.body || ''));
    }

    console.log('[submitEficiencia] raw data:', data);

    // 1) Verificar reCAPTCHA (si hay secret y token)
    if (RECAPTCHA_SECRET && data.recaptcha_token) {
      const verifyResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: RECAPTCHA_SECRET,
          response: data.recaptcha_token,
          remoteip: event.headers['x-forwarded-for'] || '',
        }),
      });
      const verify = await verifyResp.json().catch(() => ({}));
      console.log('[submitEficiencia] recaptcha:', verify);

      if (!verify.success || (typeof verify.score === 'number' && verify.score < 0.5)) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ ok: false, error: 'reCAPTCHA failed' }),
        };
      }
    } else {
      console.warn('[submitEficiencia] reCAPTCHA not verified (missing SECRET or token).');
    }

    // 2) Normalizar / aceptar ambas variantes de formulario (A y B)
    // Front actual envía: name, email, phone, puesto, estado, equipo, define, tipo, mensaje
    // También damos soporte si llega con merge tags Mailchimp (FNAME, EMAIL, PHONE, etc.)
    const name    = data.name        || data.FNAME       || '';
    const email   = data.email       || data.EMAIL       || '';
    const phone   = data.phone       || data.PHONE       || '';
    const puesto  = data.puesto      || data.PUESTOEMP   || '';
    const equipo  = data.equipo      || data.EQUIPO      || '';
    const tipo    = data.tipo        || data.TIPO        || '';
    const mensaje = data.mensaje     || data.MENSAJE     || '';

    // estado: preferir MMERGE15 (nuevo) y si no, SELECSTADO (original) o el campo normalizado
    const estado  = data.estado || data.MMERGE15 || data.SELECSTADO || '';

    // define: preferir MMERGE18 (nuevo) y si no, REQUIERE (original) o el campo normalizado
    const define  = data.define || data.MMERGE18 || data.REQUIERE || '';

    // (opcionales en el form original; mantenemos compatibilidad con tu Apps Script)
    const asesoria   = data.ASESORIA   || '';
    const aditamento = data.ADITAMIENT || '';

    // 2.1) Validaciones mínimas server-side (el front ya valida, esto es segunda barrera)
    const required = { name, email, phone, puesto, estado, equipo, define, tipo, mensaje };
    const missing = Object.entries(required).filter(([,v]) => !String(v || '').trim()).map(([k]) => k);
    if (missing.length) {
      console.warn('[submitEficiencia] missing fields:', missing);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: 'Campos requeridos faltantes', missing }),
      };
    }

    // 3) Mapear -> lo que tu Google Apps Script espera (compat vieja y nueva)
    // Tu Code.gs clásico: params.name, params.email, params.phone, params.puesto,
    // params.estado, params.requiere, params.equipo, params.asesoria, params.tipo,
    // params.aditamento, params.mensaje
    const mapped = {
      name,
      email,
      phone,
      puesto,
      estado,
      requiere: define,   // en nuevo form se llama "define"
      equipo,
      asesoria,           // si no viene, quedará vacío
      tipo,
      aditamento,         // si no viene, quedará vacío
      mensaje,
    };

    console.log('[submitEficiencia] mapped ->', mapped);

    // 4) Reenviar a Google Apps Script (si está configurado)
    let forwardStatus = 'skipped';
    let forwardCode = 0;
    let forwardText = '';

    if (APPS_SCRIPT_ENDPOINT_EFICIENCIA) {
      try {
        const res = await fetch(APPS_SCRIPT_ENDPOINT_EFICIENCIA, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(mapped).toString(),
        });
        forwardCode = res.status;
        forwardText = await res.text().catch(() => '');
        forwardStatus = 'sent';
        console.log('[submitEficiencia] GAS response:', forwardCode, forwardText.slice(0, 240));
      } catch (e) {
        forwardStatus = 'failed';
        console.error('[submitEficiencia] GAS forward error:', e);
      }
    } else {
      console.error('[submitEficiencia] APPS_SCRIPT_ENDPOINT_EFICIENCIA no configurado');
    }

    // 5) Respuesta al front
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: true,
        forwarded: forwardStatus,
        gas_status: forwardCode,
      }),
    };
  } catch (err) {
    console.error('[submitEficiencia] error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Server error' }),
    };
  }
};
