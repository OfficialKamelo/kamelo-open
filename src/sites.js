// De AI-sites die Kamelo kent. Verandert een site zijn pagina, dan is dit meestal het enige bestand dat je aanpast.
//
//   name      naam in de popup en de melding
//   hosts     domeinen (subdomeinen tellen mee)
//   composer  CSS-selector van het veld waarin je typt. Optioneel: zonder selector vindt Kamelo het veld zelf.
//             Placeholders blijven alleen in dit veld staan; overal anders worden ze teruggezet.
//   send      CSS-selector van de verstuurknop. Optioneel: zonder selector (of als hij niet meer klopt) herkent Kamelo de
//             knop aan zijn label in veel talen, en vangt het verzenden van het formulier rond het veld ook af.
//   live      pagina die de nachtelijke sitecontrole opent (tests/live/sites.mjs); alleen sites die werken zonder inloggen
//   private   hoe je hier een tijdelijke chat opent (niet in je geschiedenis, niet voor training), voor "Tijdelijke chat":
//             url    = adres van een nieuwe tijdelijke chat, of anders
//             start  = adres van een nieuwe chat + button = de knop die daar de tijdelijke chat aanzet;
//             onUrl  = stukje van de url, of onSel = element, waaraan je ziet dat je er al in zit
//             (nagekeken op de echte, ingelogde sites op 11 okt 2026)
//   files     alleen in Kamelo Business: bestanden afschermen bij uploaden (upload.js van teams): kiezen met de
//             bestandsknop, slepen en plakken. Zet dit pas aan als uploaden op de echte site is nagekeken.
//   teams     alleen in Kamelo Business: ontwikkelaarsconsoles en chatbot-widgets (daar stelt niemand een persoonlijke
//             vraag, maar wel klantgegevens). De gratis editie vraagt er geen toegang tot.
//   perHost   de domeinen zijn verschillende bedrijven onder één naam: elk domein krijgt een eigen kluis (zie scopeFor).
//   widget    draait als venster op andere sites (de klantenservice van een webwinkel): Kamelo Business blokkeert het
//             niet via aiAppsDefault, alleen als de organisatie het zelf noemt (ai-apps.js van teams).
//   only      de AI zit in een app voor iets anders (Meta AI in WhatsApp): Kamelo doet er alleen iets als de chat met de
//             AI open staat, nooit in een chat met iemand anders (zie aiChatOpen). root = het venster van de open chat,
//             title = de kop daarin, name = de naam van de AI in die kop.
//             Net als een widget blokkeert Kamelo Business zo'n app niet via aiAppsDefault.
(function (root) {
  'use strict';

  const SITES = [
    { name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com'], composer: '#prompt-textarea, #mobile-composer-prompt',
      send: '[data-testid="send-button"], #composer-submit-button', live: 'https://chatgpt.com/', files: true,
      private: { url: 'https://chatgpt.com/?temporary-chat=true', onUrl: 'temporary-chat=true' } },
    { name: 'Gemini', hosts: ['gemini.google.com'], files: true, composer: 'rich-textarea .ql-editor', send: 'button.send-button', live: 'https://gemini.google.com/app',
      private: { start: 'https://gemini.google.com/app', button: 'temp-chat-button button', onSel: 'chat-window.is-temporary-chat' } },
    { name: 'Claude', hosts: ['claude.ai'], composer: '[data-testid="chat-input"], fieldset .ProseMirror', files: true,
      send: 'button[aria-label="Send message"]',
      private: { url: 'https://claude.ai/new?incognito', onUrl: 'incognito', onSel: 'button[aria-label="Exit incognito"]' } },
    { name: 'Copilot', hosts: ['copilot.microsoft.com', 'copilot.com', 'copilot.cloud.microsoft'], files: true, composer: '#userInput' },
    { name: 'Perplexity', hosts: ['perplexity.ai'], files: true, composer: '#ask-input', live: 'https://www.perplexity.ai/' },
    { name: 'Mistral', hosts: ['chat.mistral.ai'], files: true, composer: 'form .ProseMirror', live: 'https://chat.mistral.ai/chat' },
    { name: 'Grok', hosts: ['grok.com'], files: true, composer: 'form textarea, form .ProseMirror', live: 'https://grok.com/' },
    { name: 'DeepSeek', hosts: ['chat.deepseek.com'], files: true, composer: '#chat-input' },
    { name: 'Meta AI', hosts: ['meta.ai'], files: true },
    // Meta AI in WhatsApp Web: alleen in de chat met Meta AI, nooit in je andere chats. De kop van die chat heeft precies
    // de tekst "Meta AI" (nagekeken op de echte, ingelogde site op 17 okt 2026).
    { name: 'Meta AI in WhatsApp', hosts: ['web.whatsapp.com'], composer: '#main footer [contenteditable="true"]',
      only: { root: '#main', title: 'header', name: 'Meta AI' } },
    { name: 'Microsoft 365 Copilot', hosts: ['m365.cloud.microsoft'], files: true },
    { name: 'OpenAI Playground', hosts: ['platform.openai.com'], teams: true },
    { name: 'AI Studio', hosts: ['aistudio.google.com'], files: true },
    { name: 'NotebookLM', hosts: ['notebooklm.google.com'], files: true },
    { name: 'Anthropic Console', hosts: ['console.anthropic.com'], teams: true },
    { name: 'Poe', hosts: ['poe.com'], files: true },
    { name: 'You.com', hosts: ['you.com'], files: true },
    { name: 'Qwen', hosts: ['chat.qwen.ai'], files: true },
    { name: 'Duck.ai', hosts: ['duck.ai'] },
    { name: 'Character.AI', hosts: ['character.ai'] },
    { name: 'Pi', hosts: ['pi.ai'] },
    { name: 'OpenRouter', hosts: ['openrouter.ai'], teams: true },
    { name: 'Groq', hosts: ['console.groq.com'], teams: true },
    { name: 'TypingMind', hosts: ['typingmind.com'] },
    { name: 'Phind', hosts: ['phind.com'] },
    { name: 'Kimi', hosts: ['kimi.com'], files: true },
    { name: 'Z.ai', hosts: ['z.ai'], files: true },
    // Bouwers van AI-chatbots die als widget op andere sites draaien (vaak in een iframe).
    {
      name: 'AI chatbot', teams: true, perHost: true, widget: true,
      hosts: ['chatbase.co', 'botpress.cloud', 'voiceflow.com', 'kapa.ai', 'inkeep.com', 'mendable.ai',
        'customgpt.ai', 'sitegpt.ai', 'chatling.ai', 'docsbot.ai', 'chatsimple.ai'],
    },
  ];

  const matchesHost = (hostname, host) => hostname === host || hostname.endsWith('.' + host);

  // De site bij een hostnaam, of null. Sites die de gebruiker zelf als AI markeert, krijgen hun hostnaam als naam.
  function siteFor(hostname, customAiSites = []) {
    const site = SITES.find(s => s.hosts.some(host => matchesHost(hostname, host)));
    if (site) return site;
    return customAiSites.some(host => matchesHost(hostname, host)) ? { name: hostname, hosts: [hostname] } : null;
  }

  // Het bereik van de kluis op een bekende AI-site (zie inScope in detector.js en vaultscope.js), of null.
  // Adressen van één dienst (chatgpt.com en chat.openai.com) delen één bereik; bij perHost krijgt elk domein
  // (met zijn subdomeinen) een eigen bereik, zodat bijv. chatbase.co niet terugzet wat op botpress.cloud is afgeschermd.
  function scopeFor(hostname) {
    const site = SITES.find(s => s.hosts.some(host => matchesHost(hostname, host)));
    if (!site) return null;
    if (!site.perHost) return `ai:${site.name}`;
    return `ai:${site.name}/${site.hosts.find(host => matchesHost(hostname, host))}`;
  }

  // Staat de chat met de AI open? Altijd waar op een site zonder `only`. Kijkt alleen naar de kop van de open chat,
  // nooit naar wat er in de berichten staat.
  function aiChatOpen(site, doc) {
    const only = site?.only;
    if (!only) return !!site;
    try {
      const chat = doc.querySelector(only.root);
      if (!chat) return false;
      const title = chat.querySelector(only.title);
      if (!title) return false;
      const walk = doc.createTreeWalker(title, 4 /* NodeFilter.SHOW_TEXT */);
      // Alleen zichtbare tekst die precies de naam is: een knop "Ask Meta AI" in de kop van een andere chat telt niet.
      for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue.trim() === only.name) return true;
      return false;
    } catch { return false; } // ongeldige selector
  }

  const api = { SITES, siteFor, scopeFor, matchesHost, aiChatOpen };
  root.PrivacySites = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
