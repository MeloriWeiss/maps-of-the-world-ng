import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
} from '@angular/core';
import p5 from 'p5';
import { attachFantasyMap } from './editor/fantasy-map-wrapper';

@Component({
  selector: 'wm-fantasy-map',
  imports: [],
  templateUrl: './fantasy-map.component.html',
  styleUrl: './fantasy-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FantasyMapComponent implements AfterViewInit, OnDestroy {
  canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');

  #sketch: p5 | null = null;

  ngAfterViewInit(): void {
    this.#sketch = attachFantasyMap(this.canvas().nativeElement);
  }

  ngOnDestroy(): void {
    this.#sketch?.remove();
  }
}
