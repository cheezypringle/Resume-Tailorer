export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function streamFromOpenRouter(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onProgress?: (text: string) => void,
): Promise<string> {
  const decoder = new TextDecoder();
  let fullText = '';

  return (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onProgress?.(fullText);
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    }
    return fullText;
  })();
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  onProgress?: (text: string) => void,
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, Record<string, string>>)?.error?.message || `API error: ${response.status}`,
    );
  }

  return streamFromOpenRouter(response.body!.getReader(), onProgress);
}
