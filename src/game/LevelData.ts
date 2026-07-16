import type { AssetId } from './AssetManager';

export type Vec3 = [number, number, number];
export type MovingPlatformDef = {
  axis: 'x' | 'y' | 'z';
  distance: number;
  speed: number;
  phase?: number;
};
export type LauncherDef = {
  id: string;
  pos: Vec3;
  target: Vec3;
  flightTime: number;
  visual: 'bouncer' | 'cannon';
  rotY?: number;
  message?: string;
};
export type RotatorDef = {
  id: string;
  pos: Vec3;
  radius: number;
  speed: number;
  arms?: number;
  color?: number;
};
export type PlatformDef = {
  id: string; pos: Vec3; size: Vec3;
  visual: 'grass' | 'rock' | 'bridge' | 'brick'; asset?: AssetId; moving?: MovingPlatformDef;
  collision?: boolean; act?: 1 | 2 | 3;
};
export type CollisionSurfaceDef = { id: string; pos: Vec3; size: Vec3 };
export type PropDef = { asset: AssetId; pos: Vec3; height: number; rotY?: number };
export type GateMechanismDef = {
  door: PropDef;
  lever: PropDef;
  collider: { pos: Vec3; size: Vec3 };
  gear: Vec3;
  triggerRadius: number;
  portalCenterX: number;
  portalWidth: number;
  openHeight: number;
  openDuration: number;
};
export type TutorialDef = { id: string; z: number; text: string };
export type LevelAct = {
  name: string;
  startZ: number;
  color: number;
  gate?: { x?: number; z: number; y: number; width: number };
};
export type LevelDefinition = {
  id: 'cloudtop-run' | 'sunset-spires';
  number: number;
  title: string;
  subtitle: string;
  description: string;
  completeTitle: string;
  nextId?: LevelDefinition['id'];
  theme: { sky: string; fog: string; hemisphereSky: number; hemisphereGround: number; sun: number };
  mastery: { coins: number; time: number; falls: number };
  acts: [LevelAct, LevelAct, LevelAct];
  start: Vec3;
  finishZ: number;
  platforms: PlatformDef[];
  collisionSurfaces: CollisionSurfaceDef[];
  coins: Vec3[];
  launchers: LauncherDef[];
  rotators: RotatorDef[];
  spikes: Vec3[];
  saws: Vec3[];
  checkpoints: Array<{ pos: Vec3; respawn: Vec3 }>;
  finish: Vec3;
  tutorials: TutorialDef[];
  props: PropDef[];
  gateMechanism?: GateMechanismDef;
  bonusBeacons: Vec3[];
  criticalRoute: string[];
  camera?: { height: number; distance: number; lookAhead: number; focusHeight: number };
};

