// scripts/autopilot.mjs
//
// Modo libre autónomo con aviso previo — decisión de Pablo (2026-09-01):
// "Opción A, pero avisame antes de cada publicación autónoma".
//
// Corre lun/mié/vie (autopilot-cron.yml). Cada corrida:
//   1. Llama a `orchestrator` con { action: "start", mode: "auto" } — el
//      sistema elige un tema (pickAutoTopic), debate Estratega→Creativo→
//      Crítico, y si el Crítico aprueba un post/carrusel lo auto-agenda.
//   2. Si NO aprobó → no pasa nada, se registra "skipped" y listo (se
//      reintenta la próxima corrida, no hay feedback humano que dar).
//   3. Si aprobó → se empuja el scheduled_at a una ventana de veto amplia
//      (hoy 23:00 UTC ≈ 20:00 ART, ~17h desde el cron de las 06:00) y se
//      manda un email a Pablo con la pieza + link para cancelar.
//   4. Si el email NO se puede mandar (RESEND_API_KEY sin configurar, o la
//      API falla) → la pieza se baja a `pending` para que el cron de
//      publicación NO la publique. Nunca se publica algo sin haber avisado.
//
// El cron de publicación real (publish-scheduled-posts.yml, cada 15 min) ya
// existente se encarga de publicarla llegada la hora, salvo que Pablo la
// cancele antes desde /propuestas (status → rejected; isStillScheduled() la
// saltea).

import { logRun, startTimer } from "./lib/run-log.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL || "pabloeckert@gmail.com";
const APP_URL = "https://pabloeckert.github.io/MejoraSM/app";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[autopilot] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Próxima hora preferida (23:00 UTC) con al menos MIN_LEAD_HOURS de ventana.
// 23:00 UTC ≈ 20:00 ART, uno de los bloques que ya usa pickNextSlot.
const MIN_LEAD_HOURS = 10;

function computeVetoSlot(now = new Date()) {
  const slot = new Date(now);
  slot.setUTCHours(23, 0, 0, 0);
  if ((slot.getTime() - now.getTime()) / 3_600_000 < MIN_LEAD_HOURS) {
    slot.setUTCDate(slot.getUTCDate() + 1);
  }
  return slot;
}

function fmtART(date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function supa(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendAlertEmail({ proposalId, topic, oferta, proposal, slot }) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no configurada");
  }
  const reviewUrl = `${APP_URL}/#/propuestas?id=${proposalId}`;
  const hook = proposal?.hook || topic;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:13px;color:#666;margin:0 0 4px">MejoraSM · publicación autónoma</p>
      <h2 style="margin:0 0 12px;font-size:18px">Se va a publicar sola ${esc(fmtART(slot))} (hora Argentina)</h2>
      <p style="margin:0 0 16px;font-size:14px">Tema elegido por el sistema · dimensión <b>${esc(oferta || "—")}</b> · formato <b>${esc(proposal?.format || "post")}</b></p>
      <div style="border:1px solid #e2e2e6;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.5">
        <p style="margin:0 0 8px"><b>Hook:</b> ${esc(hook)}</p>
        ${proposal?.body ? `<p style="margin:0 0 8px"><b>Cuerpo:</b> ${esc(proposal.body)}</p>` : ""}
        ${proposal?.cta ? `<p style="margin:0 0 8px"><b>CTA:</b> ${esc(proposal.cta)}</p>` : ""}
        ${Array.isArray(proposal?.hashtags) && proposal.hashtags.length ? `<p style="margin:0;color:#666">${esc(proposal.hashtags.join(" "))}</p>` : ""}
      </div>
      <p style="margin:18px 0 6px;font-size:14px">Si no hacés nada, sale a la hora de arriba.</p>
      <a href="${reviewUrl}" style="display:inline-block;background:#1A3D84;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Revisar o cancelar</a>
      <p style="margin:16px 0 0;font-size:12px;color:#999">El Crítico ya la evaluó contra el criterio de marca. Este aviso es para tu ojo, no para el de marca.</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "MejoraSM <onboarding@resend.dev>",
      to: [ALERT_EMAIL],
      subject: `MejoraSM · se publica sola ${fmtART(slot)}: "${String(proposal?.hook || topic).slice(0, 70)}"`,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function main() {
  const elapsed = startTimer();

  // 1. Modo libre vía orchestrator (service role — el EDA está cerrado).
  const res = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "start", mode: "auto" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`orchestrator ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  const { proposalId, aprobado, autoTopic, oferta, proposal } = data;
  console.log(`[autopilot] tema: "${autoTopic}" · aprobado: ${aprobado} · proposalId: ${proposalId}`);

  // 2. El Crítico no aprobó (o no se creó propuesta) → nada que publicar.
  if (!aprobado || !proposalId) {
    await logRun({
      source: "autopilot",
      step: "run",
      status: "skipped",
      durationMs: elapsed(),
      metadata: { autoTopic, aprobado: !!aprobado, reason: "critico no aprobo" },
    });
    console.log("[autopilot] El Crítico no aprobó — nada que hacer.");
    return;
  }

  // 3. Aprobada. Empujar a la ventana de veto.
  const slot = computeVetoSlot();
  const patch = await supa(`/rest/v1/proposals?id=eq.${proposalId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ scheduled_at: slot.toISOString() }),
  });
  if (!patch.ok) {
    throw new Error(`No se pudo reprogramar la propuesta: ${patch.status} ${await patch.text()}`);
  }

  // 4. Avisar. Si el email falla, bajar a pending para no publicar sin aviso.
  try {
    await sendAlertEmail({ proposalId, topic: autoTopic, oferta, proposal, slot });
  } catch (mailErr) {
    await supa(`/rest/v1/proposals?id=eq.${proposalId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "pending", scheduled_at: null }),
    });
    await logRun({
      source: "autopilot",
      step: "run",
      status: "error",
      proposalId,
      durationMs: elapsed(),
      error: `Aviso falló, pieza dejada en pending: ${mailErr.message}`,
      metadata: { autoTopic, oferta },
    });
    console.error(`[autopilot] No se pudo avisar (${mailErr.message}). Pieza ${proposalId} bajada a pending.`);
    process.exit(1);
  }

  await logRun({
    source: "autopilot",
    step: "run",
    status: "success",
    proposalId,
    durationMs: elapsed(),
    metadata: { autoTopic, oferta, scheduledAt: slot.toISOString(), format: proposal?.format },
  });
  console.log(`[autopilot] Avisado. Se publica ${slot.toISOString()} salvo cancelación.`);
}

main().catch(async (e) => {
  await logRun({ source: "autopilot", step: "run", status: "error", error: e.message });
  console.error("[autopilot] Error:", e.message);
  process.exit(1);
});
