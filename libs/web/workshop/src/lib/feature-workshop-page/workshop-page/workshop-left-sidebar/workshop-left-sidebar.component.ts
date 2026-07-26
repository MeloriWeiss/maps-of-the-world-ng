import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { WorkshopTools } from '../../../consts';
import {
  WorkshopSettingsService,
  WorkshopCanvasSizeService,
  WorkshopToolsService,
} from '../../../services';
import { SvgComponent } from '@wm/web/common-ui';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

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
  imports: [DecimalPipe, FormsModule, SvgComponent],
  templateUrl: './workshop-left-sidebar.component.html',
  styleUrl: './workshop-left-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkshopLeftSidebarComponent {
  #workshopToolsService = inject(WorkshopToolsService);
  #canvasSizeService = inject(WorkshopCanvasSizeService);
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  workshopSettingsService = inject(WorkshopSettingsService);

  currentToolName = this.#workshopToolsService.currentToolName;
  WorkshopTools = WorkshopTools;
  contextMenu: ContextMenuState | null = null;
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

  setCurrentTool(newTool: WorkshopTools) {
    this.#workshopToolsService.setCurrentTool(newTool);
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
    const menuWidth = 202;
    const menuHeight = 440;
    this.contextMenu = {
      tool: tool.name,
      x: Math.min(targetRect.right + 5, window.innerWidth - menuWidth - 8),
      y: Math.max(
        65,
        Math.min(targetRect.top - 20, window.innerHeight - menuHeight - 8),
      ),
    };
  }

  updateStrokeWidth(tool: WorkshopTools, value: number): void {
    this.workshopSettingsService.updateToolStyle(tool, {
      strokeWidth: Number(value),
    });
    this.applyStyleIfCurrent(tool);
  }

  updateStrokeColor(tool: WorkshopTools, value: string): void {
    this.workshopSettingsService.updateToolStyle(tool, {
      strokeColor: value,
    });
    this.applyStyleIfCurrent(tool);
  }

  updateFillColor(tool: WorkshopTools, value: string): void {
    this.workshopSettingsService.updateToolStyle(tool, { fillColor: value });
    this.applyStyleIfCurrent(tool);
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

  private applyStyleIfCurrent(tool: WorkshopTools): void {
    if (this.currentToolName() === tool) {
      this.workshopSettingsService.applyToolStyle(tool);
    }
  }

  @HostListener('document:mousedown')
  closeContextMenu(): void {
    this.contextMenu = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeContextMenu();
  }
}
