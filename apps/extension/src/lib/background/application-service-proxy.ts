import type {
  ApplicationAction,
  ApplicationActionResult,
  ApplicationData,
  ApplicationQuery,
  ApplicationQueryResult,
} from "../application"
import {
  executeBackgroundApplicationAction,
  executeBackgroundApplicationQuery,
  replaceBackgroundApplicationData,
} from "./application-service"

export interface BackgroundApplicationService {
  execute: (action: ApplicationAction) => Promise<ApplicationActionResult>
  query: <Query extends ApplicationQuery>(query: Query) => Promise<ApplicationQueryResult<Query>>
  replace: (data: ApplicationData) => Promise<ApplicationData>
}

export function createBackgroundApplicationService(): BackgroundApplicationService {
  return {
    execute: executeBackgroundApplicationAction,
    query: executeBackgroundApplicationQuery,
    replace: replaceBackgroundApplicationData,
  }
}
