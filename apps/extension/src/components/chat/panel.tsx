import type { AssistantRuntime, ChatModelAdapter } from "@assistant-ui/react"
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react"
import { Button } from "@newsnext/ui/components/button"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { browser } from "#imports"
import {
  PhArrowFatUpDuotone,
  PhChatCircleDotsDuotone,
  PhCircleDashedDuotone,
  PhGearDuotone,
} from "@/components/icons/ph"
import { createPiChatAdapter } from "@/lib/pi-chat-adapter"
import { requestSettingsOpen } from "@/lib/settings-navigation"
import { chatProviderSettingsAtom } from "@/store/settings"

export function ChatPanel(): React.JSX.Element {
  const provider = useAtomValue(chatProviderSettingsAtom)
  const adapter = useMemo<ChatModelAdapter>(() => createPiChatAdapter(provider), [provider])
  const runtime = useLocalRuntime(adapter)
  const configured = Boolean(provider.apiKey && provider.baseUrl && provider.model)

  return (
    <ChatPanelView
      configured={configured}
      onOpenProviderSettings={openProviderSettings}
      providerLabel={configured ? `${provider.name} · ${provider.model}` : "Provider not configured"}
      runtime={runtime}
    />
  )
}

interface ChatPanelViewProps {
  configured: boolean
  onOpenProviderSettings: () => void | Promise<void>
  providerLabel: string
  runtime: AssistantRuntime
}

export function ChatPanelView({
  configured,
  onOpenProviderSettings,
  providerLabel,
  runtime,
}: ChatPanelViewProps): React.JSX.Element {
  return (
    <main
      className="relative flex size-full min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: "color-mix(in oklab, var(--background), var(--color-theme-400) 55%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400" />
      <AssistantRuntimeProvider runtime={runtime}>
        {configured
          ? <ChatThread onOpenProviderSettings={onOpenProviderSettings} providerLabel={providerLabel} />
          : (
              <ProviderEmptyState
                onOpenProviderSettings={onOpenProviderSettings}
                providerLabel={providerLabel}
              />
            )}
      </AssistantRuntimeProvider>
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
  onOpenProviderSettings,
  providerLabel,
}: Pick<ChatPanelViewProps, "onOpenProviderSettings" | "providerLabel">): React.JSX.Element {
  return (
    <ThreadPrimitive.Root className="relative flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 overscroll-contain scrollbar-hidden">
        <ThreadPrimitive.Empty>
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
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto pt-7">
          <ChatComposer />
          <ProviderMetaBar onOpenProviderSettings={onOpenProviderSettings} providerLabel={providerLabel} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

function UserMessage(): React.JSX.Element {
  return (
    <MessagePrimitive.Root className="mb-6 flex justify-end pl-10">
      <div className="max-w-full rounded-[1.3rem] rounded-br-md bg-primary px-4 py-2.5 text-[13px] leading-5.5 text-primary-foreground shadow-sm select-text">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage(): React.JSX.Element {
  return (
    <MessagePrimitive.Root className="mb-7 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2.5 pr-3">
      <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PhChatCircleDotsDuotone className="size-3" />
      </div>
      <div className="min-w-0">
        <p className="mb-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Assistant</p>
        <div className="text-[13px] leading-5.5 whitespace-pre-wrap text-foreground select-text">
          <MessagePrimitive.Parts components={{ Text: ChatText }} />
          <MessagePrimitive.Error>
            <p className="mt-2 rounded-2xl bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
              The provider could not complete this message. Check your provider settings and try again.
            </p>
          </MessagePrimitive.Error>
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

function ChatText(): React.JSX.Element {
  return <MessagePartPrimitive.Text component="p" />
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

function ChatComposer(): React.JSX.Element {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-2 rounded-[1.35rem] border border-foreground/10 bg-background/55 p-1.5 backdrop-blur-xl transition-[background-color,border-color,box-shadow] focus-within:border-primary/60 focus-within:bg-background/65 focus-within:ring-3 focus-within:ring-primary/12">
      <ComposerPrimitive.Input
        aria-label="Message"
        placeholder="Message Assistant"
        className="max-h-36 min-h-9 flex-1 resize-none bg-transparent px-2.5 py-2 text-[13px] leading-5 outline-none placeholder:text-muted-foreground"
      />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-[background-color,transform] hover:bg-primary/85 active:scale-95 disabled:opacity-35" aria-label="Send message">
          <PhArrowFatUpDuotone className="size-4" />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background" aria-label="Stop response">
          <PhCircleDashedDuotone className="size-4 animate-spin" />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  )
}
