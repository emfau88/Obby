import type { AssetId } from './AssetManager';

export type Vec3 = [number, number, number];
export type MovingPlatformDef = { axis: 'x' | 'z'; distance: number; speed: number };
export type PlatformDef = {
  id: string; pos: Vec3; size: Vec3;
  visual: 'grass' | 'rock' | 'bridge'; asset?: AssetId; moving?: MovingPlatformDef;
  collision?: boolean; act?: 1 | 2 | 3;
};
export type CollisionSurfaceDef = { id: string; pos: Vec3; size: Vec3 };
export type PropDef = { asset: AssetId; pos: Vec3; height: number; rotY?: number };
export type TutorialDef = { id: string; z: number; text: string };
export type LevelAct = {
  name: string;
  startZ: number;
  color: number;
  gate?: { z: number; y: number; width: number };
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
  bouncer: { pos: Vec3; target: Vec3; flightTime: number };
  spikes: Vec3[];
  saws: Vec3[];
  checkpoints: Array<{ pos: Vec3; respawn: Vec3 }>;
  finish: Vec3;
  tutorials: TutorialDef[];
  props: PropDef[];
  bonusBeacons: Vec3[];
  criticalRoute: string[];
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
  bouncer: { pos: [0,1.15,-46], target: [2.5,3,-54], flightTime: .92 },
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
  subtitle: 'The Golden Hour Trial',
  description: 'A faster, tighter route across shifting ruins and the last light of day.',
  completeTitle: 'Summit Conquered!',
  theme: {
    sky: '#f39a7b', fog: '#efaa91', hemisphereSky: 0xffd6b8, hemisphereGround: 0x704a62, sun: 0xffdf9a,
  },
  mastery: { coins: 18, time: 48, falls: 2 },
  acts: [
    { name: 'Breeze Terraces', startZ: 0, color: 0xffd15a },
    { name: 'Ruin Run', startZ: -65, color: 0xff6f61, gate: { z: -65, y: 5, width: 10.5 } },
    { name: 'Summit Keep', startZ: -124, color: 0x9a87ff, gate: { z: -124, y: 5, width: 10.5 } },
  ],
  start: [0,2,4],
  finishZ: -171,
  platforms: [
    {id:'start',pos:[0,0,0],size:[16,2,18],visual:'grass',act:1},
    {id:'terrace',pos:[-3,0,-15],size:[10,2,10],visual:'grass',act:1},
    {id:'bridge',pos:[0,.25,-26],size:[5,1.5,12],visual:'bridge',asset:'bridgeSmall',act:1},
    {id:'bouncer',pos:[0,0,-38],size:[11,2,10],visual:'grass',act:1},
    {id:'rock-a',pos:[-3,2,-50],size:[8,2,8],visual:'rock',asset:'rockTall',act:1},
    {id:'rock-b',pos:[2.5,3,-60],size:[8,2,8],visual:'rock',asset:'rock2',act:1},
    {id:'ruins',pos:[0,4,-73],size:[15,2,14],visual:'grass',act:2},
    {id:'moving',pos:[0,4.25,-88],size:[9.5,1.5,9.5],visual:'rock',asset:'rockLarge',moving:{axis:'x',distance:3,speed:.95},act:2},
    {id:'mid',pos:[0,4,-102],size:[14,2,11],visual:'grass',act:2},
    {id:'hazard',pos:[0,4,-116],size:[16,2,13],visual:'grass',act:2},
    {id:'bonus-rock-a',pos:[9.5,5,-112],size:[5.5,2,5.5],visual:'rock',asset:'rock3',act:2},
    {id:'bonus-rock-b',pos:[9.5,5.6,-120],size:[5.5,2,5.5],visual:'rock',asset:'rockLarge',act:2},
    {id:'checkpoint',pos:[0,4,-130],size:[12,2,9],visual:'grass',act:3},
    {id:'landing',pos:[0,4,-143],size:[14,2,10],visual:'grass',act:3},
    {id:'stairs',pos:[0,5.5,-154],size:[8,3,12],visual:'bridge',asset:'stairs',collision:false,act:3},
    {id:'castle',pos:[0,5.5,-169],size:[20,3,20],visual:'grass',act:3},
  ],
  collisionSurfaces: [
    {id:'stair-1',pos:[0,5.2,-149.2],size:[8,.4,2.4]},
    {id:'stair-2',pos:[0,5.4,-151.6],size:[8,.8,2.4]},
    {id:'stair-3',pos:[0,5.6,-154],size:[8,1.2,2.4]},
    {id:'stair-4',pos:[0,5.8,-156.4],size:[8,1.6,2.4]},
    {id:'stair-5',pos:[0,6,-158.8],size:[8,2,2.4]},
  ],
  coins: [
    [0,2.2,-4],[-1.5,2.2,-9],[-3,2.2,-15],[-1,2.2,-20],[0,2.2,-25],[0,2.2,-30],
    [0,2.3,-37],[0,2.4,-42],[-3,4.3,-50],[2.5,5.3,-60],[0,6.3,-68],[0,6.3,-78],
    [0,6.3,-86],[0,6.3,-92],[0,6.3,-101],[9.5,7.2,-112],[9.5,7.8,-120],[-2.5,6.3,-118],
    [0,6.4,-143],[0,8.2,-169],
  ],
  bouncer: { pos: [0,1.15,-41], target: [-3,3,-50], flightTime: .9 },
  spikes: [[-5,5.1,-113],[-2.5,5.1,-113],[2.5,5.1,-113],[5,5.1,-113],[-5,5.1,-119],[0,5.1,-119],[5,5.1,-119]],
  saws: [[-3.5,5.2,-71],[3.5,5.2,-76]],
  checkpoints: [
    {pos:[0,1.1,-37],respawn:[0,2,-37]},
    {pos:[0,5.1,-130],respawn:[0,6,-130]},
    {pos:[0,5.1,-143],respawn:[0,6,-143]},
  ],
  finish: [0,7,-171],
  tutorials: [
    {id:'pace',z:-10,text:'Sunset Spires rewards clean momentum'},
    {id:'bounce',z:-34,text:'Trust the bouncer and steer into the landing'},
    {id:'saws',z:-66,text:'The center line is safest between the saws'},
    {id:'bonus',z:-106,text:'Golden side rocks hold two mastery coins'},
    {id:'spikes',z:-110,text:'Watch the warning glow — cross when the spikes retract'},
    {id:'summit',z:-125,text:'One final climb to the summit keep'},
  ],
  props: [
    {asset:'tree',pos:[-6,1,-2],height:5.5,rotY:.5},{asset:'tree',pos:[4,1,-14],height:4.8,rotY:-.4},
    {asset:'bush',pos:[5,1,-2],height:1.7},{asset:'bush',pos:[-6,1,-17],height:1.6},
    {asset:'rockTall',pos:[-11,5,-103],height:6.5,rotY:.3},{asset:'tree',pos:[-5,5,-130],height:4.4},
    {asset:'tower',pos:[0,7,-175],height:11},{asset:'chest',pos:[-5,7,-170],height:2.2,rotY:.45},
  ],
  bonusBeacons: [[7.2,7.2,-108],[8.5,7.65,-112],[9.8,8.1,-116]],
  criticalRoute: ['start','terrace','bridge','bouncer','rock-a','rock-b','ruins','moving','mid','hazard','checkpoint','landing'],
};

export const LEVELS = [cloudtopRun, sunsetSpires] as const;

export function getLevel(id: string | null | undefined) {
  if (id === '2' || id === sunsetSpires.id) return sunsetSpires;
  return cloudtopRun;
}

export const levelData = getLevel(new URLSearchParams(location.search).get('level'));
