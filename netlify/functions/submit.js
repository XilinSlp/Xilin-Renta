// netlify/functions/submit.js
exports.config = { path: "/api/submit" };

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // --- ENV secrets ---
    const APPS_SCRIPT_ENDPOINT = process.env.APPS_SCRIPT_ENDPOINT; // URL /exec
    const RECAPTCHA_SECRET     = process.env.RECAPTCHA_SECRET;     // secret v3

    // --- Parse body (x-www-form-urlencoded | json) ---
    const ct = (event.headers["content-type"] || "").toLowerCase();
    let data = {};
    if (ct.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else {
      data = Object.fromEntries(new URLSearchParams(event.body || ""));
    }

    console.log("[/api/submit] body parsed:", data);

    // 1) Verificar reCAPTCHA (si hay secret y token)
    if (RECAPTCHA_SECRET && data.recaptcha_token) {
      const verifyResp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: RECAPTCHA_SECRET,
          response: data.recaptcha_token,
          remoteip: event.headers["x-forwarded-for"] || ""
        })
      });
      const verify = await verifyResp.json();
      console.log("[/api/submit] recaptcha:", verify);
      if (!verify.success || (typeof verify.score === "number" && verify.score < 0.5)) {
        return { statusCode: 400, body: "Fallo reCAPTCHA" };
      }
    } else {
      console.warn("[/api/submit] reCAPTCHA no verificado (falta SECRET o token).");
    }

    // 2) Mapear -> lo que tu Google Apps Script espera
    //    Tu Code.gs hace: params.name, params.email, params.phone, params.puesto, params.estado,
    //                     params.requiere, params.equipo, params.asesoria, params.tipo,
    //                     params.aditamento, params.mensaje
    const mapped = {
      name:       data.FNAME       || "",
      email:      data.EMAIL       || "",
      phone:      data.PHONE       || "",
      puesto:     data.PUESTOEMP   || "",
      estado:     data.SELECSTADO  || "",
      requiere:   data.REQUIERE    || "",
      equipo:     data.EQUIPO      || "",
      asesoria:   data.ASESORIA    || "",
      tipo:       data.TIPO        || "",
      aditamento: data.ADITAMIENT  || "",
      mensaje:    data.MENSAJE     || ""
      // tu Apps Script ya agrega "landing" fijo; no es necesario mandarlo
    };

    console.log("[/api/submit] mapped ->", mapped);

    // 3) Reenviar a Google Apps Script
    if (!APPS_SCRIPT_ENDPOINT) {
      console.error("[/api/submit] APPS_SCRIPT_ENDPOINT no configurado");
    } else {
      const forwardBody = new URLSearchParams(mapped).toString();
      const res = await fetch(APPS_SCRIPT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: forwardBody
      });

      let txt = "";
      try { txt = await res.text(); } catch {}
      console.log("[/api/submit] GAS response:", res.status, txt.slice(0, 200));
      // Aunque falle GAS, Mailchimp ya recibió por action → no rompemos UX.
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("[/api/submit] error:", err);
    return { statusCode: 500, body: "Server error" };
  }
};
