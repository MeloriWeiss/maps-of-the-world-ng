import p5 from 'p5';
import { createFantasyMapSketch } from './sketch';

export function attachFantasyMap(container: HTMLElement): p5 {
  return createFantasyMapSketch(container);
}
