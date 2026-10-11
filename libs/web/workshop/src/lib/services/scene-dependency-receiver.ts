import { SceneBundleCodec } from './scene-bundle-codec';
import { SceneDependencyStore } from './scene-dependency.store';
import {
  SceneDependencyKind,
  SceneWriterToken,
} from './workshop-scene-local.types';

const decoder = new TextDecoder('utf-8', { fatal: true });

/** A dependency response becomes usable only after its verified terminal frame. */
export class SceneDependencyReceiver {
  readonly #store: SceneDependencyStore;

  constructor(store: SceneDependencyStore) {
    this.#store = store;
  }

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
