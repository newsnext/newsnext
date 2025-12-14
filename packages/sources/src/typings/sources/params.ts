interface BaseParameter {
  title: string
  description?: string
  icon?: string
}

export interface SelectOption<K extends string> {
  label: string
  value: K
}

export interface SelectParameter<K extends string = string> extends BaseParameter {
  type: "select"
  options: SelectOption<K>[]
  default: K
}

export interface MultiSelectParameter<K extends string = string> extends BaseParameter {
  type: "multiselect"
  options: SelectOption<K>[]
  default: K[]
}

export interface TextParameter extends BaseParameter {
  type: "text"
  default: string
}

export interface UrlParameter extends BaseParameter {
  type: "url"
  default: string
}

export interface NumberParameter extends BaseParameter {
  type: "number"
  default: number
  min?: number
  max?: number
  step?: number
}

export interface SwitchParameter extends BaseParameter {
  type: "switch"
  default: boolean
}

export type Parameter = SelectParameter | MultiSelectParameter | TextParameter | SwitchParameter | NumberParameter | UrlParameter

export const ParameterAsserts = {
  isNumber(param: Parameter): param is NumberParameter {
    return param.type === "number"
  },
  isSelect(param: Parameter): param is SelectParameter {
    return param.type === "select"
  },
  isMultiSelect(param: Parameter): param is MultiSelectParameter {
    return param.type === "multiselect"
  },
  isText(param: Parameter): param is TextParameter {
    return param.type === "text"
  },
  isUrl(param: Parameter): param is UrlParameter {
    return param.type === "url"
  },
  isSwitch(param: Parameter): param is SwitchParameter {
    return param.type === "switch"
  },
}
