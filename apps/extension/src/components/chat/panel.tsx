import type { ChatController, ChatMessage } from "@/hooks/use-pi-chat"
import type { ChatProviderSettings } from "@/lib/persisted-settings"
import { Button } from "@newsnext/ui/components/button"
import { useAtomValue } from "jotai"
import { useEffect, useRef, useState } from "react"
import { browser } from "#imports"
import {
  PhArrowFatUpDuotone,
  PhChatCircleDotsDuotone,
  PhCircleDashedDuotone,
  PhGearDuotone,
} from "@/components/icons/ph"
import { usePiChat } from "@/hooks/use-pi-chat"
import { requestSettingsOpen } from "@/lib/settings-navigation"
import { chatProviderSettingsAtom } from "@/store/settings"

export function ChatPanel(): React.JSX.Element {
  const provider = useAtomValue(chatProviderSettingsAtom)
  const sessionKey = `${provider.name}\0${provider.baseUrl}\0${provider.model}\0${provider.apiKey}`

  // Provider changes intentionally create a fresh agent and conversation.
  return <ChatPanelSession key={sessionKey} provider={provider} />
}

interface ChatPanelSessionProps {
  provider: ChatProviderSettings
}

function ChatPanelSession({ provider }: ChatPanelSessionProps): React.JSX.Element {
  const chat = usePiChat(provider)
  const configured = Boolean(provider.apiKey && provider.baseUrl && provider.model)

  return (
    <ChatPanelView
      chat={chat}
      configured={configured}
      onOpenProviderSettings={openProviderSettings}
      providerLabel={configured ? `${provider.name} · ${provider.model}` : "Provider not configured"}
    />
  )
}

interface ChatPanelViewProps {
  chat: ChatController
  configured: boolean
  onOpenProviderSettings: () => void | Promise<void>
  providerLabel: string
}

export function ChatPanelView({
  chat,
  configured,
  onOpenProviderSettings,
  providerLabel,
}: ChatPanelViewProps): React.JSX.Element {
  return (
    <main
      className="relative flex size-full min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: "color-mix(in oklab, var(--background), var(--color-theme-400) 55%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400" />
      {configured
        ? (
            <ChatThread
              chat={chat}
              onOpenProviderSettings={onOpenProviderSettings}
              providerLabel={providerLabel}
            />
          )
        : (
            <ProviderEmptyState
              onOpenProviderSettings={onOpenProviderSettings}
              providerLabel={providerLabel}
            />
          )}
    </main>
  )
}

function ProviderEmptyState({
  onOpenProviderSettings,
  providerLabel,
}: Pick<ChatPanelViewProps, "onOpenProviderSettings" | "providerLabel">): React.JSX.Element {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col px-4">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-10 text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-[1.15rem] bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_10%,transparent)]">
          <PhChatCircleDotsDuotone className="size-5.5" />
        </div>
        <div className="max-w-64 space-y-2">
          <h2 className="text-base font-semibold tracking-[-0.015em]">Connect your model</h2>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Add an OpenAI-compatible provider to ask questions alongside your reading.
          </p>
        </div>
        <Button type="button" className="mt-6 rounded-full px-5" onClick={() => void onOpenProviderSettings()}>
          <PhGearDuotone data-icon="inline-start" />
          Configure provider
        </Button>
      </div>
      <ProviderMetaBar onOpenProviderSettings={onOpenProviderSettings} providerLabel={providerLabel} />
    </div>
  )
}

async function openProviderSettings(): Promise<void> {
  requestSettingsOpen("provider")
  await browser.runtime.openOptionsPage().catch(() => undefined)
}

