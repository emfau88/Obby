import { LEVELS, type LevelDefinition, type PlatformDef, type Vec3 } from '../src/game/LevelData';
import { PHYSICS } from '../src/game/PhysicsConfig';

type Result = {
  level: string;
  checks: number;
  warnings: string[];
  failures: string[];
  route: Array<{
    segment: string;
    gap: number;
    climb: number;
    range: number;
    margin: number;
    mode: 'jump' | 'launcher' | 'lift';
  }>;
};

const STEP = PHYSICS.fixedStep;

function top(platform: PlatformDef, y = platform.pos[1]) {
  return y + platform.size[1] / 2;
}

function planarGap(from: PlatformDef, to: PlatformDef) {
  const x = Math.max(0, Math.abs(to.pos[0] - from.pos[0]) - from.size[0] / 2 - to.size[0] / 2);
  const z = Math.max(0, Math.abs(to.pos[2] - from.pos[2]) - from.size[2] / 2 - to.size[2] / 2);
  return Math.hypot(x, z);
}

function contains(platform: PlatformDef, point: Vec3) {
  return Math.abs(point[0] - platform.pos[0]) <= platform.size[0] / 2 + PHYSICS.playerRadius
    && Math.abs(point[2] - platform.pos[2]) <= platform.size[2] / 2 + PHYSICS.playerRadius;
}

function jumpRangeAtHeight(height: number) {
  let y = 0;
  let previousY = 0;
  let velocity = PHYSICS.jumpSpeed;
  let time = 0;
  let descending = false;
  while (time < 3) {
    previousY = y;
    const gravity = velocity < 0 ? PHYSICS.gravity * PHYSICS.fallGravity : PHYSICS.gravity;
    velocity = Math.max(-PHYSICS.terminalVelocity, velocity - gravity * STEP);
    y += velocity * STEP;
    time += STEP;
    if (velocity < 0) descending = true;
    if (descending && previousY >= height && y <= height) return PHYSICS.moveSpeed * time;
  }
  return 0;
}

function movingTravel(platform: PlatformDef) {
  return platform.moving?.axis === 'y' ? platform.moving.distance : 0;
}

function supportAt(level: LevelDefinition, point: Vec3) {
  return [...level.platforms, ...level.collisionSurfaces].some(surface => (
    Math.abs(point[0] - surface.pos[0]) <= surface.size[0] / 2 + PHYSICS.playerRadius
    && Math.abs(point[2] - surface.pos[2]) <= surface.size[2] / 2 + PHYSICS.playerRadius
    && point[1] >= surface.pos[1] + surface.size[1] / 2 - .1
    && point[1] - (surface.pos[1] + surface.size[1] / 2) <= 2
  ));
}

