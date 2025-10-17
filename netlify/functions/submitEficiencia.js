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
        Vary: 'Origin',
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
    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET; // v3 secret

    // --- Body parsing (x-www-form-urlencoded | json) ---
    const rawCT = String(event.headers['content-type'] || '');
    const ct = rawCT.toLowerCase();
    let data = {};
    if (ct.includes('application/json')) {
      try {
        data = JSON.parse(event.body || '{}');
      } catch {
        data = {};
      }
    } else {
      data = Object.fromEntries(new URLSearchParams(event.body || ''));
    }

    console.log('[submitEficiencia] raw data keys:', Object.keys(data));

    // --- Client IP (mejor intento entre varios headers) ---
    const clientIp =
      event.headers['x-nf-client-connection-ip'] ||
      event.headers['x-forwarded-for'] ||
      event.headers['client-ip'] ||
      '';

    // --- reCAPTCHA v3 verification (si hay secret y token) ---
    if (RECAPTCHA_SECRET && data.recaptcha_token) {
      const verifyResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: RECAPTCHA_SECRET,
          response: data.recaptcha_token,
          remoteip: clientIp,
        }),
      });
      const verify = await verifyResp.json().catch(() => ({}));
      console.log('[submitEficiencia] recaptcha result:', {
        success: verify.success,
        score: verify.score,
        hostname: verify.hostname,
        action: verify.action,
      });

      if (!verify.success || (typeof verify.score === 'number' && verify.score < 0.5)) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'reCAPTCHA failed' }),
        };
      }
    } else {
      console.warn('[submitEficiencia] reCAPTCHA not verified (missing SECRET or token).');
    }

    // --- Normalización de campos (acepta front nuevo y merge tags de Mailchimp)
    const name = data.name || data.FNAME || '';
    const email = data.email || data.EMAIL || '';
    const phone = data.phone || data.PHONE || '';
    const puesto = data.puesto || data.PUESTOEMP || '';
    const equipo = data.equipo || data.EQUIPO || '';
    const tipo = data.tipo || data.TIPO || '';
    const mensaje = data.mensaje || data.MENSAJE || '';

    // Estado y Define según tus IDs reales (nuevo form):
    const estado = data.estado || data.MMERGE15 || '';   // mce-MMERGE15
    const define = data.define || data.MMERGE18 || '';   // mce-MMERGE18

    // Compat opcional (si alguna vez te llega el form antiguo vía acción directa de Mailchimp):
    const estadoFallback = data.SELECSTADO || '';
    const defineFallback = data.REQUIERE || '';
    const finalEstado = estado || estadoFallback;
    const finalDefine = define || defineFallback;

    // --- Validación mínima server-side (segunda barrera) ---
    const required = { name, email, phone, puesto, estado: finalEstado, equipo, define: finalDefine, tipo, mensaje };
    const missing = Object.entries(required)
      .filter(([, v]) => !String(v || '').trim())
      .map(([k]) => k);

    if (missing.length) {
      console.warn('[submitEficiencia] missing fields:', missing);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Campos requeridos faltantes', missing }),
      };
    }

    // --- Mapeo a Apps Script (contrato clásico)
    // Tu Code.gs espera: name, email, phone, puesto, estado, requiere, equipo, asesoria, tipo, aditamento, mensaje
    const mapped = {
      name,
      email,
      phone,
      puesto,
      estado: finalEstado,
      requiere: finalDefine, // en el nuevo form se llama "define"
      equipo,
      asesoria: data.ASESORIA || '',   // no viene en el form nuevo, lo dejamos vacío si no existe
      tipo,
      aditamento: data.ADITAMIENT || '', // idem
      mensaje,
    };

    console.log('[submitEficiencia] mapped for GAS:', mapped);

    // --- Forward a Google Apps Script (si está configurado) ---
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
        console.log('[submitEficiencia] GAS response:', forwardCode, (forwardText || '').slice(0, 240));
      } catch (e) {
        forwardStatus = 'failed';
        console.error('[submitEficiencia] GAS forward error:', e);
      }
    } else {
      console.error('[submitEficiencia] APPS_SCRIPT_ENDPOINT_EFICIENCIA no configurado');
    }

    // --- Respuesta al front ---
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
