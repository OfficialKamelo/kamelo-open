// Kamelo — kluis beveiligen, ontgrendelen en vergrendelen (Touch ID of eigen wachtwoord).
// Deze pagina opent in een eigen venster: een extensie-popup sluit zodra Touch ID om je vingerafdruk vraagt.
const PC = globalThis.PrivacyCrypto;
const L = globalThis.PrivacyVaultLock;
const { t, applyI18n } = globalThis.PrivacyI18n;
const $ = id => document.getElementById(id);
const { emptyVault } = globalThis.PrivacyVault;
const MIN_PASSWORD = 8;

function say(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}

async function state() {
  await PrivacyVault.ensureReady();
  const { protect, vaultEnc } = await chrome.storage.local.get(['protect', 'vaultEnc']);
  const { key, vault } = await chrome.storage.session.get(['key', 'vault']);
  return { protect, vaultEnc, key, vault };
}

// Toont de juiste toestand; bij een fout een duidelijke melding in plaats van eeuwig "Laden…".
async function render() {
  try { await renderState(); }
  catch (err) {
    $('title').textContent = t('titleError');
    $('subtitle').textContent = err?.message || String(err);
  }
}

async function renderState() {
  const { protect, key } = await state();
  const mode = !protect ? 'off' : key ? 'open' : 'locked';
  for (const m of ['off', 'locked', 'open']) $(`state-${m}`).hidden = m !== mode;
  $('lockIcon').classList.toggle('open', mode !== 'locked');
  const methods = [protect?.touch && t('methodTouch'), protect?.password && t('methodPassword')].filter(Boolean).join(` ${t('and')} `);
  $('title').textContent = { off: t('titleOff'), locked: t('titleLocked'), open: t('titleOpen') }[mode];
  $('subtitle').textContent = {
    off: t('subOff'),
    locked: t('subLocked', { methods }),
    open: t('subOpen', { methods }),
  }[mode];
  if (mode === 'locked') {
    $('unlockTouchGroup').hidden = !protect.touch;
    $('unlockPasswordForm').hidden = !protect.password;
  }
  if (mode === 'open') {
    $('addTouch').hidden = !!protect.touch;
    $('showAddPassword').hidden = !!protect.password;
  }
}

// ---------- Touch ID (WebAuthn met de PRF-uitbreiding) ----------

const TOUCH_UNSUPPORTED = t('msgTouchUnsupported');

async function touchCreate() {
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Kamelo' },
      user: { id: PC.randomBytes(16), name: 'Kamelo-kluis', displayName: 'Kamelo-kluis' },
      challenge: PC.randomBytes(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      extensions: { prf: {} },
    },
  });
  if (!cred.getClientExtensionResults().prf?.enabled) throw new Error(TOUCH_UNSUPPORTED);
  return PC.b64(cred.rawId);
}

async function touchMethod(rawKey) {
  const credId = await touchCreate();
  const salt = PC.b64(PC.randomBytes(32));
  say(t('msgTouchAgain'));
  const wrapped = await PC.encryptBytes(await PC.keyFromPrf(await L.touchSecret(credId, salt)), rawKey);
  return { credId, salt, wrapped };
}

async function passwordMethod(rawKey, password) {
  const salt = PC.b64(PC.randomBytes(16));
  return { salt, wrapped: await PC.encryptBytes(await PC.keyFromPassword(password, salt), rawKey) };
}

// ---------- Beveiligen, ontgrendelen, vergrendelen ----------

// Zet beveiliging aan met een eerste methode: nieuwe sleutel, kluis versleuteld naar schijf.
async function enable(method) {
  const { vault } = await state();
  const rawKey = PC.randomBytes(32);
  const entry = method === 'touch' ? await touchMethod(rawKey) : await passwordMethod(rawKey, method.password);
  const current = vault || emptyVault();
  const protect = { [method === 'touch' ? 'touch' : 'password']: entry, counters: current.counters || {} };
  const vaultEnc = await PC.encryptJSON(await PC.importAesRaw(rawKey), current);
  await chrome.storage.session.set({ key: PC.b64(rawKey), locked: false });
  await chrome.storage.local.set({ protect, vaultEnc });
  await chrome.storage.local.remove('vault'); // geen onversleutelde kopie meer op schijf
}

// Voegt een tweede methode toe aan een al ontgrendelde kluis.
async function addMethod(method) {
  const { protect, key } = await state();
  const rawKey = PC.unb64(key);
  if (method === 'touch') protect.touch = await touchMethod(rawKey);
  else protect.password = await passwordMethod(rawKey, method.password);
  await chrome.storage.local.set({ protect });
}

async function disable() {
  const { vault } = await state();
  await chrome.runtime.sendMessage({ type: 'pf:flush' }).catch(() => {});
  await chrome.storage.local.set({ vault: vault || emptyVault() });
  await chrome.storage.local.remove(['protect', 'vaultEnc']);
  await chrome.storage.session.remove('key');
  await chrome.storage.session.set({ locked: false });
}

function checkNewPassword(a, b) {
  if (a.length < MIN_PASSWORD) throw new Error(t('msgMinChars', { n: MIN_PASSWORD }));
  if (a !== b) throw new Error(t('msgMismatch'));
}

// Voert een actie uit met nette meldingen en werkt daarna de weergave bij.
function action(fn, done) {
  return async e => {
    e?.preventDefault();
    say('');
    try {
      await fn();
      say(done);
    } catch (err) {
      // Afbreken van de Touch ID-vraag geeft een NotAllowedError; dat is geen fout van de gebruiker.
      say(err.name === 'NotAllowedError' ? t('msgCancelled') : err.message, true);
    }
    render();
  };
}

$('setupTouch').addEventListener('click', action(() => enable('touch'), t('msgDoneTouch')));
$('showSetupPassword').addEventListener('click', () => { $('setupPasswordForm').hidden = false; $('newPw').focus(); });
$('setupPasswordForm').addEventListener('submit', action(async () => {
  checkNewPassword($('newPw').value, $('newPw2').value);
  await enable({ password: $('newPw').value });
}, t('msgDonePassword')));

// Vanuit de popup geopend met ?touch: meteen om Touch ID vragen, en na het ontgrendelen het venster weer sluiten.
const fromPopup = new URLSearchParams(location.search).has('touch');
const closeIfFromPopup = () => { if (fromPopup) setTimeout(() => window.close(), 700); };

$('unlockTouch').addEventListener('click', action(async () => {
  await L.unlockTouch();
  closeIfFromPopup();
}, t('msgUnlocked')));
$('unlockPasswordForm').addEventListener('submit', action(async () => {
  await L.unlockPassword($('pw').value);
  $('pw').value = '';
  closeIfFromPopup();
}, t('msgUnlocked')));

$('lockNow').addEventListener('click', action(() => L.lock(), t('msgLocked')));
$('addTouch').addEventListener('click', action(() => addMethod('touch'), t('msgTouchAdded')));
$('showAddPassword').addEventListener('click', () => { $('addPasswordForm').hidden = false; $('addPw').focus(); });
$('addPasswordForm').addEventListener('submit', action(async () => {
  checkNewPassword($('addPw').value, $('addPw2').value);
  await addMethod({ password: $('addPw').value });
}, t('msgPasswordAdded')));
$('disable').addEventListener('click', action(async () => {
  if (!confirm(t('msgDisableConfirm'))) throw new Error('');
  await disable();
}, t('msgDisabled')));

applyI18n();
document.title = t('vaultPageTitle');
render().then(async () => {
  if (!fromPopup) return;
  const { protect, key } = await state();
  if (protect?.touch && !key) $('unlockTouch').click();
});
