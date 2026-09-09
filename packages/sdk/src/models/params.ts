/**
 * Base properties shared by all parameter types
 */
export type SourceParamValidation
  = | { format: "digits" }
    | { regex: string }

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
   * Whether an empty value is invalid
   */
  required?: boolean
  /**
   * Optional serializable validation applied after type normalization
   */
  validate?: SourceParamValidation
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
  constructor(message: string) {
    super(message)
    this.name = "SourceParamValueError"
  }
}
