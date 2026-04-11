/**
 * Base properties shared by all parameter types
 */
interface BaseParameter<TOutput = unknown> {
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
   * Optional runtime parser for raw input values
   */
  parse?: (value: unknown) => TOutput
  /**
   * Optional runtime validator. Return true for success or a message for failures.
   */
  validate?: (value: TOutput) => boolean | string
  /**
   * Phantom runtime output type used for inference only
   */
  readonly __output?: TOutput
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
export interface SelectParameter<K extends string = string> extends BaseParameter<K> {
  type: "select"
  /**
   * Available options
   */
  options: SelectOption<K>[]
  /**
   * Default selected value
   */
  default: K
}

/**
 * Multi-select parameter
 */
export interface MultiSelectParameter<K extends string = string> extends BaseParameter<K[]> {
  type: "multiselect"
  /**
   * Available options
   */
  options: SelectOption<K>[]
  /**
   * Default selected values
   */
  default: K[]
}

/**
 * Text input parameter
 */
export interface TextParameter<TOutput = string> extends BaseParameter<TOutput> {
  type: "text"
  /**
   * Default text value
   */
  default: string
}

/**
 * URL input parameter
 */
export interface UrlParameter<TOutput = string> extends BaseParameter<TOutput> {
  type: "url"
  /**
   * Default URL value
   */
  default: string
}

/**
 * Number input parameter
 */
export interface NumberParameter<TOutput = number> extends BaseParameter<TOutput> {
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
export interface SwitchParameter<TOutput = boolean> extends BaseParameter<TOutput> {
  type: "switch"
  /**
   * Default boolean value
   */
  default: boolean
}

/**
 * Union of all parameter types
 */
export type FeedParamSchema
  = | SelectParameter<any>
    | MultiSelectParameter<any>
    | TextParameter<any>
    | SwitchParameter<any>
    | NumberParameter<any>
    | UrlParameter<any>

/**
 * Map of parameter keys to parameter definitions
 */
export type FeedParamSchemaMap = Record<string, FeedParamSchema>

/**
 * Infer the runtime value type for a parameter
 */
export type InferFeedParamValue<TParam extends FeedParamSchema>
  = TParam extends { parse?: ((value: unknown) => infer TOutput) | undefined }
    ? TOutput
    : TParam["default"]

/**
 * Infer runtime values for a parameter map
 */
export type InferFeedParams<TParams extends FeedParamSchemaMap> = {
  [K in keyof TParams]: InferFeedParamValue<TParams[K]>
}

export class FeedParamValueError extends Error {
  readonly paramTitle: string

  constructor(paramTitle: string, message: string) {
    super(message)
    this.name = "FeedParamValueError"
    this.paramTitle = paramTitle
  }
}

/**
 * Type guard utilities for parameter types
 */
export const FeedParamGuards = {
  /**
   * Check if parameter is a number parameter
   */
  isNumber(param: FeedParamSchema): param is NumberParameter {
    return param.type === "number"
  },
  /**
   * Check if parameter is a select parameter
   */
  isSelect(param: FeedParamSchema): param is SelectParameter {
    return param.type === "select"
  },
  /**
   * Check if parameter is a multi-select parameter
   */
  isMultiSelect(param: FeedParamSchema): param is MultiSelectParameter {
    return param.type === "multiselect"
  },
  /**
   * Check if parameter is a text parameter
   */
  isText(param: FeedParamSchema): param is TextParameter {
    return param.type === "text"
  },
  /**
   * Check if parameter is a URL parameter
   */
  isUrl(param: FeedParamSchema): param is UrlParameter {
    return param.type === "url"
  },
  /**
   * Check if parameter is a switch parameter
   */
  isSwitch(param: FeedParamSchema): param is SwitchParameter {
    return param.type === "switch"
  },
}
