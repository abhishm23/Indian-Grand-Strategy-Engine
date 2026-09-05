// Handcrafted Underdog Scenarios & Skirmish Generator

import { TERRAIN_TYPES, MapGrid } from './terrain.js';
import { UNIT_TYPES, Unit, FACTIONS } from './units.js';

export const SCENARIOS = {
  thermopylae: {
    id: 'thermopylae',
    name: '1. Pass of Thermopylae',
    subtitle: '5 Blue Defenders vs 20 Red Empire Legionnaires',
    description: 'A massive enemy legion advances. Position your Shield Guards in the narrow 1-tile mountain pass to hold off the horde.',
    objectives: [
      { text: 'Hold the mountain pass for 8 turns OR eliminate enemy host.', primary: true },
      { text: 'Do not allow any enemy unit to breach past the pass.', primary: false }
    ],
    maxTurns: 10,
    setup(map, units) {
      // Map layout: 15 cols x 11 rows
      // Draw mountain walls with 1-tile pass at col 6, rows 4, 5, 6
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          if (c === 6 && (r === 4 || r === 5)) {
            map.setTile(c, r, TERRAIN_TYPES.PASS);
          } else if (c === 6) {
            map.setTile(c, r, TERRAIN_TYPES.HILL);
          } else if (c < 6) {
            // Player side: High ground behind pass
            if (c === 4 && r >= 3 && r <= 6) {
              map.setTile(c, r, TERRAIN_TYPES.HILL);
            } else {
              map.setTile(c, r, TERRAIN_TYPES.PLAIN);
            }
          } else {
            // Enemy side
            if (r === 1 || r === 9) {
              map.setTile(c, r, TERRAIN_TYPES.SWAMP);
            } else {
              map.setTile(c, r, TERRAIN_TYPES.PLAIN);
            }
          }
        }
      }
      // Fill upper and lower mountain barriers
      for (let c = 5; c <= 7; c++) {
        for (let r = 0; r < 4; r++) map.setTile(c, r, TERRAIN_TYPES.RIVER); // Mountain impassable
        for (let r = 7; r < map.rows; r++) map.setTile(c, r, TERRAIN_TYPES.RIVER);
      }
      // Open bridge/pass in middle
      map.setTile(6, 4, TERRAIN_TYPES.PASS);
      map.setTile(6, 5, TERRAIN_TYPES.PASS);
      map.setTile(6, 6, TERRAIN_TYPES.PASS);

      // Blue Army (Player - 5 units)
      units.push(new Unit('b1', UNIT_TYPES.SHIELD_GUARD, FACTIONS.BLUE, 5, 4, 'EAST'));
      units.push(new Unit('b2', UNIT_TYPES.SHIELD_GUARD, FACTIONS.BLUE, 5, 5, 'EAST'));
      units.push(new Unit('b3', UNIT_TYPES.PIKEMAN, FACTIONS.BLUE, 5, 6, 'EAST'));
      units.push(new Unit('b4', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 4, 4, 'EAST'));
      units.push(new Unit('b5', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 4, 5, 'EAST'));

      // Red Army (Enemy Horde - 20 units)
      let redId = 1;
      for (let col = 8; col <= 12; col += 2) {
        for (let row = 3; row <= 7; row++) {
          const type = (redId % 4 === 0) ? UNIT_TYPES.ROYAL_ARCHER :
                       (redId % 5 === 0) ? UNIT_TYPES.VANGUARD_CAVALRY : UNIT_TYPES.SHIELD_GUARD;
          units.push(new Unit(`r${redId++}`, type, FACTIONS.RED, col, row, 'WEST'));
        }
      }
    }
  },

  ambush: {
    id: 'ambush',
    name: '2. Shadow Forest Ambush',
    subtitle: '4 Guerrilla Rangers vs 14 Marching Invaders',
    description: 'An enemy column marches along the forest trail. Use stealth to unleash devastating flank ambushes.',
    objectives: [
      { text: 'Annihilate enemy column commanders.', primary: true },
      { text: 'Maintain forest stealth for 2.5x ambush damage.', primary: false }
    ],
    maxTurns: 12,
    setup(map, units) {
      // Map layout: Dense forest with a central road
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          if (r === 5 || r === 6) {
            map.setTile(c, r, TERRAIN_TYPES.PLAIN); // Central road
          } else {
            map.setTile(c, r, TERRAIN_TYPES.FOREST); // Dense forest
          }
        }
      }

      // Blue Army (4 Guerrillas stealthed in forest)
      const g1 = new Unit('b1', UNIT_TYPES.GUERRILLA_SCOUT, FACTIONS.BLUE, 4, 3, 'SOUTH');
      g1.isStealthed = true;
      const g2 = new Unit('b2', UNIT_TYPES.GUERRILLA_SCOUT, FACTIONS.BLUE, 8, 3, 'SOUTH');
      g2.isStealthed = true;
      const a1 = new Unit('b3', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 3, 8, 'NORTH');
      a1.isStealthed = true;
      const a2 = new Unit('b4', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 9, 8, 'NORTH');
      a2.isStealthed = true;

      units.push(g1, g2, a1, a2);

      // Red Army (14 units in tight column along road)
      let redId = 1;
      for (let c = 2; c <= 13; c++) {
        const type = (c % 3 === 0) ? UNIT_TYPES.VANGUARD_CAVALRY : UNIT_TYPES.SHIELD_GUARD;
        units.push(new Unit(`r${redId++}`, type, FACTIONS.RED, c, 5, 'EAST'));
      }
      units.push(new Unit(`r${redId++}`, UNIT_TYPES.SIEGE_BALLISTA, FACTIONS.RED, 1, 5, 'EAST'));
      units.push(new Unit(`r${redId++}`, UNIT_TYPES.ROYAL_ARCHER, FACTIONS.RED, 2, 6, 'EAST'));
    }
  },

  supplyCut: {
    id: 'supplyCut',
    name: '3. Starvation Raid',
    subtitle: '3 Fast Cavalry Raiders vs 16 Main Army Host',
    description: 'Direct confrontation is suicide. Bypass the main army, sever both enemy supply depots, and trigger mass army panic.',
    objectives: [
      { text: 'Capture/Destroy enemy Supply Depots at (13, 2) and (13, 8).', primary: true },
      { text: 'Avoid engaging main enemy infantry host directly.', primary: false }
    ],
    maxTurns: 10,
    setup(map, units) {
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          map.setTile(c, r, TERRAIN_TYPES.PLAIN);
        }
      }
      // Place Supply Depots at east
      map.setTile(13, 2, TERRAIN_TYPES.DEPOT);
      map.setTile(13, 8, TERRAIN_TYPES.DEPOT);

      // Obstacles: Swamp patches in center to slow main army
      for (let r = 3; r <= 7; r++) {
        map.setTile(7, r, TERRAIN_TYPES.SWAMP);
      }

      // Blue Raiders (3 Fast Cavalry/Scouts at west)
      units.push(new Unit('b1', UNIT_TYPES.VANGUARD_CAVALRY, FACTIONS.BLUE, 1, 1, 'EAST'));
      units.push(new Unit('b2', UNIT_TYPES.VANGUARD_CAVALRY, FACTIONS.BLUE, 1, 9, 'EAST'));
      units.push(new Unit('b3', UNIT_TYPES.GUERRILLA_SCOUT, FACTIONS.BLUE, 0, 5, 'EAST'));

      // Red Main Host (16 units in middle forming a heavy wall)
      let redId = 1;
      for (let r = 2; r <= 8; r++) {
        units.push(new Unit(`r${redId++}`, UNIT_TYPES.SHIELD_GUARD, FACTIONS.RED, 5, r, 'WEST'));
        units.push(new Unit(`r${redId++}`, UNIT_TYPES.PIKEMAN, FACTIONS.RED, 6, r, 'WEST'));
      }
      units.push(new Unit(`r${redId++}`, UNIT_TYPES.ROYAL_ARCHER, FACTIONS.RED, 12, 2, 'WEST'));
      units.push(new Unit(`r${redId++}`, UNIT_TYPES.ROYAL_ARCHER, FACTIONS.RED, 12, 8, 'WEST'));
    }
  },

  citadel: {
    id: 'citadel',
    name: '4. Citadel of Heights',
    subtitle: '6 Blue Garrison vs 22 Swarm Assault',
    description: 'Defend hilltop castle walls. Use high ground range bonuses and ballista artillery against enemies trudging through surrounding swamps.',
    objectives: [
      { text: 'Defend Citadel Fortress for 10 turns or wipe out attackers.', primary: true }
    ],
    maxTurns: 10,
    setup(map, units) {
      // High hill fortress in center (cols 5-9, rows 3-7)
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          if (c >= 5 && c <= 9 && r >= 3 && r <= 7) {
            if (c === 7 && r === 5) {
              map.setTile(c, r, TERRAIN_TYPES.FORTRESS);
            } else {
              map.setTile(c, r, TERRAIN_TYPES.HILL);
            }
          } else if (c >= 3 && c <= 11 && r >= 1 && r <= 9) {
            map.setTile(c, r, TERRAIN_TYPES.SWAMP); // Surrounding swamp ring
          } else {
            map.setTile(c, r, TERRAIN_TYPES.PLAIN);
          }
        }
      }

      // Blue Garrison (6 units inside Citadel)
      units.push(new Unit('b1', UNIT_TYPES.SHIELD_GUARD, FACTIONS.BLUE, 6, 4, 'NORTH'));
      units.push(new Unit('b2', UNIT_TYPES.SHIELD_GUARD, FACTIONS.BLUE, 8, 4, 'NORTH'));
      units.push(new Unit('b3', UNIT_TYPES.PIKEMAN, FACTIONS.BLUE, 6, 6, 'SOUTH'));
      units.push(new Unit('b4', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 7, 4, 'NORTH'));
      units.push(new Unit('b5', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 7, 6, 'SOUTH'));
      units.push(new Unit('b6', UNIT_TYPES.SIEGE_BALLISTA, FACTIONS.BLUE, 7, 5, 'EAST'));

      // Red Swarm (22 units surrounding citadel)
      let redId = 1;
      const spawnCoords = [
        {x: 1, y: 2}, {x: 1, y: 5}, {x: 1, y: 8}, {x: 2, y: 3}, {x: 2, y: 7},
        {x: 13, y: 2}, {x: 13, y: 5}, {x: 13, y: 8}, {x: 12, y: 3}, {x: 12, y: 7},
        {x: 5, y: 0}, {x: 7, y: 0}, {x: 9, y: 0}, {x: 6, y: 1}, {x: 8, y: 1},
        {x: 5, y: 10}, {x: 7, y: 10}, {x: 9, y: 10}, {x: 6, y: 9}, {x: 8, y: 9},
        {x: 0, y: 5}, {x: 14, y: 5}
      ];

      spawnCoords.forEach(pt => {
        const type = (redId % 3 === 0) ? UNIT_TYPES.ROYAL_ARCHER :
                     (redId % 4 === 0) ? UNIT_TYPES.VANGUARD_CAVALRY : UNIT_TYPES.SHIELD_GUARD;
        const dir = pt.x < 7 ? 'EAST' : 'WEST';
        units.push(new Unit(`r${redId++}`, type, FACTIONS.RED, pt.x, pt.y, dir));
      });
    }
  },

  skirmish: {
    id: 'skirmish',
    name: '5. Custom Underdog Skirmish',
    subtitle: 'Randomized Tactical Battlefield (1:4 Ratio)',
    description: 'Test your tactical mastery in a procedural battlefield with high ground, forests, rivers, and passes.',
    objectives: [
      { text: 'Annihilate all enemy forces through strategic maneuver.', primary: true }
    ],
    maxTurns: 15,
    setup(map, units) {
      // Generate procedural terrain
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          const rand = Math.random();
          if (rand < 0.15) map.setTile(c, r, TERRAIN_TYPES.HILL);
          else if (rand < 0.3) map.setTile(c, r, TERRAIN_TYPES.FOREST);
          else if (rand < 0.38) map.setTile(c, r, TERRAIN_TYPES.SWAMP);
          else map.setTile(c, r, TERRAIN_TYPES.PLAIN);
        }
      }

      // Add central bridge & pass
      for (let r = 0; r < map.rows; r++) {
        if (r === 5) map.setTile(7, r, TERRAIN_TYPES.BRIDGE);
        else map.setTile(7, r, TERRAIN_TYPES.RIVER);
      }

      // Blue Army (5 units at West)
      units.push(new Unit('b1', UNIT_TYPES.SHIELD_GUARD, FACTIONS.BLUE, 2, 4, 'EAST'));
      units.push(new Unit('b2', UNIT_TYPES.PIKEMAN, FACTIONS.BLUE, 2, 6, 'EAST'));
      units.push(new Unit('b3', UNIT_TYPES.ROYAL_ARCHER, FACTIONS.BLUE, 1, 5, 'EAST'));
      units.push(new Unit('b4', UNIT_TYPES.VANGUARD_CAVALRY, FACTIONS.BLUE, 0, 3, 'EAST'));
      units.push(new Unit('b5', UNIT_TYPES.GUERRILLA_SCOUT, FACTIONS.BLUE, 0, 7, 'EAST'));

      // Red Army (20 units at East)
      let redId = 1;
      for (let col = 10; col <= 13; col++) {
        for (let row = 3; row <= 7; row++) {
          const type = (redId % 4 === 0) ? UNIT_TYPES.ROYAL_ARCHER :
                       (redId % 5 === 0) ? UNIT_TYPES.VANGUARD_CAVALRY : UNIT_TYPES.SHIELD_GUARD;
          units.push(new Unit(`r${redId++}`, type, FACTIONS.RED, col, row, 'WEST'));
        }
      }
    }
  }
};
