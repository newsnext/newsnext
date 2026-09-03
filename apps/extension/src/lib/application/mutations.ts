import type { Color } from "@newsnext/shared/types"
import type {
  Board,
  BoardLayer,
  NextLayerWidgetDataScope,
  NextLayerWidgetLayout,
  NowLayerSortMode,
} from "../board"
import type { InstancePatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { createBoard } from "../board"
import { mergeInstancePatch } from "../source/live-cards"

export interface BoardConfiguration {
  color?: Color
  defaultLayer?: BoardLayer
  illustration?: Board["illustration"]
  sortMode?: NowLayerSortMode
}

interface ApplicationInstanceCreationInput {
  patch: InstancePatch
  sourceId: string
}

export type BoardDeleteInput
  = | { boardId: string, deleteInstances: true, targetBoardId?: never }
    | { boardId: string, deleteInstances?: never, targetBoardId: string }

export interface ApplicationMutationDependencies {
  createId: () => string
  now: () => number
  workerId: string
}

export interface ApplicationMutationExecution {
  data: ApplicationData
  result?: ApplicationMutationResult
}

export interface ApplicationMutationResult {
  boardId?: string
  instanceId?: string
}

export function createBoardMutation(
  data: ApplicationData,
  input: BoardConfiguration & {
    instances?: ApplicationInstanceCreationInput[]
    name: string
  },
  dependencies: ApplicationMutationDependencies,
): ApplicationMutationExecution {
  const name = input.name.trim()
  assertBoardName(name)
  const boardId = dependencies.createId()
  const board = configureBoard(
    createBoard(boardId, name, dependencies.now()),
    input,
  )
  let nextData: ApplicationData = {
    ...data,
    boards: [...data.boards, board],
  }
  for (const instance of input.instances ?? []) {
    nextData = createInstanceMutation(nextData, {
      ...instance,
      boardIds: [boardId],
    }, dependencies).data
  }
  return { data: nextData, result: { boardId } }
}

export function updateBoardMutation(
  data: ApplicationData,
  input: BoardConfiguration & { boardId: string, name?: string },
): ApplicationMutationExecution {
  assertBoardExists(data, input.boardId)
  if (input.name === undefined
    && input.color === undefined
    && input.defaultLayer === undefined
    && input.illustration === undefined
    && input.sortMode === undefined) {
    throw new Error("Board update requires at least one change")
  }
  const name = input.name?.trim()
  if (name !== undefined) assertBoardName(name)
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === input.boardId
        ? configureBoard({
            ...board,
            ...(name !== undefined ? { name } : {}),
          }, input)
        : board),
    },
  }
}

export function deleteBoardMutation(
  data: ApplicationData,
  input: BoardDeleteInput,
): ApplicationMutationExecution {
  const { boardId, targetBoardId } = input
  const deleteInstances = input.deleteInstances === true
  const board = getBoard(data, boardId)
  if (data.boards.length === 1) throw new Error("NewsNext must keep at least one Board")
  if (!deleteInstances) {
    if (targetBoardId === undefined) throw new Error("Board deletion requires a transfer target")
    if (targetBoardId === boardId) {
      throw new Error("Board transfer target must differ from the deleted Board")
    }
    assertBoardExists(data, targetBoardId)
  }
  const instances = deleteInstances
    ? data.instances.filter(instance => !getExclusiveBoardInstanceIds(data, boardId).has(instance.instanceId))
    : data.instances
  return {
    data: {
      ...data,
      boards: data.boards.flatMap((candidate) => {
        if (candidate.id === boardId) return []
        if (!deleteInstances && candidate.id === targetBoardId) {
          return [board.instanceIds.toReversed().reduce(addInstanceToBoard, candidate)]
        }
        return [candidate]
      }),
      instances,
    },
  }
}

export function setNowLayerManualOrderMutation(
  data: ApplicationData,
  input: { boardId: string, instanceIds: string[] },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertCompleteInstanceOrder(board.instanceIds, input.instanceIds)
  return {
    data: {
      ...data,
      boards: data.boards.map(candidate => candidate.id === input.boardId
        ? {
            ...candidate,
            nowLayer: {
              ...candidate.nowLayer,
              sort: { ...candidate.nowLayer.sort, mode: "manual", manualOrder: input.instanceIds },
            },
          }
        : candidate),
    },
  }
}

export function installNextLayerWidgetMutation(
  data: ApplicationData,
  input: {
    boardId: string
    dataScope: NextLayerWidgetDataScope
    layout: NextLayerWidgetLayout
    widgetId: string
  },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetId(input.widgetId)
  assertWidgetDataScope(board, input.dataScope)
  assertWidgetLayout(input.layout)
  if (board.nextLayer.widgets.some(widget => widget.widgetId === input.widgetId)) {
    throw new Error(`Widget '${input.widgetId}' is already installed in Board '${input.boardId}'`)
  }
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      widgets: [...board.nextLayer.widgets, {
        dataScope: input.dataScope,
        layout: input.layout,
        widgetId: input.widgetId,
      }],
    },
  })
}