function validate(level: LevelDefinition): Result {
  const failures: string[] = [];
  const warnings: string[] = [];
  const route: Result['route'] = [];
  let checks = 0;
  const byId = new Map(level.platforms.map(platform => [platform.id, platform]));

  for (let index = 1; index < level.criticalRoute.length; index++) {
    const from = byId.get(level.criticalRoute[index - 1]);
    const to = byId.get(level.criticalRoute[index]);
    checks++;
    if (!from || !to) {
      failures.push(`Missing route platform near ${level.criticalRoute[index]}`);
      continue;
    }

    const launcher = level.launchers.find(item => contains(from, item.pos) && contains(to, item.target));
    if (launcher) {
      const startTop = top(from);
      const targetTop = top(to);
      const horizontalDistance = Math.hypot(
        launcher.target[0] - launcher.pos[0],
        launcher.target[2] - launcher.pos[2],
      );
      const horizontalVelocity = horizontalDistance / launcher.flightTime;
      const verticalVelocity = (
        targetTop - startTop + PHYSICS.gravity * launcher.flightTime ** 2 / 2
      ) / launcher.flightTime;
      if (horizontalVelocity > PHYSICS.dashSpeed * 1.05) {
        failures.push(`${launcher.id} needs excessive horizontal speed ${horizontalVelocity.toFixed(2)}m/s`);
      }
      if (verticalVelocity > PHYSICS.terminalVelocity) {
        failures.push(`${launcher.id} needs excessive vertical speed ${verticalVelocity.toFixed(2)}m/s`);
      }
      route.push({
        segment: `${from.id} → ${to.id}`,
        gap: planarGap(from, to),
        climb: targetTop - startTop,
        range: horizontalDistance,
        margin: Math.min(to.size[0], to.size[2]) / 2,
        mode: 'launcher',
      });
      continue;
    }

    const fromTravel = movingTravel(from);
    const toTravel = movingTravel(to);
    const fromBestTop = top(from, from.pos[1] + fromTravel);
    const toBestTop = top(to, to.pos[1] - toTravel);
    const climb = toBestTop - fromBestTop;
    const range = jumpRangeAtHeight(climb);
    const gap = planarGap(from, to);
    const margin = range - gap;
    const mode = fromTravel || toTravel ? 'lift' : 'jump';
    if (!range || margin < PHYSICS.playerRadius * 1.5) {
      failures.push(
        `${from.id} → ${to.id}: gap ${gap.toFixed(2)}m, climb ${climb.toFixed(2)}m, range ${range.toFixed(2)}m`,
      );
    } else if (margin < 1.5) {
      warnings.push(`${from.id} → ${to.id} has only ${margin.toFixed(2)}m calculated margin`);
    }
    route.push({ segment: `${from.id} → ${to.id}`, gap, climb, range, margin, mode });
  }

  for (const launcher of level.launchers) {
    checks++;
    const source = level.platforms.find(platform => contains(platform, launcher.pos));
    const target = level.platforms.find(platform => contains(platform, launcher.target));
    if (!source) failures.push(`${launcher.id} has no supported launch surface`);
    if (!target) failures.push(`${launcher.id} target has no landing surface`);
  }

  for (const platform of level.platforms.filter(item => item.moving?.axis === 'y')) {
    checks++;
    const travel = platform.moving!.distance;
    const minimumTop = top(platform, platform.pos[1] - travel);
    const maximumTop = top(platform, platform.pos[1] + travel);
    const routeIndex = level.criticalRoute.indexOf(platform.id);
    const approach = byId.get(level.criticalRoute[routeIndex - 1]);
    const exit = byId.get(level.criticalRoute[routeIndex + 1]);
    if (!approach || !exit) {
      failures.push(`${platform.id} is not connected on the critical route`);
      continue;
    }
    const boardClimb = minimumTop - top(approach);
    if (jumpRangeAtHeight(boardClimb) < planarGap(approach, platform)) {
      failures.push(`${platform.id} cannot be boarded at its lowest point`);
    }
    if (top(exit) - maximumTop > PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity)) {
      failures.push(`${platform.id} does not rise high enough to reach ${exit.id}`);
    }
  }

  for (const rotator of level.rotators) {
    checks++;
    const support = level.platforms.find(platform => contains(platform, rotator.pos));
    if (!support) {
      failures.push(`${rotator.id} has no supporting hazard platform`);
      continue;
    }
    const sideClearance = Math.max(support.size[0] / 2, support.size[2] / 2) - rotator.radius;
    const armWindow = Math.PI * 2 / ((rotator.arms ?? 2) * Math.abs(rotator.speed));
    const crossingTime = rotator.radius * 2 / PHYSICS.moveSpeed;
    const hasSafeLane = sideClearance >= PHYSICS.playerRadius * 2;
    if (!hasSafeLane && crossingTime >= armWindow) {
      failures.push(
        `${rotator.id} has neither a safe side lane nor enough time between arms`
        + ` (${crossingTime.toFixed(2)}s crossing / ${armWindow.toFixed(2)}s window)`,
      );
    } else if (!hasSafeLane) {
      warnings.push(`${rotator.id} relies on its ${armWindow.toFixed(2)}s timing window`);
    }
  }

  for (const [index, checkpoint] of level.checkpoints.entries()) {
    checks++;
    if (!supportAt(level, checkpoint.respawn)) failures.push(`Checkpoint ${index + 1} respawn is unsupported`);
  }

  checks++;
  if (!supportAt(level, level.finish)) failures.push('Finish position is unsupported');
  if (level.coins.length < level.mastery.coins) failures.push('Mastery coin target exceeds available coins');

  return { level: level.title, checks, warnings, failures, route };
}

const results = LEVELS.map(validate);
for (const result of results) {
  console.log(`\n${result.level}: ${result.checks} checks`);
  for (const segment of result.route) {
    console.log(
      `  ${segment.mode.padEnd(8)} ${segment.segment.padEnd(35)}`
      + ` gap ${segment.gap.toFixed(2)}m | climb ${segment.climb.toFixed(2)}m`
      + ` | margin ${segment.margin.toFixed(2)}m`,
    );
  }
  for (const warning of result.warnings) console.warn(`  WARNING: ${warning}`);
  for (const failure of result.failures) console.error(`  FAILURE: ${failure}`);
}

const failureCount = results.reduce((sum, result) => sum + result.failures.length, 0);
if (failureCount) {
  console.error(`\nSolvability validation failed with ${failureCount} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('\nAll critical routes, launchers, lifts, rotators, respawns and finishes are solvable.');
}
