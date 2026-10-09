// Kamelo — versleuteling van de kluis (Web Crypto, draait in browser én Node).
//
// Opbouw:
//  - De kluis wordt versleuteld met één willekeurige sleutel K (AES-GCM 256).
//  - K zelf wordt "ingepakt" met een sleutel die alleen jij kunt maken:
//      · via Touch ID: de passkey levert met de PRF-uitbreiding steeds dezelfde geheime 32 bytes,
//        die het apparaat nooit verlaten; daar maken we met HKDF een sleutel van;
//      · via een eigen wachtwoord: PBKDF2-SHA256 met 600.000 rondes.
//  - Ontgrendeld staat K alleen in het werkgeheugen van Chrome (chrome.storage.session).
(function (root) {
  'use strict';
  const subtle = root.crypto.subtle;
  const enc = new TextEncoder(), dec = new TextDecoder();

  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
  const randomBytes = n => root.crypto.getRandomValues(new Uint8Array(n));

  const importAesRaw = raw => subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

  async function encryptBytes(key, bytes) {
    const iv = randomBytes(12);
    const data = await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
    return { iv: b64(iv), data: b64(data) };
  }
  async function decryptBytes(key, { iv, data }) {
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(data)));
  }

  const encryptJSON = async (key, obj) => encryptBytes(key, enc.encode(JSON.stringify(obj)));
  const decryptJSON = async (key, box) => JSON.parse(dec.decode(await decryptBytes(key, box)));

  // Inpaksleutel uit een wachtwoord.
  async function keyFromPassword(password, salt) {
    const base = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: 600000 },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  // Inpaksleutel uit de geheime bytes die Touch ID (WebAuthn PRF) teruggeeft.
  async function keyFromPrf(prfBytes) {
    const base = await subtle.importKey('raw', prfBytes, 'HKDF', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode('privacyfilter-kluis-v1') },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  // Voegt kluisregels die tijdens het vergrendelen zijn gemaakt samen met de ontsleutelde kluis.
  // Placeholders botsen niet, omdat de tellers ook vergrendeld doorlopen.
  function mergeVaults(stored, pending) {
    const out = {
      byKey: { ...(stored.byKey || {}) }, byPlaceholder: { ...(stored.byPlaceholder || {}) },
      counters: { ...(stored.counters || {}) }, lastUsed: { ...(stored.lastUsed || {}) }, sites: { ...(stored.sites || {}) },
    };
    if (!pending) return out;
    for (const [ph, value] of Object.entries(pending.byPlaceholder || {})) {
      if (!(ph in out.byPlaceholder)) out.byPlaceholder[ph] = value;
      if (pending.lastUsed?.[ph]) out.lastUsed[ph] = Math.max(out.lastUsed[ph] || 0, pending.lastUsed[ph]);
      if (pending.sites?.[ph] !== undefined && out.sites[ph] === undefined) out.sites[ph] = pending.sites[ph];
    }
    for (const [key, ph] of Object.entries(pending.byKey || {})) if (!(key in out.byKey)) out.byKey[key] = ph;
    for (const [type, n] of Object.entries(pending.counters || {})) out.counters[type] = Math.max(out.counters[type] || 0, n);
    return out;
  }

  const api = {
    b64, unb64, randomBytes, importAesRaw, encryptBytes, decryptBytes, encryptJSON, decryptJSON,
    keyFromPassword, keyFromPrf, mergeVaults,
  };
  root.PrivacyCrypto = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
