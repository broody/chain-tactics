import React, { useState, useRef, useEffect, useCallback } from "react";
import { BlueprintContainer } from "../components/BlueprintContainer";
import { PixelPanel } from "../components/PixelPanel";
import { PixelButton } from "../components/PixelButton";
import { terrainAtlas } from "../game/spritesheets/terrain";
import {
  Application,
  Assets,
  Spritesheet,
  Sprite,
  Container,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";
import { Viewport } from "pixi-viewport";

const TERRAIN_TYPES = [
  { char: ".", name: "Grass", color: "#4a7c59" },
  { char: "M", name: "Mountain", color: "#8b7355" },
  { char: "R", name: "Road", color: "#9e9e9e" },
  { char: "T", name: "Tree", color: "#2d5a1e" },
  { char: "D", name: "DirtRoad", color: "#8b7355" },
  { char: "O", name: "Ocean", color: "#2389da" },
];

const BUILDING_TYPES = ["City", "Factory", "HQ"];
const UNIT_TYPES = [
  "Infantry",
  "Ranger",
  "Tank",
  "HeavyTank",
  "Artillery",
  "Jeep",
  "Buggy",
];

interface Building {
  type: string;
  player: number;
  x: number;
  y: number;
}
interface Unit {
  type: string;
  player: number;
  x: number;
  y: number;
}
interface EditorState {
  terrain: string[][];
  buildings: Building[];
  units: Unit[];
  width: number;
  height: number;
}

const loadSavedState = (): EditorState | null => {
  try {
    const saved = localStorage.getItem("hashfront_map_editor");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load map editor state", e);
  }
  return null;
};

export default function MapEditor() {
  const savedState = loadSavedState();
  const [width, setWidth] = useState(savedState?.width || 20);
  const [height, setHeight] = useState(savedState?.height || 20);

  const [terrain, setTerrain] = useState<string[][]>(
    () =>
      savedState?.terrain ||
      Array(20)
        .fill(null)
        .map(() => Array(20).fill("O")),
  );
  const [buildings, setBuildings] = useState<Building[]>(
    savedState?.buildings || [],
  );
  const [units, setUnits] = useState<Unit[]>(savedState?.units || []);

  const [past, setPast] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);

  const [toolCategory, setToolCategory] = useState<
    "terrain" | "building" | "unit" | "erase"
  >("terrain");
  const [selectedTerrain, setSelectedTerrain] = useState(".");
  const [selectedBuilding, setSelectedBuilding] = useState("City");
  const [selectedUnit, setSelectedUnit] = useState("Infantry");
  const [selectedPlayer, setSelectedPlayer] = useState(1);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(
      "hashfront_map_editor",
      JSON.stringify({ width, height, terrain, buildings, units }),
    );
  }, [width, height, terrain, buildings, units]);

  const saveState = useCallback(() => {
    setPast((prev) => [
      ...prev,
      {
        terrain: terrain.map((row) => [...row]),
        buildings: [...buildings],
        units: [...units],
        width,
        height,
      },
    ]);
    setFuture([]);
  }, [terrain, buildings, units, width, height]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [
      { terrain, buildings, units, width, height },
      ...prev,
    ]);
    setTerrain(previous.terrain);
    setBuildings(previous.buildings);
    setUnits(previous.units);
    setWidth(previous.width);
    setHeight(previous.height);
  }, [past, terrain, buildings, units, width, height]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, { terrain, buildings, units, width, height }]);
    setTerrain(next.terrain);
    setBuildings(next.buildings);
    setUnits(next.units);
    setWidth(next.width);
    setHeight(next.height);
  }, [future, terrain, buildings, units, width, height]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleResize = (newW: number, newH: number) => {
    saveState();
    setWidth(newW);
    setHeight(newH);
    setTerrain((prev) => {
      const newTerrain = Array(newH)
        .fill(null)
        .map(() => Array(newW).fill("O"));
      for (let y = 0; y < Math.min(prev.length, newH); y++) {
        for (let x = 0; x < Math.min(prev[y].length, newW); x++) {
          if (x > 0 && y > 0 && x < newW - 1 && y < newH - 1)
            newTerrain[y][x] = prev[y][x];
        }
      }
      return newTerrain;
    });
    setBuildings((prev) =>
      prev.filter(
        (b) => b.x > 0 && b.y > 0 && b.x < newW - 1 && b.y < newH - 1,
      ),
    );
    setUnits((prev) =>
      prev.filter(
        (u) => u.x > 0 && u.y > 0 && u.x < newW - 1 && u.y < newH - 1,
      ),
    );
  };

  const applyTool = useCallback(
    (x: number, y: number) => {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (toolCategory === "terrain") {
        if (isEdge && selectedTerrain !== "O") return;
        setTerrain((prev) => {
          if (prev[y][x] === selectedTerrain) return prev;
          const next = [...prev.map((row) => [...row])];
          next[y][x] = selectedTerrain;
          return next;
        });
      } else if (toolCategory === "building") {
        if (isEdge) return;
        setBuildings((prev) => {
          const next = prev.filter((b) => b.x !== x || b.y !== y);
          next.push({ type: selectedBuilding, player: selectedPlayer, x, y });
          return next;
        });
      } else if (toolCategory === "unit") {
        if (isEdge) return;
        setUnits((prev) => {
          const next = prev.filter((u) => u.x !== x || u.y !== y);
          next.push({ type: selectedUnit, player: selectedPlayer, x, y });
          return next;
        });
      } else if (toolCategory === "erase") {
        setTerrain((prev) => {
          if (prev[y][x] === "O") return prev;
          const next = [...prev.map((row) => [...row])];
          next[y][x] = "O";
          return next;
        });
        setBuildings((prev) => prev.filter((b) => b.x !== x || b.y !== y));
        setUnits((prev) => prev.filter((u) => u.x !== x || u.y !== y));
      }
    },
    [
      width,
      height,
      toolCategory,
      selectedTerrain,
      selectedBuilding,
      selectedUnit,
      selectedPlayer,
    ],
  );

  const handleReset = () => {
    saveState();
    setTerrain(
      Array(height)
        .fill(null)
        .map(() => Array(width).fill("O")),
    );
    setBuildings([]);
    setUnits([]);
    setIsResetModalOpen(false);
  };

  // Autotile logic
  const isTileType = useCallback(
    (tx: number, ty: number, char: string) => {
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
      return terrain[ty][tx] === char;
    },
    [terrain, width, height],
  );

  const isOceanOrOOB = useCallback(
    (tx: number, ty: number) => {
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) return true;
      const char = terrain[ty][tx];
      return char === "O" || char === "k" || char === "b" || char === "s";
    },
    [terrain, width, height],
  );

  const pickAutotile = useCallback(
    (tx: number, ty: number, char: string, prefix: string) => {
      const left = isTileType(tx - 1, ty, char);
      const right = isTileType(tx + 1, ty, char);
      const up = isTileType(tx, ty - 1, char);
      const down = isTileType(tx, ty + 1, char);
      const horizontal = left || right;
      const vertical = up || down;

      if (vertical && !horizontal) {
        if (up && down) return `${prefix}_vertical_mid`;
        if (!up && down) return `${prefix}_top`;
        if (up && !down) return `${prefix}_bottom`;
      }
      if (horizontal && !vertical) {
        if (left && right) return `${prefix}_horizontal_mid`;
        if (!left && right) return `${prefix}_left`;
        if (left && !right) return `${prefix}_right`;
      }
      if (right && down && !left && !up) return `${prefix}_top_left`;
      if (right && up && !left && !down) return `${prefix}_bottom_left`;
      if (left && right && down && !up) return `${prefix}_top_mid`;
      if (left && down && !right && !up) return `${prefix}_top_right`;
      if (left && right && up && !down) return `${prefix}_bottom_mid`;
      if (left && up && !right && !down) return `${prefix}_bottom_right`;
      if (right && up && down && !left) return `${prefix}_mid_left`;
      if (left && up && down && !right) return `${prefix}_mid_right`;
      if (left && right && up && down) return `${prefix}_mid_center`;

      return `${prefix}_single`;
    },
    [isTileType],
  );

  const pickOceanBorder = useCallback(
    (tx: number, ty: number, prefix: string) => {
      const landUp = !isOceanOrOOB(tx, ty - 1);
      const landDown = !isOceanOrOOB(tx, ty + 1);
      const landLeft = !isOceanOrOOB(tx - 1, ty);
      const landRight = !isOceanOrOOB(tx + 1, ty);

      if (landUp && landDown && landLeft && landRight)
        return `${prefix}_cove_enclosed`;

      if (landDown && landLeft && landRight) return `${prefix}_cove_top`;
      if (landUp && landLeft && landRight) return `${prefix}_cove_bottom`;
      if (landUp && landDown && landRight) return `${prefix}_cove_left`;
      if (landUp && landDown && landLeft) return `${prefix}_cove_right`;

      if (landUp && landDown) return `${prefix}_cove_parallel_vertical`;
      if (landLeft && landRight) return `${prefix}_cove_parallel_horizontal`;

      if (landUp && landLeft) return `${prefix}_inner_top_left`;
      if (landUp && landRight) return `${prefix}_inner_top_right`;
      if (landDown && landLeft) return `${prefix}_inner_bottom_left`;
      if (landDown && landRight) return `${prefix}_inner_bottom_right`;

      if (landUp) return `${prefix}_top_edge`;
      if (landDown) return `${prefix}_bottom_edge`;
      if (landLeft) return `${prefix}_left_edge`;
      if (landRight) return `${prefix}_right_edge`;

      return null;
    },
    [isOceanOrOOB],
  );

  const pickOceanOuterCorners = useCallback(
    (tx: number, ty: number, prefix: string) => {
      const corners = [];
      const landUp = !isOceanOrOOB(tx, ty - 1);
      const landDown = !isOceanOrOOB(tx, ty + 1);
      const landLeft = !isOceanOrOOB(tx - 1, ty);
      const landRight = !isOceanOrOOB(tx + 1, ty);

      if (!landUp && !landLeft && !isOceanOrOOB(tx - 1, ty - 1))
        corners.push(`${prefix}_bottom_right`);
      if (!landUp && !landRight && !isOceanOrOOB(tx + 1, ty - 1))
        corners.push(`${prefix}_bottom_left`);
      if (!landDown && !landLeft && !isOceanOrOOB(tx - 1, ty + 1))
        corners.push(`${prefix}_top_right`);
      if (!landDown && !landRight && !isOceanOrOOB(tx + 1, ty + 1))
        corners.push(`${prefix}_top_left`);

      return corners;
    },
    [isOceanOrOOB],
  );

  const getTileSprites = useCallback(
    (tx: number, ty: number) => {
      const char = terrain[ty][tx];
      const sprites: string[] = [];

      if (char === "O" || char === "k" || char === "b" || char === "s") {
        sprites.push("border_water");
        const prefix =
          char === "b" ? "bluff" : char === "s" ? "beach" : "cliff";
        const primary = pickOceanBorder(tx, ty, prefix);
        if (primary) sprites.push(primary);
        const corners = pickOceanOuterCorners(tx, ty, prefix);
        sprites.push(...corners);
      } else {
        sprites.push("grass");
        if (char === "M") sprites.push(pickAutotile(tx, ty, "M", "mountain"));
        else if (char === "T") sprites.push(pickAutotile(tx, ty, "T", "tree"));
        else if (char === "R") sprites.push(pickAutotile(tx, ty, "R", "road"));
        else if (char === "D")
          sprites.push(pickAutotile(tx, ty, "D", "dirtroad"));
      }
      return sprites;
    },
    [terrain, pickOceanBorder, pickOceanOuterCorners, pickAutotile],
  );

  const getExportChar = (x: number, y: number) => {
    const char = terrain[y][x];
    if (char === "O") {
      const landUp = !isOceanOrOOB(x, y - 1);
      const landDown = !isOceanOrOOB(x, y + 1);
      const landLeft = !isOceanOrOOB(x - 1, y);
      const landRight = !isOceanOrOOB(x + 1, y);
      const landUpLeft = !isOceanOrOOB(x - 1, y - 1);
      const landUpRight = !isOceanOrOOB(x + 1, y - 1);
      const landDownLeft = !isOceanOrOOB(x - 1, y + 1);
      const landDownRight = !isOceanOrOOB(x + 1, y + 1);
      if (
        landUp ||
        landDown ||
        landLeft ||
        landRight ||
        landUpLeft ||
        landUpRight ||
        landDownLeft ||
        landDownRight
      )
        return "k";
    }
    return char;
  };

  const handleExport = () => {
    const terrainText = terrain
      .map((row, y) => row.map((_, x) => getExportChar(x, y)).join(" "))
      .join("\n");
    const buildingsText = buildings
      .map((b) => `${b.type} ${b.player} ${b.x} ${b.y}`)
      .join("\n");
    const unitsText = units
      .map((u) => `${u.type} ${u.player} ${u.x} ${u.y}`)
      .join("\n");

    const download = (filename: string, content: string) => {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    download("terrain.txt", terrainText);
    if (buildingsText) download("buildings.txt", buildingsText);
    if (unitsText) download("units.txt", unitsText);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    saveState();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const lines = text
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));

      if (file.name === "terrain.txt") {
        const newTerrain = lines.map((line) => line.split(/\s+/));
        if (newTerrain.length > 0) {
          setHeight(newTerrain.length);
          setWidth(newTerrain[0].length);
          setTerrain(newTerrain);
        }
      } else if (file.name === "buildings.txt") {
        setBuildings(
          lines.map((line) => {
            const parts = line.split(/\s+/);
            return {
              type: parts[0],
              player: parseInt(parts[1], 10),
              x: parseInt(parts[2], 10),
              y: parseInt(parts[3], 10),
            };
          }),
        );
      } else if (file.name === "units.txt") {
        setUnits(
          lines.map((line) => {
            const parts = line.split(/\s+/);
            return {
              type: parts[0],
              player: parseInt(parts[1], 10),
              x: parseInt(parts[2], 10),
              y: parseInt(parts[3], 10),
            };
          }),
        );
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // PixiJS Integration
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const mapContainerRef = useRef<Container | null>(null);
  const sheetRef = useRef<Spritesheet | null>(null);

  // Use refs for callbacks inside Pixi events to avoid recreation
  const applyToolRef = useRef(applyTool);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const saveStateRef = useRef(saveState);

  useEffect(() => {
    applyToolRef.current = applyTool;
  }, [applyTool]);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);
  useEffect(() => {
    heightRef.current = height;
  }, [height]);
  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const app = new Application();
    app
      .init({
        resizeTo: containerRef.current,
        backgroundColor: 0x001a33,
        antialias: false,
        roundPixels: true,
      })
      .then(async () => {
        appRef.current = app;
        if (containerRef.current)
          containerRef.current.appendChild(app.canvas as HTMLCanvasElement);

        const texture = await Assets.load({
          src: "/tilesets/terrain.png",
          data: { scaleMode: "nearest" },
        });
        const sheet = new Spritesheet(texture, terrainAtlas);
        await sheet.parse();
        sheetRef.current = sheet;

        const vp = new Viewport({
          screenWidth: app.screen.width,
          screenHeight: app.screen.height,
          worldWidth: widthRef.current * 32,
          worldHeight: heightRef.current * 32,
          events: app.renderer.events,
        });
        app.stage.addChild(vp as any);

        // Panning with right click (button 2) or middle click (button 1)
        vp.drag({ mouseButtons: "right" })
          .pinch()
          .wheel()
          .clampZoom({ minScale: 0.25, maxScale: 4 });
        vp.scale.set(1.5);
        vp.moveCenter(
          (widthRef.current * 32) / 2,
          (heightRef.current * 32) / 2,
        );

        const mapContainer = new Container();
        vp.addChild(mapContainer);
        mapContainerRef.current = mapContainer;

        const overlayGrid = new Graphics();
        vp.addChild(overlayGrid);

        const drawGrid = () => {
          overlayGrid.clear();
          overlayGrid.setStrokeStyle({
            color: 0xffffff,
            alpha: 0.15,
            width: 1,
          });
          const w = widthRef.current * 32;
          const h = heightRef.current * 32;
          for (let x = 0; x <= w; x += 32)
            overlayGrid.moveTo(x, 0).lineTo(x, h);
          for (let y = 0; y <= h; y += 32)
            overlayGrid.moveTo(0, y).lineTo(w, y);
          overlayGrid.stroke();
        };
        drawGrid();

        // Listen for viewport resize to update grid bounds if width/height changed
        app.ticker.add(() => {
          if (
            vp.worldWidth !== widthRef.current * 32 ||
            vp.worldHeight !== heightRef.current * 32
          ) {
            vp.resize(
              app.screen.width,
              app.screen.height,
              widthRef.current * 32,
              heightRef.current * 32,
            );
            drawGrid();
          }
        });

        const highlight = new Graphics();
        highlight.setStrokeStyle({ color: 0xffffff, alpha: 0.8, width: 2 });
        highlight.rect(0, 0, 32, 32);
        highlight.stroke();
        highlight.visible = false;
        vp.addChild(highlight);

        // Handle Drawing events
        let isDrawing = false;
        let lastDrawnPos = { x: -1, y: -1 };

        vp.on("pointerdown", (e) => {
          if (e.button === 0) {
            // Left click
            saveStateRef.current();
            isDrawing = true;
            const pos = vp.toLocal(e.global);
            const tx = Math.floor(pos.x / 32);
            const ty = Math.floor(pos.y / 32);
            lastDrawnPos = { x: tx, y: ty };
            applyToolRef.current(tx, ty);
          }
        });

        vp.on("pointerup", (e) => {
          if (e.button === 0) isDrawing = false;
        });
        vp.on("pointerupoutside", (e) => {
          if (e.button === 0) isDrawing = false;
        });

        vp.on("pointermove", (e) => {
          const pos = vp.toLocal(e.global);
          const tx = Math.floor(pos.x / 32);
          const ty = Math.floor(pos.y / 32);

          if (
            tx >= 0 &&
            tx < widthRef.current &&
            ty >= 0 &&
            ty < heightRef.current
          ) {
            highlight.visible = true;
            highlight.x = tx * 32;
            highlight.y = ty * 32;
            if (isDrawing && (tx !== lastDrawnPos.x || ty !== lastDrawnPos.y)) {
              lastDrawnPos = { x: tx, y: ty };
              applyToolRef.current(tx, ty);
            }
          } else {
            highlight.visible = false;
          }
        });

        app.canvas.addEventListener("pointerout", () => {
          highlight.visible = false;
        });

        // Prevent context menu on right click to allow panning
        app.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        // Trigger initial draw by slightly changing state reference or just letting useEffect handle it
        setTerrain((prev) => [...prev]);
      });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []); // Only run once

  // Redraw map when state changes
  useEffect(() => {
    const container = mapContainerRef.current;
    const sheet = sheetRef.current;
    if (!container || !sheet) return;

    container.removeChildren();

    const addSprite = (name: string, x: number, y: number, alpha = 1) => {
      const tex = sheet.textures[name];
      if (tex) {
        const s = new Sprite(tex);
        s.x = x * 32;
        s.y = y * 32;
        s.width = 32;
        s.height = 32;
        s.alpha = alpha;
        container.addChild(s);
      }
    };

    const addText = (
      text: string,
      x: number,
      y: number,
      size: number,
      color: string,
      align: "top" | "bottom" | "center" = "center",
    ) => {
      const t = new Text({
        text,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: size,
          fill: color,
          fontWeight: "bold",
        }),
      });
      t.x = x * 32 + (32 - t.width) / 2;
      if (align === "center") t.y = y * 32 + (32 - t.height) / 2;
      else if (align === "top") t.y = y * 32 + 2;
      else if (align === "bottom") t.y = y * 32 + 32 - t.height - 2;
      container.addChild(t);
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sprites = getTileSprites(x, y);
        for (const sp of sprites) addSprite(sp, x, y);

        const bldg = buildings.find((b) => b.x === x && b.y === y);
        if (bldg) {
          addSprite(
            bldg.type === "City"
              ? "city_idle"
              : bldg.type === "Factory"
                ? "factory_idle"
                : "hq_bottom",
            x,
            y,
          );
          if (bldg.type === "HQ") addSprite("hq_top", x, y - 1);
          addText(`P${bldg.player}`, x, y, 10, "#ffffff", "top");
        }

        const unit = units.find((u) => u.x === x && u.y === y);
        if (unit) {
          addText(
            `${unit.type.substring(0, 3).toUpperCase()}`,
            x,
            y,
            10,
            "#ff5555",
            "bottom",
          );
        }
      }
    }
  }, [terrain, buildings, units, width, height, getTileSprites]);

  return (
    <BlueprintContainer>
      <div className="flex w-full h-full gap-4 text-white font-mono">
        {/* PixiJS Canvas Container */}
        <PixelPanel
          className="flex-1 flex flex-col relative overflow-hidden"
          title="TACTICAL_MAP_CANVAS"
        >
          <div className="absolute top-2 right-4 flex gap-2 z-10">
            <div className="bg-black/50 px-2 py-1 text-[10px] border border-white/20 mr-4 flex items-center">
              Right-Click + Drag to Pan
            </div>
            <button
              onClick={undo}
              disabled={past.length === 0}
              className="px-2 py-1 text-xs border border-white/30 disabled:opacity-30 hover:bg-white/10 bg-black/50"
            >
              UNDO
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              className="px-2 py-1 text-xs border border-white/30 disabled:opacity-30 hover:bg-white/10 bg-black/50"
            >
              REDO
            </button>
          </div>
          <div ref={containerRef} className="w-full h-full cursor-crosshair" />
        </PixelPanel>

        {/* Tools Palette */}
        <PixelPanel
          className="w-64 flex flex-col gap-4 overflow-y-auto"
          title="EDITOR_TOOLS"
        >
          <div>
            <div className="text-xs mb-2 opacity-50">DIMENSIONS</div>
            <div className="flex gap-2 mb-2 text-sm">
              <input
                type="number"
                className="w-16 bg-transparent border border-white/30 text-center"
                value={width}
                onChange={(e) =>
                  handleResize(parseInt(e.target.value, 10) || 1, height)
                }
              />
              <span className="self-center">x</span>
              <input
                type="number"
                className="w-16 bg-transparent border border-white/30 text-center"
                value={height}
                onChange={(e) =>
                  handleResize(width, parseInt(e.target.value, 10) || 1)
                }
              />
            </div>
          </div>
          <hr className="border-white/20" />
          <div>
            <div className="text-xs mb-2 opacity-50">TOOL CATEGORY</div>
            <div className="flex flex-col gap-1">
              <PixelButton
                variant={toolCategory === "terrain" ? "green" : "blue"}
                onClick={() => setToolCategory("terrain")}
              >
                Terrain
              </PixelButton>
              <PixelButton
                variant={toolCategory === "building" ? "green" : "blue"}
                onClick={() => setToolCategory("building")}
              >
                Building
              </PixelButton>
              <PixelButton
                variant={toolCategory === "unit" ? "green" : "blue"}
                onClick={() => setToolCategory("unit")}
              >
                Unit
              </PixelButton>
              <PixelButton
                variant={toolCategory === "erase" ? "green" : "blue"}
                onClick={() => setToolCategory("erase")}
              >
                Erase Object
              </PixelButton>
            </div>
          </div>
          {toolCategory === "terrain" && (
            <div>
              <div className="text-xs mb-2 opacity-50 mt-4">TERRAIN</div>
              <div className="grid grid-cols-2 gap-1">
                {TERRAIN_TYPES.map((t) => (
                  <button
                    key={t.char}
                    onClick={() => setSelectedTerrain(t.char)}
                    className={`h-8 border text-xs flex items-center justify-center ${selectedTerrain === t.char ? "border-green-500 text-green-500 bg-white/5" : "border-white/30 hover:border-white/60"}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {toolCategory === "building" && (
            <div>
              <div className="text-xs mb-2 opacity-50 mt-4">BUILDINGS</div>
              <div className="flex flex-col gap-1">
                {BUILDING_TYPES.map((b) => (
                  <PixelButton
                    key={b}
                    variant={selectedBuilding === b ? "green" : "gray"}
                    onClick={() => setSelectedBuilding(b)}
                  >
                    {b}
                  </PixelButton>
                ))}
              </div>
            </div>
          )}
          {toolCategory === "unit" && (
            <div>
              <div className="text-xs mb-2 opacity-50 mt-4">UNITS</div>
              <div className="flex flex-col gap-1">
                {UNIT_TYPES.map((u) => (
                  <button
                    key={u}
                    onClick={() => setSelectedUnit(u)}
                    className={`text-left text-sm p-1 border ${selectedUnit === u ? "border-green-500 text-green-500 bg-white/5" : "border-transparent hover:border-white/30"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(toolCategory === "building" || toolCategory === "unit") && (
            <div>
              <div className="text-xs mb-2 opacity-50 mt-4">PLAYER OWNER</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlayer(p)}
                    className={`w-8 h-8 border text-sm flex items-center justify-center ${selectedPlayer === p ? "border-green-500 text-green-500 bg-white/5" : "border-white/30 hover:border-white/60"}`}
                  >
                    P{p}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-auto pt-4 flex flex-col gap-2">
            <PixelButton
              onClick={() => setIsResetModalOpen(true)}
              className="!border-red-500 !text-red-500 hover:!bg-red-500 hover:!text-black mb-2"
            >
              RESET MAP
            </PixelButton>
            <PixelButton onClick={handleExport} variant="green">
              EXPORT MAP
            </PixelButton>
            <label className="blueprint-btn text-center cursor-pointer block border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black">
              IMPORT FILES
              <input
                type="file"
                multiple
                accept=".txt"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </PixelPanel>
      </div>

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-blueprint-dark/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <PixelPanel title="CONFIRM_RESET" className="!p-6">
              <div className="flex flex-col gap-5">
                <div className="text-center text-red-500 uppercase tracking-widest">
                  Warning: This will clear all terrain, buildings, and units.
                  You can undo this action.
                </div>
                <div className="flex justify-between gap-4 mt-4">
                  <PixelButton
                    variant="gray"
                    className="flex-1"
                    onClick={() => setIsResetModalOpen(false)}
                  >
                    CANCEL
                  </PixelButton>
                  <PixelButton
                    className="flex-1 !border-red-500 !text-red-500 hover:!bg-red-500 hover:!text-black"
                    onClick={handleReset}
                  >
                    CONFIRM RESET
                  </PixelButton>
                </div>
              </div>
            </PixelPanel>
          </div>
        </div>
      )}
    </BlueprintContainer>
  );
}
