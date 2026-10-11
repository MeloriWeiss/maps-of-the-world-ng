import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  InputComponent,
  SelectComponent,
  SelectOptionComponent,
  SvgComponent,
  TooltipDirective,
} from '@wm/web/common-ui';
import {
  intersectsBounds,
  mapChunkSize,
  WorldBounds,
} from '@wm/shared/workshop';
import { GraphNode, ShapeNode } from '../../../nodes';
import { StampShape } from '../../../shapes';
import {
  WorkshopCoordsService,
  WorkshopSceneGraphStorageService,
  WorkshopShapesService,
  WorkshopCanvasManagerService,
  WorkshopSceneGraphService,
  WorkshopPanningService,
  WorkshopModeService,
} from '../../../services';
import {
  SceneObjectSummary,
  WorkshopChunksService,
} from '../../../services/workshop-chunks.service';

interface LocalObject {
  node: ShapeNode;
  parts: ShapeNode[];
  name: string;
  image: string | null;
  stamp: StampShape | null;
  count: number;
}

@Component({
  selector: 'wm-workshop-objects-panel',
  standalone: true,
  imports: [
    FormsModule,
    InputComponent,
    SelectComponent,
    SelectOptionComponent,
    SvgComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="search"
      >Поиск объектов
      <wm-input
        type="search"
        ariaLabel="Поиск объектов по названию"
        placeholder="Название объекта"
        [ngModel]="query()"
        (ngModelChange)="query.set($event ?? ''); limit.set(100)"
      />
    </label>
    <wm-select
      ariaLabel="Тип объектов"
      [value]="kind()"
      (valueChange)="setKind($event)"
    >
      <wm-option value="" label="Все типы">Все типы</wm-option>
      <wm-option value="texture" label="Покрытия">Покрытия</wm-option>
      <wm-option value="stamp" label="Изображения">Изображения</wm-option>
      <wm-option value="text" label="Текст">Текст</wm-option>
      <wm-option value="line" label="Линии">Линии</wm-option>
      <wm-option value="rectangle" label="Прямоугольники"
        >Прямоугольники</wm-option
      >
    </wm-select>
    <wm-select
      ariaLabel="Область поиска"
      [value]="scope()"
      (valueChange)="setScope($event)"
    >
      <wm-option value="viewport" label="В области просмотра"
        >В области просмотра</wm-option
      >
      <wm-option value="map" label="По всей карте">По всей карте</wm-option>
    </wm-select>
    @if (scope() === 'map' && query().trim().length < 2) {
      <p class="status">Введите минимум две буквы для поиска по всей карте.</p>
    }
    @if (tooWide() && scope() === 'viewport') {
      <p class="status">
        Приблизьте карту, чтобы увидеть список объектов в этой области.
      </p>
    }
    @if (remoteError()) {
      <p class="status" role="status">{{ remoteError() }}</p>
    }
    @if (chunks.loading()) {
      <p class="status" role="status">Загружаем детали области…</p>
    }
    @if (chunks.error()) {
      <p role="status">
        {{ chunks.error() }}
        <button type="button" (click)="chunks.retry()">Повторить</button>
      </p>
    }
    @if (!chunks.canEditViewport() && !chunks.loading()) {
      <button type="button" (click)="chunks.loadViewportDetails()">
        Показать объекты этой области
      </button>
    }
    <div class="objects wm-scrollbar" aria-label="Объекты карты">
      @for (item of remoteOnly(); track item.objectId) {
        <div class="object">
          <button type="button" class="name" (click)="focusRemote(item)">
            <span>{{ item.name || 'Объект' }} · {{ item.kind }}</span>
          </button>
          <button
            type="button"
            class="object__action"
            (click)="focusRemote(item)"
            aria-label="Перейти к объекту на карте"
            wmTooltip="Перейти к объекту"
            wmTooltipPosition="left"
          >
            <svg
              icon="focus"
              dir="workshop/"
              class="svg16"
              aria-hidden="true"
            ></svg>
          </button>
        </div>
      }
      @for (item of shown(); track item.node.id) {
        <div class="object" [class.selected]="item.node.shape.selected">
          <button
            type="button"
            class="name"
            (click)="select(item.node)"
            (dblclick)="focus(item.node)"
          >
            @if (item.image) {
              <img [src]="item.image" alt="" loading="lazy" />
            }
            <span>{{ item.name }}</span>
          </button>
          <button
            type="button"
            class="object__action"
            (click)="focus(item.node)"
            aria-label="Перейти к объекту на карте"
            wmTooltip="Перейти к объекту"
            wmTooltipPosition="left"
          >
            <svg
              icon="focus"
              dir="workshop/"
              class="svg16"
              aria-hidden="true"
            ></svg>
          </button>
          @if (!readOnly()) {
            <button
              type="button"
              class="object__action"
              [class.object__action--locked]="item.node.locked"
              (click)="toggleLock(item.node)"
              [attr.aria-label]="
                item.node.locked
                  ? 'Разблокировать объект'
                  : 'Заблокировать объект'
              "
              [wmTooltip]="
                item.node.locked
                  ? 'Разблокировать объект'
                  : 'Заблокировать объект'
              "
              wmTooltipPosition="left"
            >
              <svg
                [icon]="item.node.locked ? 'lock-closed' : 'lock-open'"
                dir="workshop/"
                class="svg16"
                aria-hidden="true"
              ></svg>
            </button>
          }
          @if (item.stamp) {
            <button
              type="button"
              (click)="toggle(item.node.id)"
              [attr.aria-expanded]="expanded() === item.node.id"
            >
              {{ item.count }} шт.
            </button>
          }
        </div>
        @if (item.stamp && expanded() === item.node.id) {
          <div class="instances">
            @for (instance of visibleInstances(); track instance.id) {
              <button
                type="button"
                (click)="selectInstance(instance.node, instance.index)"
                [disabled]="readOnly() || instance.node.locked"
              >
                Изображение {{ instance.index + 1 }} · выделить отдельно
              </button>
            }
            <p class="status">
              До 100 изображений в текущей области. Приблизьте карту для точного
              выбора.
            </p>
          </div>
        }
      }
      @if (!remoteOnly().length && !shown().length) {
        <p class="status">Здесь нет подходящих объектов.</p>
      }
    </div>
    @if (nextCursor()) {
      <button type="button" (click)="loadMore()">Показать ещё</button>
    }
    @if (objects().length > limit()) {
      <button type="button" (click)="limit.set(limit() + 100)">
        Показать ещё загруженные
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
      padding: 8px;
      color: var(--text-light-color);
      background: var(--bg-surface-tertiary-color);
    }
    .search {
      display: grid;
      gap: 4px;
    }
    .status {
      color: var(--text-light-color);
      font-size: 12px;
      margin: 0;
      opacity: 0.75;
    }
    .objects {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 4px;
      min-height: 0;
      overflow-y: auto;
    }
    .object {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 32px;
      padding: 0 6px;
      border-radius: 5px;
      background: var(--bg-surface-variant-color);
      color: var(--text-light-color);
      transition: background-color 0.15s ease;
    }
    button {
      color: inherit;
      padding: 5px;
      border-radius: 4px;
    }
    .object.selected {
      background: var(--dark-cyan-color);
    }
    .object:hover {
      background: var(--cyan-color);
    }
    .object button:hover {
      background: rgb(from var(--light-color) r g b / 12%);
    }
    .object__action {
      display: grid;
      flex: 0 0 28px;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      color: var(--text-light-color);
    }
    .object__action--locked {
      background: rgb(from var(--dark-color) r g b / 20%);
    }
    .object__action svg {
      display: block;
      color: var(--text-light-color);
      fill: var(--text-light-color);
    }
    .name {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
      color: var(--text-light-color);
      text-align: left;
    }
    .name span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    img {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
    .instances {
      display: grid;
      gap: 4px;
      padding-left: 12px;
    }
  `,
})
export class WorkshopObjectsPanelComponent {
  #storage = inject(WorkshopSceneGraphStorageService);
  #coords = inject(WorkshopCoordsService);
  #shapes = inject(WorkshopShapesService);
  #graph = inject(WorkshopSceneGraphService);
  #canvas = inject(WorkshopCanvasManagerService);
  #panning = inject(WorkshopPanningService);
  readonly chunks = inject(WorkshopChunksService);
  readonly readOnly = inject(WorkshopModeService).isReadOnly;
  readonly query = signal('');
  readonly kind = signal('');
  readonly scope = signal<'viewport' | 'map'>('viewport');

  setKind(value: string) {
    this.kind.set(value);
    this.limit.set(100);
  }

  setScope(value: string) {
    if (value !== 'viewport' && value !== 'map') return;
    this.scope.set(value);
  }
  readonly limit = signal(100);
  readonly expanded = signal<string | null>(null);
  readonly remote = signal<SceneObjectSummary[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly remoteError = signal('');
  #remoteRequestId = 0;
  #pendingFocusId = signal<string | null>(null);
  readonly tooWide = computed(() => {
    this.#coords.viewportVersion();
    const bounds = this.#coords.worldViewport;
    return (
      bounds.width > mapChunkSize * 64 || bounds.height > mapChunkSize * 64
    );
  });
  readonly objects = computed<LocalObject[]>(() => {
    this.#storage.graphVersion();
    this.#coords.viewportVersion();
    const result: LocalObject[] = [];
    const groups = new Map<string, LocalObject>();
    const query = this.query().trim().toLocaleLowerCase();
    const visit = (node: GraphNode) => {
      if (!node.visible) return;
      if (node instanceof ShapeNode) {
        const shape = node.shape;
        if (
          !intersectsBounds(shape.getBounds(), this.#coords.worldViewport) ||
          this.#coords.zoom < (shape.minZoom ?? 0) ||
          this.#coords.zoom > (shape.maxZoom ?? Infinity)
        )
          return;
        if (this.kind() && shape.type !== this.kind()) return;
        const name = shape.name || 'Объект';
        if (!name.toLocaleLowerCase().includes(query)) return;
        const stamp = shape instanceof StampShape ? shape : null;
        const image =
          'textureUrl' in shape && typeof shape.textureUrl === 'string'
            ? shape.textureUrl
            : null;
        const id = shape.objectId ?? shape.id;
        const existing = groups.get(id);
        if (existing) {
          existing.parts.push(node);
          existing.count += stamp?.instances.length ?? 0;
        } else {
          const item = {
            node,
            parts: [node],
            name,
            image,
            stamp,
            count: stamp?.instances.length ?? 0,
          };
          groups.set(id, item);
          result.push(item);
        }
        return;
      }
      for (const child of node.children) visit(child);
    };
    visit(this.#storage.nodesRoot());
    return result;
  });
  readonly shown = computed(() => this.objects().slice(0, this.limit()));
  readonly remoteOnly = computed(() => {
    if (this.scope() !== 'map') return [];
    const loaded = new Set(
      this.objects().map(
        (item) => item.node.shape.objectId ?? item.node.shape.id,
      ),
    );
    return this.remote().filter((item) => !loaded.has(item.objectId));
  });
  readonly visibleInstances = computed(() => {
    const item = this.objects().find(
      (item) => item.node.id === this.expanded(),
    );
    if (!item?.stamp) return [];
    return item.parts
      .flatMap((node) => {
        if (!(node.shape instanceof StampShape)) return [];
        const stamp = node.shape;
        return stamp.instances
          .map((instance, index) => ({
            id: instance.id,
            node,
            instance,
            index,
          }))
          .filter(({ instance }) =>
            intersectsBounds(
              stamp.getInstanceBounds(instance),
              this.#coords.worldViewport,
            ),
          );
      })
      .slice(0, 100);
  });

  constructor() {
    effect((onCleanup) => {
      const mapId = this.chunks.sceneMapId();
      this.chunks.sceneRevision();
      const kind = this.kind(),
        query = this.query().trim(),
        scope = this.scope();
      const requestId = ++this.#remoteRequestId;
      this.remote.set([]);
      this.nextCursor.set(null);
      this.remoteError.set('');
      if (mapId === null || scope !== 'map' || query.length < 2) return;
      const bounds = { ...this.#coords.worldViewport };
      let active = true;
      const timer = setTimeout(() => {
        void this.chunks
          .searchObjects(bounds, kind, query, scope)
          .then((page) => {
            if (!active || requestId !== this.#remoteRequestId) return;
            this.remote.set(page.items);
            this.nextCursor.set(page.nextCursor);
          })
          .catch(() => {
            if (active && requestId === this.#remoteRequestId)
              this.remoteError.set('Не удалось загрузить список объектов.');
          });
      }, 180);
      onCleanup(() => {
        active = false;
        clearTimeout(timer);
      });
    });
    effect(() => {
      const id = this.#pendingFocusId();
      this.#storage.graphVersion();
      if (
        !id ||
        !this.chunks.canEditViewport() ||
        !this.chunks.ready(this.#coords.worldViewport)
      )
        return;
      const item = this.objects().find(
        (object) => (object.node.shape.objectId ?? object.node.shape.id) === id,
      );
      if (!item) return;
      this.#pendingFocusId.set(null);
      this.select(item.node);
    });
  }

  loadMore() {
    const cursor = this.nextCursor();
    if (!cursor || this.scope() !== 'map') return;
    const requestId = this.#remoteRequestId;
    const bounds: WorldBounds = { ...this.#coords.worldViewport };
    void this.chunks
      .searchObjects(
        bounds,
        this.kind(),
        this.query().trim(),
        this.scope(),
        cursor,
      )
      .then((page) => {
        if (requestId !== this.#remoteRequestId) return;
        this.remote.update((items) => [...items, ...page.items]);
        this.nextCursor.set(page.nextCursor);
      })
      .catch(() => {
        if (requestId === this.#remoteRequestId)
          this.remoteError.set(
            'Не удалось загрузить следующую страницу объектов.',
          );
      });
  }

  focusRemote(item: SceneObjectSummary) {
    this.#pendingFocusId.set(item.objectId);
    this.#panning.fitBounds({
      x: item.minX,
      y: item.minY,
      width: Math.max(1, item.maxX - item.minX),
      height: Math.max(1, item.maxY - item.minY),
    });
    this.chunks.loadViewportDetails();
  }

  select(node: ShapeNode) {
    if (node.locked) return;
    this.#shapes.clearSelection();
    node.shape.selected = true;
    this.#shapes.setSelectedShapes([node.shape]);
    this.#graph.setActiveNode(node.id);
    this.#canvas.requestRedraw();
  }
  focus(node: ShapeNode) {
    this.select(node);
    this.#panning.fitBounds(node.shape.getBounds());
  }
  toggle(id: string) {
    this.expanded.set(this.expanded() === id ? null : id);
  }
  toggleLock(node: ShapeNode) {
    if (this.readOnly()) return;
    this.#shapes.beginOperation();
    node.locked = !node.locked;
    this.#shapes.clearSelection();
    this.#graph.markShapeDirty(node.shape);
    this.#graph.saveNodes();
    this.#shapes.endOperation();
  }
  selectInstance(node: ShapeNode, index: number) {
    if (this.readOnly() || node.locked || !(node.shape instanceof StampShape))
      return;
    const source = node.shape,
      instance = source.instances[index];
    if (!instance) return;
    this.#shapes.beginOperation();
    const shape = new StampShape({ ...source, instances: [{ ...instance }] });
    source.instances.splice(index, 1);
    this.#graph.setActiveNode(node.parent?.id ?? this.#graph.root().id);
    this.#shapes.createShape(shape);
    if (!source.instances.length) this.#graph.removeNode(node.id);
    else this.#graph.markShapeDirty(source);
    this.#shapes.clearSelection();
    shape.selected = true;
    this.#shapes.setSelectedShapes([shape]);
    this.#shapes.endOperation();
    this.#canvas.requestRedraw();
  }
}
