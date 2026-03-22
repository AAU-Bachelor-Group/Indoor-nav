import { authClient } from "./auth-client"

export function useSession() {
  return authClient.useSession()
}

export function useIsLoggedIn() {
  const { data, isPending } = authClient.useSession()
  return {
    isLoggedIn: !!data?.session,
    isPending,
  }
}
