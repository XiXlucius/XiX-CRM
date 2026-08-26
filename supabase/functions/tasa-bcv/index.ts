// ============================================================
// Lee la tasa oficial del BCV y la guarda en `exchange_rates`.
//
// Por qué vive en el servidor y no en el navegador: bcv.org.ve no
// tiene API, hay que leer el HTML, y el navegador no puede hacerlo
// por CORS. Además su certificado TLS suele estar mal configurado,
// así que aquí se desactiva la verificación a propósito — es una
// página pública de solo lectura, no se envía nada sensible.
//
// Se puede llamar de dos formas:
//   GET  -> lee el BCV y guarda la tasa del día
//   POST -> { usd_to_ves, eur_to_ves } guarda una tasa a mano
//           (respaldo para cuando el BCV cambie su página)
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** El BCV publica los números en formato venezolano: 36.170,25
 *  El punto es separador de miles y la coma es decimal. */
function parseNumeroVE(txt: string): number | null {
  const limpio = txt.trim().replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrae una divisa del HTML. El BCV la marca así:
 *  <div id="dolar"> ... <strong> 36,17 </strong> ... </div> */
function extraerDivisa(html: string, id: string): number | null {
  const bloque = new RegExp(`id=["']${id}["'][\\s\\S]{0,600}?<strong>([\\s\\S]*?)</strong>`, "i");
  const m = bloque.exec(html);
  if (!m) return null;
  return parseNumeroVE(m[1].replace(/<[^>]*>/g, ""));
}

function hoyCaracas(): string {
  // Venezuela es UTC-4 y no cambia de horario. Se calcula así para que
  // "hoy" sea el día venezolano, no el del servidor.
  const ahora = new Date();
  const caracas = new Date(ahora.getTime() - 4 * 60 * 60 * 1000);
  return caracas.toISOString().slice(0, 10);
}

async function leerBCV(): Promise<{ usd: number; eur: number | null }> {
  // El BCV tiene el certificado mal configurado desde hace años.
  const client = Deno.createHttpClient
    ? Deno.createHttpClient({ caCerts: [] })
    : undefined;

  const res = await fetch("https://www.bcv.org.ve/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; XiXCRM/1.0)" },
    // @ts-ignore: `client` solo existe en Deno con --unstable-http
    client,
  });
  if (!res.ok) throw new Error(`El BCV respondió ${res.status}`);
  const html = await res.text();

  const usd = extraerDivisa(html, "dolar");
  const eur = extraerDivisa(html, "euro");
  if (!usd) throw new Error("No se encontró la tasa del dólar en la página del BCV");
  return { usd, eur };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    let usd: number;
    let eur: number | null = null;
    let source = "bcv";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const manualUsd = Number(body.usd_to_ves);
      if (!Number.isFinite(manualUsd) || manualUsd <= 0) {
        return new Response(
          JSON.stringify({ error: "usd_to_ves debe ser un número mayor que cero" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      usd = manualUsd;
      const manualEur = Number(body.eur_to_ves);
      eur = Number.isFinite(manualEur) && manualEur > 0 ? manualEur : null;
      source = "manual";
    } else {
      const leido = await leerBCV();
      usd = leido.usd;
      eur = leido.eur;
    }

    const rate_date = hoyCaracas();

    // upsert: si ya se leyó hoy, se actualiza en vez de duplicar.
    const { data, error } = await supabase
      .from("exchange_rates")
      .upsert(
        { rate_date, source, usd_to_ves: usd, eur_to_ves: eur, org_id: null },
        { onConflict: "org_id,rate_date,source" },
      )
      .select("*")
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, rate: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
