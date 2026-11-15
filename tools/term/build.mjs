// Builds term-data.js: the hidden machine's files (scrambled, not secure: just keeps View Source spoiler-free),
// hashes of the seven seals and passwords, and the Vault page encrypted with the seven seal words.
//   node tools/term/build.mjs
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFS, BARROW, MOTD, MAIL, ADV_END, SEALS, ROOT_PASSWORD, SSH_PASSWORD } from "./fs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const enc = new TextEncoder();
const b64 = buf => Buffer.from(buf).toString("base64");
const sha = async s => b64(await crypto.subtle.digest("SHA-256", enc.encode("whimsy:" + s)));

// a light scramble: XOR with a short key, then base64. The site reverses it in the browser.
const KEY = enc.encode("wisp-whimsy-forever");
const scramble = obj => {
  const bytes = enc.encode(JSON.stringify(obj));
  return b64(bytes.map((b, i) => b ^ KEY[i % KEY.length]));
};

// the vault: AES-GCM with a key derived from the seven seals, in order, joined by spaces
const PBKDF2_ITERS = 150000;
async function seal(html, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(html));
  return { salt: b64(salt), iv: b64(iv), ct: b64(ct), iters: PBKDF2_ITERS };
}

const data = {
  fs: scramble({ fs: buildFS(), barrow: BARROW, motd: MOTD, mail: MAIL, advEnd: ADV_END }),
  seals: await Promise.all(SEALS.map(sha)),
  root: await sha(ROOT_PASSWORD),
  ssh: await sha(SSH_PASSWORD),
  vault: await seal(readFileSync(join(HERE, "vault.html"), "utf8"), SEALS.join(" ")),
};
writeFileSync(join(ROOT, "term-data.js"),
  "/* Built by tools/term/build.mjs. The hidden machine's files are scrambled and the Vault is encrypted with the seven seals. Good luck. */\n" +
  "window.TWTD=" + JSON.stringify(data) + ";\n");
console.log("term-data.js: %d files, vault %d bytes", Object.keys(buildFS()).length, data.vault.ct.length);
