// src/utils/localVault.js
const VERSION = "v1";
const PASSPHRASE = "APP_LOCAL_VAULT_v1"; // cámbiala por una propia

function arrToB64(a){ return btoa(String.fromCharCode(...new Uint8Array(a))); }
function b64ToArr(s){ return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

async function deriveKey(passphrase, saltStr){
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt: enc.encode(String(saltStr)), iterations:100000, hash:"SHA-256" },
    baseKey,
    { name:"AES-GCM", length:256 },
    false,
    ["encrypt","decrypt"]
  );
}

export async function encryptLocalPassword(plain, userSalt){
  if(!plain || typeof window==="undefined" || !crypto?.subtle) return "";
  const key = await deriveKey(PASSPHRASE, userSalt || "anon");
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `v1.${arrToB64(iv)}.${arrToB64(ct)}`;
}

export async function decryptLocalPassword(packed, userSalt){
  try{
    if(typeof window==="undefined" || !crypto?.subtle) return "";
    const [v, ivB64, ctB64] = String(packed).split(".");
    if(v!=="v1") return "";
    const key = await deriveKey(PASSPHRASE, userSalt || "anon");
    const pt  = await crypto.subtle.decrypt({ name:"AES-GCM", iv: b64ToArr(ivB64) }, key, b64ToArr(ctB64));
    return new TextDecoder().decode(pt);
  }catch{ return ""; }
}