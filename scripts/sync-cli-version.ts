import { readFile, writeFile } from "node:fs/promises"

const cargoManifestUrl = new URL("../Cargo.toml", import.meta.url)
const cargoLockUrl = new URL("../Cargo.lock", import.meta.url)
const workspaceVersionPattern = /(^\[workspace\.package\]\n(?:(?!\[)[^\n]*\n)*?version\s*=\s*")[^"]+("\s*$)/m
const lockedPackageVersionPattern = /(^\[\[package\]\]\nname = "newsnext"\nversion = ")[^"]+("\s*$)/m

export async function syncCliVersion(version: string): Promise<void> {
  await Promise.all([
    replaceVersion(cargoManifestUrl, workspaceVersionPattern, version),
    replaceVersion(cargoLockUrl, lockedPackageVersionPattern, version),
  ])
}

async function replaceVersion(file: URL, pattern: RegExp, version: string): Promise<void> {
  const contents = await readFile(file, "utf8")

  if (!pattern.test(contents)) {
    throw new Error(`Could not find the CLI version in ${file.pathname}`)
  }

  const updated = contents.replace(pattern, `$1${version}$2`)
  if (updated !== contents) {
    await writeFile(file, updated)
  }
}
