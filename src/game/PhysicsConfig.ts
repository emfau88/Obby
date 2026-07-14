export const PHYSICS = {
  fixedStep: 1 / 120,
  maxFrameDelta: .1,
  maxSubSteps: 12,
  moveSpeed: 8.5,
  groundResponse: 28,
  airResponse: 8.5,
  jumpSpeed: 11.2,
  gravity: 27,
  jumpCutGravity: 1.7,
  fallGravity: 1.08,
  terminalVelocity: 30,
  coyoteTime: .13,
  jumpBuffer: .13,
  dashSpeed: 18,
  dashDuration: .18,
  dashCooldown: 1.15,
  playerRadius: .42,
  playerHeight: 2.2,
  stepHeight: .48,
  groundProbe: .16,
  landingSweep: .5,
} as const;

export const JUMP_METRICS = {
  height: PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity),
  airtime: PHYSICS.jumpSpeed * 2 / PHYSICS.gravity,
  flatDistance: PHYSICS.moveSpeed * PHYSICS.jumpSpeed * 2 / PHYSICS.gravity,
} as const;
