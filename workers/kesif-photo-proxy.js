/**
 * Private R2 gateway for MVC Keşif photo evidence.
 *
 * Bind KESIF_PHOTOS to the `mvc-kesif-fotograflar` R2 bucket and set the two
 * public Supabase variables in the Worker dashboard.  Authorization is not
 * trusted from the browser: the caller's Supabase JWT is used to query the
 * assignment table, whose RLS policy permits only the assigned personnel or
 * a manager to see the file.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const APP_ORIGIN = "https://mvcyazilim.com";

function cors(request) {
  const origin = request.headers.get("Origin");
  return {
    "access-control-allow-origin": origin === APP_ORIGIN ? origin : APP_ORIGIN,
    "access-control-allow-methods": "GET, PUT, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, content-type, content-length",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function response(body, status, request, headers = {}) {
  return new Response(body, { status, headers: { ...cors(request), ...headers } });
}

function parseKey(url) {
  const match = new URL(url).pathname.match(/^\/files\/([0-9a-f-]{36})\/([a-zA-Z0-9][a-zA-Z0-9._-]{0,150})$/);
  return match ? `kesif/${match[1]}/${match[2]}` : null;
}

async function canAccessFile(request, env, fileId) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const check = await fetch(`${env.SUPABASE_URL}/rest/v1/kesif_dosyalari?id=eq.${fileId}&select=id`, {
    headers: { authorization: auth, apikey: env.SUPABASE_ANON_KEY },
  });
  return check.ok && (await check.json()).length === 1;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return response(null, 204, request);

    const key = parseKey(request.url);
    if (!key) return response("Not found", 404, request);
    const fileId = key.split("/")[1];

    try {
      if (!(await canAccessFile(request, env, fileId))) return response("Unauthorized", 401, request);

      if (request.method === "PUT") {
        const contentType = request.headers.get("content-type") || "";
        const contentLength = Number(request.headers.get("content-length"));
        if (!contentType.startsWith("image/") || !Number.isFinite(contentLength) || contentLength < 1 || contentLength > MAX_IMAGE_BYTES) {
          return response("Only image files up to 10 MB are accepted", 400, request);
        }
        await env.KESIF_PHOTOS.put(key, request.body, {
          httpMetadata: { contentType },
          customMetadata: { uploadedAt: new Date().toISOString(), source: "mvc-kesif" },
        });
        return response(JSON.stringify({ key, url: new URL(request.url).toString() }), 201, request, { "content-type": "application/json" });
      }

      if (request.method === "GET") {
        const object = await env.KESIF_PHOTOS.get(key);
        if (!object) return response("Not found", 404, request);
        const headers = new Headers(cors(request));
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "private, max-age=3600");
        return new Response(object.body, { headers });
      }
      return response("Method not allowed", 405, request);
    } catch (error) {
      console.log(JSON.stringify({ level: "error", message: error instanceof Error ? error.message : "photo gateway failure" }));
      return response("Photo service error", 500, request);
    }
  },
};
