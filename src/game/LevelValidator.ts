import { levelData, type PlatformDef, type CollisionSurfaceDef, type Vec3 } from './LevelData';
import { JUMP_METRICS, PHYSICS } from './PhysicsConfig';

type Surface = Pick<PlatformDef | CollisionSurfaceDef, 'id' | 'pos' | 'size'>;

export function validateLevelData() {
  const issues: string[] = [];
  const surfaces: Surface[] = [...levelData.platforms, ...levelData.collisionSurfaces];
  const ids = new Set<string>();
  for (const surface of surfaces) {
    if (ids.has(surface.id)) issues.push(`duplicate surface id "${surface.id}"`);
    ids.add(surface.id);
    if (surface.size.some(value => value <= 0)) issues.push(`surface "${surface.id}" has a non-positive size`);
  }
  if (levelData.coins.length < levelData.mastery.coins) {
    issues.push(`mastery requires ${levelData.mastery.coins} coins, but only ${levelData.coins.length} exist`);
  }

  const criticalRoute = levelData.criticalRoute;
  const safeGap = JUMP_METRICS.flatDistance * .78;
  for (let index = 1; index < criticalRoute.length; index++) {
    const from = surfaces.find(surface => surface.id === criticalRoute[index - 1]);
    const to = surfaces.find(surface => surface.id === criticalRoute[index]);
    if (!from || !to) {
      issues.push(`critical route surface missing near "${criticalRoute[index]}"`);
      continue;
    }
    const gap = forwardGap(from, to);
    if (gap > safeGap) issues.push(`critical gap ${from.id} → ${to.id} is ${gap.toFixed(2)}m`);
  }

  const landing = surfaces.find(surface => surface.id === 'landing');
  const castle = surfaces.find(surface => surface.id === 'castle');
  const stairs = levelData.collisionSurfaces.filter(surface => surface.id.startsWith('stair-'));
  const climb = landing && castle ? [landing, ...stairs, castle] : [];
  for (let index = 1; index < climb.length; index++) {
    const previousTop = top(climb[index - 1]);
    const nextTop = top(climb[index]);
    if (nextTop - previousTop > PHYSICS.stepHeight + .001) {
      issues.push(`step ${climb[index - 1].id} → ${climb[index].id} is too high`);
    }
    if (forwardGap(climb[index - 1], climb[index]) > PHYSICS.playerRadius * 2 + .05) {
      issues.push(`step ${climb[index - 1].id} → ${climb[index].id} has a floor gap`);
    }
  }

  for (const [index, checkpoint] of levelData.checkpoints.entries()) {
    if (!surfaceBelow(checkpoint.respawn, surfaces)) issues.push(`checkpoint ${index + 1} respawn has no support`);
  }
  if (!surfaceBelow(levelData.finish, surfaces)) issues.push('finish has no supporting surface');
  return issues;
}

function forwardGap(from: Surface, to: Surface) {
  return Math.max(0, Math.abs(to.pos[2] - from.pos[2]) - from.size[2] / 2 - to.size[2] / 2);
}

function top(surface: Surface) {
  return surface.pos[1] + surface.size[1] / 2;
}

function surfaceBelow(position: Vec3, surfaces: Surface[]) {
  return surfaces.some(surface => (
    Math.abs(position[0] - surface.pos[0]) <= surface.size[0] / 2 + PHYSICS.playerRadius
    && Math.abs(position[2] - surface.pos[2]) <= surface.size[2] / 2 + PHYSICS.playerRadius
    && position[1] >= top(surface) - .1
    && position[1] - top(surface) <= 2
  ));
}
