import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChildren,
  viewChild,
} from '@angular/core';
import { GraphNode, LayerNode, ShapeNode } from '../../../../nodes';
import { NodesTypes } from '../../../../consts';
import {
  WorkshopCanvasManagerService,
  WorkshopSceneGraphService,
  WorkshopSceneGraphStorageService,
} from '../../../../services';
import { PopoverComponent, VirtualListComponent } from '@wm/web/common-ui';

@Component({
  selector: 'wm-workshop-nodes-panel',
  imports: [PopoverComponent, VirtualListComponent],
  templateUrl: './workshop-nodes-panel.component.html',
  styleUrl: './workshop-nodes-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopNodesPanelComponent {
  #sceneGraphService = inject(WorkshopSceneGraphService);
  #sceneGraphStorageService = inject(WorkshopSceneGraphStorageService);
  #canvasManagerService = inject(WorkshopCanvasManagerService);

  nodesRoot = input.required<GraphNode>();
  activeNodeId = this.#sceneGraphService.activeNodeId;
  graphVersion = this.#sceneGraphStorageService.graphVersion;
  #expandedNodes = signal<Set<string>>(new Set());
  editingNodeId = signal<string | null>(null);
  editedName = signal('');
  contextMenu = signal<{ x: number; y: number; nodeId: string } | null>(null);
  contextMenuPosition = computed(() => {
    const menu = this.contextMenu();
    return menu ? { x: menu.x, y: menu.y } : null;
  });
  nodePopover = viewChild(PopoverComponent);
  #draggedNodeId: string | null = null;
  readonly nameInputs = viewChildren<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    effect(() => {
      if (!this.editingNodeId()) return;
      const input = this.nameInputs()[0]?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  flattenedNodes = computed(() => {
    this.graphVersion();
    const result: { node: GraphNode; depth: number }[] = [];
    const expandedNodes = this.#expandedNodes();

    function walk(nodes: GraphNode[], depth = 0) {
      nodes.forEach((node) => {
        result.push({ node, depth });
        if (!expandedNodes.has(node.id)) return;
        walk(node.children, depth + 1);
      });
    }

    walk(this.nodesRoot().children);
    return result;
  });

  isSelected(node: GraphNode): boolean {
    return this.activeNodeId() === node.id;
  }

  onNodeClick(node: GraphNode) {
    this.#sceneGraphService.setActiveNode(node.id);
  }

  onNodeContextMenu(event: MouseEvent, node: GraphNode) {
    event.preventDefault();
    this.#sceneGraphService.setActiveNode(node.id);
    this.contextMenu.set({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
    this.nodePopover()?.setOpenState(true);
  }

  toggleVisible(node: GraphNode) {
    this.#sceneGraphService.setNodeVisibility(node.id, !node.visible);
    this.#canvasManagerService.requestRedraw();
  }

  toggleExpand(node: GraphNode) {
    this.#expandedNodes.update((nodes) => {
      const next = new Set(nodes);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }

  isExpanded(nodeId: string): boolean {
    return this.#expandedNodes().has(nodeId);
  }

  getIcon(node: GraphNode): string {
    if (node.type === NodesTypes.LAYER) return 'L';
    if (node.type === NodesTypes.GROUP) return 'G';
    return 'S';
  }

  getNodeName(node: GraphNode) {
    if (node instanceof LayerNode && hasName(node.layerData)) {
      return node.layerData.name;
    }
    if (node.type === NodesTypes.LAYER) return `Layer ${node.id.slice(0, 6)}`;
    if (node.type === NodesTypes.GROUP) return `Group ${node.id.slice(0, 6)}`;
    if (node instanceof ShapeNode && node.shape.name) return node.shape.name;
    return `Shape ${node.id.slice(0, 6)}`;
  }

  startRenaming(event: MouseEvent, node: GraphNode): void {
    if (!(node instanceof ShapeNode)) return;
    event.stopPropagation();
    this.editingNodeId.set(node.id);
    this.editedName.set(this.getNodeName(node));
  }

  updateEditedName(name: string): void {
    this.editedName.set(name);
  }

  onNameInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.updateEditedName(input.value);
    }
  }

  saveName(node: GraphNode): void {
    if (this.editingNodeId() !== node.id || !(node instanceof ShapeNode))
      return;

    const name = this.editedName().trim();
    if (name) node.shape.name = name;
    this.editingNodeId.set(null);
    this.#sceneGraphService.saveNodes();
  }

  cancelRenaming(): void {
    this.editingNodeId.set(null);
  }

  deleteNode(nodeId: string) {
    this.#sceneGraphService.removeNode(nodeId);
    this.#canvasManagerService.requestRedraw();
    this.closeContextMenu();
  }

  startNodeDrag(nodeId: string) {
    this.#draggedNodeId = nodeId;
  }

  dropNode(targetNodeId: string, mode: 'inside' | 'after') {
    if (!this.#draggedNodeId) return;
    this.#sceneGraphService.moveNode(this.#draggedNodeId, targetNodeId, mode);
    this.#canvasManagerService.requestRedraw();
    this.#draggedNodeId = null;
  }

  finishNodeDrag() {
    this.#draggedNodeId = null;
  }

  closeContextMenu() {
    this.contextMenu.set(null);
    this.nodePopover()?.close();
  }

  onPopoverOpenChange(open: boolean) {
    if (!open) this.contextMenu.set(null);
  }
}

function hasName(value: unknown): value is { name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string'
  );
}
