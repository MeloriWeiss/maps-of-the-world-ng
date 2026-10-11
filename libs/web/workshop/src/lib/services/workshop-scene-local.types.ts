import { MapSceneHeaderV4 } from '@wm/shared/workshop';

export type SceneEntityType = 'part' | 'container';
export type ScenePartKind = 'page' | 'tile' | 'container';
export type SceneCommitPhase =
  | 'preparing'
  | 'ready'
  | 'uploading'
  | 'publishing'
  | 'acknowledged'
  | 'conflict';

export interface SceneLocalDocument {
  documentKey: string;
  accountId: number;
  localDocumentId: string;
  mapId?: number;
  sourceMapId?: number;
  sourceRevision?: number;
  baseRevision: number;
  activeSeq: number;
  durableSeq: number;
  acknowledgedSeq: number;
  activeCommitId?: string;
  writerEpoch: number;
  writerId?: string;
  leaseUntil?: number;
}

export interface SceneWriterToken {
  documentKey: string;
  writerId: string;
  epoch: number;
}

export interface SceneLocalOperation {
  documentKey: string;
  seq: number;
  operationId: string;
  expectedRecords: number;
  status: 'writing' | 'complete';
}

export interface SceneLocalMutation {
  documentKey: string;
  seq: number;
  entityType: SceneEntityType;
  entityId: string;
  objectId?: string;
  instanceId?: string;
  /** Owner cells at the gesture boundary; pageId is assigned later by the page builder. */
  oldCell?: string;
  newCell?: string;
  oldBounds?: readonly [number, number, number, number];
  newBounds?: readonly [number, number, number, number];
  deleted: boolean;
  /** Exact serialized postimage; omitted for an explicit tombstone. */
  body?: string;
}

export interface SceneLocalCommit {
  version: 2;
  documentKey: string;
  localCommitId: string;
  cutSeq: number;
  /** Acknowledged journal boundary at the moment this commit was sealed. */
  fromSeq: number;
  expectedRevision: number;
  sourceMapId?: number;
  sourceRevision?: number;
  header: MapSceneHeaderV4;
  renderPalette: Readonly<Record<string, string>>;
  rendererVersion: number;
  state: SceneCommitPhase;
  pageCount: number;
  tileCount: number;
  containerCount: number;
  totalBytes: number;
  completedParts: number;
  serverCommitId?: string;
  attemptId?: string;
  idempotencyKey: string;
  publishedRevision?: number;
  dependencyCursor?: number;
  dependencyDigest?: string;
  dependenciesComplete?: boolean;
  bundleId?: string;
  bundleReady?: boolean;
  bundleFrameCount?: number;
  bundlePayloadBytes?: number;
  bundleDigest?: string;
  preparationStage?:
    | 'dependencies'
    | 'parts'
    | 'pages'
    | 'links'
    | 'previews'
    | 'bundle';
  linkCount?: number;
  linkBytes?: number;
  intentId?: string;
  intentDigest?: string;
  intentFrameCount?: number;
  intentReady?: boolean;
}

export type SceneDependencyKind =
  | 'page'
  | 'container'
  | 'tile'
  | 'texture'
  | 'empty'
  | 'preview-plan';

export interface SceneDependencyRecord {
  documentKey: string;
  localCommitId: string;
  kind: SceneDependencyKind;
  resourceKey: string;
  segment: number;
  byteLength: number;
  digest: string;
  body?: string;
  blob?: Blob;
}

export interface SceneBundleFrame {
  documentKey: string;
  localCommitId: string;
  bundleId: string;
  ordinal: number;
  offset: number;
  byteLength: number;
  prefixHash: string;
  kind: ScenePartKind;
  partKey: string;
}

export interface SceneLocalPart {
  documentKey: string;
  localCommitId: string;
  kind: ScenePartKind;
  partKey: string;
  ordinal: number;
  byteLength: number;
  digest: string;
  /** Stored bytes for a page or container batch. */
  body?: string;
  /** PNG binary, never a data URL in IndexedDB. */
  png?: Blob;
  cellX?: number;
  cellY?: number;
  pageId?: number;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  level?: number;
  x?: number;
  y?: number;
  deleted?: boolean;
}

export type SceneLocalPartDescriptor = Omit<SceneLocalPart, 'body' | 'png'>;

export interface SceneLocalWork {
  documentKey: string;
  localCommitId: string;
  taskKey: string;
  kind:
    | 'dirty-cell'
    | 'preview'
    | 'scratch'
    | 'checkpoint'
    | 'final-part'
    | 'preview-link';
  status: 'pending' | 'complete';
  body?: string;
  cellX?: number;
  cellY?: number;
  partId?: string;
  bounds?: readonly [number, number, number, number];
  orderPath?: readonly (readonly [number, number, string])[];
  visible?: boolean;
  parentId?: string;
  level?: number;
  x?: number;
  y?: number;
  rank?: number;
}

export interface SceneUploadReceipt {
  documentKey: string;
  localCommitId: string;
  attemptId: string;
  kind: ScenePartKind;
  partKey: string;
  digest: string;
}

export interface SceneCursorPage<T> {
  items: T[];
  nextKey?: IDBValidKey;
}

export class SceneLocalStorageError extends Error {
  constructor(
    readonly kind: 'quota' | 'writer-lost' | 'conflict' | 'invalid-part',
    message: string,
  ) {
    super(message);
  }
}