const cloudtopRun: LevelDefinition = {
  id: 'cloudtop-run',
  number: 1,
  title: 'Cloudtop Run',
  subtitle: 'The Garden Ascent',
  description: 'Learn the movement, cross the sky trials and reach Cloudtop Castle.',
  completeTitle: 'Castle Reached!',
  nextId: 'sunset-spires',
  theme: {
    sky: '#78cdf7', fog: '#78cdf7', hemisphereSky: 0xd9f5ff, hemisphereGround: 0x806443, sun: 0xfff4dc,
  },
  mastery: { coins: 18, time: 50, falls: 2 },
  acts: [
    { name: 'Garden Run', startZ: 0, color: 0xffd15a },
    { name: 'Sky Trials', startZ: -69, color: 0xff6b55, gate: { z: -69, y: 5, width: 10.5 } },
    { name: 'Castle Climb', startZ: -129, color: 0x55cfff, gate: { z: -129, y: 5, width: 10.5 } },
  ],
  start: [0, 2, 4],
  finishZ: -184,
  platforms: [
    {id:'start',pos:[0,0,0],size:[16,2,20],visual:'grass',act:1},
    {id:'garden',pos:[0,0,-19],size:[14,2,12],visual:'grass',act:1},
    {id:'bridge',pos:[0,.25,-31],size:[5,1.5,12],visual:'bridge',asset:'bridge',act:1},
    {id:'bouncer',pos:[0,0,-43],size:[11,2,11],visual:'grass',act:1},
    {id:'rock-a',pos:[2.5,2,-54],size:[8,2,8],visual:'rock',asset:'rock1',act:1},
    {id:'rock-b',pos:[-2,3,-64],size:[8,2,8],visual:'rock',asset:'rock2',act:1},
    {id:'rock-c',pos:[2,4,-74],size:[8,2,8],visual:'rock',asset:'rock3',act:2},
    {id:'saw-island',pos:[0,4,-87],size:[16,2,15],visual:'grass',act:2},
    {id:'spike-island',pos:[0,4,-106],size:[17,2,18],visual:'grass',act:2},
    {id:'bonus-rock-a',pos:[-9.5,5,-97],size:[5.5,2,5.5],visual:'rock',asset:'rockLarge',act:2},
    {id:'bonus-rock-b',pos:[-9.5,5.7,-106],size:[5.5,2,5.5],visual:'rock',asset:'rock2',act:2},
    {id:'checkpoint',pos:[0,4,-125],size:[13,2,12],visual:'grass',act:2},
    {id:'moving',pos:[0,4.25,-140],size:[9.5,1.5,9.5],visual:'rock',asset:'rockLarge',moving:{axis:'x',distance:3.1,speed:.9},act:3},
    {id:'landing',pos:[0,4,-156],size:[14,2,14],visual:'grass',act:3},
    {id:'stairs',pos:[0,5.5,-168],size:[8,3,12],visual:'bridge',asset:'stairs',collision:false,act:3},
    {id:'castle',pos:[0,5.5,-183],size:[20,3,20],visual:'grass',act:3},
  ],
  collisionSurfaces: [
    {id:'stair-1',pos:[0,5.2,-163.2],size:[8,.4,2.4]},
    {id:'stair-2',pos:[0,5.4,-165.6],size:[8,.8,2.4]},
    {id:'stair-3',pos:[0,5.6,-168],size:[8,1.2,2.4]},
    {id:'stair-4',pos:[0,5.8,-170.4],size:[8,1.6,2.4]},
    {id:'stair-5',pos:[0,6,-172.8],size:[8,2,2.4]},
  ],
  coins: [
    [0,2.2,-5],[0,2.2,-10],[-3,2.2,-18],[3,2.2,-22],[0,2.2,-28],[0,2.2,-34],
    [0,2.3,-41],[0,2.5,-46],[2.5,4.3,-53],[-2,5.3,-64],[2,6.3,-74],
    [0,6.3,-83],[0,6.3,-91],[-9.5,7.4,-97],[-9.5,8.1,-106],[-2.5,6.3,-110],
    [0,6.3,-124],[0,7,-150],[0,6.8,-166],[0,8.2,-181],
  ],
  launchers: [{
    id: 'garden-bouncer', pos: [0,1.15,-46], target: [2.5,3,-54], flightTime: .92,
    visual: 'bouncer', message: 'Super bounce!',
  }],
  rotators: [],
  spikes: [[-5,5.1,-103],[-2.5,5.1,-103],[2.5,5.1,-103],[5,5.1,-103],[-5,5.1,-109],[0,5.1,-109],[5,5.1,-109]],
  saws: [[-3.5,5.2,-85],[3.5,5.2,-89]],
  checkpoints: [
    {pos:[0,1.1,-40],respawn:[0,2,-40]},
    {pos:[0,5.1,-125],respawn:[0,6,-125]},
    {pos:[0,5.1,-156],respawn:[0,6,-156]},
  ],
  finish: [0,7,-185],
  tutorials: [
    {id:'jump',z:-12,text:'Jump as you reach the gap'},
    {id:'dash',z:-27,text:'Dash gives you extra distance'},
    {id:'bounce',z:-39,text:'Aim forward — the bouncer does the rest'},
    {id:'bonus',z:-91,text:'Risky side rocks hide bonus coins'},
    {id:'spikes',z:-99,text:'Watch the warning glow — cross when the spikes retract'},
    {id:'moving',z:-130,text:'Watch the platform rhythm, then commit'},
  ],
  props: [
    {asset:'tree',pos:[-5,1,-1],height:6,rotY:.4},{asset:'tree',pos:[5,1,-20],height:5,rotY:-.5},
    {asset:'bush',pos:[-5,1,-18],height:1.8},{asset:'bush',pos:[4.5,1,-3],height:1.7},
    {asset:'tree',pos:[-5,5,-124],height:4.5},{asset:'bush',pos:[4,5,-128],height:1.6},
    {asset:'tower',pos:[0,7,-189],height:11},{asset:'chest',pos:[-5,7,-184],height:2.2,rotY:.5},
  ],
  bonusBeacons: [[-12,7.4,-96],[-10.8,7.85,-100.2],[-9.6,8.3,-104.4]],
  criticalRoute: [
    'start','garden','bridge','bouncer','rock-a','rock-b','rock-c','saw-island','spike-island','checkpoint','moving','landing',
  ],
};

