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
  options: SelectOption<K>[]
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
  options: SelectOption<K>[]
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
export type Parameter = SelectParameter | MultiSelectParameter | TextParameter | SwitchParameter | NumberParameter | UrlParameter

/**
 * Type guard utilities for parameter types
 */
export const ParameterAsserts = {
  /**
   * Check if parameter is a number parameter
   */
  isNumber(param: Parameter): param is NumberParameter {
    return param.type === "number"
  },
  /**
   * Check if parameter is a select parameter
   */
  isSelect(param: Parameter): param is SelectParameter {
    return param.type === "select"
  },
  /**
   * Check if parameter is a multi-select parameter
   */
  isMultiSelect(param: Parameter): param is MultiSelectParameter {
    return param.type === "multiselect"
  },
  /**
   * Check if parameter is a text parameter
   */
  isText(param: Parameter): param is TextParameter {
    return param.type === "text"
  },
  /**
   * Check if parameter is a URL parameter
   */
  isUrl(param: Parameter): param is UrlParameter {
    return param.type === "url"
  },
  /**
   * Check if parameter is a switch parameter
   */
  isSwitch(param: Parameter): param is SwitchParameter {
    return param.type === "switch"
  },
}
