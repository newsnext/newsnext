#!/usr/bin/env bun
import { runCli } from "./cli"

const exitCode = await runCli({
  args: Bun.argv.slice(2),
  stdout: (message) => {
    console.log(message)
  },
  stderr: (message) => {
    console.error(message)
  },
})

process.exit(exitCode)
