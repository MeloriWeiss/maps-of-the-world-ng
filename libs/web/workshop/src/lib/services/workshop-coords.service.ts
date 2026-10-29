import { ElementRef, Injectable, signal } from '@angular/core';
import { Point } from '../interfaces/point.interface';
import { Bounds } from '../interfaces';

/** Преобразует координаты указателя и рабочей области карты. */
@Injectable()
export class WorkshopCoordsService {
  readonly viewportVersion = signal(0);
  cameraX = 0;
  cameraY = 0;
  #zoom = 1;

  worldViewport: Bounds = { x: 0, y: 0, width: 0, height: 0 };

  minZoom = 0.01;
  maxZoom = 10;

  /**
   * Преобразует позицию указателя из координат экрана в координаты мира.
   *
   * @param e Событие указателя.
   * @param canvasRef Ссылка на холст, относительно которого получена позиция.
   * @returns Координаты указателя в пространстве карты.
   */
  getWorldCoords(
    e: MouseEvent,
    canvasRef: ElementRef<HTMLCanvasElement>,
  ): Point {
    const rect = canvasRef.nativeElement.getBoundingClientRect();
    const screenX = rect.left - e.clientX;
    const screenY = rect.top - e.clientY;

    const x = (this.cameraX - screenX) / this.#zoom;
    const y = (this.cameraY - screenY) / this.#zoom;

    return { x, y };
  }

  /** Возвращает текущий масштаб карты. */
  get zoom() {
    return this.#zoom;
  }

  /**
   * Устанавливает масштаб, если он входит в допустимый диапазон.
   *
   * @param newZoom Новый масштаб карты.
   */
  set zoom(newZoom: number) {
    if (newZoom > this.maxZoom || newZoom < this.minZoom) return;

    this.#zoom = newZoom;
  }

  /**
   * Пересчитывает видимую область мира после изменения камеры или масштаба.
   *
   * @param cameraX Смещение камеры по горизонтали.
   * @param cameraY Смещение камеры по вертикали.
   * @param zoom Текущий масштаб карты.
   * @param canvasW Ширина холста в экранных координатах.
   * @param canvasH Высота холста в экранных координатах.
   */
  updateViewport(
    cameraX: number,
    cameraY: number,
    zoom: number,
    canvasW: number,
    canvasH: number,
  ) {
    this.worldViewport = {
      x: cameraX / zoom,
      y: cameraY / zoom,
      width: canvasW / zoom,
      height: canvasH / zoom,
    };
    this.viewportVersion.update((value) => value + 1);
  }
}
