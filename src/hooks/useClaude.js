export async function askClaude(systemPrompt, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text
}
