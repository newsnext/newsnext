import { CliError } from "./errors"

export function collectRepeatedOption(
  args: string[],
  names: readonly string[],
): string[] {
  const values: string[] = []
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument && names.includes(argument)) {
      const value = args[index + 1]
      if (value === undefined) {
        throw new CliError(`${argument} requires a value`, 2)
      }
      values.push(value)
      index++
      continue
    }

    const name = names.find(candidate => argument?.startsWith(`${candidate}=`))
    if (name && argument) {
      values.push(argument.slice(name.length + 1))
    }
  }
  return values
}
