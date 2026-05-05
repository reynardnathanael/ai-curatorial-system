import kaboom from "kaboom";

export function startExhibition(
  canvasElement,
  sectionCount,
  onSectionInteract,
) {
  const k = kaboom({
    canvas: canvasElement,
    global: false,
    background: [190, 155, 120], // Warm, light brown background
  });

  // --- 1. Load the Character ---
  k.loadSprite("player", "spritesheet.png", {
    sliceX: 39,
    sliceY: 31,
    anims: {
      "idle-down": 936,
      "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
      "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
      "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
    },
  });

  // --- 2. Advanced Dynamic Layout Generator ---
  const generateLayout = (count) => {
    const layout = [];
    const width = count * 6 + 4;

    // Top Outer Wall
    layout.push("#".repeat(width));
    layout.push("#".repeat(width)); // Double thickness for perspective

    // Upper floor padding with floor tiles '.'
    layout.push("|" + ".".repeat(width - 2) + "|");

    // Markers row (spaced out)
    let markers = "|.";
    for (let i = 1; i <= count; i++) {
      markers += `  ${i}   `;
    }
    // Pad any remaining space with floor tiles
    while (markers.length < width - 1) markers += ".";
    markers += "|";
    layout.push(markers);

    // Lower floor walking space
    for (let i = 0; i < 3; i++) {
      layout.push("|" + ".".repeat(width - 2) + "|");
    }

    // Bottom Outer Wall
    layout.push("#".repeat(width));
    return layout;
  };

  // --- 3. Style the Map Elements (Warm Brown Palette) ---
  const TILE_SIZE = 64;

  const levelConf = {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    tiles: {
      // Wall Styling: Rich dark wood/brown
      "#": () => [
        k.rect(TILE_SIZE, TILE_SIZE),
        k.color(100, 55, 30),
        k.outline(2, k.rgb(60, 30, 15)),
        k.area(),
        k.body({ isStatic: true }),
      ],
      // Side Walls: Slightly lighter wood
      "|": () => [
        k.rect(TILE_SIZE, TILE_SIZE),
        k.color(110, 65, 35),
        k.outline(2, k.rgb(60, 30, 15)),
        k.area(),
        k.body({ isStatic: true }),
      ],
      // Floor Styling: Warm hardwood or tan tile
      ".": () => [
        k.rect(TILE_SIZE, TILE_SIZE),
        k.color(210, 175, 135),
        k.outline(1, k.rgb(190, 155, 115)), // Subtle grid lines
        k.z(-1),
      ],
    },
  };

  // Create the golden section pedestals dynamically
  for (let i = 1; i <= sectionCount; i++) {
    levelConf.tiles[i.toString()] = () => [
      k.rect(TILE_SIZE, TILE_SIZE - 16),
      k.color(212, 175, 55), // Museum Gold
      k.outline(3, k.rgb(255, 255, 255)),
      k.area(),
      k.body({ isStatic: true }),
      "sectionMarker",
      { sectionId: i },
      k.z(1),
    ];
  }

  // --- 4. Build the Scene ---
  k.scene("main-hall", () => {
    k.addLevel(generateLayout(sectionCount), levelConf);

    // Add the Player
    const player = k.add([
      k.sprite("player", { anim: "idle-down" }),
      k.pos(TILE_SIZE * 3, TILE_SIZE * 4),
      k.scale(2.5),
      k.anchor("center"), // Centering origin point fixes the camera follow offset
      k.area({ shape: new k.Rect(k.vec2(0, 12), 16, 16) }), // Adjust collision relative to center
      k.body(),
      k.z(10),
    ]);

    // --- 5. Smooth Camera Follow ---
    player.onUpdate(() => {
      k.camPos(player.pos);
    });

    // --- 6. Movement Logic ---
    const SPEED = 250;

    k.onKeyRelease(["left", "right", "up", "down"], () => {
      player.play("idle-down");
    });

    k.onKeyDown("left", () => {
      player.move(-SPEED, 0);
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
    });

    k.onKeyDown("right", () => {
      player.move(SPEED, 0);
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
    });

    k.onKeyDown("up", () => {
      player.move(0, -SPEED);
      if (player.curAnim() !== "walk-up") player.play("walk-up");
    });

    k.onKeyDown("down", () => {
      player.move(0, SPEED);
      if (player.curAnim() !== "walk-down") player.play("walk-down");
    });

    // --- 7. UI Collision Logic ---
    player.onCollide("sectionMarker", (marker) => {
      player.pos.y += 20;
      player.play("idle-down");
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
