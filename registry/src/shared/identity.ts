export const identityParam = {
  type: "text",
  title: "Identity",
  description: "Uniquely identifies the signed-in user so personalized data remains separate. This value is not sent to the provider.",
  default: "",
} as const

export interface IdentityParams {
  identity: string
}

export async function assertIdentity(
  expectedIdentity: string,
  resolveActualIdentity: () => string | undefined | Promise<string | undefined>,
  provider: string,
): Promise<void> {
  const expected = expectedIdentity.trim().toLowerCase()
  if (!expected) return
  const actual = (await resolveActualIdentity())?.trim().toLowerCase()
  if (!actual) {
    throw new Error(`Cannot determine the signed-in ${provider} user.`)
  }
  if (expected !== actual) {
    throw new Error(
      `The signed-in ${provider} user changed. Recreate this source for the current user.`,
    )
  }
}
