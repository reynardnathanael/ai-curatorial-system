import kaboom from "kaboom";

export function startExhibition(
  canvasElement,
  sectionCount,
  onSectionInteract,
) {
  const k = kaboom({
    canvas: canvasElement,
    width: window.innerWidth,
    height: window.innerHeight,
    stretch: true,
    letterbox: true,
    global: false,
    background: [46, 20, 35], // Deep void background outside the room matching the dark walls
  });

  // --- 1. Load the Character ---
  k.loadSprite("player", "spritesheet.png", {
    sliceX: 39,
    sliceY: 31,
    anims: {
      "idle-down": 936,
      "idle-side": 975,
      "idle-up": 1014,
      "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
      "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
      "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
    },
  });

  // --- 2. Advanced Dynamic Layout Generator ---
  const generateLayout = (count) => {
    const layout = [];
    const innerWidth = count * 3 + 5; // Adjusted to perfectly center the 2-block desks
    const padWidth = 4; // Drastically reduced padding for better performance
    const carpetWidth = innerWidth - 4;

    const padSpace = " ".repeat(padWidth);

    // 2. Upper plain square wall
    layout.push(padSpace + "T".repeat(innerWidth) + padSpace);

    // 3. Wall Baseboard
    let wallRow = "[";
    for (let i = 0; i < innerWidth - 4; i++) {
      wallRow += i % 4 === 2 ? "I" : "W";
    }
    wallRow += "]";
    layout.push(padSpace + "T" + wallRow + "T" + padSpace);

    // 4. Upper Wood Floor (Bounded by walls on the sides)
    layout.push(padSpace + "T" + ".".repeat(innerWidth - 2) + "T" + padSpace);

    // 5. Red Carpet Area (Using 9-slice tiling)
    const carpetTop = "c" + "C".repeat(carpetWidth - 2) + "d";
    layout.push(padSpace + "T." + carpetTop + ".T" + padSpace); // Carpet top

    // Pedestals on the center of the carpet
    let markerRow = "";
    for (let i = 1; i <= count; i++) {
      markerRow += i === count ? `${i}*` : `${i}**`; // Safely allocates 2 blocks per desk plus gaps
    }
    let carpetMid = "e" + markerRow + "f";
    layout.push(padSpace + "T." + carpetMid + ".T" + padSpace);

    const carpetBot = "g" + "B".repeat(carpetWidth - 2) + "h";
    layout.push(padSpace + "T." + carpetBot + ".T" + padSpace); // Carpet bottom

    // 6. Lower Wood Floor
    layout.push(padSpace + "T" + ".".repeat(innerWidth - 2) + "T" + padSpace);

    // 7. Bottom Wall / Void
    layout.push(padSpace + "T".repeat(innerWidth) + padSpace);

    return layout;
  };

  // --- 3. Map Tiles from Spritesheet ---
  const TILE_SIZE = 64; // Set this back to 64! (16px sprite * 4 scale = 64px)

  const levelConf = {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    tiles: {
      // Walls (Collision Enabled)
      T: () => [
        k.color(46, 20, 35),
        k.rect(TILE_SIZE, TILE_SIZE),
        k.area(),
        k.body({ isStatic: true }),
      ],
      "[": () => [
        k.sprite("player", { frame: 26 }), // Left wall corner
        k.scale(4),
        k.area(),
        k.body({ isStatic: true }),
      ],
      "]": () => [
        k.sprite("player", { frame: 28 }), // Right wall corner
        k.scale(4),
        k.area(),
        k.body({ isStatic: true }),
      ],
      I: () => [
        k.sprite("player", { frame: 25 }), // Window
        k.scale(4),
        k.area(),
        k.body({ isStatic: true }),
      ],
      W: () => [
        k.sprite("player", { frame: 27 }), // Wood Baseboard Trim
        k.scale(4),
        k.area(),
        k.body({ isStatic: true }),
      ],
      // Wood Floor (Walkable)
      ".": () => [k.sprite("player", { frame: 66 }), k.scale(4), k.z(-2)],
      // Red Carpet Tiling (Walkable)
      c: () => [k.sprite("player", { frame: 301 }), k.scale(4), k.z(-1)], // Top-Left
      C: () => [k.sprite("player", { frame: 302 }), k.scale(4), k.z(-1)], // Top
      d: () => [k.sprite("player", { frame: 303 }), k.scale(4), k.z(-1)], // Top-Right
      e: () => [k.sprite("player", { frame: 340 }), k.scale(4), k.z(-1)], // Left
      "*": () => [k.sprite("player", { frame: 341 }), k.scale(4), k.z(-1)], // Center
      f: () => [k.sprite("player", { frame: 342 }), k.scale(4), k.z(-1)], // Right
      g: () => [k.sprite("player", { frame: 379 }), k.scale(4), k.z(-1)], // Bottom-Left
      B: () => [k.sprite("player", { frame: 380 }), k.scale(4), k.z(-1)], // Bottom
      h: () => [k.sprite("player", { frame: 381 }), k.scale(4), k.z(-1)], // Bottom-Right
    },
  };

  // Create the Art Desks dynamically
  for (let i = 1; i <= sectionCount; i++) {
    levelConf.tiles[i.toString()] = () => [
      k.sprite("player", { frame: 417 }), // Left half of a large 2-block table
      k.scale(4),
      k.area({ shape: new k.Rect(k.vec2(12, 2), 14, 10) }), // Tighter collision box on the solid base of the desk
      k.body({ isStatic: true }),
      "sectionMarker",
      { sectionId: i },
      k.z(1),
      {
        add() {
          // Fill the carpet under the left half
          this.add([k.sprite("player", { frame: 341 }), k.z(-1)]);
          // Fill the carpet under the right half
          this.add([k.sprite("player", { frame: 341 }), k.pos(16, 0), k.z(-1)]);
          // Add the right half of the table
          this.add([k.sprite("player", { frame: 153 }), k.pos(16, 0)]);
        },
      },
    ];
  }

  // --- 4. Build the Scene ---
  k.scene("main-hall", () => {
    k.addLevel(generateLayout(sectionCount), levelConf);

    // Zoom the camera in closer
    k.camScale(2.2);

    // Add the Player
    const innerWidth = sectionCount * 3 + 5;
    const padWidth = 4;
    const spawnX = (padWidth + 1.5) * TILE_SIZE; // Spawn at the far left side
    const spawnY = 4.5 * TILE_SIZE; // Adjusted after reducing the upper floor rows

    const player = k.add([
      k.sprite("player", { anim: "idle-down" }),
      k.pos(spawnX, spawnY),
      k.scale(2.5),
      k.anchor("center"), // Centering origin point fixes the camera follow offset
      k.area({ shape: new k.Rect(k.vec2(-6, 2), 12, 12) }), // Perfectly center collision on the character's feet
      k.body(),
      k.z(10),
    ]);

    // --- 5. Smooth Camera Follow ---
    player.onUpdate(() => {
      k.camPos(player.pos);
    });

    // --- 6. Movement Logic ---
    const SPEED = 250;

    // Consolidate movement into onUpdate to stop legs moving when stopped
    k.onUpdate(() => {
      let isMoving = false;
      let dx = 0;
      let dy = 0;

      if (k.isKeyDown("left")) {
        dx -= SPEED;
        isMoving = true;
        player.flipX = true;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
      } else if (k.isKeyDown("right")) {
        dx += SPEED;
        isMoving = true;
        player.flipX = false;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
      } else if (k.isKeyDown("up")) {
        dy -= SPEED;
        isMoving = true;
        if (player.curAnim() !== "walk-up") player.play("walk-up");
      } else if (k.isKeyDown("down")) {
        dy += SPEED;
        isMoving = true;
        if (player.curAnim() !== "walk-down") player.play("walk-down");
      }

      if (isMoving) {
        player.move(dx, dy);
      } else {
        // Immediately revert to idle frame of the current direction
        const curAnim = player.curAnim();
        if (curAnim === "walk-down") player.play("idle-down");
        else if (curAnim === "walk-side") player.play("idle-side");
        else if (curAnim === "walk-up") player.play("idle-up");
      }
    });

    // --- 7. UI Collision Logic ---
    player.onCollide("sectionMarker", (marker) => {
      player.pos.y += 15; // Small bounce back so they don't get stuck in the tighter collision box

      const curAnim = player.curAnim();
      if (curAnim === "walk-down") player.play("idle-down");
      else if (curAnim === "walk-side") player.play("idle-side");
      else if (curAnim === "walk-up") player.play("idle-up");

      onSectionInteract(marker.sectionId);
    });
  });

  k.go("main-hall");

  return {
    pause: () => {
      k.debug.paused = true;
    },
    resume: () => {
      k.debug.paused = false;
    },
  };
}
