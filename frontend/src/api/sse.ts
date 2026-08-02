export type ChatStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'values'; values: Record<string, string> }
  | { type: 'memory'; note: string }
  | { type: 'document_type'; slug: string }
  | { type: 'error'; detail: string }
  | { type: 'done' }

export async function* readChatStream(response: Response): AsyncGenerator<ChatStreamEvent> {
  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let separatorIndex: number
    while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)
      const dataLine = frame.split('\n').find((line) => line.startsWith('data: '))
      if (dataLine) {
        yield JSON.parse(dataLine.slice('data: '.length)) as ChatStreamEvent
      }
    }
  }
}
