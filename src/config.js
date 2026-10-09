// Gedeelde instellingen voor content scripts en popup.
(function (root) {
  'use strict';

  // De AI-sites zelf staan in sites.js, de API's van AI-modellen in ai-hosts.js.
  // Op andere sites (Gmail, Slack, Notion, webshops, …) herkennen we AI-invoervelden aan hun label of
  // placeholder, in veel talen: "Help me schrijven", "Ask AI", "Frag die KI", "Pregunta a la IA", "问AI", …
  const AI_FIELD_WORDS = [
    'ai', 'a\\.i\\.', 'ki', 'ia', 'ии', 'gemini', 'copilot', 'copilote', 'chatgpt', 'gpt', 'openai', 'claude', 'anthropic',
    'grok', 'llama', 'mistral', 'llm', 'chatbot', 'bot', 'assistant', 'assistent', 'asistente', 'assistente', 'asystent',
    'ассистент', 'помощник', 'virtual agent', 'prompt', 'ask anything', 'ask me anything',
    'vraag (?:me |het |maar )?(?:alles|iets)', 'stel (?:een|je) vraag', 'help me (?:write|schrijven)', 'help mij schrijven',
    'frag (?:die |mich )?', 'pregunta', 'demandez', 'chiedi', 'pergunte', 'zapytaj', 'спросить', 'спросите',
  ];
  const AI_FIELD_DENSE = ['助手', '问ai', '問ai', '人工智能', 'アシスタント', 'aiに', 'aiアシスタント', '어시스턴트', 'ai에게'];
  const AI_FIELD_HINT = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${AI_FIELD_WORDS.join('|')})(?![\\p{L}])|${AI_FIELD_DENSE.join('|')}`, 'iu');

  const SUPPORT_EMAIL = 'hello@kamelo.eu';

  const DEFAULT_SETTINGS = {
    enabled: true,
    restore: true,
    customTerms: [],
    allowList: [],
    allowMeta: {}, // herkomst van uitzonderingen: { woord: { site, at } }
    customAiSites: [], // sites die de gebruiker zelf als AI heeft gemarkeerd
    retentionDays: 30, // 0 = nooit automatisch wissen
    topicWarnings: true, // waarschuwen bij gevoelige onderwerpen (zie topics.js)
    mutedTopics: [], // onderwerpen waarbij de gebruiker "Niet meer tonen" koos
  };

  root.PrivacyConfig = { AI_FIELD_HINT, DEFAULT_SETTINGS, SUPPORT_EMAIL };
})(typeof globalThis !== 'undefined' ? globalThis : this);
