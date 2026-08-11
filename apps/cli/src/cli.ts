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
import { FETCH_ARGS, runFetchCommand } from "./fetch"
import { writeLine } from "./io"
import {
  runHistoryCompareCommand,
  runHistoryDatasetsCommand,
  runHistoryGetCommand,
  runHistoryObservationsCommand,
  SOURCE_HISTORY_COMPARE_ARGS,
  SOURCE_HISTORY_DATASETS_ARGS,
  SOURCE_HISTORY_GET_ARGS,
  SOURCE_HISTORY_OBSERVATIONS_ARGS,
} from "./source-history"
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
  const fetch = defineCommand({
    meta: {
      name: "fetch",
      description: "Fetch a URL in a connected extension with browser cookies",
    },
    args: FETCH_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runFetchCommand(rawArgs, io)),
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
  const historyDatasets = defineCommand({
    meta: {
      name: "datasets",
      description: "List locally stored source-history datasets",
    },
    args: SOURCE_HISTORY_DATASETS_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runHistoryDatasetsCommand(rawArgs, io)),
  })
  const historyObservations = defineCommand({
    meta: {
      name: "observations",
      description: "List observation metadata for a source and parameter set",
    },
    args: SOURCE_HISTORY_OBSERVATIONS_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runHistoryObservationsCommand(rawArgs, io)),
  })
  const historyGet = defineCommand({
    meta: {
      name: "get",
      description: "Read the complete items from an exact source observation",
    },
    args: SOURCE_HISTORY_GET_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runHistoryGetCommand(rawArgs, io)),
  })
  const historyCompare = defineCommand({
    meta: {
      name: "compare",
      description: "Compare two exact source observations",
    },
    args: SOURCE_HISTORY_COMPARE_ARGS,
    run: ({ rawArgs }) => runWithExitCode(() => runHistoryCompareCommand(rawArgs, io)),
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

  let history: CommandDef
  const historyHelp = defineCommand({
    meta: {
      name: "help",
      description: "Show source-history command help",
      hidden: true,
    },
    run: () => writeUsage(io, history),
  })
  history = defineCommand({
    meta: {
      name: "history",
      description: "Inspect locally observed source history",
    },
    default: "help",
    subCommands: {
      compare: historyCompare,
      datasets: historyDatasets,
      get: historyGet,
      help: historyHelp,
      observations: historyObservations,
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
      fetch,
      help: mainHelp,
      history,
      restart,
      source,
      start,
      status,
      stop,
    },
  })

  const helpWriters = new Map<string, () => Promise<void>>([
    ["fetch", () => writeUsage(io, fetch)],
    ["history", () => writeUsage(io, history)],
    ["history compare", () => writeUsage(io, historyCompare)],
    ["history datasets", () => writeUsage(io, historyDatasets)],
    ["history get", () => writeUsage(io, historyGet)],
    ["history observations", () => writeUsage(io, historyObservations)],
    ["restart", () => writeUsage(io, restart)],
    ["source", () => writeUsage(io, source)],
    ["source list", () => writeUsage(io, sourceList)],
    ["source run", () => writeUsage(io, sourceRun)],
    ["start", () => writeUsage(io, start)],
    ["status", () => writeUsage(io, status)],
    ["stop", () => writeUsage(io, stop)],
  ])

  return {
    helpWriters,
    history,
    historyCompare,
    historyDatasets,
    historyGet,
    historyObservations,
    main,
    fetch,
    restart,
    source,
    sourceList,
    sourceRun,
    start,
    status,
    stop,
  }
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
    const commandPath = args.slice(0, 2).filter(argument => !argument.startsWith("-")).join(" ")
    const writeCommandUsage = commands.helpWriters.get(commandPath)
    await (writeCommandUsage ? writeCommandUsage() : writeUsage(io, commands.main))
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
