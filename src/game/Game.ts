import * as THREE from 'three';
import { InputManager, type InputActions } from './InputManager';
import { AudioManager } from './AudioManager';
import { UIManager } from './UIManager';
import { AssetManager, type AssetId } from './AssetManager';
import {
  levelData, type PlatformDef, type CollisionSurfaceDef, type Vec3, type MovingPlatformDef, type RotatorDef,
} from './LevelData';
import { PHYSICS } from './PhysicsConfig';
import { validateLevelData } from './LevelValidator';

type Platform = {
  root: THREE.Group;
  def: { id: string; size: Vec3; moving?: MovingPlatformDef };
  basePosition: THREE.Vector3;
  previousPosition: THREE.Vector3;
};
type AnimatedPickup = { object: THREE.Object3D; baseY: number; phase: number };
type Particle = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number };
type RotatingHazard = { root: THREE.Group; def: RotatorDef };
type CheckpointVisual = {
  root: THREE.Group;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  active: boolean;
};
type SpikeTrap = {
  object: THREE.Object3D;
  mixer?: THREE.AnimationMixer;
  action?: THREE.AnimationAction;
  clipDuration: number;
  phaseOffset: number;
  exposure: number;
  warning: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
};
type ActMarkerVisual = {
  crystal: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  baseY: number;
  phase: number;
};

const NO_ACTIONS: InputActions = { jump: false, dash: false };
const DEFERRED_ASSETS: AssetId[] = ['tower', 'chest'];
const SPIKE_CYCLE = 3.4;
const SPIKE_DANGER_THRESHOLD = .7;
const v = (position: Vec3) => new THREE.Vector3(...position);

