import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import { readChatStream } from '../api/sse'
import type { ChatMessage, DocumentType } from '../types/document'

interface ChatPanelProps {
  documentType: DocumentType
  savedDocumentId: number | null
  onValuesUpdate: (values: Record<string, string>) => void
}

export function ChatPanel({ documentType, savedDocumentId, onValuesUpdate }: ChatPanelProps) {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = async (activeSessionId: number, content: string | null) => {
    setError(null)
    setIsStreaming(true)
    if (content) {
      setMessages((current) => [
        ...current,
        { id: Date.now(), role: 'user', content, created_at: new Date().toISOString() },
      ])
    }
    const assistantMessageId = Date.now() + 1
    setMessages((current) => [
      ...current,
      { id: assistantMessageId, role: 'assistant', content: '', created_at: new Date().toISOString() },
    ])

    try {
      const response = await api.chat.sendMessage(activeSessionId, content)
      for await (const event of readChatStream(response)) {
        if (event.type === 'token') {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + event.text }
                : message,
            ),
          )
        } else if (event.type === 'values') {
          onValuesUpdate(event.values)
        } else if (event.type === 'error') {
          setError(event.detail)
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível conversar com a IA.')
    } finally {
      setIsStreaming(false)
    }
  }

  useEffect(() => {
    let ignore = false
    setMessages([])
    setSessionId(null)
    setError(null)

    api.chat
      .createOrResumeSession({ document_type: documentType.slug, saved_document_id: savedDocumentId })
      .then((session) => {
        if (ignore) return
        setSessionId(session.id)
        setMessages(session.messages)
        onValuesUpdate(session.values)
        if (session.messages.length === 0) {
          void sendMessage(session.id, null)
        }
      })
      .catch((err) => {
        if (ignore) return
        setError(err instanceof ApiError ? err.message : 'Não foi possível iniciar o chat.')
      })

    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType.slug, savedDocumentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const content = input.trim()
    if (!content || !sessionId || isStreaming) return
    setInput('')
    void sendMessage(sessionId, content)
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-nude-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
              message.role === 'user' ? 'ml-auto bg-nude-600 text-white' : 'bg-nude-100 text-slate-800'
            }`}
          >
            {message.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-nude-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!sessionId || isStreaming}
          placeholder="Responda aqui..."
          aria-label="Mensagem"
          className="flex-1 rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500"
        />
        <button
          type="submit"
          disabled={!sessionId || isStreaming || !input.trim()}
          className="rounded-lg bg-nude-600 px-4 py-2 text-sm font-medium text-white hover:bg-nude-700 disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
