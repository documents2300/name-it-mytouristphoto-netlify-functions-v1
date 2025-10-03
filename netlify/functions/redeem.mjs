// netlify/functions/redeem.mjs
import { resolveExistingPublicId, buildDownloadUrl, photoSetIdFromPublicId } from "./helpers.mjs";

// In-memory entitlement store (same instance as other functions is not guaranteed across invocations;
// for production use a DB like Supabase, Planetscale, DynamoDB, or Fauna).
const MEM = {
  entitlements: new Map(), // photo_set_id -> { free_redeemed, free_asset_public_id, redeemed_at }
};

function getEntitlements(photo_set_id) {
  return MEM.entitlements.get(photo_set_id) || { free_redeemed: 0, free_asset_public_id: null, redeemed_at: null };
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const body = JSON.parse(event.body || "{}");
    const { photoId, publicId } = body;
    if (!photoId || !publicId) return { statusCode: 400, body: JSON.stringify({ error: "photoId and publicId required" }) };

    const mainPub = await resolveExistingPublicId(photoId);
    if (!mainPub) return { statusCode: 404, body: JSON.stringify({ error: "Photo not found" }) };

    const photo_set_id = photoSetIdFromPublicId(mainPub);
    const ent = getEntitlements(photo_set_id);
    if (ent.free_redeemed) return { statusCode: 403, body: JSON.stringify({ error: "Free already redeemed" }) };

    MEM.entitlements.set(photo_set_id, {
      free_redeemed: 1,
      free_asset_public_id: publicId,
      redeemed_at: new Date().toISOString(),
    });

    const downloadUrl = buildDownloadUrl(publicId);
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ photo_set_id, downloadUrl })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
