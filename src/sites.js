// De AI-sites die Kamelo kent. Verandert een site zijn pagina, dan is dit meestal het enige bestand dat je aanpast.
//
//   name      naam in de popup en de melding
//   hosts     domeinen (subdomeinen tellen mee)
//   composer  CSS-selector van het veld waarin je typt. Optioneel: zonder selector vindt Kamelo het veld zelf.
//             Placeholders blijven alleen in dit veld staan; overal anders worden ze teruggezet.
//   live      pagina die de nachtelijke sitecontrole opent (tests/live/sites.mjs); alleen sites die werken zonder inloggen
//   private   hoe je hier een tijdelijke chat opent (niet in je geschiedenis, niet voor training), voor "Tijdelijke chat":
//             url    = adres van een nieuwe tijdelijke chat, of anders
//             start  = adres van een nieuwe chat + button = de knop die daar de tijdelijke chat aanzet;
//             onUrl  = stukje van de url, of onSel = element, waaraan je ziet dat je er al in zit
//             (nagekeken op de echte, ingelogde sites op 11 okt 2026)
//   teams     alleen in Kamelo for teams: ontwikkelaarsconsoles en chatbot-widgets (daar stelt niemand een persoonlijke
//             vraag, maar wel klantgegevens). De gratis editie vraagt er geen toegang tot.
(function (root) {
  'use strict';

  const SITES = [
    { name: 'ChatGPT', hosts: ['chatgpt.com', 'chat.openai.com'], composer: '#prompt-textarea, #mobile-composer-prompt', live: 'https://chatgpt.com/',
      private: { url: 'https://chatgpt.com/?temporary-chat=true', onUrl: 'temporary-chat=true' } },
    { name: 'Gemini', hosts: ['gemini.google.com'], composer: 'rich-textarea .ql-editor', live: 'https://gemini.google.com/app',
      private: { start: 'https://gemini.google.com/app', button: 'temp-chat-button button', onSel: 'chat-window.is-temporary-chat' } },
    { name: 'Claude', hosts: ['claude.ai'], composer: '[data-testid="chat-input"], fieldset .ProseMirror',
      private: { url: 'https://claude.ai/new?incognito', onUrl: 'incognito', onSel: 'button[aria-label="Exit incognito"]' } },
    { name: 'Copilot', hosts: ['copilot.microsoft.com', 'copilot.com', 'copilot.cloud.microsoft'], composer: '#userInput' },
    { name: 'Perplexity', hosts: ['perplexity.ai'], composer: '#ask-input', live: 'https://www.perplexity.ai/' },
    { name: 'Mistral', hosts: ['chat.mistral.ai'], composer: 'form .ProseMirror', live: 'https://chat.mistral.ai/chat' },
    { name: 'Grok', hosts: ['grok.com'], composer: 'form textarea, form .ProseMirror', live: 'https://grok.com/' },
    { name: 'DeepSeek', hosts: ['chat.deepseek.com'], composer: '#chat-input' },
    { name: 'Meta AI', hosts: ['meta.ai'] },
    { name: 'Microsoft 365 Copilot', hosts: ['m365.cloud.microsoft'] },
    { name: 'OpenAI Playground', hosts: ['platform.openai.com'], teams: true },
    { name: 'AI Studio', hosts: ['aistudio.google.com'] },
    { name: 'NotebookLM', hosts: ['notebooklm.google.com'] },
    { name: 'Anthropic Console', hosts: ['console.anthropic.com'], teams: true },
    { name: 'Poe', hosts: ['poe.com'] },
    { name: 'You.com', hosts: ['you.com'] },
    { name: 'Qwen', hosts: ['chat.qwen.ai'] },
    { name: 'Duck.ai', hosts: ['duck.ai'] },
    { name: 'Character.AI', hosts: ['character.ai'] },
    { name: 'Pi', hosts: ['pi.ai'] },
    { name: 'OpenRouter', hosts: ['openrouter.ai'], teams: true },
    { name: 'Groq', hosts: ['console.groq.com'], teams: true },
    { name: 'TypingMind', hosts: ['typingmind.com'] },
    { name: 'Phind', hosts: ['phind.com'] },
    { name: 'Kimi', hosts: ['kimi.com'] },
    { name: 'Z.ai', hosts: ['z.ai'] },
    // Bouwers van AI-chatbots die als widget op andere sites draaien (vaak in een iframe).
    {
      name: 'AI chatbot', teams: true,
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

  const api = { SITES, siteFor, matchesHost };
  root.PrivacySites = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
