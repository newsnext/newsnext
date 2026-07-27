import process from "node:process"

export interface CliWritable {
  write: (value: string) => unknown
}

export interface CliIO {
  stdout: CliWritable
  stderr: CliWritable
}

export const processIO: CliIO = {
  stdout: process.stdout,
  stderr: process.stderr,
}

export function writeLine(stream: CliWritable, value = ""): void {
  stream.write(`${value}\n`)
}
