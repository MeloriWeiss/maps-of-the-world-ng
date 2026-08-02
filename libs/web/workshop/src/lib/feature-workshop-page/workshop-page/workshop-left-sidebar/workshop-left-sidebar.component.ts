import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { WorkshopTools } from '../../../consts';
import {
  WorkshopSettingsService,
  WorkshopCanvasSizeService,
  WorkshopToolsService,
  WorkshopTexture,
  WorkshopTexturesService,
} from '../../../services';
import { PopoverComponent, SvgComponent } from '@wm/web/common-ui';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ToolButton {
  name: WorkshopTools;
  icon: string;
  label: string;
  configurable: boolean;
}

interface ContextMenuState {
  tool: WorkshopTools;
  x: number;
  y: number;
}

@Component({
  selector: 'wm-workshop-left-sidebar',
  imports: [
    DecimalPipe,
    FormsModule,
    PopoverComponent,
    RouterLink,
    SvgComponent,
  ],
  templateUrl: './workshop-left-sidebar.component.html',
  styleUrl: './workshop-left-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopLeftSidebarComponent {
  #workshopToolsService = inject(WorkshopToolsService);
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #texturesService = inject(WorkshopTexturesService);
  workshopSettingsService = inject(WorkshopSettingsService);

  currentToolName = this.#workshopToolsService.currentToolName;
  textures = this.#texturesService.textures;
  texturePacks = this.#texturesService.packs;
  selectedTexturePackId = this.#texturesService.selectedPackId;
  texturesLoading = this.#texturesService.loading;
  hasMoreTextures = this.#texturesService.hasMore;
  textureError = this.#texturesService.error;
  WorkshopTools = WorkshopTools;
  contextMenu: ContextMenuState | null = null;
  toolPopover = viewChild(PopoverComponent);
  collapsed = signal(false);

  @HostBinding('class.collapsed')
  get isCollapsed() {
    return this.collapsed();
  }

  readonly tools: ToolButton[] = [
    {
      name: WorkshopTools.SELECT,
      icon: 'mouse',
      label: 'Выделение',
      configurable: false,
    },
    {
      name: WorkshopTools.PENCIL,
      icon: 'brush',
      label: 'Карандаш',
      configurable: true,
    },
    {
      name: WorkshopTools.RECTANGLE,
      icon: 'texture',
      label: 'Прямоугольник',
      configurable: true,
    },
    {
      name: WorkshopTools.TEXT,
      icon: 'text',
      label: 'Текст',
      configurable: true,
    },
    {
      name: WorkshopTools.TEXTURE,
      icon: 'grid',
      label: 'Текстура',
      configurable: true,
    },
    {
      name: WorkshopTools.ERASER,
      icon: 'file',
      label: 'Ластик',
      configurable: true,
    },
  ];

  setCurrentTool(tool: ToolButton, event: MouseEvent): void {
    this.#workshopToolsService.setCurrentTool(tool.name);
    if (tool.name === WorkshopTools.TEXTURE) {
      this.openContextMenu(event, tool);
      this.#texturesService.load();
      return;
    }
    this.closeContextMenu();
  }

  toggleSidebar(event: MouseEvent) {
    event.stopPropagation();
    this.collapsed.update((value) => !value);
    if (this.collapsed()) this.closeContextMenu();

    setTimeout(() => {
      this.#canvasSizeService.leftSidebarWidth =
        this.#elementRef.nativeElement.getBoundingClientRect().width;
      this.#canvasSizeService.resizeCanvas();
    }, 220);
  }

  openContextMenu(event: MouseEvent, tool: ToolButton): void {
    event.preventDefault();
    event.stopPropagation();

    if (!tool.configurable) {
      this.closeContextMenu();
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const targetRect = target.getBoundingClientRect();
    const menuWidth = tool.name === WorkshopTools.TEXTURE ? 286 : 202;
    const menuHeight = tool.name === WorkshopTools.TEXTURE ? 590 : 440;
    this.contextMenu = {
      tool: tool.name,
      x: Math.min(targetRect.right + 5, window.innerWidth - menuWidth - 8),
      y: Math.max(
        65,
        Math.min(targetRect.top - 20, window.innerHeight - menuHeight - 8),
      ),
    };
    this.toolPopover()?.setOpenState(true);
  }

  updateStrokeWidth(tool: WorkshopTools, value: number): void {
    this.workshopSettingsService.updateToolStyle(tool, {
      strokeWidth: Number(value),
    });
    this.#applyStyleIfCurrent(tool);
  }

  updateStrokeColor(tool: WorkshopTools, value: string): void {
    this.workshopSettingsService.updateToolStyle(tool, {
      strokeColor: value,
    });
    this.#applyStyleIfCurrent(tool);
  }

  updateFillColor(tool: WorkshopTools, value: string): void {
    this.workshopSettingsService.updateToolStyle(tool, { fillColor: value });
    this.#applyStyleIfCurrent(tool);
  }

  updateOpacity(value: number): void {
    this.workshopSettingsService.shapeStyle.opacity = Number(value);
  }

  updateTextureScale(value: number): void {
    this.workshopSettingsService.textureStyle.textureScale = Number(value);
  }

  updateTextureRotation(value: number): void {
    this.workshopSettingsService.textureStyle.textureRotation = Number(value);
  }

  selectTexture(texture: WorkshopTexture): void {
    this.workshopSettingsService.textureStyle.textureId = texture.id;
    this.workshopSettingsService.textureStyle.textureUrl = texture.imageUrl;
  }

  selectTexturePack(event: Event) {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    this.#texturesService.loadPack(select.value);
  }

  loadMoreTextures() {
    this.#texturesService.loadMore();
  }

  #applyStyleIfCurrent(tool: WorkshopTools): void {
    if (this.currentToolName() === tool) {
      this.workshopSettingsService.applyToolStyle(tool);
    }
  }

  closeContextMenu() {
    this.contextMenu = null;
    this.toolPopover()?.close();
  }

  onPopoverOpenChange(open: boolean) {
    if (!open) this.contextMenu = null;
  }
}