const sunsetSpires: LevelDefinition = {
  id: 'sunset-spires',
  number: 2,
  title: 'Sunset Spires',
  subtitle: 'The Clockwork Citadel',
  description: 'Breach the golden ruins, ride the clockwork lifts and climb beyond the last light.',
  completeTitle: 'Citadel Conquered!',
  theme: {
    sky: '#e98772', fog: '#d99382', hemisphereSky: 0xffd2ad, hemisphereGround: 0x493953, sun: 0xffd27d,
  },
  mastery: { coins: 22, time: 68, falls: 2 },
  acts: [
    { name: 'Golden Ruins', startZ: 0, color: 0xffcc62 },
    { name: 'Clockwork Core', startZ: -62, color: 0xff725e, gate: { x: -4, z: -66, y: 7, width: 11 } },
    { name: 'Spire Ascent', startZ: -121, color: 0x9b83ff, gate: { x: 4, z: -123, y: 12, width: 12 } },
  ],
  start: [0,2,5],
  finishZ: -196,
  platforms: [
    {id:'start',pos:[0,0,0],size:[18,2,18],visual:'brick',act:1},
    {id:'lower-west',pos:[-4,1,-17],size:[10,2,9],visual:'brick',act:1},
    {id:'lower-east',pos:[4,2,-29],size:[9,2,9],visual:'brick',act:1},
    {id:'launcher-deck',pos:[4,2,-41],size:[11,2,10],visual:'brick',act:1},
    {id:'arrival-balcony',pos:[-7,6,-56],size:[12,2,10],visual:'brick',act:1},
    {id:'archway',pos:[-4,6,-68],size:[11,2,8],visual:'brick',act:2},
    {id:'clockwork-floor',pos:[0,6,-82],size:[20,2,18],visual:'brick',act:2},
    {id:'lift-approach',pos:[7,7,-96],size:[8,2,8],visual:'brick',act:2},
    {id:'lift-one',pos:[7,9,-107],size:[7,1.5,7],visual:'brick',moving:{axis:'y',distance:2,speed:.72,phase:-1.5708},act:2},
    {id:'upper-gallery',pos:[7,11,-118],size:[11,2,10],visual:'brick',act:2},
    {id:'spire-step',pos:[1,12.5,-130],size:[9,2,8],visual:'brick',act:3},
    {id:'bonus-balcony',pos:[-9,12.8,-130],size:[6,2,6],visual:'rock',asset:'rock3',act:3},
    {id:'spinner-terrace',pos:[-6,13,-141],size:[16,2,13],visual:'brick',act:3},
    {id:'final-approach',pos:[3,14,-153],size:[8,2,8],visual:'brick',act:3},
    {id:'lift-two',pos:[3,16.5,-164],size:[7,1.5,7],visual:'brick',moving:{axis:'y',distance:2,speed:.78,phase:-1.5708},act:3},
    {id:'summit',pos:[0,18,-178],size:[18,2,18],visual:'brick',act:3},
    {id:'crown',pos:[0,19,-194],size:[10,2,8],visual:'brick',act:3},
  ],
  collisionSurfaces: [],
  coins: [
    [0,2.2,-5],[-2,2.5,-12],[-4,3.2,-17],[0,3.6,-24],[4,4.2,-29],[4,4.2,-36],
    [4,4.2,-42],[1,6.2,-48],[-3,8,-52],[-7,8.2,-56],[-4,8.2,-67],[-5,8.2,-76],
    [-2,8.2,-82],[2,8.2,-82],[6,8.2,-86],[7,9.2,-96],[7,10.4,-107],[7,13.2,-118],
    [2,14.7,-129],[-9,15,-130],[-6,15.2,-137],[-6,15.2,-144],[1,16.2,-152],[3,17.2,-164],
    [0,20.2,-176],[0,21.2,-194],
  ],
  launchers: [{
    id: 'ruin-cannon', pos: [4,3.15,-43], target: [-7,7,-56], flightTime: 1.05,
    visual: 'cannon', rotY: -2.4, message: 'Citadel launch!',
  }],
  rotators: [
    {id:'core-sweep',pos:[0,8,-82],radius:7.3,speed:1.08,arms:2,color:0xffb64c},
    {id:'spire-sweep',pos:[-6,15,-141],radius:5.8,speed:-1.32,arms:3,color:0x9b83ff},
  ],
  spikes: [],
  saws: [],
  checkpoints: [
    {pos:[2.5,3.1,-38.5],respawn:[4,3,-38]},
    {pos:[-7,7.1,-56],respawn:[-7,7,-56]},
    {pos:[7,12.1,-118],respawn:[7,12,-118]},
    {pos:[3,15.1,-153],respawn:[3,15,-153]},
  ],
  finish: [0,20,-194],
  tutorials: [
    {id:'ruins',z:-10,text:'The Citadel climbs upward — read the next landing'},
    {id:'cannon',z:-32,text:'Step into the cannon and keep steering toward the balcony'},
    {id:'clockwork',z:-65,text:'Step up to the brass lever to open the clockwork gate'},
    {id:'lift-one',z:-94,text:'Board the lift low and jump when it reaches the gallery'},
    {id:'bonus',z:-123,text:'The outer rock holds a risky mastery coin'},
    {id:'spire',z:-135,text:'Use the quiet space near the hub to read the three arms'},
    {id:'summit',z:-170,text:'One clean final jump reaches the crown'},
  ],
  props: [
    {asset:'pipeStraight',pos:[-9,7,-81],height:5.5,rotY:.2},{asset:'pipe90',pos:[9,7,-84],height:4.2,rotY:-.8},
    {asset:'tower',pos:[-18,7,-111],height:18,rotY:.2},{asset:'tower',pos:[18,13,-145],height:22,rotY:-.3},
    {asset:'tower',pos:[0,20,-202],height:17},{asset:'chest',pos:[-3,20,-194],height:2.2,rotY:.45},
  ],
  gateMechanism: {
    door: {asset:'door',pos:[-4,7,-71],height:5.8,rotY:0},
    lever: {asset:'lever',pos:[-8,7,-67.8],height:1.65,rotY:1.5708},
    collider: {pos:[-4,9.45,-71],size:[4.35,4.9,.85]},
    gear: [-12,11,-82],
    triggerRadius: 1.45,
    portalCenterX: 0,
    portalWidth: 20,
    openHeight: 5.2,
    openDuration: 1.15,
  },
  bonusBeacons: [[-3.8,14.8,-128],[-6.2,15,-129],[-8.5,15.2,-130]],
  criticalRoute: [
    'start','lower-west','lower-east','launcher-deck','arrival-balcony','archway','clockwork-floor',
    'lift-approach','lift-one','upper-gallery','spire-step','spinner-terrace','final-approach','lift-two','summit','crown',
  ],
  camera: { height: 7.1, distance: 10.1, lookAhead: 7.3, focusHeight: 1.35 },
};

export const LEVELS = [cloudtopRun, sunsetSpires] as const;

export function getLevel(id: string | null | undefined) {
  if (id === '2' || id === sunsetSpires.id) return sunsetSpires;
  return cloudtopRun;
}

export const levelData = getLevel(
  typeof location === 'undefined' ? undefined : new URLSearchParams(location.search).get('level'),
);
