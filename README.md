# Cubi's Reef Rush 🐠

A cute, cartoon-style 3D underwater runner starring **Cubi**, a young yellow boxfish.
Ride the current through a living coral reef, dodge enemies, collect pearls and make friends with clownfish.

Built with [three.js](https://threejs.org/) — everything (characters, corals, terrain) is generated in code, no 3D model files.

## Play

```bash
npm install
npm run build
npm run serve      # then open http://localhost:8080
```

- `public/index.html` — the game
- `public/editor.html` — level editor (place pearls, enemies, currents, wrecks… then "Play this level")
- `public/showcase.html?m=lush` — model viewer (`m=cubi|clown|lush|life|newlife|enemies|corals|cast`)

**Controls:** drag / arrow keys / WASD to steer · **Space** or the Toxin button to release Cubi's toxin cloud.

## Gameplay
- Behind-the-fish camera; the current carries Cubi forward along a path that curves and rolls.
- Only enemies hurt: jellyfish, pufferfish, sea urchins, sharks (escape with toxin within 2 s), moray eels (lunge from rocks and pipe corals), the kraken (ink blacks out the screen).
- Corals, rocks and the shipwreck you swim through only bump Cubi gently.
- Swim through an anemone to pick up a clownfish buddy that takes one hit for you.

## World
Landscape zones are shuffled every run: U-shaped canyon, open sand flats, coral garden, rock arches, coral cliff, kelp forest and rocky reef bed.
Hard corals stay still; anemones, soft corals, sea fans, seaweed and Christmas tree worms sway (the worms tuck in when Cubi swims close).

## Project layout
| Path | |
|---|---|
| `src/game.js` | game loop, terrain, zones, enemies, HUD |
| `src/models.js` | Cubi, clownfish, enemies, reef fish schools, basic corals |
| `src/reef.js` | lush corals, anemones, reef walls & mounds, creatures, shipwreck, kraken |
| `src/levels.js` | starter levels + level format |
| `src/editor.js` | level editor |
| `src/env.js`, `src/materials.js` | lighting, water, toon materials & outlines |
| `art/` | 2D character sheet, sprite sheets (256/128 px), expressions, turnarounds, 2D demo and generator, renders |
