// netlify/functions/submit.js
exports.config = { path: "/api/submit" };

// Si NO quieres usar variables de entorno, deja estos 4 valores hardcodeados:
const MC_FALLBACK = {
  // URL base del action (sin query):
  POST_URL: "https://xilinslp.us14.list-manage.com/subscribe/post",
  // Los mismos params que ya usas en tu <form action="...">
  U:   "c94b27e74f56092fcbb938573",
  ID:  "7e912b06e1",
  FID: "00059ce1f0", // opcional (si Mailchimp lo pide)
};

// Opcional: tags por env “MC_TAGS=Leads,Web”
function tagsFromEnv() {
  const raw = process.env.MC_TAGS || "";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => ({ name, status: "active" }));
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // ---- Parse body (x-www-form-urlencoded | json) ----
    const ct = event.headers["content-type"] || "";
    let data = {};
    if (ct.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else {
      data = Object.fromEntries(new URLSearchParams(event.body || ""));
    }

    const {
      FNAME, EMAIL, PHONE, SELECSTADO, PUESTOEMP, REQUIERE, EQUIPO,
      ASESORIA, TIPO, ADITAMIENT, MENSAJE, recaptcha_token
    } = data;

    // ---- 1) reCAPTCHA v3 ----
    if (!process.env.RECAPTCHA_SECRET) {
      console.warn("RECAPTCHA_SECRET no configurado; se omite verificación.");
    } else {
      const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET,
          response: recaptcha_token || ""
        })
      }).then(r => r.json());

      if (!verify.success || (verify.score !== undefined && verify.score < 0.5)) {
        return { statusCode: 400, body: "Fallo reCAPTCHA" };
      }
    }

    // ---- 2) Google Sheets (opcional, si tienes GS_WEBAPP_URL en env) ----
    if (process.env.GS_WEBAPP_URL) {
      await fetch(process.env.GS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          name: FNAME, email: EMAIL, phone: PHONE, puesto: PUESTOEMP,
          estado: SELECSTADO, requiere: REQUIERE, equipo: EQUIPO,
          asesoria: ASESORIA, tipo: TIPO, aditamento: ADITAMIENT, mensaje: MENSAJE
        })
      });
    }

    // ---- 3) MAILCHIMP ----
    const hasMCEnv = !!(process.env.MC_API_KEY && process.env.MC_SERVER_PREFIX && process.env.MC_LIST_ID);

    if (hasMCEnv) {
      // === Camino A: API oficial (upsert) ===
      const mcServer = process.env.MC_SERVER_PREFIX; // ej: "us14"
      const mcListId = process.env.MC_LIST_ID;

      const emailLc = (EMAIL || "").trim().toLowerCase();
      const crypto = require("crypto");
      const subscriberHash = crypto.createHash("md5").update(emailLc).digest("hex");

      // Upsert con PUT
      const memberUrl = `https://${mcServer}.api.mailchimp.com/3.0/lists/${mcListId}/members/${subscriberHash}`;
      const authHeader = { "Authorization": `apikey ${process.env.MC_API_KEY}` };

      const upsertBody = {
        email_address: emailLc,
        status_if_new: "subscribed", // usa "pending" si tienes double opt-in
        status: "subscribed",
        merge_fields: {
          FNAME: FNAME || "",
          PHONE: PHONE || "",
          PUESTOEMP: PUESTOEMP || "",
          ESTADO: SELECSTADO || "",
          REQUIERE: REQUIERE || "",
          EQUIPO: EQUIPO || "",
          ASESORIA: ASESORIA || "",
          TIPO: TIPO || "",
          ADITAMIENT: ADITAMIENT || "",
          MENSAJE: MENSAJE || ""
        }
      };

      const upsertRes = await fetch(memberUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(upsertBody)
      });

      if (!upsertRes.ok) {
        const txt = await upsertRes.text();
        console.error("Mailchimp upsert error:", upsertRes.status, txt);
        // si quieres abortar en error, retorna 502 aquí
      } else {
        const tags = tagsFromEnv();
        if (tags.length) {
          const tagsRes = await fetch(`${memberUrl}/tags`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify({ tags })
          });
          if (!tagsRes.ok) {
            const t = await tagsRes.text();
            console.error("Mailchimp tags error:", tagsRes.status, t);
          }
        }
      }
    } else {
      // === Camino B: Fallback sin variables (POST al action del form) ===
      const url = new URL(MC_FALLBACK.POST_URL);
      url.searchParams.set("u", MC_FALLBACK.U);
      url.searchParams.set("id", MC_FALLBACK.ID);
      if (MC_FALLBACK.FID) url.searchParams.set("f_id", MC_FALLBACK.FID);

      // Mailchimp espera los mismos nombres de campos
      const formBody = new URLSearchParams({
        EMAIL: EMAIL || "",
        FNAME: FNAME || "",
        PHONE: PHONE || "",
        PUESTOEMP: PUESTOEMP || "",
        SELECSTADO: SELECSTADO || "",
        REQUIERE: REQUIERE || "",
        EQUIPO: EQUIPO || "",
        ASESORIA: ASESORIA || "",
        TIPO: TIPO || "",
        ADITAMIENT: ADITAMIENT || "",
        MENSAJE: MENSAJE || ""
      });

      const mcRes = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody
      });

      if (!mcRes.ok) {
        const txt = await mcRes.text();
        console.error("Mailchimp fallback error:", mcRes.status, txt);
      }
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
};
