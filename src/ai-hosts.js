// AI-diensten die een pagina rechtstreeks kan aanroepen (voor het netwerkfilter, net-main.js).
// Een eigen bestand: Chrome laadt hetzelfde bestand maar één keer per pagina, dus het netwerkfilter (in de
// pagina zelf) en het content script (in de afgeschermde omgeving van de extensie) mogen geen bestanden delen.
(function (root) {
  'use strict';

  const AI_API_HOSTS = [
    'api.openai.com', 'openai.azure.com', 'cognitiveservices.azure.com', 'services.ai.azure.com',
    'api.anthropic.com', 'generativelanguage.googleapis.com', 'aiplatform.googleapis.com',
    'api.mistral.ai', 'api.cohere.com', 'api.cohere.ai', 'api.groq.com', 'openrouter.ai',
    'api.together.xyz', 'api.together.ai', 'api.fireworks.ai', 'api.deepseek.com', 'api.perplexity.ai',
    'api.x.ai', 'api.replicate.com', 'api-inference.huggingface.co', 'router.huggingface.co',
    'api.deepinfra.com', 'api.cerebras.ai', 'api.sambanova.ai', 'api.moonshot.ai', 'api.ai21.com',
    'dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com',
  ];
  const AI_API_PATTERNS = [/^bedrock-runtime(-fips)?\.[a-z0-9-]+\.amazonaws\.com$/];

  const matchesHost = (hostname, host) => hostname === host || hostname.endsWith('.' + host);

  function isAiApiHost(hostname) {
    return AI_API_HOSTS.some(host => matchesHost(hostname, host)) || AI_API_PATTERNS.some(re => re.test(hostname));
  }

  root.PrivacyAiHosts = { AI_API_HOSTS, isAiApiHost };
})(typeof globalThis !== 'undefined' ? globalThis : this);
