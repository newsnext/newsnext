/**
 * Base properties shared by all parameter types
 */
interface BaseParameter {
  /**
   * Display title for the parameter
   */
  title: string
  /**
   * Optional description explaining the parameter
   */
  description?: string
  /**
   * Optional icon identifier
   */
  icon?: string
  /**
   * Optional Liquid template applied to the raw value before type coercion.
   */
  template?: string
  /**
   * Optional serializable regular expression pattern for string-like values.
   */
  pattern?: string
  /**
   * Optional serializable prefix constraint for string-like values.
   */
  startsWith?: string
  /**
   * Optional serializable disallowed values for string-like values.
   */
  notIn?: string[]
}

/**
 * Option for select and multi-select parameters
 */
export interface SelectOption<K extends string> {
  /**
   * Display label for the option
   */
  label: string
  /**
   * Value of the option
   */
  value: K
}

/**
 * Single-select dropdown parameter
 */
export interface SelectParameter<K extends string = string> extends BaseParameter {
  type: "select"
  /**
   * Available options
   */
  values: readonly SelectOption<K>[]
  /**
   * Default selected value
   */
  default: K
}

/**
 * Multi-select parameter
 */
export interface MultiSelectParameter<K extends string = string> extends BaseParameter {
  type: "multiselect"
  /**
   * Available options
   */
  values: readonly SelectOption<K>[]
  /**
   * Default selected values
   */
  default: K[]
}

/**
 * Text input parameter
 */
export interface TextParameter extends BaseParameter {
  type: "text"
  /**
   * Default text value
   */
  default: string
}

/**
 * URL input parameter
 */
export interface UrlParameter extends BaseParameter {
  type: "url"
  /**
   * Default URL value
   */
  default: string
}

/**
 * Number input parameter
 */
export interface NumberParameter extends BaseParameter {
  type: "number"
  /**
   * Default numeric value
   */
  default: number
  /**
   * Minimum allowed value
   */
  min?: number
  /**
   * Maximum allowed value
   */
  max?: number
  /**
   * Step increment
   */
  step?: number
}

/**
 * Boolean switch parameter
 */
export interface SwitchParameter extends BaseParameter {
  type: "switch"
  /**
   * Default boolean value
   */
  default: boolean
}

/**
 * Union of all parameter types
 */
export type SourceParamSchema
  = | SelectParameter<any>
    | MultiSelectParameter<any>
    | TextParameter
    | SwitchParameter
    | NumberParameter
    | UrlParameter

/**
 * Map of parameter keys to parameter definitions
 */
export type SourceParamSchemaMap = Record<string, SourceParamSchema>

/**
 * Infer the runtime value type for a parameter
 */
export type InferSourceParamValue<TParam extends SourceParamSchema>
  = TParam["default"]

/**
 * Infer runtime values for a parameter map
 */
export type InferSourceParams<TParams extends SourceParamSchemaMap> = {
  [K in keyof TParams]: InferSourceParamValue<TParams[K]>
}

export class SourceParamValueError extends Error {
  readonly paramTitle: string

  constructor(paramTitle: string, message: string) {
    super(message)
    this.name = "SourceParamValueError"
    this.paramTitle = paramTitle
  }
}

/**
 * Type guard utilities for parameter types
 */
export const SourceParamGuards = {
  /**
   * Check if parameter is a number parameter
   */
  isNumber(param: SourceParamSchema): param is NumberParameter {
    return param.type === "number"
  },
  /**
   * Check if parameter is a select parameter
   */
  isSelect(param: SourceParamSchema): param is SelectParameter {
    return param.type === "select"
  },
  /**
   * Check if parameter is a multi-select parameter
   */
  isMultiSelect(param: SourceParamSchema): param is MultiSelectParameter {
    return param.type === "multiselect"
  },
  /**
   * Check if parameter is a text parameter
   */
  isText(param: SourceParamSchema): param is TextParameter {
    return param.type === "text"
  },
  /**
   * Check if parameter is a URL parameter
   */
  isUrl(param: SourceParamSchema): param is UrlParameter {
    return param.type === "url"
  },
  /**
   * Check if parameter is a switch parameter
   */
  isSwitch(param: SourceParamSchema): param is SwitchParameter {
    return param.type === "switch"
  },
}
