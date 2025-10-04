// helpers.mjs
import { v2 as cloudinary } from "cloudinary";
import dayjs from "dayjs";

// Configure Cloudinary Admin SDK from Netlify env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// (Optional) shows up in Netlify function logs
console.log("Cloudinary ready for:", process.env.CLOUDINARY_CLOUD_NAME);

// Month names for the “/September/09.28.2025/” folder segment
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Chiefs = CH..., Ka Moana = KL...
export function venueFromId(photoId) {
  const p = (photoId || "").toUpperCase();
  return p.startsWith("KL") ? "ka-moana-luau" : "chiefs-luau";
}

// Build all plausible public_id paths (Month-in-path FIRST, then no-month)
export function candidatePublicIds(photoId, startDateISO) {
  const venue = venueFromId(photoId);
  const start = dayjs(startDateISO || new Date());

  // Try both casings to avoid surprises
  const idsToTry = [photoId, (photoId || "").toUpperCase(), (photoId || "").toLowerCase()]
    .filter((v, i, a) => v && a.indexOf(v) === i);

  const candidates = [];
  for (let d = 0; d < 90; d++) { // look back 90 days
    const date = start.subtract(d, "day");
    const Y    = date.format("YYYY");
    const Mtxt = MONTHS[date.month()];     // e.g., "September"
    const mdY  = date.format("MM.DD.YYYY"); // e.g., "09.28.2025"

    for (const idVariant of idsToTry) {
      // Priority: with Month folder
      candidates.push(`${venue}/${Y}/${Mtxt}/${mdY}/${idVariant}`);
      // Fallback: without Month folder
      candidates.push(`${venue}/${Y}/${mdY}/${idVariant}`);
    }
  }
  return candidates;
}

// Find the first existing asset in Cloudinary Admin API
export async function resolveExistingPublicId(photoId, startDateISO) {
  const candidates = candidatePublicIds(photoId, startDateISO);

  for (const pubId of candidates) {
    try {
      console.log("Trying public_id:", pubId);
      // Include type: "upload" since your folders are under the upload type
      await cloudinary.api.resource(pubId, { resource_type: "image", type: "upload" });
      console.log("FOUND:", pubId);
      return pubId;
    } catch (e) {
      console.warn(
        "FAIL:",
        pubId,
        "| code:", e?.http_code ?? e?.status ?? e?.statusCode ?? "?",
        "| message:", e?.message
      );
      // keep trying
    }
  }

  console.warn("No match for photoId:", photoId);
  return null;
}

// Adjacent numeric IDs (e.g., ...1007 → 1006, 1008)
export function neighborIds(photoId) {
  const digits = (photoId.match(/(\d+)$/) || [])[1] || "";
  const prefix = photoId.slice(0, photoId.length - digits.length);
  const n = parseInt(digits || "0", 10);
  return [`${prefix}${n - 1}`, `${prefix}${n + 1}`];
}

// SAMPLE tiled watermark preview URL
export function buildPreviewUrl(publicId) {
  const overlay = "l_overlays:sample_word,fl_tiled,fl_relative,w_1.0,h_1.0,o_60";
  const size    = "q_auto,f_auto,w_1400";
  const cloud   = process.env.CLOUDINARY_CLOUD_NAME; // use your env cloud
  return `https://res.cloudinary.com/${cloud}/image/upload/${overlay}/${size}/${publicId}.jpg`;
}

// Short-lived, force-download URL for the original
export function buildDownloadUrl(publicId, format = "jpg", minutes = 15) {
  const expiresAt = Math.floor(Date.now() / 1000) + minutes * 60;
  return cloudinary.utils.private_download_url(publicId, format, {
    expires_at: expiresAt,
    type: "upload",
    attachment: true,
  });
}

// Stable id for “entitlements” map (in-memory/demo)
export function photoSetIdFromPublicId(publicId) {
  return "ps_" + Buffer.from(publicId).toString("base64").slice(0, 16);
}
