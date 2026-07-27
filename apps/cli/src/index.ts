#!/usr/bin/env bun

import process from "node:process"
import { runMain } from "citty"
import { createNewsnextCommand } from "./cli"
import { processIO } from "./io"

await runMain(createNewsnextCommand(
  processIO,
  exitCode => process.exitCode = exitCode,
))
