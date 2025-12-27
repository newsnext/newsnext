/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  /**
   * Whether the request was successful
   */
  success: boolean
  /**
   * Response data (present on success)
   */
  data?: T
  /**
   * Error information (present on failure)
   */
  error?: {
    /**
     * Error code for programmatic handling
     */
    code: string
    /**
     * Human-readable error message
     */
    message: string
  }
}
