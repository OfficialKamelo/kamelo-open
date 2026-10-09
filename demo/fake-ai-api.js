// Nep-AI-API voor de demo: verzoeken aan api.openai.com gaan niet het internet op, maar
// krijgen een antwoord terug met de placeholders die de "AI" ontving.
(() => {
  const realFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith('https://api.openai.com/')) return realFetch(input, init);
    const body = JSON.parse(init.body);
    window.lastApiRequest = init.body;
    const asked = body.messages.at(-1).content;
    const person = (asked.match(/\[PERSON_\d+\]/) || ['de klant'])[0];
    const iban = (asked.match(/\[IBAN_\d+\]/) || ['het rekeningnummer'])[0];
    const reply = `Concept-mail aan ${person}: graag het openstaande bedrag overmaken naar ${iban}.`;
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: reply } }] }),
      { headers: { 'Content-Type': 'application/json' } });
  };
})();
