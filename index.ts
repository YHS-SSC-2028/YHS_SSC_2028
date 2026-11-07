
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const KIND_DOMAIN = "https://yhsssc2028.kinde.com";
const KIND_AUDIENCE = "yhs-snake";
const JWKS = createRemoteJWKSet(new URL(`${KIND_DOMAIN}/.well-known/jwks`));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return Response.json({ error: "Sign in with Kinde first." }, { status: 401, headers: corsHeaders });
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: KIND_DOMAIN,
      audience: KIND_AUDIENCE,
    });

    const userId = typeof payload.sub === "string" ? payload.sub : "";
    if (!userId) {
      return Response.json({ error: "Token has no user ID." }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const score = Number(body?.score);
    const displayName = String(body?.display_name || "Student")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 40) || "Student";

    if (!Number.isInteger(score) || score < 0 || score > 3210) {
      return Response.json({ error: "Score is outside the allowed range." }, { status: 400, headers: corsHeaders });
    }

    const seasonId = Math.floor(Date.now() / (72 * 60 * 60 * 1000));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase.rpc("submit_snake_score", {
      p_user_id: userId,
      p_display_name: displayName,
      p_score: score,
      p_season_id: seasonId,
    });

    if (error) throw error;
    return Response.json({ ok: true, season_id: seasonId }, { headers: corsHeaders });
  } catch (err) {
    console.error("submit-snake-score:", err);
    return Response.json(
      { error: "Score could not be verified or saved. Check your Kinde API audience and Supabase function setup." },
      { status: 401, headers: corsHeaders },
    );
  }
});
