import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  PopoverComponent,
  SearchableSelectComponent,
  SelectComponent,
  SelectOptionComponent,
  SvgComponent,
  TooltipDirective,
} from '@wm/web/common-ui';
import {
  EraserTool,
  PencilTool,
  RectangleTool,
  SelectTool,
  TextTool,
  TextureTool,
} from '../../../tools';
import { StampTool } from '../../../tools/stamp/stamp';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ToolButton {
  name: WorkshopTools;
  icon: string;
  label: string;
  configurable: boolean;
  secondary?: boolean;
}

interface ContextMenuState {
  tool: WorkshopTools;
  label: string;
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
    TooltipDirective,
    SearchableSelectComponent,
    SelectComponent,
    SelectOptionComponent,
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
  packOptions = computed(() =>
    this.texturePacks().map((pack) => ({
      value: pack.id,
      label: `${pack.name} (${pack._count.textures})`,
    })),
  );
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
      label: SelectTool.displayName,
      configurable: false,
    },
    {
      name: WorkshopTools.TEXTURE,
      icon: 'surface',
      label: TextureTool.displayName,
      configurable: true,
    },
    {
      name: WorkshopTools.STAMP,
      icon: 'stamp',
      label: StampTool.displayName,
      configurable: true,
    },
    {
      name: WorkshopTools.TEXT,
      icon: 'text',
      label: TextTool.displayName,
      configurable: true,
    },
    {
      name: WorkshopTools.ERASER,
      icon: 'eraser',
      label: EraserTool.displayName,
      configurable: true,
    },
    {
      name: WorkshopTools.PENCIL,
      icon: 'brush',
      label: PencilTool.displayName,
      configurable: true,
      secondary: true,
    },
    {
      name: WorkshopTools.RECTANGLE,
      icon: 'texture',
      label: RectangleTool.displayName,
      configurable: true,
      secondary: true,
    },
  ];

  setCurrentTool(tool: ToolButton, event: MouseEvent): void {
    this.#workshopToolsService.setCurrentTool(tool.name);
    if (
      tool.name === WorkshopTools.TEXTURE ||
      tool.name === WorkshopTools.STAMP
    ) {
      this.openContextMenu(event, tool);
      this.#texturesService.load(
        tool.name === WorkshopTools.STAMP ? 'STAMP' : 'SURFACE',
      );
      return;
    }
    if (tool.configurable) this.openContextMenu(event, tool);
    else this.closeContextMenu();
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
    const menuWidth = 286;
    const menuHeight = 590;
    this.contextMenu = {
      tool: tool.name,
      label: tool.label,
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
    const style =
      this.currentToolName() === WorkshopTools.STAMP
        ? this.workshopSettingsService.stampStyle
        : this.workshopSettingsService.textureStyle;
    style.textureId = texture.id;
    style.textureUrl = texture.imageUrl;
    if (texture.width && texture.height)
      this.workshopSettingsService.stampStyle.aspect =
        texture.height / texture.width;
  }

  selectTexturePack(packId: string) {
    this.#texturesService.loadPack(packId);
  }

  setEraserMode(value: string) {
    if (value !== 'parts' && value !== 'whole') return;
    this.workshopSettingsService.eraserObjectsOnly = value === 'whole';
  }

  setStampMode(value: string) {
    if (value !== 'distance' && value !== 'time') return;
    this.workshopSettingsService.stampStyle.mode = value;
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
