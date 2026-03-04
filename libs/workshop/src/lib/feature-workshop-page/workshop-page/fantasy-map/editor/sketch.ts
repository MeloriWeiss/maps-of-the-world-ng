import p5 from 'p5';

export function createFantasyMapSketch(container: HTMLElement): p5 {
  // === Constants ===
  const MAP_WIDTH = 2000;
  const MAP_HEIGHT = 1500;
  const WIN_WIDTH = 900;
  const WIN_HEIGHT = 600;
  const PANEL_WIDTH = 100;

  const MOUNTAIN = 0;
  const CITY = 1;
  const CAMP = 2;
  const HOUSE = 3;

  const LOCATION_FOREST = 0;
  const LOCATION_DESERT = 1;
  const LOCATION_PLAINS = 2;

  const LOCATION_NOISE_SCALE = 0.0015;
  const DESERT_TEXTURE_TILE = 512;

  // === Global state (через замыкание) ===
  let centerX: number;
  let centerY: number;
  const baseRadius = 600;
  let islandPoints: p5.Vector[] = [];
  let seed: number;
  let camX: number;
  let camY: number;
  let zoom = 1.0;
  let selectedTool = -1;
  let userObjects: CustomObject[] = [];
  let locationRegions: LocationRegion[] = [];
  const desertGroundTexture: p5.Image | null = null;

  let texturePreviewMode = false;

  // === Classes ===
  class LocationRegion {
    primaryBiome: number;
    secondaryBiome: number;
    outline: p5.Vector[];
    secondaryAlpha: number;

    constructor(
      primaryBiome: number,
      secondaryBiome: number,
      outline: p5.Vector[],
      private p: p5
    ) {
      this.primaryBiome = primaryBiome;
      this.secondaryBiome = secondaryBiome;
      this.outline = outline;
      this.secondaryAlpha = p.random(80, 140);
    }

    contains(x: number, y: number): boolean {
      let inside = false;
      const n = this.outline.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = this.outline[i].x,
          yi = this.outline[i].y;
        const xj = this.outline[j].x,
          yj = this.outline[j].y;
        const intersect =
          yi > y !== yj > y &&
          x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }
  }

  class CustomObject {
    roofAlpha = 255;

    constructor(
      public x: number,
      public y: number,
      public type: number,
      public locationType: number
    ) {}
  }

  // === p5 instance ===
  return new p5((p: p5) => {
    // === Preload assets ===
    // p.preload = () => {
    //   desertGroundTexture = p.loadImage('assets/desert_ground.png');
    // };

    // === Setup ===
    p.setup = () => {
      p.createCanvas(WIN_WIDTH, WIN_HEIGHT, p.WEBGL).parent(container);
      p.pixelDensity(1);
      zoom = 1.0;
      generateMap();
      camX = centerX;
      camY = centerY;
    };

    // === Main draw loop ===
    p.draw = () => {
      if (texturePreviewMode) {
        drawTexturePreview();
        return;
      }

      p.background(10, 10, 30);
      updateHouseAnimations();
      drawMap();
      drawToolbar();
      drawHints();
    };

    // === Texture preview mode / keyboard ===
    p.keyPressed = () => {
      const key = p.key;
      const keyCode = p.keyCode;

      if (key === 't' || key === 'T') {
        texturePreviewMode = !texturePreviewMode;
        return;
      }
      if (texturePreviewMode) return;

      if (key === 'n' || key === 'N') {
        generateMap();
        camX = centerX;
        camY = centerY;
        zoom = 1.0;
      }
      if (key === 's' || key === 'S') {
        p.save(
          'fantasy_map_' +
            p.nf(p.year(), 4) +
            p.nf(p.month(), 2) +
            p.nf(p.day(), 2) +
            '_' +
            p.nf(p.hour(), 2) +
            p.nf(p.minute(), 2) +
            p.nf(p.second(), 2) +
            '.png'
        );
      }
      if (key === '-') zoom /= 1.2;
      if (key === '=') zoom *= 1.2;
      zoom = p.constrain(zoom, 0.2, 8.0);

      const move = 60 / zoom;
      if (keyCode === +p.LEFT_ARROW) camX -= move;
      if (keyCode === +p.RIGHT_ARROW) camX += move;
      if (keyCode === +p.UP_ARROW) camY -= move;
      if (keyCode === +p.DOWN_ARROW) camY += move;
      camX = p.constrain(camX, 0, MAP_WIDTH);
      camY = p.constrain(camY, 0, MAP_HEIGHT);
    };

    // === Mouse interaction ===
    p.mousePressed = () => {
      if (texturePreviewMode) return;
      if (p.mouseX >= 0 && p.mouseX <= PANEL_WIDTH) {
        const cx = PANEL_WIDTH / 2;
        const y1 = 70,
          y2 = 130,
          y3 = 190,
          y4 = 250;
        const r = 35;
        if (p.dist(p.mouseX, p.mouseY, cx, y1) < r) selectedTool = MOUNTAIN;
        else if (p.dist(p.mouseX, p.mouseY, cx, y2) < r) selectedTool = CITY;
        else if (p.dist(p.mouseX, p.mouseY, cx, y3) < r) selectedTool = CAMP;
        else if (p.dist(p.mouseX, p.mouseY, cx, y4) < r) selectedTool = HOUSE;
        return;
      }
      if (selectedTool !== -1) {
        const mapX =
          camX +
          (p.mouseX - ((WIN_WIDTH - PANEL_WIDTH) / 2 + PANEL_WIDTH)) / zoom;
        const mapY = camY + (p.mouseY - WIN_HEIGHT / 2) / zoom;
        if (isInsideIsland(mapX, mapY)) {
          const locationType = getLocationAt(mapX, mapY);
          userObjects.push(
            new CustomObject(mapX, mapY, selectedTool, locationType)
          );
        }
      }
    };

    // === Core logic ===
    function generateMap(): void {
      seed = p.random(10000);
      p.noiseSeed(seed);
      centerX = MAP_WIDTH / 2;
      centerY = MAP_HEIGHT / 2;
      buildIslandOutline();
      buildLocationRegions();
      userObjects = [];
    }

    function buildIslandOutline(): void {
      islandPoints = [];
      const segments = 120;
      for (let i = 0; i < segments; i++) {
        const angle = p.map(i, 0, segments, 0, p.TWO_PI);
        const radiusNoise = p.noise(angle * 0.3, seed * 0.1) * 0.3 + 0.7;
        const radius = baseRadius * radiusNoise;
        const x = centerX + p.cos(angle) * radius;
        const y = centerY + p.sin(angle) * radius;
        islandPoints.push(p.createVector(x, y));
      }
    }

    function isInsideIsland(x: number, y: number): boolean {
      return p.dist(x, y, centerX, centerY) <= baseRadius * 0.92;
    }

    // === Location system ===
    function getLocationAt(x: number, y: number): number {
      const region = findRegion(x, y);
      if (region) return region.primaryBiome;
      const nx = x * LOCATION_NOISE_SCALE;
      const ny = y * LOCATION_NOISE_SCALE;
      const value = p.noise(nx, ny, seed + 2000);
      if (value < 0.33) return LOCATION_DESERT;
      if (value < 0.66) return LOCATION_FOREST;
      return LOCATION_PLAINS;
    }

    function findRegion(x: number, y: number): LocationRegion | null {
      for (let i = locationRegions.length - 1; i >= 0; i--) {
        if (locationRegions[i].contains(x, y)) return locationRegions[i];
      }
      return null;
    }

    function buildLocationRegions(): void {
      locationRegions = [];
      const regionCount = 30;
      const baseMin = 140;
      const baseMax = 260;
      for (let i = 0; i < regionCount; i++) {
        const center = getRandomPointInIsland();
        const baseRadiusRegion = p.random(baseMin, baseMax);
        const segments = p.floor(p.random(8, 15));
        const outline: p5.Vector[] = [];
        const startAngle = p.random(p.TWO_PI);
        for (let s = 0; s < segments; s++) {
          const angle =
            startAngle +
            p.map(s, 0, segments, 0, p.TWO_PI) +
            p.random(-0.2, 0.2);
          const radius = baseRadiusRegion * p.random(0.6, 1.15);
          const x = center.x + p.cos(angle) * radius;
          const y = center.y + p.sin(angle) * radius;
          const clamped = clampToIsland(x, y);
          outline.push(clamped);
        }
        const primary = sampleBiome(center.x, center.y);
        let secondary = -1;
        if (p.random(1) < 0.4) {
          secondary = pickDifferentBiome(primary, center.x, center.y);
        }
        locationRegions.push(
          new LocationRegion(primary, secondary, outline, p)
        );
      }
    }

    function getRandomPointInIsland(): p5.Vector {
      let x: number, y: number;
      do {
        x = p.random(centerX - baseRadius * 0.8, centerX + baseRadius * 0.8);
        y = p.random(centerY - baseRadius * 0.8, centerY + baseRadius * 0.8);
      } while (!isInsideIsland(x, y));
      return p.createVector(x, y);
    }

    function clampToIsland(x: number, y: number): p5.Vector {
      const maxRadius = baseRadius * 0.92;
      const dx = x - centerX;
      const dy = y - centerY;
      const d = p.sqrt(dx * dx + dy * dy);
      if (d <= maxRadius || d === 0) return p.createVector(x, y);
      const nx = dx / d;
      const ny = dy / d;
      return p.createVector(centerX + nx * maxRadius, centerY + ny * maxRadius);
    }

    function sampleBiome(x: number, y: number): number {
      const nx = x * 0.0012;
      const ny = y * 0.0012;
      const v = p.noise(nx, ny, seed * 0.15);
      if (v < 0.33) return LOCATION_DESERT;
      if (v < 0.66) return LOCATION_FOREST;
      return LOCATION_PLAINS;
    }

    function pickDifferentBiome(exclude: number, x: number, y: number): number {
      let candidate = sampleBiome(x + 50, y + 50);
      if (candidate === exclude) candidate = (candidate + 1) % 3;
      return candidate;
    }

    // === Rendering ===
    function drawMap(): void {
      p.push();
      p.translate(
        (WIN_WIDTH - PANEL_WIDTH) / 2 + PANEL_WIDTH - p.width / 2,
        WIN_HEIGHT / 2 - p.height / 2
      );
      p.scale(zoom);
      p.translate(-camX, -camY);

      p.noStroke();
      if (locationRegions.length > 0) {
        // Primary biomes
        for (const region of locationRegions) {
          if (region.primaryBiome === LOCATION_DESERT && desertGroundTexture) {
            drawRegionWithTexture(
              region,
              desertGroundTexture,
              DESERT_TEXTURE_TILE
            );
          } else {
            p.fill(getLocationFill(region.primaryBiome));
            p.beginShape();
            for (const pt of region.outline) p.vertex(pt.x, pt.y);
            p.endShape(p.CLOSE);
          }
        }
        // Secondary biomes
        for (const region of locationRegions) {
          if (region.secondaryBiome === -1) continue;
          p.fill(
            getLocationFill(region.secondaryBiome) as unknown as number,
            region.secondaryAlpha
          );
          p.beginShape();
          for (const pt of region.outline) p.vertex(pt.x, pt.y);
          p.endShape(p.CLOSE);
        }
      } else {
        p.fill(40, 120, 40);
        p.beginShape();
        for (const pt of islandPoints) p.vertex(pt.x, pt.y);
        p.endShape(p.CLOSE);
      }

      // Island border
      p.noFill();
      p.stroke(20, 70, 20);
      p.strokeWeight(2);
      p.beginShape();
      for (const pt of islandPoints) p.vertex(pt.x, pt.y);
      p.endShape(p.CLOSE);

      // Objects
      p.noStroke();
      for (const obj of userObjects) {
        drawObject(obj);
      }

      p.pop();
    }

    function drawObject(obj: CustomObject): void {
      const { x, y, type, locationType } = obj;
      const size = 10;
      p.noStroke();
      switch (type) {
        case MOUNTAIN:
          p.fill(applyLocationTint(p.color(180, 180, 190), locationType));
          p.triangle(
            x,
            y - size,
            x - size / 2,
            y + size / 2,
            x + size / 2,
            y + size / 2
          );
          break;
        case CITY:
          p.fill(applyLocationTint(p.color(240, 220, 100), locationType));
          p.ellipse(x, y, size * 1.5, size * 1.5);
          break;
        case CAMP:
          p.fill(applyLocationTint(p.color(220, 60, 60), locationType));
          p.rect(x - size / 2, y - size / 2, size, size);
          break;
        case HOUSE:
          drawHouse(obj, size);
          break;
      }
    }

    function drawHouse(obj: CustomObject, size: number): void {
      const { x, y, locationType } = obj;
      const wallColor = applyLocationTint(p.color(200, 160, 120), locationType);
      p.fill(wallColor);
      p.rect(x - size / 2, y, size, size);
      const targetAlpha = p.constrain(p.map(zoom, 1.0, 3.0, 255, 30), 30, 255);
      obj.roofAlpha = p.lerp(obj.roofAlpha, targetAlpha, 0.1);
      const roofColor = applyLocationTint(p.color(220, 60, 60), locationType);
      p.fill(+roofColor, obj.roofAlpha);
      p.triangle(x, y, x - size / 2, y, x + size / 2, y);
    }

    function updateHouseAnimations(): void {
      for (const obj of userObjects) {
        if (obj.type === HOUSE) {
          const targetAlpha = p.constrain(
            p.map(zoom, 1.0, 3.0, 255, 0),
            0,
            255
          );
          obj.roofAlpha = p.lerp(obj.roofAlpha, targetAlpha, 0.1);
        }
      }
    }

    // === Helpers ===
    function getLocationLabel(type: number): string {
      if (type === LOCATION_DESERT) return 'Desert';
      if (type === LOCATION_PLAINS) return 'Plains';
      return 'Forest';
    }

    function getLocationFill(type: number): p5.Color {
      if (type === LOCATION_DESERT) return p.color(216, 188, 120);
      if (type === LOCATION_PLAINS) return p.color(160, 190, 110);
      return p.color(60, 150, 90);
    }

    function applyLocationTint(
      baseColor: p5.Color,
      locationType: number
    ): p5.Color {
      let accent: p5.Color;
      if (locationType === LOCATION_DESERT) accent = p.color(220, 180, 80);
      else if (locationType === LOCATION_PLAINS)
        accent = p.color(150, 200, 110);
      else accent = p.color(80, 180, 100);
      return p.lerpColor(baseColor, accent, 0.35);
    }

    function texCoord(value: number, tileSize: number): number {
      let wrapped = value % tileSize;
      if (wrapped < 0) wrapped += tileSize;
      return wrapped / tileSize;
    }

    function drawRegionWithTexture(
      region: LocationRegion,
      texture: p5.Image,
      tileSize: number
    ): void {
      if (!texture) return;
      p.beginShape();
      p.texture(texture);
      p.textureMode(p.NORMAL);
      for (const corner of region.outline) {
        const u = texCoord(corner.x, tileSize);
        const v = texCoord(corner.y, tileSize);
        p.vertex(corner.x, corner.y, u, v);
      }
      p.endShape(p.CLOSE);
    }

    // === UI ===
    function drawToolbar(): void {
      p.push();
      p.translate(-p.width / 2, -p.height / 2);
      p.fill(30, 30, 50);
      p.noStroke();
      p.rect(0, 0, PANEL_WIDTH, WIN_HEIGHT);
      const iconSize = 35;
      const cx = PANEL_WIDTH / 2;
      const y1 = 70,
        y2 = 130,
        y3 = 190,
        y4 = 250;

      if (selectedTool === MOUNTAIN) p.fill(80, 80, 100);
      else p.fill(60, 60, 80);
      p.triangle(
        cx,
        y1 - iconSize / 2,
        cx - iconSize / 2,
        y1 + iconSize / 2,
        cx + iconSize / 2,
        y1 + iconSize / 2
      );

      if (selectedTool === CITY) p.fill(255, 230, 100);
      else p.fill(200, 180, 80);
      p.ellipse(cx, y2, iconSize, iconSize);

      if (selectedTool === CAMP) p.fill(220, 80, 80);
      else p.fill(180, 60, 60);
      p.rect(cx - iconSize / 2, y3 - iconSize / 2, iconSize, iconSize);

      if (selectedTool === HOUSE) {
        p.fill(220, 60, 60);
        p.triangle(cx, y4, cx - iconSize / 2, y4, cx + iconSize / 2, y4);
        p.fill(130, 40, 40);
        p.triangle(cx, y4, cx - iconSize / 2, y4, cx + iconSize / 2, y4);
      } else {
        p.fill(150, 120, 90);
        p.rect(cx - iconSize / 2, y4, iconSize, iconSize / 2);
        p.fill(100, 30, 30);
        p.triangle(cx, y4, cx - iconSize / 2, y4, cx + iconSize / 2, y4);
      }
      p.pop();
    }

    function drawHints(): void {
      p.push();
      p.translate(-p.width / 2, -p.height / 2);
      p.fill(255);
      p.textSize(12);
      p.text(
        'N — новая карта | Выберите иконку → клик на карту',
        PANEL_WIDTH + 10,
        20
      );
      if (p.mouseX > PANEL_WIDTH && p.mouseX < WIN_WIDTH) {
        const mapX =
          camX +
          (p.mouseX - ((WIN_WIDTH - PANEL_WIDTH) / 2 + PANEL_WIDTH)) / zoom;
        const mapY = camY + (p.mouseY - WIN_HEIGHT / 2) / zoom;
        const hovered = findRegion(mapX, mapY);
        let label: string;
        if (hovered) {
          label = getLocationLabel(hovered.primaryBiome);
          if (hovered.secondaryBiome !== -1) {
            label += ' + ' + getLocationLabel(hovered.secondaryBiome);
          }
        } else {
          label = getLocationLabel(getLocationAt(mapX, mapY));
        }
        p.text('Location: ' + label, PANEL_WIDTH + 10, 40);
      }
      p.pop();
    }

    function drawTexturePreview(): void {
      p.background(25);
      p.textSize(18);
      p.fill(255);
      p.textAlign(p.LEFT, p.TOP);
      p.text('Texture preview mode (press T to toggle)', 20, 20);
      const previewSize = 250;
      const margin = 120;
      const top = 120;
      drawLocationPreview('Forest', LOCATION_FOREST, margin, top, previewSize);
      drawLocationPreview(
        'Desert',
        LOCATION_DESERT,
        margin * 2 + previewSize,
        top,
        previewSize
      );
    }

    function drawLocationPreview(
      label: string,
      biome: number,
      x: number,
      y: number,
      size: number
    ): void {
      p.push();
      p.translate(x, y);
      p.fill(getLocationFill(biome));
      p.stroke(255, 60);
      p.strokeWeight(2);
      drawPreviewShape(biome, size * 0.3, size * 0.3, size * 0.4, 0);
      drawPreviewShape(biome, size * 0.75, size * 0.3, size * 0.35, 1);
      drawPreviewShape(biome, size * 0.5, size * 0.75, size * 0.4, 2);
      p.fill(255);
      p.textAlign(p.CENTER, p.TOP);
      p.text(label, size / 2, size + 10);
      p.pop();
    }

    function drawPreviewShape(
      biome: number,
      cx: number,
      cy: number,
      size: number,
      shapeType: number
    ): void {
      const outline: p5.Vector[] = [];
      if (shapeType === 0) {
        const seg = 40;
        for (let i = 0; i < seg; i++) {
          const a = p.map(i, 0, seg, 0, p.TWO_PI);
          outline.push(
            p.createVector(cx + p.cos(a) * size, cy + p.sin(a) * size)
          );
        }
      } else if (shapeType === 1) {
        outline.push(p.createVector(cx - size, cy - size));
        outline.push(p.createVector(cx + size, cy - size));
        outline.push(p.createVector(cx + size, cy + size));
        outline.push(p.createVector(cx - size, cy + size));
      } else {
        outline.push(p.createVector(cx, cy - size));
        outline.push(p.createVector(cx + size, cy + size));
        outline.push(p.createVector(cx - size, cy + size));
      }
      const region = new LocationRegion(biome, -1, outline, p);
      if (biome === LOCATION_DESERT && desertGroundTexture) {
        drawRegionWithTexture(region, desertGroundTexture, DESERT_TEXTURE_TILE);
      } else {
        p.fill(getLocationFill(biome));
        p.beginShape();
        for (const pt of outline) p.vertex(pt.x, pt.y);
        p.endShape(p.CLOSE);
      }
    }
  });
}
