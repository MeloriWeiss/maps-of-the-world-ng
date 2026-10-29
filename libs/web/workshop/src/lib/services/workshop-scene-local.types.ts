import { MapSceneHeaderV4 } from '@wm/shared/workshop';

/** Вид сущности сцены, изменяемой в локальном журнале. */
export type SceneEntityType = 'part' | 'container';

/** Вид самостоятельной части сцены, сохраняемой локально. */
export type ScenePartKind = 'page' | 'tile' | 'container';

/** Этап подготовки и публикации локального коммита сцены. */
export type SceneCommitPhase =
  | 'preparing'
  | 'ready'
  | 'uploading'
  | 'publishing'
  | 'acknowledged'
  | 'conflict';

/** Локальное состояние документа и последовательности его сохранения. */
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

/** Идентификатор владельца записи и эпоха его блокировки документа. */
export interface SceneWriterToken {
  documentKey: string;
  writerId: string;
  epoch: number;
}

/** Маркер завершённой или ещё записываемой операции журнала. */
export interface SceneLocalOperation {
  documentKey: string;
  seq: number;
  operationId: string;
  expectedRecords: number;
  status: 'writing' | 'complete';
}

/** Изменение одной части или контейнера сцены, записанное в журнале. */
export interface SceneLocalMutation {
  documentKey: string;
  seq: number;
  entityType: SceneEntityType;
  entityId: string;
  objectId?: string;
  instanceId?: string;
  /** Ячейки, занятые до и после действия пользователя; идентификатор страницы назначает сборщик страниц. */
  oldCell?: string;
  newCell?: string;
  oldBounds?: readonly [number, number, number, number];
  newBounds?: readonly [number, number, number, number];
  deleted: boolean;
  /** Точное сериализованное состояние после изменения; для записи об удалении поле отсутствует. */
  body?: string;
}

/** Неизменяемый снимок данных сцены, подготовленный для публикации. */
export interface SceneLocalCommit {
  version: 2;
  documentKey: string;
  localCommitId: string;
  cutSeq: number;
  /** Подтверждённая граница журнала на момент фиксации коммита. */
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

/** Вид ресурса, необходимого для построения или публикации сцены. */
export type SceneDependencyKind =
  | 'page'
  | 'container'
  | 'tile'
  | 'texture'
  | 'empty'
  | 'preview-plan';

/** Сегмент локально сохранённой зависимости коммита. */
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

/** Описание кадра в бинарном пакете частей коммита. */
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

/** Часть неизменяемых данных, подготовленных для загрузки на сервер. */
export interface SceneLocalPart {
  documentKey: string;
  localCommitId: string;
  kind: ScenePartKind;
  partKey: string;
  ordinal: number;
  byteLength: number;
  digest: string;
  /** Сериализованные данные страницы или группы контейнеров. */
  body?: string;
  /** Изображение PNG в бинарном виде, без преобразования в data URL при хранении в IndexedDB. */
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

/** Описание части без её сериализованного тела и бинарного изображения. */
export type SceneLocalPartDescriptor = Omit<SceneLocalPart, 'body' | 'png'>;

/** Локальная промежуточная задача построения частей коммита. */
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

/** Подтверждение приёма сервером отдельной части коммита. */
export interface SceneUploadReceipt {
  documentKey: string;
  localCommitId: string;
  attemptId: string;
  kind: ScenePartKind;
  partKey: string;
  digest: string;
}

/** Страница результатов локального запроса к хранилищу IndexedDB. */
export interface SceneCursorPage<T> {
  items: T[];
  nextKey?: IDBValidKey;
}

/** Ошибка локального хранилища сцены с машинно-читаемым видом сбоя. */
export class SceneLocalStorageError extends Error {
  constructor(
    readonly kind: 'quota' | 'writer-lost' | 'conflict' | 'invalid-part',
    message: string,
  ) {
    super(message);
  }
}
