import type { ChatController, ChatMessage } from "@/hooks/use-pi-chat"
import { Button } from "@newsnext/ui/components/button"
import { useEffect, useRef, useState } from "react"
import {
  PhArrowDown,
  PhArrowFatUp,
  PhCheck,
  PhCopy,
  PhGear,
  PhStop,
} from "@/components/icons/ph"
import { MarkdownText } from "./markdown-text"
import { ToolTimeline } from "./tool-timeline"

interface AssistantThreadProps {
  chat: ChatController
  onOpenProviderSettings: () => void | Promise<void>
  providerLabel: string
}

const SUGGESTIONS = [
  "What changed in my sources today?",
  "Compare the latest observations",
  "Summarize my recent source history",
] as const

export function AssistantThread({
  chat,
  onOpenProviderSettings,
  providerLabel,
}: AssistantThreadProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const hasMessages = chat.messages.length > 0

  useEffect(() => {
    if (!autoScrollRef.current) return

    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current
      if (viewport) viewport.scrollTop = viewport.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chat.messages])

  function handleScroll(): void {
    const viewport = viewportRef.current
    if (!viewport) return

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    const nearBottom = distanceFromBottom < 64
    autoScrollRef.current = nearBottom
    setShowScrollToBottom(!nearBottom)
  }

  function sendMessage(text: string): void {
    autoScrollRef.current = true
    setShowScrollToBottom(false)
    void chat.sendMessage(text)
  }

  function scrollToBottom(): void {
    const viewport = viewportRef.current
    if (!viewport) return
    autoScrollRef.current = true
    setShowScrollToBottom(false)
    viewport.scrollTo({ behavior: "smooth", top: viewport.scrollHeight })
  }

  return (
    <section className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        data-slot="aui_thread-viewport"
        className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth overscroll-contain scrollbar-hidden"
        onScroll={handleScroll}
      >
        <div className={`mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 pt-4 ${hasMessages ? "" : "justify-center"}`}>
          {!hasMessages && <ThreadWelcome onSend={sendMessage} />}
          {hasMessages && (
            <div data-slot="aui_message-group" className="mb-10 flex flex-col gap-y-6">
              {chat.messages.map((message, index) => (
                <ThreadMessage
                  key={message.id}
                  message={message}
                  streaming={chat.isRunning && index === chat.messages.length - 1}
                />
              ))}
              {chat.isRunning && chat.messages.at(-1)?.role === "user" && <TypingIndicator />}
            </div>
          )}
          <div
            data-slot="aui_thread-viewport-footer"
            className={`relative z-10 flex flex-col pb-2 ${hasMessages ? "sticky bottom-0 mt-auto pt-2" : "mt-6"}`}
          >
            {showScrollToBottom && (
              <button
                type="button"
                className="absolute -top-10 self-center rounded-full border border-foreground/10 bg-background/90 p-2 text-muted-foreground shadow-sm backdrop-blur transition-[background-color,color,transform] hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                aria-label="Scroll to bottom"
                onClick={scrollToBottom}
              >
                <PhArrowDown className="size-4" />
              </button>
            )}
            <ThreadComposer
              isRunning={chat.isRunning}
              onOpenProviderSettings={onOpenProviderSettings}
              onSend={sendMessage}
              onStop={chat.stop}
              providerLabel={providerLabel}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function ThreadWelcome({ onSend }: { onSend: (text: string) => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center px-3 text-center">
      <div className="max-w-72">
        <h1 className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-xl font-semibold tracking-[-0.025em] duration-200">
          How can I help with your reading?
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
          Ask about saved source history, recent changes, or patterns across observations.
        </p>
      </div>
      <div className="mt-6 flex max-w-sm flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map(suggestion => (
          <button
            key={suggestion}
            type="button"
            className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both rounded-full border border-foreground/10 bg-background/25 px-3.5 py-1.5 text-xs text-foreground/80 transition-[background-color,border-color,color,transform] duration-200 hover:border-foreground/15 hover:bg-muted hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={() => onSend(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

function ThreadMessage({ message, streaming }: { message: ChatMessage, streaming: boolean }): React.JSX.Element {
  return message.role === "user"
    ? <UserMessage message={message} />
    : <AssistantMessage message={message} streaming={streaming} />
}

function UserMessage({ message }: { message: ChatMessage }): React.JSX.Element {
  return (
    <article
      data-slot="aui_user-message-root"
      data-role="user"
      className="fade-in slide-in-from-bottom-1 animate-in grid grid-cols-[minmax(72px,1fr)_auto] px-2 duration-150 [contain-intrinsic-size:auto_120px] [content-visibility:auto]"
    >
      <div className="col-start-2 min-w-0 max-w-full rounded-xl bg-muted px-4 py-2 text-[13px] leading-5.5 text-foreground [overflow-wrap:anywhere] select-text">
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </article>
  )
}

function AssistantMessage({ message, streaming }: { message: ChatMessage, streaming: boolean }): React.JSX.Element {
  return (
    <article
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="group fade-in slide-in-from-bottom-1 animate-in px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-[13px] leading-5.5 text-foreground [overflow-wrap:anywhere] select-text"
      >
        {message.tools && <ToolTimeline turnActive={streaming} tools={message.tools} />}
        {message.text && <MarkdownText streaming={streaming} text={message.text} />}
        {message.failed && (
          <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive">
            The provider could not complete this message. Check your provider settings and try again.
          </p>
        )}
      </div>
      {message.text && <AssistantActionBar text={message.text} />}
    </article>
  )
}

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="fade-in animate-in flex gap-1 px-3 py-1 duration-300" aria-label="Assistant is working">
      {["-0.32s", "-0.16s", "0s"].map(delay => (
        <span
          key={delay}
          aria-hidden
          className="size-1 animate-bounce rounded-full bg-foreground/40 motion-reduce:animate-none"
          style={{ animationDelay: delay, animationDuration: "1.1s" }}
        />
      ))}
    </div>
  )
}

function AssistantActionBar({ text }: { text: string }): React.JSX.Element {
  const resetCopyTimerRef = useRef<number>(undefined)
  const [copied, setCopied] = useState(false)

  useEffect(() => () => window.clearTimeout(resetCopyTimerRef.current), [])

  async function copyMessage(): Promise<void> {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.clearTimeout(resetCopyTimerRef.current)
    resetCopyTimerRef.current = window.setTimeout(setCopied, 1_500, false)
  }

  return (
    <div className="mt-1.5 flex min-h-7 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
      <button
        type="button"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        aria-label={copied ? "Copied" : "Copy message"}
        title={copied ? "Copied" : "Copy"}
        onClick={() => void copyMessage()}
      >
        {copied ? <PhCheck className="size-3.5" /> : <PhCopy className="size-3.5" />}
      </button>
    </div>
  )
}

interface ThreadComposerProps {
  isRunning: boolean
  onOpenProviderSettings: () => void | Promise<void>
  onSend: (text: string) => void
  onStop: () => void
  providerLabel: string
}

function ThreadComposer({
  isRunning,
  onOpenProviderSettings,
  onSend,
  onStop,
  providerLabel,
}: ThreadComposerProps): React.JSX.Element {
  const [input, setInput] = useState("")

  function submit(): void {
    const message = input.trim()
    if (!message || isRunning) return

    setInput("")
    onSend(message)
  }

  return (
    <form
      className="flex w-full flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex h-10 shrink-0 items-center justify-between rounded-full bg-foreground/[0.04] py-1.5 ps-4 pe-1.5 transition-[background-color,box-shadow] focus-within:bg-foreground/[0.06] focus-within:ring-2 focus-within:ring-foreground/15 dark:bg-foreground/[0.06] dark:focus-within:bg-foreground/[0.09]">
        <input
          value={input}
          aria-label="Message input"
          autoFocus
          enterKeyHint="send"
          placeholder="Message"
          className="h-full min-w-0 flex-1 bg-transparent pe-3 text-[13px] outline-none placeholder:text-foreground/35"
          onChange={event => setInput(event.currentTarget.value)}
        />
        <button
          type={isRunning ? "button" : "submit"}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-[opacity,transform] hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          aria-label={isRunning ? "Stop generating" : "Send message"}
          disabled={!isRunning && !input.trim()}
          onClick={isRunning ? onStop : undefined}
        >
          {isRunning ? <PhStop className="size-3.5" /> : <PhArrowFatUp className="size-3.5" />}
        </button>
      </div>
      <div className="flex h-7 min-w-0 items-center gap-1.5 px-2 text-[10px] text-muted-foreground">
        <span className="size-1.5 shrink-0 rounded-full bg-primary/70" />
        <span className="truncate">{providerLabel}</span>
        <button
          type="button"
          className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
          aria-label="Chat provider settings"
          title="Chat provider settings"
          onClick={() => void onOpenProviderSettings()}
        >
          <PhGear className="size-3" />
        </button>
      </div>
    </form>
  )
}

interface AssistantProviderRequiredProps {
  onOpenProviderSettings: () => void | Promise<void>
  providerLabel: string
}

export function AssistantProviderRequired({
  onOpenProviderSettings,
  providerLabel,
}: AssistantProviderRequiredProps): React.JSX.Element {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col px-4 pt-4 pb-3">
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 text-center">
        <div className="max-w-72">
          <h1 className="text-xl font-semibold tracking-[-0.025em]">Connect your model</h1>
          <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
            Add an OpenAI-compatible provider to ask questions alongside your reading.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-foreground/10 bg-background/45 p-2 backdrop-blur-xl">
        <Button
          type="button"
          className="h-10 w-full rounded-[1.15rem]"
          onClick={() => void onOpenProviderSettings()}
        >
          <PhGear data-icon="inline-start" />
          Configure provider
        </Button>
        <p className="mt-2 truncate px-2 pb-1 text-center text-[10px] text-muted-foreground">{providerLabel}</p>
      </div>
    </section>
  )
}