export class Game {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, .1, 350);
  private renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  private clock = new THREE.Clock(false);
  private input: InputManager;
  private audio = new AudioManager();
  private ui: UIManager;
  private assets = new AssetManager();
  private player = new THREE.Group();
  private playerVisual?: THREE.Object3D;
  private playerMixer?: THREE.AnimationMixer;
  private currentAction?: THREE.AnimationAction;
  private currentAnimation = '';
  private playerVisualScale = new THREE.Vector3(1, 1, 1);
  private contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(.62, 24),
    new THREE.MeshBasicMaterial({ color: 0x24485c, transparent: true, opacity: .2, depthWrite: false }),
  );
  private velocity = new THREE.Vector3();
  private platforms: Platform[] = [];
  private movingPlatforms: Platform[] = [];
  private groundedOn?: Platform;
  private coins: AnimatedPickup[] = [];
  private collected = new Set<THREE.Object3D>();
  private saws: THREE.Object3D[] = [];
  private spikeTraps: SpikeTrap[] = [];
  private rotators: RotatingHazard[] = [];
  private clockworkDecor: THREE.Object3D[] = [];
  private actMarkers: ActMarkerVisual[] = [];
  private respawn = v(levelData.start);
  private grounded = false;
  private dashCooldown = 0;
  private dashTime = 0;
  private dashDirection = new THREE.Vector3(0, 0, -1);
  private bounceAssistTime = 0;
  private bounceVelocity = new THREE.Vector3();
  private coyoteTime = 0;
  private jumpBuffer = 0;
  private landingSquash = 0;
  private landingAnimationTime = 0;
  private cameraKick = 0;
  private activatedCheckpoints = new Set<number>();
  private checkpointVisuals: CheckpointVisual[] = [];
  private activatedTutorials = new Set<string>();
  private particles: Particle[] = [];
  private particleGeometry = new THREE.OctahedronGeometry(.12, 0);
  private particleMaterials = new Map<number, THREE.MeshBasicMaterial>();
  private cameraFocus = new THREE.Vector3();
  private previousPlayerPosition = new THREE.Vector3();
  private platformDelta = new THREE.Vector3();
  private sun?: THREE.DirectionalLight;
  private sunTarget = new THREE.Object3D();
  private accumulator = 0;
  private simulationTime = 0;
  private runTime = 0;
  private resetGrace = 0;
  private respawnTimer = 0;
  private respawnPlaced = false;
  private deaths = 0;
  private finishSequenceTime = 0;
  private finishResultShown = false;
  private devScenario = false;
  private finishCameraStart = new THREE.Vector3();
  private finishRing?: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private finishGlow?: THREE.PointLight;
  private paused = false;
  private done = false;
  private debugOutput?: HTMLOutputElement;
  private debugCommand?: HTMLInputElement;

  constructor(private root: HTMLElement) {
    this.ui = new UIManager(root);
    this.renderer.domElement.setAttribute('aria-label', 'Cloudtop Castle Run game canvas');
    root.prepend(this.renderer.domElement);
    this.input = new InputManager();
    if (import.meta.env.DEV) {
      this.debugOutput = document.createElement('output');
      this.debugOutput.id = 'game-debug';
      this.debugOutput.hidden = true;
      root.append(this.debugOutput);
      this.debugCommand = document.createElement('input');
      this.debugCommand.id = 'game-debug-command';
      this.debugCommand.tabIndex = -1;
      this.debugCommand.setAttribute('aria-hidden', 'true');
      this.debugCommand.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none';
      root.append(this.debugCommand);
    }
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.handleVisibility());
    document.querySelector('#restart')!.addEventListener('click', () => location.reload());
    document.querySelector('#menu-button')!.addEventListener('click', () => location.assign('./'));
    document.querySelector('#continue')!.addEventListener('click', () => {
      location.assign(levelData.nextId ? `?level=${levelData.nextId}` : './');
    });
    void this.start();
  }

  getDebugState() {
    return {
      position: this.player.position.toArray(),
      velocity: this.velocity.toArray(),
      grounded: this.grounded,
      groundedOn: this.groundedOn?.def.id ?? null,
      movingPlatforms: this.movingPlatforms.map(platform => ({
        id: platform.def.id,
        position: platform.root.position.toArray(),
      })),
      checkpointCount: this.activatedCheckpoints.size,
      coins: this.collected.size,
      falls: this.deaths,
      spikeExposure: this.spikeTraps.map(trap => Number(trap.exposure.toFixed(2))),
      runTime: this.runTime,
      respawning: this.respawnTimer > 0,
      finished: this.done,
    };
  }

  private consumeDebugCommand() {
    const command = this.debugCommand?.value;
    if (!command || !this.debugCommand) return;
    this.debugCommand.value = '';
    if (command === 'forward') this.input.setDebugMove(0, 1);
    if (command === 'forward-left') this.input.setDebugMove(-1, 1);
    if (command === 'forward-right') this.input.setDebugMove(1, 1);
    if (command === 'back') this.input.setDebugMove(0, -1);
    if (command === 'left') this.input.setDebugMove(-1, 0);
    if (command === 'right') this.input.setDebugMove(1, 0);
    if (command === 'stop') this.input.setDebugMove(0, 0);
    if (command === 'jump-down') this.input.setDebugJump(true);
    if (command === 'jump-up') this.input.setDebugJump(false);
    if (command === 'dash') this.input.triggerDebugDash();
  }

  private async start() {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerHTML = `<b>${levelData.title}</b><span>Loading adventure… 0%</span>`;
    this.root.append(loading);
    try {
      await this.assets.loadAll((done, total) => {
        loading.querySelector('span')!.textContent = `Loading adventure… ${Math.round(done / total * 100)}%`;
      }, DEFERRED_ASSETS);
      const validation = validateLevelData();
      if (validation.length) console.warn('Level validation:', validation.join(' | '));
      this.setupScene();
      loading.remove();
      this.clock.start();
      const mobile = matchMedia('(pointer: coarse)').matches;
      this.ui.hint(mobile ? 'Drag the joystick to move' : 'Move with WASD or arrow keys', 2800);
      this.loop();
      void this.loadDeferredDecorations();
    } catch (error) {
      loading.innerHTML = '<b>Loading failed</b><span>Please reload the page.</span>';
      console.error(error);
    }
  }

  private setupScene() {
    this.scene.background = new THREE.Color(levelData.theme.sky);
    this.scene.fog = new THREE.Fog(levelData.theme.fog, 100, 245);
    this.updateRenderQuality();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.add(new THREE.HemisphereLight(levelData.theme.hemisphereSky, levelData.theme.hemisphereGround, 2.35));
    this.sun = new THREE.DirectionalLight(levelData.theme.sun, 3.2);
    this.sun.position.set(-30, 45, 25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(innerWidth < 900 ? 768 : 1024, innerWidth < 900 ? 768 : 1024);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -34;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 34;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 110;
    this.sun.target = this.sunTarget;
    this.scene.add(this.sun, this.sunTarget);

    levelData.platforms.forEach(def => this.createPlatform(def));
    levelData.collisionSurfaces.forEach(def => this.createCollisionSurface(def));
    this.createPlayer();
    this.createCoins();
    this.createHazards();
    this.createCheckpointAndFinish();
    this.createPropsAndSky();
    this.createActLandmarks();
    this.player.position.copy(this.respawn);
    this.applyDevScenario();
    const camera = levelData.camera ?? { height: 6.35, distance: 9.25, lookAhead: 6.15, focusHeight: 1.2 };
    this.camera.position.copy(this.player.position).add(new THREE.Vector3(0, camera.height, camera.distance));
    this.cameraFocus.copy(this.player.position).add(new THREE.Vector3(0, camera.focusHeight, -camera.lookAhead));
  }

  private createPlatform(def: PlatformDef) {
    const root = new THREE.Group();
    root.position.copy(v(def.pos));
    root.name = `platform-${def.id}`;
    const asset: AssetId = def.asset
      ?? (def.visual === 'grass' ? 'grassCube'
        : def.visual === 'brick' ? 'brickCube'
          : def.visual === 'rock' ? 'rockLarge' : 'bridge');
    if (def.visual === 'grass' || def.visual === 'brick') {
      const tileAsset: AssetId = def.visual === 'brick' ? 'brickCube' : 'grassCube';
      const columns = Math.ceil(def.size[0] / 5);
      const rows = Math.ceil(def.size[2] / 5);
      const tileWidth = def.size[0] / columns;
      const tileDepth = def.size[2] / rows;
      for (let column = 0; column < columns; column++) for (let row = 0; row < rows; row++) {
        const tile = this.assets.create(tileAsset, { size: [tileWidth, def.size[1], tileDepth] });
        tile.position.set(
          -def.size[0] / 2 + tileWidth * (column + .5),
          -def.size[1] / 2,
          -def.size[2] / 2 + tileDepth * (row + .5),
        );
        root.add(tile);
      }
    } else {
      const bridgeRotation = ['bridge', 'bridgeSmall', 'bridgeCenter'].includes(asset) ? Math.PI / 2 : undefined;
      const visual = this.assets.create(asset, { size: def.size, rotationY: bridgeRotation });
      visual.position.y = -def.size[1] / 2;
      root.add(visual);
    }
    this.scene.add(root);
    const platform: Platform = {
      root,
      def,
      basePosition: root.position.clone(),
      previousPosition: root.position.clone(),
    };
    if (def.collision !== false) this.platforms.push(platform);
    if (def.moving) this.movingPlatforms.push(platform);
  }

  private applyDevScenario() {
    if (!import.meta.env.DEV) return;
    const scenario = new URLSearchParams(location.search).get('scenario');
    if (!['bridge', 'bouncer', 'launcher', 'checkpoint', 'hazard', 'moving', 'finish', 'finish-persist'].includes(scenario ?? '')) return;
    this.devScenario = scenario !== 'finish-persist';
    const bridge = levelData.platforms.find(platform => platform.id === 'bridge');
    const launcher = levelData.launchers[0];
    const launcherSurface = launcher && levelData.platforms.find(platform => (
      Math.abs(launcher.pos[0] - platform.pos[0]) <= platform.size[0] / 2
      && Math.abs(launcher.pos[2] - platform.pos[2]) <= platform.size[2] / 2
    ));
    const checkpoint = levelData.checkpoints[1] ?? levelData.checkpoints[0];
    const movingDef = levelData.platforms.find(platform => platform.moving);
    const movingIndex = movingDef ? levelData.criticalRoute.indexOf(movingDef.id) : -1;
    const movingApproach = movingIndex > 0
      ? levelData.platforms.find(platform => platform.id === levelData.criticalRoute[movingIndex - 1])
      : undefined;
    const movingZ = movingDef?.pos[2] ?? 0;
    const priorCheckpoint = levelData.checkpoints
      .filter(item => item.pos[2] > movingZ)
      .sort((a, b) => a.pos[2] - b.pos[2])[0] ?? levelData.checkpoints[0];
    if (scenario === 'bridge' && bridge) this.player.position.set(
      bridge.pos[0],
      bridge.pos[1] + bridge.size[1] / 2,
      bridge.pos[2] + bridge.size[2] / 2 + 2.4,
    );
    if ((scenario === 'bouncer' || scenario === 'launcher') && launcher && launcherSurface) this.player.position.set(
      launcher.pos[0],
      launcherSurface.pos[1] + launcherSurface.size[1] / 2,
      launcher.pos[2] + 3,
    );
    if (scenario === 'checkpoint' && checkpoint) this.player.position.copy(v(checkpoint.respawn));
    if (scenario === 'hazard') {
      const spike = levelData.spikes[0] ?? levelData.saws[0];
      const rotator = levelData.rotators[0];
      if (spike) this.player.position.set(spike[0], spike[1] - 1, spike[2]);
      else if (rotator) this.player.position.set(
        rotator.pos[0] + rotator.radius * .66, rotator.pos[1] - 1, rotator.pos[2],
      );
    }
    if (scenario === 'moving' && movingApproach) {
      this.player.position.set(
        movingApproach.pos[0],
        movingApproach.pos[1] + movingApproach.size[1] / 2,
        movingApproach.pos[2] - movingApproach.size[2] / 2 + 2,
      );
      this.respawn.copy(v(priorCheckpoint.respawn));
    }
    if (scenario === 'finish' || scenario === 'finish-persist') {
      this.player.position.set(levelData.finish[0], levelData.finish[1], levelData.finish[2] + 1.5);
    }
  }

  private createCollisionSurface(def: CollisionSurfaceDef) {
    const root = new THREE.Group();
    root.position.copy(v(def.pos));
    root.name = `collision-${def.id}`;
    this.scene.add(root);
    this.platforms.push({
      root,
      def,
      basePosition: root.position.clone(),
      previousPosition: root.position.clone(),
    });
  }

  private createActLandmarks() {
    levelData.acts.slice(1).forEach(act => {
      if (act.gate) this.createActMarker(new THREE.Vector3(0, act.gate.y, act.gate.z), act.gate.width, act.color);
    });
    const bonusMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd52a, emissive: 0xa95e00, emissiveIntensity: .55, roughness: .45,
    });
    levelData.bonusBeacons.forEach((position, index) => {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.28 + index * .06, 0), bonusMaterial);
      crystal.position.copy(v(position));
      crystal.userData.baseY = crystal.position.y;
      crystal.rotation.z = index * .6;
      crystal.name = 'bonus-beacon';
      crystal.castShadow = true;
      this.scene.add(crystal);
    });
  }

  private createActMarker(position: THREE.Vector3, width: number, color: number) {
    const root = new THREE.Group();
    root.position.copy(position);
    root.name = 'act-marker';
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9f2e2, roughness: .78, metalness: .02,
    });
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: .62, roughness: .24, metalness: .12,
    });
    const ringMaterial = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: .48, depthWrite: false,
    });
    for (const [index, side] of [-1, 1].entries()) {
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.42, .58, .58, 6), stoneMaterial);
      pedestal.position.set(side * width / 2, .29, 0);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.5, .46, .16, 8), stoneMaterial);
      cap.position.set(side * width / 2, .64, 0);
      cap.castShadow = true;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.34, 0), crystalMaterial);
      crystal.position.set(side * width / 2, 1.2, 0);
      crystal.castShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.52, .035, 6, 24), ringMaterial);
      ring.position.copy(crystal.position);
      ring.rotation.x = Math.PI / 2;
      root.add(pedestal, cap, crystal, ring);
      this.actMarkers.push({ crystal, ring, baseY: crystal.position.y, phase: index * Math.PI });
    }
    this.scene.add(root);
  }

  private createPlayer() {
    this.playerVisual = this.assets.create('character', { height: 2.45 });
    this.playerVisual.position.y -= .1;
    this.playerVisualScale.copy(this.playerVisual.scale);
    this.player.add(this.playerVisual);
    this.player.rotation.y = Math.PI;
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 1.025;
    this.contactShadow.renderOrder = 2;
    this.scene.add(this.player, this.contactShadow);
    this.playerMixer = new THREE.AnimationMixer(this.playerVisual);
    this.playAnimation('Idle', 0);
  }

  private createCoins() {
    levelData.coins.forEach((position, index) => {
      const object = this.assets.create('coin', { height: .85, castShadow: false, receiveShadow: false });
      object.position.copy(v(position));
      this.scene.add(object);
      this.coins.push({ object, baseY: object.position.y, phase: index * .7 });
    });
  }

  private createHazards() {
    levelData.launchers.forEach(launcher => {
      const object = launcher.visual === 'cannon'
        ? this.assets.create('cannon', { height: 2.65 })
        : this.assets.create('bouncer', { size: [4, .65, 4] });
      object.position.copy(v(launcher.pos));
      object.rotation.y = launcher.rotY ?? 0;
      if (launcher.visual === 'bouncer') object.position.y -= .18;
      object.name = `launcher-${launcher.id}`;
      this.scene.add(object);
    });

    const spikeClip = THREE.AnimationClip.findByName(this.assets.animations('spikes'), 'SpikeTrap_Activate');
    levelData.spikes.forEach((position, index) => {
      const spike = this.assets.create('spikes', { size: [2.1, 1.25, 2.1] });
      spike.position.copy(v(position));
      spike.name = `spike-trap-${index}`;
      const mixer = spikeClip ? new THREE.AnimationMixer(spike) : undefined;
      const action = mixer && spikeClip ? mixer.clipAction(spikeClip) : undefined;
      if (action && mixer) {
        action.play();
        action.paused = true;
        action.time = 0;
        mixer.update(0);
      }
      const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc24b, transparent: true, opacity: .16, depthWrite: false,
      });
      const warning = new THREE.Mesh(new THREE.RingGeometry(.72, 1.04, 24), warningMaterial);
      warning.rotation.x = -Math.PI / 2;
      warning.position.set(position[0], position[1] + .025, position[2]);
      warning.name = `spike-warning-${index}`;
      this.spikeTraps.push({
        object: spike,
        mixer,
        action,
        clipDuration: spikeClip?.duration ?? 0,
        phaseOffset: index < 4 ? 0 : SPIKE_CYCLE / 2,
        exposure: 0,
        warning,
      });
      this.scene.add(warning, spike);
    });
    levelData.saws.forEach((position, index) => {
      const saw = this.assets.create('saw', { height: 2.8 });
      saw.position.copy(v(position));
      saw.userData.baseX = saw.position.x;
      saw.rotation.y = index ? Math.PI / 2 : 0;
      this.saws.push(saw);
      this.scene.add(saw);
    });
    levelData.rotators.forEach(definition => this.createRotator(definition));
  }

  private createRotator(def: RotatorDef) {
    const root = new THREE.Group();
    root.position.copy(v(def.pos));
    root.name = `rotator-${def.id}`;
    const color = def.color ?? 0xffb64c;
    const metal = new THREE.MeshStandardMaterial({
      color: 0x4b3b59, metalness: .58, roughness: .32,
    });
    const accent = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: .34, metalness: .38, roughness: .28,
    });
    const pillar = this.assets.create('hazardCylinder', { height: 2.2 });
    pillar.position.y = -1;
    root.add(pillar);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.78, .92, .52, 12), accent);
    hub.castShadow = true;
    root.add(hub);
    const armCount = def.arms ?? 2;
    for (let index = 0; index < armCount; index++) {
      const arm = new THREE.Group();
      arm.rotation.y = index * Math.PI * 2 / armCount;
      const length = Math.max(1, def.radius - 1.05);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(length, .32, .48), metal);
      beam.position.x = 1.05 + length / 2;
      beam.castShadow = true;
      beam.receiveShadow = true;
      const tip = this.assets.create('spikyBall', { height: .92 });
      tip.position.set(def.radius, -.46, 0);
      arm.add(beam, tip);
      root.add(arm);
    }
    const sweep = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius, .055, 6, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .28, depthWrite: false }),
    );
    sweep.rotation.x = Math.PI / 2;
    sweep.position.y = -1.02;
    root.add(sweep);
    this.rotators.push({ root, def });
    this.scene.add(root);
  }

  private createCheckpointAndFinish() {
    levelData.checkpoints.forEach((definition, index) => {
      const root = new THREE.Group();
      root.position.copy(v(definition.pos));
      root.name = `checkpoint-${index}`;
      const checkpoint = this.assets.create('flag', { height: 3.8, color: 0x28b8ff });
      checkpoint.rotation.y = Math.PI / 2;
      checkpoint.name = `checkpoint-flag-${index}`;
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x28b8ff, transparent: true, opacity: .62, depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .065, 8, 32), ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = .08;
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x28b8ff, transparent: true, opacity: .075, depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, 3.4, 16, 1, true), beamMaterial);
      beam.position.y = 1.7;
      root.add(checkpoint, ring, beam);
      this.scene.add(root);
      this.checkpointVisuals.push({ root, ring, beam, active: false });
    });

    const finishFlag = this.assets.create('flag', { height: 5 });
    finishFlag.position.copy(v(levelData.finish));
    finishFlag.position.x = 4;
    this.scene.add(finishFlag);
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(.75, 0),
      new THREE.MeshStandardMaterial({ color: 0xffd52a, emissive: 0x9b6500, emissiveIntensity: .55 }),
    );
    star.position.copy(v(levelData.finish)).add(new THREE.Vector3(0, 2.3, 0));
    star.userData.baseY = star.position.y;
    star.name = 'finish-star';
    star.castShadow = true;
    this.scene.add(star);

    const finishRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd52a, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.finishRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, .1, 10, 48), finishRingMaterial);
    this.finishRing.position.copy(v(levelData.finish)).add(new THREE.Vector3(0, .12, 0));
    this.finishRing.rotation.x = Math.PI / 2;
    this.finishRing.visible = false;
    this.finishGlow = new THREE.PointLight(0xffd52a, 0, 18, 2);
    this.finishGlow.position.copy(v(levelData.finish)).add(new THREE.Vector3(0, 2, 0));
    this.scene.add(this.finishRing, this.finishGlow);
  }

  private createPropsAndSky() {
    levelData.props.filter(prop => this.assets.has(prop.asset)).forEach(prop => this.createProp(prop));
    const cloudIds: AssetId[] = ['cloud1', 'cloud2', 'cloud3'];
    const cloudCount = levelData.id === 'sunset-spires' ? 16 : 22;
    for (let index = 0; index < cloudCount; index++) {
      const cloud = this.assets.create(cloudIds[index % cloudIds.length], {
        height: 3 + (index % 4), castShadow: false, receiveShadow: false,
      });
      const side = index % 2 ? 1 : -1;
      cloud.position.set(side * (20 + (index * 13) % 55), 10 + (index * 7) % 24, 15 - index * 10);
      cloud.rotation.y = index * .73;
      this.scene.add(cloud);
    }
    if (levelData.id === 'sunset-spires') this.createCitadelScenery();
  }

  private createCitadelScenery() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x765064, roughness: .82, metalness: .04 });
    const deepStone = new THREE.MeshStandardMaterial({ color: 0x59425f, roughness: .78, metalness: .08 });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xe0a04b, emissive: 0x7d351f, emissiveIntensity: .32, roughness: .42, metalness: .34,
    });
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(9, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffc56a, fog: false }),
    );
    sun.position.set(-42, 38, -238);
    sun.name = 'citadel-sun';
    this.scene.add(sun);

    const spirePositions: Vec3[] = [[-40,-5,-54],[38,-3,-82],[-42,1,-144],[40,6,-190]];
    spirePositions.forEach((position, index) => {
      const root = new THREE.Group();
      root.position.copy(v(position));
      const bodyHeight = 11 + index * 1.55;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.6, bodyHeight, 6), deepStone);
      body.position.y = bodyHeight / 2;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2.75, 5.2, 6), gold);
      crown.position.y = bodyHeight + 2.6;
      for (const heightRatio of [.28, .72]) {
        const bandRadius = THREE.MathUtils.lerp(3.2, 2.05, heightRatio);
        const band = new THREE.Mesh(new THREE.TorusGeometry(bandRadius, .12, 6, 18), gold);
        band.rotation.x = Math.PI / 2;
        band.position.y = bodyHeight * heightRatio;
        root.add(band);
      }
      const window = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.55, .15), gold);
      window.position.set(0, bodyHeight * .62, 2.65);
      body.castShadow = crown.castShadow = true;
      root.add(body, crown, window);
      this.scene.add(root);
    });

    levelData.platforms.filter(platform => (
      platform.visual === 'brick' && !platform.moving && platform.pos[1] >= 5 && platform.size[0] >= 10
    )).forEach(platform => {
      const height = Math.min(8, 2.8 + platform.pos[1] * .24);
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(platform.size[0] * .24, platform.size[0] * .38, height, 6), stone,
      );
      support.position.set(platform.pos[0], platform.pos[1] - platform.size[1] / 2 - height / 2, platform.pos[2]);
      support.castShadow = true;
      support.receiveShadow = true;
      this.scene.add(support);

      if (['clockwork-floor', 'upper-gallery', 'spinner-terrace', 'summit'].includes(platform.id)) {
        for (const side of [-1, 1]) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, platform.size[2] * .82), gold);
          trim.position.set(
            platform.pos[0] + side * (platform.size[0] / 2 - .3),
            platform.pos[1] + platform.size[1] / 2 + .1,
            platform.pos[2],
          );
          trim.castShadow = true;
          this.scene.add(trim);
        }
      }
    });

    const gearPositions: Vec3[] = [[-12,11,-82],[14,15,-141],[-10,22,-184]];
    gearPositions.forEach((position, index) => {
      const gear = new THREE.Group();
      gear.position.copy(v(position));
      gear.rotation.y = index % 2 ? -.45 : .35;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7 + index * .35, .24, 8, 24), gold);
      gear.add(ring);
      for (let tooth = 0; tooth < 12; tooth++) {
        const angle = tooth / 12 * Math.PI * 2;
        const block = new THREE.Mesh(new THREE.BoxGeometry(.54, .78, .44), gold);
        const radius = 3.02 + index * .35;
        block.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        block.rotation.z = angle;
        gear.add(block);
      }
      this.clockworkDecor.push(gear);
      this.scene.add(gear);
    });

    levelData.platforms.filter(platform => platform.moving?.axis === 'y').forEach(platform => {
      const travel = platform.moving?.distance ?? 2;
      const railHeight = travel * 2 + 3.5;
      const railRoot = new THREE.Group();
      railRoot.position.set(platform.pos[0], platform.pos[1], platform.pos[2]);
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, railHeight, 8), gold);
        rail.position.x = side * (platform.size[0] / 2 + .35);
        rail.castShadow = true;
        railRoot.add(rail);
      }
      this.scene.add(railRoot);
    });
  }

  private createProp(prop: (typeof levelData.props)[number]) {
    const object = this.assets.create(prop.asset, { height: prop.height });
    object.name = `prop-${prop.asset}`;
    object.position.copy(v(prop.pos));
    object.rotation.y = prop.rotY ?? 0;
    object.userData.baseY = object.position.y;
    object.userData.baseRotationY = object.rotation.y;
    this.scene.add(object);
  }

  private async loadDeferredDecorations() {
    try {
      await this.assets.load(DEFERRED_ASSETS);
      levelData.props.filter(prop => DEFERRED_ASSETS.includes(prop.asset)).forEach(prop => this.createProp(prop));
    } catch (error) {
      console.warn('Optional castle decorations could not be loaded.', error);
    }
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const frameDelta = Math.min(this.clock.getDelta(), PHYSICS.maxFrameDelta);
    if (!this.paused) {
      if (!this.done) {
        this.consumeDebugCommand();
        this.input.update();
        this.accumulator += frameDelta;
        let steps = 0;
        let actions: InputActions | undefined;
        while (this.accumulator >= PHYSICS.fixedStep && steps < PHYSICS.maxSubSteps) {
          actions ??= this.input.consume();
          this.simulate(PHYSICS.fixedStep, actions);
          actions = NO_ACTIONS;
          this.accumulator -= PHYSICS.fixedStep;
          steps++;
          if (this.done) {
            this.accumulator = 0;
            break;
          }
        }
        if (steps === PHYSICS.maxSubSteps && this.accumulator >= PHYSICS.fixedStep) {
          this.accumulator %= PHYSICS.fixedStep;
        }
      } else {
        this.simulationTime += frameDelta;
        this.advanceWorld(frameDelta, false);
      }
      this.playerMixer?.update(frameDelta);
      if (this.done) this.updateFinishSequence(frameDelta);
      else this.updateCamera(frameDelta);
      this.updateContactShadow();
      this.updateHud();
    }
    this.renderer.render(this.scene, this.camera);
  };

  private simulate(delta: number, pressed: InputActions) {
    this.simulationTime += delta;
    this.runTime += delta;
    this.resetGrace = Math.max(0, this.resetGrace - delta);
    this.landingAnimationTime = Math.max(0, this.landingAnimationTime - delta);
    this.advanceWorld(delta, true);
    if (this.respawnTimer > 0) {
      this.respawnTimer = Math.max(0, this.respawnTimer - delta);
      if (!this.respawnPlaced && this.respawnTimer <= .45) this.placeRespawn();
      return;
    }

    this.coyoteTime = this.grounded ? PHYSICS.coyoteTime : Math.max(0, this.coyoteTime - delta);
    this.jumpBuffer = pressed.jump ? PHYSICS.jumpBuffer : Math.max(0, this.jumpBuffer - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.dashTime = Math.max(0, this.dashTime - delta);
    this.bounceAssistTime = Math.max(0, this.bounceAssistTime - delta);

    const move = this.input.moveVector;
    const magnitude = Math.min(1, Math.hypot(move.x, move.y));
    const length = Math.hypot(move.x, move.y) || 1;
    const targetX = move.x / length * PHYSICS.moveSpeed * magnitude;
    const targetZ = -move.y / length * PHYSICS.moveSpeed * magnitude;

    if (pressed.dash && this.dashCooldown <= 0) {
      this.dashDirection.set(targetX, 0, targetZ);
      if (this.dashDirection.lengthSq() < 1) {
        this.dashDirection.set(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
      }
      this.dashDirection.normalize();
      this.dashTime = PHYSICS.dashDuration;
      this.dashCooldown = PHYSICS.dashCooldown;
      this.audio.play('dash');
      this.haptic(18);
      this.burst(this.player.position.clone().add(new THREE.Vector3(0, .8, 0)), 0x56d8ff, 8, 3.5);
    }
    if (this.dashTime > 0) {
      this.velocity.x = this.dashDirection.x * PHYSICS.dashSpeed;
      this.velocity.z = this.dashDirection.z * PHYSICS.dashSpeed;
    } else if (this.bounceAssistTime > 0) {
      this.velocity.x = this.bounceVelocity.x + targetX * .14;
      this.velocity.z = this.bounceVelocity.z + targetZ * .14;
    } else {
      const response = 1 - Math.exp(-(this.grounded ? PHYSICS.groundResponse : PHYSICS.airResponse) * delta);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetX, response);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetZ, response);
    }
    if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
      this.velocity.y = PHYSICS.jumpSpeed;
      this.grounded = false;
      this.groundedOn = undefined;
      this.coyoteTime = 0;
      this.jumpBuffer = 0;
      this.audio.play('jump');
      this.haptic(10);
    }

    const gravityScale = this.velocity.y > 0 && !this.input.jumpHeld && this.bounceAssistTime <= 0
      ? PHYSICS.jumpCutGravity
      : this.velocity.y < 0 ? PHYSICS.fallGravity : 1;
    this.velocity.y = Math.max(-PHYSICS.terminalVelocity, this.velocity.y - PHYSICS.gravity * gravityScale * delta);

    const wasGrounded = this.grounded;
    const fallSpeed = this.velocity.y;
    this.previousPlayerPosition.copy(this.player.position);
    this.moveAxis('x', this.velocity.x * delta);
    this.moveAxis('z', this.velocity.z * delta);
    const previousY = this.player.position.y;
    this.player.position.y += this.velocity.y * delta;
    this.resolveGround(previousY, wasGrounded);

    if (!wasGrounded && this.grounded) this.input.setDebugMove(0, 0);
    if (!wasGrounded && this.grounded && fallSpeed < -5) {
      this.landingSquash = Math.min(.2, Math.abs(fallSpeed) * .009);
      this.landingAnimationTime = .16;
      this.cameraKick = Math.min(.2, Math.abs(fallSpeed) * .009);
      this.audio.play('land');
      this.burst(this.player.position.clone(), 0xffffff, 5, 1.7);
      this.haptic(8);
    }
    this.landingSquash = Math.max(0, this.landingSquash - delta * 1.9);
    if (this.playerVisual) this.playerVisual.scale.set(
      this.playerVisualScale.x * (1 + this.landingSquash * .25),
      this.playerVisualScale.y * (1 - this.landingSquash),
      this.playerVisualScale.z * (1 + this.landingSquash * .25),
    );
    if (magnitude > .05) {
      const turnResponse = 1 - Math.exp(-14 * delta);
      this.player.rotation.y = this.lerpAngle(
        this.player.rotation.y, Math.atan2(this.velocity.x, this.velocity.z), turnResponse,
      );
    }
    this.updatePlayerAnimation(magnitude);

    if (this.player.position.y < -12) {
      this.beginRespawn('Mind the clouds!');
      return;
    }
    this.interactions(this.previousPlayerPosition);
  }

  private moveAxis(axis: 'x' | 'z', amount: number) {
    if (Math.abs(amount) < .000001) return;
    const other = axis === 'x' ? 'z' : 'x';
    this.player.position[axis] += amount;
    const foot = this.player.position.y;
    const head = foot + PHYSICS.playerHeight;
    for (const platform of this.platforms) {
      const position = platform.root.position;
      const size = platform.def.size;
      const axisIndex = axis === 'x' ? 0 : 2;
      const otherIndex = other === 'x' ? 0 : 2;
      const top = position.y + size[1] / 2;
      const bottom = position.y - size[1] / 2;
      if (head <= bottom + .02 || foot >= top - .05) continue;
      const stepable = this.grounded && top >= foot - .1 && top - foot <= PHYSICS.stepHeight + .02;
      if (stepable) continue;
      if (Math.abs(this.player.position[other] - position[other]) > size[otherIndex] / 2 + PHYSICS.playerRadius) continue;
      const min = position[axis] - size[axisIndex] / 2 - PHYSICS.playerRadius;
      const max = position[axis] + size[axisIndex] / 2 + PHYSICS.playerRadius;
      if (this.player.position[axis] <= min || this.player.position[axis] >= max) continue;
      this.player.position[axis] = amount > 0 ? min : max;
      this.velocity[axis] = 0;
    }
  }

  private resolveGround(previousY: number, wasGrounded: boolean) {
    this.grounded = false;
    this.groundedOn = undefined;
    let best: { top: number; platform: Platform } | undefined;
    for (const platform of this.platforms) {
      const position = platform.root.position;
      const size = platform.def.size;
      if (Math.abs(this.player.position.x - position.x) > size[0] / 2 + PHYSICS.playerRadius) continue;
      if (Math.abs(this.player.position.z - position.z) > size[2] / 2 + PHYSICS.playerRadius) continue;
      const top = position.y + size[1] / 2;
      const landing = this.velocity.y <= 0
        && previousY >= top - .08
        && this.player.position.y <= top + .08
        && this.player.position.y >= top - PHYSICS.landingSweep;
      const step = wasGrounded
        && this.velocity.y <= .5
        && top >= previousY - PHYSICS.groundProbe
        && top - previousY <= PHYSICS.stepHeight
        && this.player.position.y <= top + .18;
      if ((landing || step) && (!best || top > best.top)) best = { top, platform };
    }
    if (!best) return;
    this.player.position.y = best.top;
    this.velocity.y = 0;
    this.grounded = true;
    this.groundedOn = best.platform;
  }

  private advanceWorld(delta: number, carryPlayer: boolean) {
    for (const platform of this.movingPlatforms) {
      const moving = platform.def.moving;
      if (!moving) continue;
      platform.previousPosition.copy(platform.root.position);
      platform.root.position[moving.axis] = platform.basePosition[moving.axis]
        + Math.sin(this.simulationTime * moving.speed + (moving.phase ?? 0)) * moving.distance;
      if (carryPlayer && this.groundedOn === platform) {
        this.platformDelta.subVectors(platform.root.position, platform.previousPosition);
        this.player.position.add(this.platformDelta);
      }
    }
    this.coins.forEach(coin => {
      if (this.collected.has(coin.object)) return;
      coin.object.rotation.y += delta * 2.7;
      coin.object.position.y = coin.baseY + Math.sin(this.simulationTime * 3 + coin.phase) * .18;
    });
    this.saws.forEach((saw, index) => {
      saw.rotation.z += delta * (index ? -5 : 5);
      saw.position.x = saw.userData.baseX + Math.sin(this.simulationTime * 1.8 + index * Math.PI) * 1.35;
    });
    this.rotators.forEach(rotator => {
      rotator.root.rotation.y += delta * rotator.def.speed;
    });
    this.clockworkDecor.forEach((gear, index) => {
      gear.rotation.z += delta * (index % 2 ? -.18 : .22);
    });
    this.spikeTraps.forEach(trap => {
      const phase = (this.simulationTime + trap.phaseOffset) % SPIKE_CYCLE;
      let exposure = 0;
      if (phase >= .72 && phase < 1.06) exposure = THREE.MathUtils.smoothstep(phase, .72, 1.06);
      else if (phase >= 1.06 && phase < 2.18) exposure = 1;
      else if (phase >= 2.18 && phase < 2.52) exposure = 1 - THREE.MathUtils.smoothstep(phase, 2.18, 2.52);
      trap.exposure = exposure;
      if (trap.action && trap.mixer) {
        // The pack's clip is a complete up/down cycle; its highest pose is at the midpoint.
        trap.action.time = trap.clipDuration * .5 * exposure;
        trap.mixer.update(0);
      }
      const warningPulse = .12 + Math.sin(this.simulationTime * 7 + trap.phaseOffset) * .035;
      trap.warning.material.color.setHex(exposure >= SPIKE_DANGER_THRESHOLD ? 0xff405c : 0xffc24b);
      trap.warning.material.opacity = warningPulse + exposure * .28;
      trap.warning.scale.setScalar(1 + exposure * .08);
    });
    this.actMarkers.forEach(marker => {
      marker.crystal.rotation.y += delta * 1.7;
      marker.crystal.position.y = marker.baseY + Math.sin(this.simulationTime * 2.4 + marker.phase) * .08;
      marker.ring.position.y = marker.crystal.position.y;
      marker.ring.rotation.z += delta * .8;
      marker.ring.material.opacity = .38 + Math.sin(this.simulationTime * 2.4 + marker.phase) * .1;
    });
    const finishStar = this.scene.getObjectByName('finish-star');
    if (finishStar) finishStar.rotation.y += delta * 2;
    this.checkpointVisuals.forEach((checkpoint, index) => {
      const pulse = 1 + Math.sin(this.simulationTime * 3 + index) * (checkpoint.active ? .075 : .035);
      checkpoint.ring.scale.setScalar(pulse);
      checkpoint.ring.material.opacity = checkpoint.active ? .9 : .52 + Math.sin(this.simulationTime * 2.2 + index) * .12;
      checkpoint.beam.material.opacity = checkpoint.active ? .15 : .055 + Math.sin(this.simulationTime * 1.7 + index) * .018;
    });
    this.scene.getObjectsByProperty('name', 'bonus-beacon').forEach((beacon, index) => {
      beacon.rotation.y += delta * (1.4 + index * .2);
      beacon.position.y = beacon.userData.baseY + Math.sin(this.simulationTime * 2.3 + index) * .16;
    });
    for (let index = this.particles.length - 1; index >= 0; index--) {
      const particle = this.particles[index];
      particle.life -= delta;
      particle.velocity.y -= 8 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.scale.setScalar(Math.max(.01, particle.life));
      if (particle.life > 0) continue;
      this.scene.remove(particle.mesh);
      this.particles.splice(index, 1);
    }
  }

  private interactions(previousPosition: THREE.Vector3) {
    for (const tutorial of levelData.tutorials) {
      if (this.activatedTutorials.has(tutorial.id) || this.player.position.z > tutorial.z) continue;
      this.activatedTutorials.add(tutorial.id);
      this.ui.hint(tutorial.text);
    }

    const chest = this.player.position.clone().add(new THREE.Vector3(0, 1, 0));
    for (const coin of this.coins) {
      if (this.collected.has(coin.object) || coin.object.position.distanceTo(chest) >= 1.25) continue;
      this.collected.add(coin.object);
      this.burst(coin.object.position.clone(), 0xffd52a, 7, 2.6);
      coin.object.visible = false;
      this.audio.play('coin');
      this.haptic(6);
    }

    const launcher = levelData.launchers.find(definition => (
      this.grounded && this.horizontalDistance(this.player.position, v(definition.pos)) < 1.8
    ));
    if (launcher) {
      const target = v(launcher.target);
      const flightTime = launcher.flightTime;
      this.bounceVelocity.subVectors(target, this.player.position).multiplyScalar(1 / flightTime).setY(0);
      this.velocity.x = this.bounceVelocity.x;
      this.velocity.z = this.bounceVelocity.z;
      this.velocity.y = (target.y - this.player.position.y + PHYSICS.gravity * flightTime ** 2 / 2) / flightTime;
      this.bounceAssistTime = .82;
      this.grounded = false;
      this.groundedOn = undefined;
      this.audio.play('bounce');
      this.haptic([12, 20, 18]);
      this.burst(v(launcher.pos).add(new THREE.Vector3(0, .3, 0)), 0xffb34f, 12, 4);
      this.ui.toast(launcher.message ?? 'Launch!');
    }

    if (this.resetGrace <= 0) {
      const spikeHit = this.spikeTraps.some(trap => {
        if (trap.exposure < SPIKE_DANGER_THRESHOLD) return false;
        const hazard = trap.object.position;
        const distance = this.pointToSegmentDistanceXZ(hazard, previousPosition, this.player.position);
        return distance < 1.05 && Math.abs(this.player.position.y + 1 - hazard.y) < 1.45;
      });
      const sawHit = this.saws.some(saw => {
        const distance = this.pointToSegmentDistanceXZ(saw.position, previousPosition, this.player.position);
        return distance < 1.55 && Math.abs(this.player.position.y + 1 - saw.position.y) < 1.75;
      });
      const rotatorHit = this.rotators.some(rotator => {
        if (Math.abs(this.player.position.y + 1 - rotator.def.pos[1]) > .95) return false;
        const armCount = rotator.def.arms ?? 2;
        for (let index = 0; index < armCount; index++) {
          const angle = rotator.root.rotation.y + index * Math.PI * 2 / armCount;
          const directionX = Math.cos(angle);
          const directionZ = -Math.sin(angle);
          const start = new THREE.Vector3(
            rotator.root.position.x + directionX * .8,
            rotator.root.position.y,
            rotator.root.position.z + directionZ * .8,
          );
          const end = new THREE.Vector3(
            rotator.root.position.x + directionX * rotator.def.radius,
            rotator.root.position.y,
            rotator.root.position.z + directionZ * rotator.def.radius,
          );
          if (this.pointToSegmentDistanceXZ(this.player.position, start, end) < PHYSICS.playerRadius + .36) return true;
        }
        return false;
      });
      if (spikeHit || sawHit || rotatorHit) {
        this.beginRespawn(spikeHit ? 'Ouch!' : rotatorHit ? 'Mind the clockwork!' : 'Saw that coming!');
        return;
      }
    }

    levelData.checkpoints.forEach((checkpoint, index) => {
      if (this.activatedCheckpoints.has(index) || this.horizontalDistance(this.player.position, v(checkpoint.pos)) >= 1.8) return;
      this.activatedCheckpoints.add(index);
      this.respawn.copy(v(checkpoint.respawn));
      const visual = this.checkpointVisuals[index];
      if (visual) {
        visual.active = true;
        visual.root.scale.setScalar(1.06);
        visual.ring.material.color.setHex(0x55f29a);
        visual.beam.material.color.setHex(0x55f29a);
      }
      this.audio.play('check');
      this.haptic([15, 35, 15]);
      this.burst(v(checkpoint.pos).add(new THREE.Vector3(0, 1.4, 0)), 0x28b8ff, 16, 3.5);
      this.ui.toast('Checkpoint reached!');
    });
    const finish = v(levelData.finish);
    if (this.horizontalDistance(this.player.position, finish) < 2.8
      && Math.abs(this.player.position.y - finish.y) < 3) this.finish();
  }

  private updateCamera(delta: number) {
    const fast = this.dashTime > 0;
    const airborne = !this.grounded;
    const camera = levelData.camera ?? { height: 6.35, distance: 9.3, lookAhead: 6.15, focusHeight: 1.2 };
    const targetFov = fast ? 63 : airborne ? 59 : 56;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-7 * delta));
    this.camera.updateProjectionMatrix();
    this.cameraKick = Math.max(0, this.cameraKick - delta * 1.7);
    const verticalLead = THREE.MathUtils.clamp(this.velocity.y * .055, -.45, 1.05);
    const forwardLead = camera.lookAhead + THREE.MathUtils.clamp(-this.velocity.z * .24, 0, 2.2);
    const focus = this.player.position.clone().add(new THREE.Vector3(
      this.velocity.x * .18,
      camera.focusHeight + verticalLead,
      -forwardLead,
    ));
    this.cameraFocus.lerp(focus, 1 - Math.exp(-8 * delta));
    const desired = this.player.position.clone().add(new THREE.Vector3(
      -this.velocity.x * .07,
      camera.height + verticalLead - this.cameraKick,
      fast ? camera.distance + 1.2 : camera.distance,
    ));
    this.camera.position.lerp(desired, 1 - Math.exp(-7.5 * delta));
    this.camera.lookAt(this.cameraFocus);

    if (this.sun) {
      this.sunTarget.position.set(this.player.position.x, 0, this.player.position.z - 10);
      this.sun.position.copy(this.sunTarget.position).add(new THREE.Vector3(-30, 45, 25));
      this.sunTarget.updateMatrixWorld();
    }
  }

  private updateFinishSequence(delta: number) {
    this.finishSequenceTime += delta;
    const raw = THREE.MathUtils.clamp(this.finishSequenceTime / 1.35, 0, 1);
    const ease = raw * raw * (3 - 2 * raw);
    const finish = v(levelData.finish);
    const cameraDestination = finish.clone().add(new THREE.Vector3(6.8, 5.4, 8.2));
    this.camera.position.lerpVectors(this.finishCameraStart, cameraDestination, ease);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 50, 1 - Math.exp(-4 * delta));
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 1.25, 0)));

    const reveal = THREE.MathUtils.clamp((this.finishSequenceTime - .18) / 1.2, 0, 1);
    if (this.finishRing) {
      this.finishRing.visible = true;
      this.finishRing.rotation.z += delta * 1.8;
      this.finishRing.scale.setScalar(.72 + reveal * 1.35);
      this.finishRing.material.opacity = (1 - reveal * .42) * .72;
    }
    if (this.finishGlow) this.finishGlow.intensity = Math.sin(reveal * Math.PI) * 3.4 + reveal * .8;
    const star = this.scene.getObjectByName('finish-star');
    if (star) {
      const pulse = 1 + Math.sin(this.finishSequenceTime * 7) * .08 * reveal;
      star.scale.setScalar(pulse);
      star.position.y = star.userData.baseY + Math.sin(this.finishSequenceTime * 3.5) * .18 * reveal;
    }
    const chest = this.scene.getObjectByName('prop-chest');
    if (chest) {
      const chestReveal = THREE.MathUtils.smoothstep(this.finishSequenceTime, .55, 1.35);
      chest.position.y = chest.userData.baseY + chestReveal * .3;
      chest.rotation.y = chest.userData.baseRotationY - chestReveal * .18;
    }
    if (!this.finishResultShown && this.finishSequenceTime >= 2.35) {
      this.finishResultShown = true;
      this.ui.complete(this.runTime, this.collected.size, this.deaths, !this.devScenario);
    }
  }

  private updatePlayerAnimation(moveMagnitude: number) {
    if (this.landingAnimationTime > 0) this.playAnimation('Jump_Land', .08);
    else if (!this.grounded && this.velocity.y > 1) this.playAnimation('Jump');
    else if (!this.grounded) this.playAnimation('Jump_Idle');
    else if (moveMagnitude > .08) this.playAnimation('Run');
    else this.playAnimation('Idle');
    if (this.currentAction && this.currentAnimation === 'Run') {
      this.currentAction.timeScale = .8 + moveMagnitude * .35;
    }
  }

  private playAnimation(name: string, fade = .16) {
    if (!this.playerMixer || name === this.currentAnimation) return;
    const clip = THREE.AnimationClip.findByName(this.assets.animations('character'), name);
    if (!clip) return;
    const next = this.playerMixer.clipAction(clip);
    next.setLoop(name === 'Jump_Land' ? THREE.LoopOnce : THREE.LoopRepeat, name === 'Jump_Land' ? 1 : Infinity);
    next.clampWhenFinished = name === 'Jump_Land';
    next.reset().fadeIn(fade).play();
    this.currentAction?.fadeOut(fade);
    this.currentAction = next;
    this.currentAnimation = name;
  }

  private burst(position: THREE.Vector3, color: number, count: number, speed: number) {
    let material = this.particleMaterials.get(color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color });
      this.particleMaterials.set(color, material);
    }
    for (let index = 0; index < count; index++) {
      const mesh = new THREE.Mesh(this.particleGeometry, material);
      mesh.position.copy(position);
      mesh.scale.setScalar(.75 + Math.random() * .6);
      mesh.frustumCulled = true;
      this.scene.add(mesh);
      const velocity = new THREE.Vector3(
        (Math.random() - .5) * speed, Math.random() * speed, (Math.random() - .5) * speed,
      );
      this.particles.push({ mesh, velocity, life: .55 + Math.random() * .35 });
    }
  }

  private updateHud() {
    let act = 0;
    for (let index = 1; index < levelData.acts.length; index++) {
      if (this.player.position.z <= levelData.acts[index].startZ) act = index;
    }
    this.ui.update(
      this.collected.size,
      THREE.MathUtils.clamp(-this.player.position.z / Math.abs(levelData.finishZ), 0, 1),
      1 - this.dashCooldown / PHYSICS.dashCooldown,
      this.deaths,
      act,
    );
    if (this.debugOutput) this.debugOutput.textContent = JSON.stringify(this.getDebugState());
  }

  private updateContactShadow() {
    let groundTop = Number.NEGATIVE_INFINITY;
    for (const platform of this.platforms) {
      const position = platform.root.position;
      const size = platform.def.size;
      if (Math.abs(this.player.position.x - position.x) > size[0] / 2 + .18) continue;
      if (Math.abs(this.player.position.z - position.z) > size[2] / 2 + .18) continue;
      const top = position.y + size[1] / 2;
      if (top <= this.player.position.y + .12 && top > groundTop) groundTop = top;
    }
    if (!Number.isFinite(groundTop)) {
      this.contactShadow.visible = false;
      return;
    }
    const height = Math.max(0, this.player.position.y - groundTop);
    this.contactShadow.visible = height < 4;
    this.contactShadow.position.set(this.player.position.x, groundTop + .025, this.player.position.z);
    this.contactShadow.scale.setScalar(1 + height * .13);
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = this.grounded
      ? .22
      : THREE.MathUtils.clamp(.18 - height * .04, .025, .18);
  }

  private beginRespawn(message: string) {
    if (this.respawnTimer > 0 || this.done) return;
    this.respawnTimer = .9;
    this.respawnPlaced = false;
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.groundedOn = undefined;
    this.input.reset();
    this.deaths++;
    this.cameraKick = .2;
    this.playAnimation('HitReact', .06);
    this.audio.play('hit');
    this.haptic([35, 25, 35]);
    this.ui.respawn(message);
  }

  private placeRespawn() {
    this.player.position.copy(this.respawn);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.groundedOn = undefined;
    this.dashTime = 0;
    this.bounceAssistTime = 0;
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.resetGrace = .4;
    this.respawnPlaced = true;
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.finishSequenceTime = 0;
    this.finishResultShown = false;
    this.finishCameraStart.copy(this.camera.position);
    this.velocity.set(0, 0, 0);
    this.input.reset();
    this.ui.setCinematic(true);
    this.playAnimation('Wave');
    this.audio.play('finish');
    this.haptic([20, 40, 20, 40, 50]);
    this.burst(this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffd52a, 28, 5);
  }

  private handleVisibility() {
    this.paused = document.hidden;
    this.input.reset();
    this.accumulator = 0;
    if (!this.paused) this.clock.getDelta();
  }

  private resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.updateRenderQuality();
  }

  private updateRenderQuality() {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const mobileLimit = innerWidth < 900 || memory <= 4 ? 1.25 : 1.5;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobileLimit));
  }

  private horizontalDistance(a: THREE.Vector3, b: THREE.Vector3) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private pointToSegmentDistanceXZ(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq < .000001) return Math.hypot(point.x - end.x, point.z - end.z);
    const t = THREE.MathUtils.clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq, 0, 1);
    return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
  }

  private lerpAngle(from: number, to: number, amount: number) {
    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    return from + delta * amount;
  }

  private haptic(pattern: number | number[]) {
    try { navigator.vibrate?.(pattern); } catch { /* Haptics are optional. */ }
  }
}
