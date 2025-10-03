// netlify/functions/gallery.mjs
import { resolveExistingPublicId, neighborIds, buildPreviewUrl, buildDownloadUrl, photoSetIdFromPublicId } from "./helpers.mjs";

// In-memory entitlement store (Netlify function instance — fine for demo; move to DB for production)
const MEM = {
  entitlements: new Map(), // photo_set_id -> { free_redeemed, free_asset_public_id, redeemed_at }
  purchases: new Map(),    // photo_set_id -> Set(public_id)
};

function getEntitlements(photo_set_id) {
  return MEM.entitlements.get(photo_set_id) || { free_redeemed: 0, free_asset_public_id: null, redeemed_at: null };
}
function getPurchasedSet(photo_set_id) {
  if (!MEM.purchases.has(photo_set_id)) MEM.purchases.set(photo_set_id, new Set());
  return MEM.purchases.get(photo_set_id);
}

export async function handler(event) {
  try {
    const photoId = event.path.split("/").pop();
    const startDateISO = (event.queryStringParameters || {}).startDateISO;

    const mainPub = await resolveExistingPublicId(photoId, startDateISO);
    if (!mainPub) return { statusCode: 404, body: JSON.stringify({ error: "Photo not found" }) };

    const [leftId, rightId] = neighborIds(photoId);
    const [leftPub, rightPub] = await Promise.all([
      resolveExistingPublicId(leftId, startDateISO),
      resolveExistingPublicId(rightId, startDateISO),
    ]);

    const photo_set_id = photoSetIdFromPublicId(mainPub);
    const ent = getEntitlements(photo_set_id);
    const purchased = getPurchasedSet(photo_set_id);

    const mk = (label, publicId, isMain) => {
      if (!publicId) return null;
      const isFreeAsset = ent.free_redeemed && ent.free_asset_public_id === publicId;
      const isPurchased = purchased.has(publicId);

      let action = { type: "buy", label: "Buy", url: null };
      if (!ent.free_redeemed && isMain) {
        action = { type: "free", label: "Get Free Download", url: null };
      } else if (isFreeAsset || isPurchased) {
        action = { type: "download", label: "Download", url: buildDownloadUrl(publicId) };
      }

      return { label, publicId, previewUrl: buildPreviewUrl(publicId), action };
    };

    const assets = [ mk("Main Pose", mainPub, true), mk("Other Pose", leftPub, false), mk("Other Pose", rightPub, false) ].filter(Boolean);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ photo_set_id, assets, entitlements: ent })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