export function removeNextLayerWidgetMutation(
  data: ApplicationData,
  input: { boardId: string, widgetId: string },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      widgets: board.nextLayer.widgets.filter(widget => widget.widgetId !== input.widgetId),
    },
  })
}

export function setNextLayerWidgetDataScopeMutation(
  data: ApplicationData,
  input: { boardId: string, dataScope: NextLayerWidgetDataScope, widgetId: string },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  assertWidgetInstalled(board, input.widgetId)
  assertWidgetDataScope(board, input.dataScope)
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      widgets: board.nextLayer.widgets.map(widget => widget.widgetId === input.widgetId
        ? { ...widget, dataScope: input.dataScope }
        : widget),
    },
  })
}

export function setNextLayerWidgetLayoutsMutation(
  data: ApplicationData,
  input: {
    boardId: string
    widgets: Array<{ layout: NextLayerWidgetLayout, widgetId: string }>
  },
): ApplicationMutationExecution {
  const board = getBoard(data, input.boardId)
  const updates = new Map<string, NextLayerWidgetLayout>()
  for (const widget of input.widgets) {
    assertWidgetInstalled(board, widget.widgetId)
    assertWidgetLayout(widget.layout)
    if (updates.has(widget.widgetId)) throw new Error("Widget layout update IDs must be unique")
    updates.set(widget.widgetId, widget.layout)
  }
  if (updates.size === 0) throw new Error("At least one Widget layout is required")
  return replaceBoard(data, {
    ...board,
    nextLayer: {
      widgets: board.nextLayer.widgets.map(widget => ({
        ...widget,
        layout: updates.get(widget.widgetId) ?? widget.layout,
      })),
    },
  })
}

export function addBoardInstanceMutation(
  data: ApplicationData,
  input: { boardId: string, instanceId: string },
): ApplicationMutationExecution {
  assertBoardExists(data, input.boardId)
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === input.boardId
        ? addInstanceToBoard(board, input.instanceId)
        : board),
    },
  }
}

export function removeBoardInstanceMutation(
  data: ApplicationData,
  input: { boardId: string, instanceId: string },
): ApplicationMutationExecution {
  assertBoardExists(data, input.boardId)
  assertInstanceExists(data, input.instanceId)
  const membershipCount = data.boards.filter(board => board.instanceIds.includes(input.instanceId)).length
  if (membershipCount <= 1 && getBoard(data, input.boardId).instanceIds.includes(input.instanceId)) {
    throw new Error("A LiveCard must belong to at least one Board")
  }
  return {
    data: {
      ...data,
      boards: data.boards.map(board => board.id === input.boardId
        ? removeInstanceFromBoard(board, input.instanceId)
        : board),
    },
  }
}

export function createInstanceMutation(
  data: ApplicationData,
  input: ApplicationInstanceCreationInput & { boardIds: string[] },
  dependencies: ApplicationMutationDependencies,
): ApplicationMutationExecution {
  const { boardIds, patch, sourceId } = input
  if (!sourceId.trim()) throw new Error("Source ID is required")
  const uniqueBoardIds = [...new Set(boardIds)]
  if (uniqueBoardIds.length === 0) throw new Error("A LiveCard must belong to at least one Board")
  for (const boardId of uniqueBoardIds) assertBoardExists(data, boardId)
  const instanceId = `${sourceId}::${dependencies.createId()}`
  if (data.instances.some(instance => instance.instanceId === instanceId)) {
    throw new Error(`Instance '${instanceId}' already exists`)
  }
  return {
    data: {
      ...data,
      instances: [...data.instances, {
        instanceId,
        workerId: dependencies.workerId,
        sourceId,
        patch,
        createdAt: dependencies.now(),
      }],
      boards: data.boards.map(board => uniqueBoardIds.includes(board.id)
        ? addInstanceToBoard(board, instanceId)
        : board),
    },
    result: { instanceId },
  }
}

export function configureInstanceMutation(
  data: ApplicationData,
  input: { instanceId: string, patch: InstancePatch },
): ApplicationMutationExecution {
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      instances: data.instances.map(instance => instance.instanceId === input.instanceId
        ? { ...instance, patch: mergeInstancePatch(instance.patch, input.patch) }
        : instance),
    },
  }
}

export function resetInstanceParamsMutation(
  data: ApplicationData,
  input: { instanceId: string },
): ApplicationMutationExecution {
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      instances: data.instances.map(instance => instance.instanceId === input.instanceId
        ? { ...instance, patch: { ...instance.patch, params: {} } }
        : instance),
    },
  }
}

export function deleteInstanceMutation(
  data: ApplicationData,
  input: { instanceId: string },
): ApplicationMutationExecution {
  assertInstanceExists(data, input.instanceId)
  return {
    data: {
      ...data,
      instances: data.instances.filter(instance => instance.instanceId !== input.instanceId),
      boards: data.boards.map(board => removeInstanceFromBoard(board, input.instanceId)),
    },
  }
}