function ChatThread({
  chat,
  onOpenProviderSettings,
  providerLabel,
}: Pick<ChatPanelViewProps, "chat" | "onOpenProviderSettings" | "providerLabel">): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const streamingText = chat.streamingMessage?.text

  useEffect(() => {
    if (!autoScrollRef.current) return

    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current
      if (viewport) viewport.scrollTop = viewport.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chat.messages, streamingText])

  function handleScroll(): void {
    const viewport = viewportRef.current
    if (!viewport) return

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    autoScrollRef.current = distanceFromBottom < 50
  }

  function sendMessage(text: string): void {
    autoScrollRef.current = true
    void chat.sendMessage(text)
  }

  const hasMessages = chat.messages.length > 0 || Boolean(chat.streamingMessage)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 overscroll-contain scrollbar-hidden"
        onScroll={handleScroll}
      >
        {!hasMessages && (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
            <div className="mb-5 flex size-12 items-center justify-center rounded-[1.15rem] bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_10%,transparent)]">
              <PhChatCircleDotsDuotone className="size-5.5" />
            </div>
            <div className="max-w-64 space-y-2">
              <h2 className="text-base font-semibold tracking-[-0.015em]">What are you exploring?</h2>
              <p className="text-[13px] leading-5 text-muted-foreground">
                Ask about an article, compare ideas, or turn your reading into a concise brief.
              </p>
            </div>
          </div>
        )}
        {chat.messages.map(message => <ChatMessageView key={message.id} message={message} />)}
        {chat.streamingMessage && <ChatMessageView message={chat.streamingMessage} />}
        <div className="sticky bottom-0 mt-auto pt-7">
          <ChatComposer isRunning={chat.isRunning} onSend={sendMessage} onStop={chat.stop} />
          <ProviderMetaBar onOpenProviderSettings={onOpenProviderSettings} providerLabel={providerLabel} />
        </div>
      </div>
    </div>
  )
}

function ChatMessageView({ message }: { message: ChatMessage }): React.JSX.Element {
  return message.role === "user"
    ? <UserMessage message={message} />
    : <AssistantMessage message={message} />
}

function UserMessage({ message }: { message: ChatMessage }): React.JSX.Element {
  return (
    <div className="mb-6 flex justify-end pl-10">
      <div className="max-w-full rounded-[1.3rem] rounded-br-md bg-primary px-4 py-2.5 text-[13px] leading-5.5 text-primary-foreground shadow-sm select-text">
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  )
}

function AssistantMessage({ message }: { message: ChatMessage }): React.JSX.Element {
  return (
    <div className="mb-7 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2.5 pr-3">
      <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PhChatCircleDotsDuotone className="size-3" />
      </div>
      <div className="min-w-0">
        <p className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Assistant</p>
        <div className="text-[13px] leading-5.5 whitespace-pre-wrap text-foreground select-text">
          {message.text && <p>{message.text}</p>}
          {message.failed && (
            <p className="mt-2 rounded-2xl bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
              The provider could not complete this message. Check your provider settings and try again.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ProviderMetaBar({
  onOpenProviderSettings,
  providerLabel,
}: Pick<ChatPanelViewProps, "onOpenProviderSettings" | "providerLabel">): React.JSX.Element {
  return (
    <div className="flex h-9 min-w-0 items-center gap-1.5 px-1.5 text-[10px] text-muted-foreground">
      <span className="size-1.5 shrink-0 rounded-full bg-primary/70" />
      <span className="truncate">{providerLabel}</span>
      <Button
        type="button"
        variant="transparent"
        size="icon-sm"
        className="ml-auto size-7 shrink-0 rounded-full text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
        aria-label="Chat provider settings"
        title="Chat provider settings"
        onClick={() => void onOpenProviderSettings()}
      >
        <PhGearDuotone />
      </Button>
    </div>
  )
}

interface ChatComposerProps {
  isRunning: boolean
  onSend: (text: string) => void
  onStop: () => void
}

function ChatComposer({ isRunning, onSend, onStop }: ChatComposerProps): React.JSX.Element {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function submit(): void {
    const message = input.trim()
    if (!message || isRunning) return

    setInput("")
    if (inputRef.current) inputRef.current.style.height = ""
    onSend(message)
  }

  return (
    <form
      className="flex items-end gap-2 rounded-[1.35rem] border border-foreground/10 bg-background/55 p-1.5 backdrop-blur-xl transition-[background-color,border-color,box-shadow] focus-within:border-primary/60 focus-within:bg-background/65 focus-within:ring-3 focus-within:ring-primary/12"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <textarea
        ref={inputRef}
        value={input}
        aria-label="Message"
        placeholder="Message Assistant"
        className="max-h-36 min-h-9 flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-2 text-[13px] leading-5 outline-none placeholder:text-muted-foreground"
        rows={1}
        onChange={(event) => {
          const textarea = event.currentTarget
          textarea.style.height = "auto"
          textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`
          setInput(textarea.value)
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
          event.preventDefault()
          submit()
        }}
      />
      {!isRunning
        ? (
            <button
              type="submit"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/85 active:scale-95 disabled:opacity-35"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <PhArrowFatUpDuotone className="size-4" />
            </button>
          )
        : (
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
              aria-label="Stop response"
              onClick={onStop}
            >
              <PhCircleDashedDuotone className="size-4 animate-spin" />
            </button>
          )}
    </form>
  )
}
