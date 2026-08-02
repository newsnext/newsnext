import type { PropsWithChildren, ReactNode } from "react"
import { QueryClient } from "@tanstack/react-query"
import { AppProvider } from "@/components/app-provider"

const queryClient = new QueryClient()

export default function CosmosDecorator({ children }: PropsWithChildren): ReactNode {
  return (
    <AppProvider queryClient={queryClient}>
      {children}
    </AppProvider>
  )
}
