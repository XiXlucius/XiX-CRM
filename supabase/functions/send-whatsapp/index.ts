import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize phone (remove non-digits, keep leading country code)
    const normalized = phone.replace(/[^0-9]/g, "");

    // Log the message to the audit table for traceability
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData.user?.id;

    if (userId) {
      await supabase.from("audit_log").insert({
        user_id: userId,
        user_email: userData.user?.email ?? "",
        action: "send_whatsapp",
        entity: "message",
        entity_id: normalized,
        new_value: { phone: normalized, message, channel: "whatsapp" },
      });
    }

    // If a WhatsApp API token is configured, send via the Cloud API.
    // Otherwise, return a wa.me link so the frontend can open the chat.
    const waToken = Deno.env.get("WHATSAPP_TOKEN");
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (waToken && waPhoneId) {
      const fbRes = await fetch(
        `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${waToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: normalized,
            type: "text",
            text: { body: message },
          }),
        },
      );
      if (!fbRes.ok) {
        const errBody = await fbRes.text();
        return new Response(
          JSON.stringify({ error: "WhatsApp API error", detail: errBody }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const fbData = await fbRes.json();
      return new Response(
        JSON.stringify({ success: true, provider: "meta", messageId: fbData.messages?.[0]?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // No API token configured — return a wa.me deep link
    const waLink = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    return new Response(
      JSON.stringify({ success: true, provider: "deep_link", link: waLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
