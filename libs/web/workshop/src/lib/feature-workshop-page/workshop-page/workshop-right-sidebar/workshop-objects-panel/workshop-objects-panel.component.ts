import type { LocalObject } from './workshop-objects-panel.component.types';
import {
  collectVisibleObjects,
  collectVisibleStampInstances,
} from './utils/visible-objects';
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
import { mapChunkSize, WorldBounds } from '@wm/shared/workshop';
import { ShapeNode } from '../../../../nodes';
import { StampShape } from '../../../../shapes';
import {
  WorkshopCoordsService,
  WorkshopSceneGraphStorageService,
  WorkshopShapesService,
  WorkshopCanvasManagerService,
  WorkshopSceneGraphService,
  WorkshopPanningService,
  WorkshopModeService,
} from '../../../../services';
import { WorkshopChunksService } from '../../../../services/workshop-chunks.service';
import type { SceneObjectSummary } from '../../../../interfaces/workshop-chunks';

/** Панель поиска, фильтрации и выбора объектов сцены. */
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
  templateUrl: './workshop-objects-panel.component.html',
  styleUrl: './workshop-objects-panel.component.scss',
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

    return collectVisibleObjects(
      this.#storage.nodesRoot(),
      this.#coords.worldViewport,
      this.#coords.zoom,
      this.kind(),
      this.query(),
    );
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

    return collectVisibleStampInstances(item, this.#coords.worldViewport);
  });

  constructor() {
    effect((onCleanup) => {
      const mapId = this.chunks.sceneMapId();
      this.chunks.sceneRevision();
      const kind = this.kind();
      const query = this.query().trim();
      const scope = this.scope();
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

  setKind(value: string) {
    this.kind.set(value);
    this.limit.set(100);
  }

  setScope(value: string) {
    if (value !== 'viewport' && value !== 'map') return;

    this.scope.set(value);
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

    const source = node.shape;
    const instance = source.instances[index];
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
