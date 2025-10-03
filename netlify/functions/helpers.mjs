// helpers.mjs
import { v2 as cloudinary } from "cloudinary";
import dayjs from "dayjs";

// Configure Cloudinary from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dvqpndvej",
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function venueFromId(photoId) {
  const p = photoId?.toUpperCase() || "";
  return p.startsWith("KL") ? "ka-moana-luau" : "chiefs-luau";
}

export function candidatePublicIds(photoId, startDateISO) {
  // Always try Month-in-path FIRST, then no-month
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const venue = venueFromId(photoId);
  const start = dayjs(startDateISO || new Date());

  // Try both ID casings to avoid case-sensitivity surprises
  const idsToTry = [photoId, (photoId || "").toUpperCase(), (photoId || "").toLowerCase()]
    .filter((v, i, a) => v && a.indexOf(v) === i);

  const candidates = [];
  for (let d = 0; d < 90; d++) { // look back 90 days
    const date = start.subtract(d, "day");
    const Y = date.format("YYYY");
    const Mtext = MONTHS[date.month()];   // e.g., "September"
    const mdY = date.format("MM.DD.YYYY"); // e.g., "09.28.2025"

    for (const idVariant of idsToTry) {
      // 1) With Month folder (PRIORITY)
      candidates.push(`${venue}/${Y}/${Mtext}/${mdY}/${idVariant}`);
      // 2) Without Month folder (fallback)
      candidates.push(`${venue}/${Y}/${mdY}/${idVariant}`);
    }
  }
  return candidates;
}

export async function resolveExistingPublicId(photoId, startDateISO) {
  const candidates = candidatePublicIds(photoId, startDateISO);

  for (const pubId of candidates) {
    try {
      console.log("Trying public_id:", pubId);
      await cloudinary.api.resource(pubId, { resource_type: "image" });
      console.log("FOUND:", pubId);
      return pubId;
    } catch (e) {
      // continue to next
    }
  }
  console.warn("No match for photoId:", photoId);
  return null;
}
export function neighborIds(photoId) {
  const digits = (photoId.match(/(\d+)$/) || [])[1] || "";
  const prefix = photoId.slice(0, photoId.length - digits.length);
  const n = parseInt(digits || "0", 10);
  return [`${prefix}${n - 1}`, `${prefix}${n + 1}`];
}

export function buildPreviewUrl(publicId) {
  const overlay = "l_overlays:sample_word,fl_tiled,fl_relative,w_1.0,h_1.0,o_60";
  const size    = "q_auto,f_auto,w_1400";
  const cloud   = process.env.CLOUDINARY_CLOUD_NAME || "dvqpndvej";
  return `https://res.cloudinary.com/${cloud}/image/upload/${overlay}/${size}/${publicId}.jpg`;
}

export function buildDownloadUrl(publicId, format = "jpg", minutes = 15) {
  const expiresAt = Math.floor(Date.now() / 1000) + minutes * 60;
  return cloudinary.utils.private_download_url(publicId, format, {
    expires_at: expiresAt,
    type: "upload",
    attachment: true,
  });
}

export function photoSetIdFromPublicId(publicId) {
  return "ps_" + Buffer.from(publicId).toString("base64").slice(0, 16);
}
