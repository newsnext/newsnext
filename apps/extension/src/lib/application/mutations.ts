import type { Color } from "@newsnext/shared/types"
import type { Board, BoardLayer, NowLayerSortMode } from "../board"
import type { InstancePatch } from "../source/live-cards"
import type { ApplicationData } from "./data"
import { createBoard } from "../board"
import { mergeInstancePatch } from "../source/live-cards"

export interface BoardConfiguration {
  color?: Color
  defaultLayer?: BoardLayer
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
