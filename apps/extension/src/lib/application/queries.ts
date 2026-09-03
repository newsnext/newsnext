import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type { Board } from "../board"
import type { Instance } from "../source/live-cards"
import type { ApplicationData } from "./data"

export interface ApplicationBoardContext {
  boardId: string
  boardName: string
}

export interface ApplicationNowLayerLiveCard {
  boardId: string
  instanceId: string
  sourceId: string
}

export interface BoardConfigurationResult {
  color: Board["color"]
  defaultLayer: Board["defaultLayer"]
  nowLayer: Board["nowLayer"]
}

export interface BoardDetail {
  board: Board
  instances: Instance[]
}

export function listSourcesQuery(sources: readonly SourceDescriptor[]): SourceDescriptor[] {
  return [...sources]
}

export function getSourceQuery(
  sources: readonly SourceDescriptor[],
  input: { sourceId: string },
): SourceDescriptor {
  const source = sources.find(candidate => candidate.id === input.sourceId)
  if (!source) throw new Error(`Source '${input.sourceId}' not found`)
  return source
}

export function listBoardsQuery(data: ApplicationData): Board[] {
  return data.boards
}

export function getBoardQuery(
  data: ApplicationData,
  input: { boardId: string },
): BoardDetail {
  const board = getBoard(data, input.boardId)
  return { board, instances: resolveBoardInstances(data, board) }
}

export function listBoardInstancesQuery(
  data: ApplicationData,
  input: { boardId: string },
): Instance[] {
  return resolveBoardInstances(data, getBoard(data, input.boardId))
}

export function listInstancesQuery(data: ApplicationData): Instance[] {
  return data.instances
}

export function getInstanceQuery(
  data: ApplicationData,
  input: { instanceId: string },
): Instance {
  const instance = data.instances.find(candidate => candidate.instanceId === input.instanceId)
  if (!instance) throw new Error(`Instance '${input.instanceId}' not found`)
  return instance
}

export function getBoardContextQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  return resolveBoardContext(data, currentBoardId)
}

export function getBoardConfigurationQuery(
  data: ApplicationData,
  input: { boardId: string },
): BoardConfigurationResult {
  const { color, defaultLayer, nowLayer } = getBoard(data, input.boardId)
  return { color, defaultLayer, nowLayer }
}

export function getNowLayerLiveCardsQuery(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationNowLayerLiveCard[] {
  const context = resolveBoardContext(data, currentBoardId)
  const board = getBoard(data, context.boardId)
  return resolveBoardInstances(data, board).map(instance => ({
    boardId: board.id,
    instanceId: instance.instanceId,
    sourceId: instance.sourceId,
  }))
}

function resolveBoardContext(
  data: ApplicationData,
  currentBoardId?: string,
): ApplicationBoardContext {
  const board = data.boards.find(candidate => candidate.id === currentBoardId)
    ?? data.boards[0]
  if (!board) throw new Error("NewsNext has no Boards")
  return { boardId: board.id, boardName: board.name }
}

function getBoard(data: ApplicationData, boardId: string): Board {
  const board = data.boards.find(candidate => candidate.id === boardId)
  if (!board) throw new Error(`Board '${boardId}' not found`)
  return board
}

function resolveBoardInstances(
  data: ApplicationData,
  board: Board,
): Instance[] {
  const instances = new Map(data.instances.map(instance => [instance.instanceId, instance]))
  return board.instanceIds.flatMap((instanceId) => {
    const instance = instances.get(instanceId)
    return instance ? [instance] : []
  })
}
