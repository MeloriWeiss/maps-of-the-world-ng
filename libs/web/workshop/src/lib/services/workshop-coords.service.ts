import { ElementRef, Injectable } from '@angular/core';
import { Point } from '../interfaces/point.interface';
import { Bounds } from '../interfaces';

@Injectable()
export class WorkshopCoordsService {
  cameraX = 0;
  cameraY = 0;
  #zoom = 1;

  worldViewport: Bounds = { x: 0, y: 0, width: 0, height: 0 };

  minZoom = 0.1;
  maxZoom = 10;

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

  get zoom() {
    return this.#zoom;
  }

  set zoom(newZoom: number) {
    if (newZoom > this.maxZoom || newZoom < this.minZoom) return;

    this.#zoom = newZoom;
  }

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
  }
}