function addInstanceToBoard(board: Board, instanceId: string): Board {
  if (board.instanceIds.includes(instanceId)) return board
  const manualOrder = [
    instanceId,
    ...board.nowLayer.sort.manualOrder.filter(candidate => candidate !== instanceId),
  ]
  return {
    ...board,
    instanceIds: [instanceId, ...board.instanceIds],
    nowLayer: {
      ...board.nowLayer,
      sort: { ...board.nowLayer.sort, manualOrder },
    },
  }
}

function removeInstanceFromBoard(board: Board, instanceId: string): Board {
  if (!board.instanceIds.includes(instanceId)) return board
  return {
    ...board,
    instanceIds: board.instanceIds.filter(candidate => candidate !== instanceId),
    nowLayer: {
      ...board.nowLayer,
      sort: {
        ...board.nowLayer.sort,
        manualOrder: board.nowLayer.sort.manualOrder.filter(candidate => candidate !== instanceId),
      },
    },
    nextLayer: {
      widgets: board.nextLayer.widgets.map(widget => widget.dataScope.type === "instances"
        ? {
            ...widget,
            dataScope: {
              ...widget.dataScope,
              instanceIds: widget.dataScope.instanceIds.filter(candidate => candidate !== instanceId),
            },
          }
        : widget),
    },
  }
}

function getExclusiveBoardInstanceIds(
  data: ApplicationData,
  boardId: string,
): Set<string> {
  const board = getBoard(data, boardId)
  const otherBoardInstanceIds = new Set(data.boards
    .filter(candidate => candidate.id !== boardId)
    .flatMap(candidate => candidate.instanceIds))
  return new Set(board.instanceIds.filter(instanceId => !otherBoardInstanceIds.has(instanceId)))
}

function configureBoard(
  board: Board,
  configuration: BoardConfiguration,
): Board {
  const sortMode = configuration.sortMode ?? board.nowLayer.sort.mode
  return {
    ...board,
    ...(configuration.color !== undefined ? { color: configuration.color } : {}),
    ...(configuration.defaultLayer !== undefined ? { defaultLayer: configuration.defaultLayer } : {}),
    ...(configuration.illustration !== undefined ? { illustration: configuration.illustration } : {}),
    nowLayer: {
      ...board.nowLayer,
      sort: {
        ...board.nowLayer.sort,
        mode: sortMode,
        automaticMode: sortMode === "manual"
          ? board.nowLayer.sort.automaticMode
          : sortMode,
      },
    },
  }
}

function assertCompleteInstanceOrder(existingIds: string[], requestedIds: string[]): void {
  const existing = new Set(existingIds)
  const requested = new Set(requestedIds)
  if (requested.size !== requestedIds.length
    || requested.size !== existing.size
    || requestedIds.some(instanceId => !existing.has(instanceId))) {
    throw new Error("Manual order must contain every Board Instance exactly once")
  }
}

function getBoard(data: ApplicationData, boardId: string): Board {
  const board = data.boards.find(candidate => candidate.id === boardId)
  if (!board) throw new Error(`Board '${boardId}' not found`)
  return board
}

function assertBoardExists(data: ApplicationData, boardId: string): void {
  getBoard(data, boardId)
}

function assertInstanceExists(data: ApplicationData, instanceId: string): void {
  if (!data.instances.some(instance => instance.instanceId === instanceId)) {
    throw new Error(`Instance '${instanceId}' not found`)
  }
}

function assertBoardName(name: string): void {
  if (!name) throw new Error("Board name is required")
}

function replaceBoard(data: ApplicationData, board: Board): ApplicationMutationExecution {
  return {
    data: {
      ...data,
      boards: data.boards.map(candidate => candidate.id === board.id ? board : candidate),
    },
  }
}

function assertWidgetId(widgetId: string): void {
  if (!widgetId || !/^[\w-]+$/.test(widgetId)) {
    throw new Error("Widget ID must contain only letters, numbers, '-' or '_'")
  }
}

function assertWidgetInstalled(board: Board, widgetId: string): void {
  if (!board.nextLayer.widgets.some(widget => widget.widgetId === widgetId)) {
    throw new Error(`Widget '${widgetId}' is not installed in Board '${board.id}'`)
  }
}

function assertWidgetDataScope(board: Board, dataScope: NextLayerWidgetDataScope): void {
  if (dataScope.type === "board") return
  const instanceIds = new Set(dataScope.instanceIds)
  if (instanceIds.size !== dataScope.instanceIds.length
    || dataScope.instanceIds.some(instanceId => !board.instanceIds.includes(instanceId))) {
    throw new Error("Widget data scope must contain unique Instances from its Board")
  }
}

function assertWidgetLayout(layout: NextLayerWidgetLayout): void {
  if (!Number.isInteger(layout.x)
    || layout.x < 0
    || !Number.isInteger(layout.y)
    || layout.y < 0
    || !Number.isInteger(layout.width)
    || layout.width < 1
    || layout.width > 12
    || layout.x + layout.width > 12
    || !Number.isInteger(layout.height)
    || layout.height < 1
    || layout.height > 100) {
    throw new Error("Widget layout is invalid")
  }
}
