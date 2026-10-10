// De kluis ontgrendelen en vergrendelen. Gedeeld door de popup en het kluisvenster (unlock/).
// Ontgrendelen: de sleutel van de kluis uitpakken met het wachtwoord of Touch ID, de versleutelde kluis van schijf
// ontsleutelen en samenvoegen met wat er intussen (vergrendeld) is afgeschermd.
(function (root) {
  'use strict';
  const PC = root.PrivacyCrypto;
  const { emptyVault, ensureReady } = root.PrivacyVault;
  const { t } = root.PrivacyI18n;

  // Vraagt Touch ID en geeft de geheime bytes terug die bij deze passkey en dit zout horen (WebAuthn, PRF-uitbreiding).
  async function touchSecret(credId, salt) {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: PC.randomBytes(32),
        allowCredentials: [{ type: 'public-key', id: PC.unb64(credId), transports: ['internal', 'hybrid'] }],
        userVerification: 'required',
        extensions: { prf: { eval: { first: PC.unb64(salt) } } },
      },
    });
    const first = assertion.getClientExtensionResults().prf?.results?.first;
    if (!first) throw new Error(t('msgTouchUnsupported'));
    return new Uint8Array(first);
  }

  async function unlockWith(wrappingKey, wrapped) {
    let rawKey;
    try { rawKey = await PC.decryptBytes(wrappingKey, wrapped); }
    catch { throw new Error(t('msgWrong')); }
    await ensureReady();
    const { vaultEnc } = await chrome.storage.local.get('vaultEnc');
    const { vault: pending } = await chrome.storage.session.get('vault');
    const stored = vaultEnc ? await PC.decryptJSON(await PC.importAesRaw(rawKey), vaultEnc) : emptyVault();
    await chrome.storage.session.set({ key: PC.b64(rawKey), locked: false, vault: PC.mergeVaults(stored, pending) });
  }

  async function protection() {
    const { protect } = await chrome.storage.local.get('protect');
    if (!protect) throw new Error(t('titleOff'));
    return protect;
  }

  async function unlockPassword(password) {
    const { password: p } = await protection();
    await unlockWith(await PC.keyFromPassword(password, p.salt), p.wrapped);
  }

  async function unlockTouch() {
    const { touch } = await protection();
    await unlockWith(await PC.keyFromPrf(await touchSecret(touch.credId, touch.salt)), touch.wrapped);
  }

  // De achtergrond schrijft eerst de laatste wijzigingen versleuteld weg en wist dan de sleutel.
  const lock = () => chrome.runtime.sendMessage({ type: 'pf:lock' });

  root.PrivacyVaultLock = { touchSecret, unlockPassword, unlockTouch, lock };
})(typeof globalThis !== 'undefined' ? globalThis : this);
