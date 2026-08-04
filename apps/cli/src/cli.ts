import type { ArgsDef, CommandDef } from "citty"
import type { CliIO } from "./io"
import { defineCommand, renderUsage, runCommand } from "citty"
import packageJson from "../package.json"
import {
  DAEMON_COMMAND_ARGS,
  runDaemon,
  runRestartCommand,
  runStartCommand,
  runStatusCommand,
  runStopCommand,
} from "./daemon"
import { CliError } from "./errors"
import { writeLine } from "./io"
import { runSourceListCommand, SOURCE_LIST_ARGS } from "./source-list"
import { runSourceRunCommand } from "./source-run/command"
import { SOURCE_RUN_ARGS } from "./source-run/options"

const VERSION = packageJson.version

type ExitCodeHandler = (exitCode: number) => void

async function writeUsage<T extends ArgsDef>(
  io: CliIO,
  command: CommandDef<T>,
): Promise<void> {
  writeLine(io.stdout, await renderUsage(command))
}

function createCommandSet(io: CliIO, setExitCode: ExitCodeHandler) {
  const runWithExitCode = async (command: () => Promise<number>): Promise<void> => {
    try {
      setExitCode(await command())
    } catch (error) {
      const cliError = error instanceof CliError
        ? error
        : new CliError(error instanceof Error ? error.message : String(error))
      writeLine(io.stderr, cliError.message)
      setExitCode(cliError.exitCode)
    }
  }

  const start = defineCommand({
    meta: {
      name: "start",
      description: "Start the NewsNext background server",
    },
    args: DAEMON_COMMAND_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runStartCommand(rawArgs, io)),
  })
  const status = defineCommand({
    meta: {
      name: "status",
      description: "Show server and extension connection status",
    },
    args: DAEMON_COMMAND_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runStatusCommand(rawArgs, io)),
  })
  const restart = defineCommand({
    meta: {
      name: "restart",
      description: "Restart the NewsNext background server",
    },
    args: DAEMON_COMMAND_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runRestartCommand(rawArgs, io)),
  })
  const stop = defineCommand({
    meta: {
      name: "stop",
      description: "Stop the NewsNext background server",
    },
    args: DAEMON_COMMAND_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runStopCommand(rawArgs, io)),
  })
  const sourceRun = defineCommand({
    meta: {
      name: "run",
      description: "Run a registered or local JSON source in a connected extension",
    },
    args: SOURCE_RUN_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runSourceRunCommand(rawArgs, io)),
  })
  const sourceList = defineCommand({
    meta: {
      name: "list",
      description: "List sources registered in a connected extension",
    },
    args: SOURCE_LIST_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runSourceListCommand(rawArgs, io)),
  })

  let source: CommandDef
  const sourceHelp = defineCommand({
    meta: {
      name: "help",
      description: "Show source command help",
      hidden: true,
    },
    run: () => writeUsage(io, source),
  })
  source = defineCommand({
    meta: {
      name: "source",
      description: "Source authoring commands",
    },
    default: "help",
    subCommands: {
      help: sourceHelp,
      list: sourceList,
      run: sourceRun,
    },
  })

  let main: CommandDef
  const mainHelp = defineCommand({
    meta: {
      name: "help",
      description: "Show help",
      hidden: true,
    },
    run: () => writeUsage(io, main),
  })
  const daemon = defineCommand({
    meta: {
      name: "__daemon",
      description: "Run the internal NewsNext daemon",
      hidden: true,
    },
    args: DAEMON_COMMAND_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runDaemon(rawArgs)),
  })
  main = defineCommand({
    meta: {
      name: "newsnext",
      version: VERSION,
      description: "NewsNext command-line tools",
    },
    default: "help",
    subCommands: {
      __daemon: daemon,
      help: mainHelp,
      restart,
      source,
      start,
      status,
      stop,
    },
  })

  return { main, restart, source, sourceList, sourceRun, start, status, stop }
}

export function createNewsnextCommand(
  io: CliIO,
  setExitCode: ExitCodeHandler = () => {},
): CommandDef {
  return createCommandSet(io, setExitCode).main
}

export async function runCli(args: string[], io: CliIO): Promise<number> {
  let exitCode = 0
  const commands = createCommandSet(io, value => exitCode = value)

  if (args.includes("--help") || args.includes("-h")) {
    if (args[0] === "source" && args[1] === "list") {
      await writeUsage(io, commands.sourceList)
    } else if (args[0] === "source" && args[1] === "run") {
      await writeUsage(io, commands.sourceRun)
    } else if (args[0] === "source") {
      await writeUsage(io, commands.source)
    } else if (args[0] === "start") {
      await writeUsage(io, commands.start)
    } else if (args[0] === "restart") {
      await writeUsage(io, commands.restart)
    } else if (args[0] === "status") {
      await writeUsage(io, commands.status)
    } else if (args[0] === "stop") {
      await writeUsage(io, commands.stop)
    } else {
      await writeUsage(io, commands.main)
    }
    return 0
  }
  if (args.length === 1 && (args[0] === "--version" || args[0] === "-V")) {
    writeLine(io.stdout, VERSION)
    return 0
  }

  try {
    await runCommand(commands.main, { rawArgs: args })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeLine(io.stderr, message)
    writeLine(io.stderr, "Run newsnext --help to see available commands.")
    return 2
  }
  return exitCode
}
