// netlify/functions/gallery.mjs
import {
  resolveExistingPublicId,
  buildPreviewUrl,
  buildDownloadUrl,
  photoSetIdFromPublicId,
} from "./helpers.mjs";

// ---- In-memory entitlement store (OK for demo; use a DB for production)
const MEM = {
  entitlements: new Map(), // photo_set_id -> { free_redeemed, free_asset_public_id, redeemed_at }
  purchases: new Map(),    // photo_set_id -> Set(public_id)
};

function getEntitlements(photo_set_id) {
  return (
    MEM.entitlements.get(photo_set_id) || {
      free_redeemed: 0,
      free_asset_public_id: null,
      redeemed_at: null,
    }
  );
}

function getPurchasedSet(photo_set_id) {
  if (!MEM.purchases.has(photo_set_id)) MEM.purchases.set(photo_set_id, new Set());
  return MEM.purchases.get(photo_set_id);
}

// ---- Main handler
export async function handler(event) {
  try {
    const photoId = event.path.split("/").pop();
    const startDateISO = (event.queryStringParameters || {}).startDateISO;

    // 1) Resolve main public_id (tries Month-in-path first, then without Month)
    const mainPub = await resolveExistingPublicId(photoId, startDateISO);
    if (!mainPub) {
      return { statusCode: 404, body: JSON.stringify({ error: "Photo not found" }) };
    }

    // 2) Entitlements & purchases
    const photo_set_id = photoSetIdFromPublicId(mainPub);
    const ent = getEntitlements(photo_set_id);
    const purchased = getPurchasedSet(photo_set_id);

    const mk = (label, publicId, isMain) => {
      if (!publicId) return null;

      const isFreeAsset = ent.free_redeemed && ent.free_asset_public_id === publicId;
      const isPurchased = purchased.has(publicId);

      let action = { type: "buy", label: "Buy", url: null };
      if (isMain && !ent.free_redeemed) {
        action = { type: "free", label: "Get Free Download", url: null };
      } else if (isFreeAsset || isPurchased) {
        action = { type: "download", label: "Download", url: buildDownloadUrl(publicId) };
      }

      return { label, publicId, previewUrl: buildPreviewUrl(publicId), action };
    };

    // 3) Always include main asset
    const assets = [mk("Main Pose", mainPub, true)].filter(Boolean);

    // 4) Neighbors: ±1 from numeric tail of the ID
    const neighborOffsets = [-1, 1];
    const digits = (photoId.match(/(\d+)$/) || [])[1] || "";
    const prefix = photoId.slice(0, photoId.length - digits.length);

    for (const off of neighborOffsets) {
      const neighborId = `${prefix}${parseInt(digits || "0", 10) + off}`;
      const neighborPub = await resolveExistingPublicId(neighborId, startDateISO);
      if (neighborPub) {
        assets.push(mk(off < 0 ? "Previous pose" : "Next pose", neighborPub, false));
      }
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
      body: JSON.stringify({ photo_set_id, assets, entitlements: ent }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
