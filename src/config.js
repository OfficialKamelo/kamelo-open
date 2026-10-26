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
    'frag(?: die| mich)?', 'pregunta', 'demandez', 'chiedi', 'pergunte', 'zapytaj', 'спросить', 'спросите',
  ];
  const AI_FIELD_DENSE = ['助手', '问ai', '問ai', '人工智能', 'アシスタント', 'aiに', 'aiアシスタント', '어시스턴트', 'ai에게'];
  const AI_FIELD_HINT = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${AI_FIELD_WORDS.join('|')})(?![\\p{L}])|${AI_FIELD_DENSE.join('|')}`, 'iu');

  const SUPPORT_EMAIL = 'hello@kamelo.eu';

  const DEFAULT_SETTINGS = {
    enabled: true,
    // Kamelo-knop bij antwoorden met placeholders: een kaart met de echte gegevens, alleen voor jou. Kamelo zet nooit
    // echte waarden terug in de pagina zelf (die kan de site uitlezen); zie 'Antwoorden' in content.js.
    answerButton: true,
    customTerms: [],
    allowList: [],
    allowMeta: {}, // herkomst van uitzonderingen: { woord: { site, at } }
    customAiSites: [], // sites die de gebruiker zelf als AI heeft gemarkeerd
    retentionDays: 30, // 0 = nooit automatisch wissen
    topicWarnings: true, // waarschuwen bij gevoelige onderwerpen (zie topics.js)
    mutedTopics: [], // onderwerpen waarbij de gebruiker "Niet meer tonen" koos
    privateChat: true, // "Vraag het Melo" in de melding: naar Melo (de privéchat, heette Private Chat) (op dit apparaat of de tijdelijke chat; nooit een chip of server)
    meloMac: false, // "Vraag Melo" naar Melo voor Mac (Chrome, Edge, Firefox op een Mac; aan in de popup, src/background.js). Safari: altijd.
  };

  // Melo voor Mac in de popup van Chrome, Edge en Firefox (de schakelaar). Aan sinds 26 okt 2026: Melo voor Mac staat op
  // kamelo.eu/app (bouw 8 en later stellen de brug in onder Instellingen → Verbindingen). Safari heeft hem niet nodig (daar
  // zit de extensie in de app).
  const MELO_MAC_IN_POPUP = true;

  root.PrivacyConfig = { AI_FIELD_HINT, DEFAULT_SETTINGS, SUPPORT_EMAIL, MELO_MAC_IN_POPUP };
})(typeof globalThis !== 'undefined' ? globalThis : this);
