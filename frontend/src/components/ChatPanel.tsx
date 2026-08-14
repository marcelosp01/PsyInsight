import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { api, ApiError } from '../api/client'
import { readChatStream } from '../api/sse'
import { CHAT_FONT_SIZE_CLASSES, CHAT_INPUT_HEIGHT_CLASSES, normalizeLayoutSize } from '../lib/layoutPreferences'
import type { ChatMessage, DocumentType } from '../types/document'

interface ChatPanelProps {
  documentTypes: DocumentType[]
  initialDocumentType: DocumentType | null
  savedDocumentId: number | null
  chatInputSize?: string | null
  chatFontSize?: string | null
  onDocumentTypeChange: (documentType: DocumentType) => void
  onValuesUpdate: (values: Record<string, string>) => void
}

export function ChatPanel({
  documentTypes,
  initialDocumentType,
  savedDocumentId,
  chatInputSize,
  chatFontSize,
  onDocumentTypeChange,
  onValuesUpdate,
}: ChatPanelProps) {
  const inputSize = normalizeLayoutSize(chatInputSize)
  const fontSize = normalizeLayoutSize(chatFontSize)
  const [documentType, setDocumentType] = useState<DocumentType | null>(initialDocumentType)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const appendAssistantChunk = (assistantMessageId: number, text: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantMessageId ? { ...message, content: message.content + text } : message,
      ),
    )
  }

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
          appendAssistantChunk(assistantMessageId, event.text)
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

  const startInterview = async (type: DocumentType, { append }: { append: boolean }) => {
    try {
      const session = await api.chat.createOrResumeSession({
        document_type: type.slug,
        saved_document_id: savedDocumentId,
      })
      setSessionId(session.id)
      onValuesUpdate(session.values)
      setMessages((current) => (append ? [...current, ...session.messages] : session.messages))
      if (session.messages.length === 0) {
        await sendMessage(session.id, null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível iniciar o chat.')
    }
  }

  const runModalitySelectionTurn = async (content: string | null) => {
    setError(null)
    setIsStreaming(true)
    const historyForRequest = messages.map((message) => ({ role: message.role, content: message.content }))
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
      const response = await api.chat.selectModality(historyForRequest, content)
      let resolvedType: DocumentType | null = null
      for await (const event of readChatStream(response)) {
        if (event.type === 'token') {
          appendAssistantChunk(assistantMessageId, event.text)
        } else if (event.type === 'document_type') {
          resolvedType = documentTypes.find((type) => type.slug === event.slug) ?? null
        } else if (event.type === 'error') {
          setError(event.detail)
        }
      }
      if (resolvedType) {
        setDocumentType(resolvedType)
        onDocumentTypeChange(resolvedType)
        await startInterview(resolvedType, { append: true })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível conversar com a IA.')
    } finally {
      setIsStreaming(false)
    }
  }

  useEffect(() => {
    if (documentType) {
      void startInterview(documentType, { append: false })
    } else {
      void runModalitySelectionTurn(null)
    }
    // Cada troca de laudo (savedDocumentId) ou reinício ("Novo laudo") remonta este
    // componente via `key` no DashboardPage, então este efeito roda uma vez por instância.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  const canInteract = documentType ? sessionId !== null : true

  const submitCurrentInput = () => {
    const content = input.trim()
    if (!content || !canInteract || isStreaming) return
    setInput('')
    if (documentType && sessionId) {
      void sendMessage(sessionId, content)
    } else {
      void runModalitySelectionTurn(content)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submitCurrentInput()
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submitCurrentInput()
    }
  }

  return (
    <div className="flex h-[75vh] flex-col rounded-lg border border-nude-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${CHAT_FONT_SIZE_CLASSES[fontSize]} ${
              message.role === 'user' ? 'ml-auto bg-nude-600 text-white' : 'bg-nude-100 text-slate-800'
            }`}
          >
            {message.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-nude-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={!canInteract || isStreaming}
          placeholder="Responda aqui... (Enter envia, Shift+Enter quebra linha)"
          aria-label="Mensagem"
          className={`flex-1 resize-none rounded-lg border border-nude-200 px-3 py-2 text-slate-800 focus:border-nude-500 focus:outline-none focus:ring-1 focus:ring-nude-500 ${CHAT_INPUT_HEIGHT_CLASSES[inputSize]} ${CHAT_FONT_SIZE_CLASSES[fontSize]}`}
        />
        <button
          type="submit"
          disabled={!canInteract || isStreaming || !input.trim()}
          className="rounded-lg bg-nude-600 px-4 py-2 text-sm font-medium text-white hover:bg-nude-700 disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
