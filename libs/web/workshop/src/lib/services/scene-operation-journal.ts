import {
  SceneDraftRepository,
  NewSceneMutation,
} from './scene-draft.repository';
import { SceneMutation } from './scene-history';
import { captureSceneOperation } from './scene-operation-mutations';

interface PendingOperation {
  id: string;
  mutations: NewSceneMutation[];
}

/**
 * Сохраняет завершённые операции редактора в локальном журнале.
 *
 * Записи IndexedDB выполняются последовательно для документа, чтобы сохранить
 * порядок изменений и корректно восстановить состояние после перезагрузки.
 */
export class SceneOperationJournal {
  readonly #repository = new SceneDraftRepository();
  #documentKey: Promise<string> | null = null;
  #pending: PendingOperation[] = [];
  #draining: Promise<void> | null = null;
  #error: unknown = null;

  constructor(readonly onError: (error: unknown) => void) {}

  /** Создаёт локальный документ и активирует запись изменений для него. */
  activate(accountId: number, mapId: number | undefined, revision: number) {
    this.#documentKey = this.#repository
      .createDocument(accountId, mapId, revision)
      .then((document) => document.documentKey);
    void this.#documentKey.catch((error) => this.onError(error));
  }

  /** Добавляет завершённую операцию в очередь последовательной записи. */
  capture(mutation: SceneMutation, direction: 'undo' | 'redo') {
    const mutations = captureSceneOperation(mutation, direction);
    if (!mutations.length) return;
    this.#pending.push({ id: crypto.randomUUID(), mutations });
    void this.#drain().catch((error) => this.onError(error));
  }

  /** Дожидается записи очереди и возвращает последний сохранённый номер операции. */
  async flush(): Promise<number> {
    if (!this.#documentKey)
      throw new Error('Local scene journal is not active');
    await this.#drain();
    const documentKey = await this.#documentKey;
    return this.#repository.withWriter(documentKey, (token) =>
      this.#repository.flush(token),
    );
  }

  /** Связывает активный локальный документ с идентификатором карты. */
  async bindMap(mapId: number) {
    if (!this.#documentKey)
      throw new Error('Local scene journal is not active');
    const documentKey = await this.#documentKey;
    await this.#repository.withWriter(documentKey, (token) =>
      this.#repository.bindMap(token, mapId),
    );
  }

  /** Подтверждает публикацию локальных изменений на сервере. */
  async acknowledge(input: {
    serverCommitId: string;
    expectedRevision: number;
    publishedRevision: number;
    cutSeq: number;
  }) {
    if (!this.#documentKey)
      throw new Error('Local scene journal is not active');
    const documentKey = await this.#documentKey;
    await this.#repository.withWriter(documentKey, (token) =>
      this.#repository.acknowledgeLegacyPublication(token, input),
    );
  }

  /** Последовательно записывает ожидающие операции и сохраняет порядок журнала. */
  async #drain(): Promise<void> {
    if (this.#draining) {
      await this.#draining;
      if (this.#pending.length) await this.#drain();
      return;
    }

    if (this.#error) this.#error = null;
    const run = async () => {
      if (!this.#documentKey)
        throw new Error('Local scene journal is not active');
      const documentKey = await this.#documentKey;
      await this.#repository.withWriter(documentKey, async (token) => {
        while (this.#pending.length) {
          const operation = this.#pending[0];

          async function* records() {
            for (const mutation of operation.mutations) yield mutation;
          }
          await this.#repository.appendOperation(
            token,
            operation.id,
            operation.mutations.length,
            records(),
          );
          this.#pending.shift();
        }
      });
    };

    const task = run();
    this.#draining = task;
    try {
      await task;
    } catch (error) {
      this.#error = error;
      throw error;
    } finally {
      if (this.#draining === task) this.#draining = null;
    }
  }
}
