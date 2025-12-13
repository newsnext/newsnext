interface Base {
  title: string
  description?: string
  optional?: boolean
  icon?: string
}

export interface Option<K extends string> {
  label: string
  value: K
}

export interface Select<K extends string = string> extends Base {
  type: "select"
  options: Option<K>[]
  default: K
}

export interface MulitSelect<K extends string = string> extends Base {
  type: "multiselect"
  options: Option<K>[]
  default: K[]
}

interface Text extends Base {
  type: "text"
  default: string
}

interface Number extends Base {
  type: "number"
  default: number
  min?: number
  max?: number
  step?: number
}

interface Switch extends Base {
  type: "switch"
  default: boolean
}

export type Parameter = Select | MulitSelect | Text | Switch | Number

export const ParameterAsserts = {
  isNumber(param: Parameter): param is Number {
    return param.type === "number"
  },
  isSelect(param: Parameter): param is Select {
    return param.type === "select"
  },
  isMulitSelect(param: Parameter): param is MulitSelect {
    return param.type === "multiselect"
  },
  isText(param: Parameter): param is Text {
    return param.type === "text"
  },
  isSwitch(param: Parameter): param is Switch {
    return param.type === "switch"
  },
}
