import { SceneBundleCodec } from './scene-bundle-codec';
import { SceneDependencyStore } from './scene-dependency.store';
import {
  SceneDependencyKind,
  SceneWriterToken,
} from './workshop-scene-local.types';

const decoder = new TextDecoder('utf-8', { fatal: true });

/** Делает ответ с зависимостями доступным только после проверки завершающего кадра. */
export class SceneDependencyReceiver {
  readonly #store: SceneDependencyStore;

  constructor(store: SceneDependencyStore) {
    this.#store = store;
  }

  /**
   * Проверяет поток зависимостей и сохраняет его части локально.
   *
   * Запись завершается только после проверки итогового кадра и контрольной суммы.
   *
   * @param token Токен записи локального документа.
   * @param localCommitId Идентификатор принимаемого локального коммита.
   * @param stream Поток кадров с данными сцены и её зависимостями.
   */
  async receive(
    token: SceneWriterToken,
    localCommitId: string,
    stream: ReadableStream<Uint8Array>,
  ): Promise<void> {
    const terminal = await SceneBundleCodec.consume(
      stream,
      async (metadata, payload, prefixHash) => {
        if (
          !(
            [
              'page',
              'container',
              'tile',
              'texture',
              'empty',
              'preview-plan',
            ] as const
          ).some((kind) => kind === metadata.kind)
        ) {
          throw new Error('Unexpected dependency frame type');
        }

        const kind = metadata.kind as SceneDependencyKind;
        if (kind === 'empty' && payload.byteLength !== 0)
          throw new Error('Nonempty empty dependency');

        const record = {
          documentKey: token.documentKey,
          localCommitId,
          kind,
          resourceKey: metadata.partKey,
          segment: metadata.segment ?? 0,
          byteLength: payload.byteLength,
          digest: metadata.digest,
          ...(kind === 'tile' || kind === 'texture'
            ? { blob: new Blob([payload]) }
            : { body: decoder.decode(payload) }),
        };

        await this.#store.put(token, record, metadata.ordinal + 1, prefixHash);
      },
    );

    await this.#store.complete(
      token,
      localCommitId,
      terminal.count,
      terminal.hash,
    );
  }
}
