import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { GraphNode } from '../../../../nodes';
import { NodesTypes } from '../../../../consts';
import {
  WorkshopCanvasManagerService,
  WorkshopSceneGraphService,
  WorkshopSceneGraphStorageService,
} from '../../../../services';

@Component({
  selector: 'wm-workshop-nodes-panel',
  imports: [],
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
  #collapsedNodes = signal<Set<string>>(new Set());
  contextMenu = signal<{ x: number; y: number; nodeId: string } | null>(null);
  #draggedNodeId: string | null = null;

  flattenedNodes = computed(() => {
    this.graphVersion();
    const result: { node: GraphNode; depth: number }[] = [];
    const collapsedNodes = this.#collapsedNodes();

    function walk(nodes: GraphNode[], depth = 0) {
      nodes.forEach((node) => {
        result.push({ node, depth });
        if (collapsedNodes.has(node.id)) return;
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
  }

  toggleVisible(node: GraphNode) {
    this.#sceneGraphService.setNodeVisibility(node.id, !node.visible);
    this.#canvasManagerService.requestRedraw();
  }

  toggleExpand(node: GraphNode) {
    this.#collapsedNodes.update((nodes) => {
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
    return !this.#collapsedNodes().has(nodeId);
  }

  getIcon(node: GraphNode): string {
    if (node.type === NodesTypes.LAYER) return 'L';
    if (node.type === NodesTypes.GROUP) return 'G';
    return 'S';
  }

  getNodeName(node: GraphNode) {
    if (node.type === NodesTypes.LAYER) return `Layer ${node.id.slice(0, 6)}`;
    if (node.type === NodesTypes.GROUP) return `Group ${node.id.slice(0, 6)}`;
    return `Shape ${node.id.slice(0, 6)}`;
  }

  deleteNode(nodeId: string) {
    this.#sceneGraphService.removeNode(nodeId);
    this.#canvasManagerService.requestRedraw();
    this.contextMenu.set(null);
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

  @HostListener('document:click')
  onDocumentClick() {
    this.contextMenu.set(null);
  }
}
