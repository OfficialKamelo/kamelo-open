// Nabootsing van de Chrome-extensie-API's (opslag en berichten), zodat de demo zonder extensie draait.
// "local" en "session" worden allebei in localStorage bewaard, onder een eigen sleutel.
(() => {
  if (window.chrome?.storage) return;
  const listeners = [];
  const messageListeners = [];
  window.importScripts = () => {}; // voor background.js in de preview

  function area(name, storageKey) {
    const read = () => { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } };
    const write = obj => { try { localStorage.setItem(storageKey, JSON.stringify(obj)); } catch {} };
    const notify = changes => listeners.forEach(fn => fn(changes, name));
    return {
      async get(keys) {
        const all = read();
        if (keys === undefined || keys === null) return all;
        return Object.fromEntries([].concat(keys).filter(k => k in all).map(k => [k, all[k]]));
      },
      async set(items) {
        const all = read(), changes = {};
        for (const [k, v] of Object.entries(items)) { changes[k] = { oldValue: all[k], newValue: v }; all[k] = v; }
        write(all);
        notify(changes);
      },
      async remove(keys) {
        const all = read(), changes = {};
        for (const k of [].concat(keys)) { changes[k] = { oldValue: all[k] }; delete all[k]; }
        write(all);
        notify(changes);
      },
      async clear() { write({}); },
      async setAccessLevel() {},
    };
  }

  window.chrome = Object.assign(window.chrome || {}, {
    storage: {
      local: area('local', 'privacyfilter-demo'),
      session: area('session', 'privacyfilter-demo-session'),
      onChanged: { addListener: fn => listeners.push(fn) },
    },
    // Berichten gaan naar de luisteraars op dezelfde pagina (zoals background.js in de previews).
    runtime: {
      onMessage: { addListener: fn => messageListeners.push(fn) },
      onInstalled: { addListener() {} },
      setUninstallURL: async () => {},
      getURL: p => `../${p}`,
      getManifest: () => ({ version: 'preview' }),
      sendMessage: msg => new Promise(resolve => {
        let async = false;
        for (const fn of messageListeners) if (fn(msg, {}, resolve) === true) async = true;
        if (!async) resolve(true);
      }),
    },
  });
})();
