import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const ASSETS = {
  character: 'Character', coin: 'Coin', bouncer: 'Bouncer', saw: 'Hazard_Saw',
  spikes: 'Hazard_SpikeTrap', flag: 'Goal_Flag', bridge: 'Bridge_Modular',
  bridgeSmall: 'Bridge_Small', bridgeCenter: 'Bridge_Modular_Center', arrow: 'Arrow',
  tower: 'Tower',
  rock1: 'RockPlatforms_1', rock2: 'RockPlatforms_2', rock3: 'RockPlatforms_3',
  rockLarge: 'RockPlatforms_Large', rockTall: 'RockPlatform_Tall', tree: 'Tree',
  bush: 'Bush', cloud1: 'Cloud_1', cloud2: 'Cloud_2', cloud3: 'Cloud_3',
  chest: 'Chest', stairs: 'Stairs', grassCube: 'Cube_Grass_Single',
} as const;

export type AssetId = keyof typeof ASSETS;

export class AssetManager {
  private loader = new GLTFLoader();
  private models = new Map<AssetId, GLTF>();

  async loadAll(onProgress?: (done: number, total: number) => void, deferred: AssetId[] = []) {
    const entries = (Object.entries(ASSETS) as [AssetId, string][])
      .filter(([id]) => !deferred.includes(id));
    await this.loadEntries(entries, onProgress);
  }

  async load(ids: AssetId[], onProgress?: (done: number, total: number) => void) {
    const entries = ids
      .filter(id => !this.models.has(id))
      .map(id => [id, ASSETS[id]] as [AssetId, string]);
    await this.loadEntries(entries, onProgress);
  }

  has(id: AssetId) { return this.models.has(id); }

  private async loadEntries(entries: [AssetId, string][], onProgress?: (done: number, total: number) => void) {
    let done = 0;
    await Promise.all(entries.map(async ([id, file]) => {
      const gltf = await this.loader.loadAsync(`${import.meta.env.BASE_URL}game-assets/${file}.gltf`);
      this.models.set(id, gltf);
      onProgress?.(++done, entries.length);
    }));
  }

  create(id: AssetId, options: {
    size?: [number, number, number], height?: number, color?: number,
    rotationY?: number,
    castShadow?: boolean, receiveShadow?: boolean,
  } = {}) {
    const source = this.models.get(id);
    if (!source) throw new Error(`Asset not loaded: ${id}`);
    const object = clone(source.scene);
    object.rotation.y = options.rotationY ?? 0;
    const box = new THREE.Box3().setFromObject(object);
    const natural = box.getSize(new THREE.Vector3());
    if (options.size) object.scale.set(
      options.size[0] / Math.max(natural.x, .001),
      options.size[1] / Math.max(natural.y, .001),
      options.size[2] / Math.max(natural.z, .001),
    );
    if (options.height) {
      const scale = options.height / Math.max(natural.y, .001);
      object.scale.setScalar(scale);
    }
    object.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(object);
    const center = fitted.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= fitted.min.y;
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = options.castShadow ?? true;
      child.receiveShadow = options.receiveShadow ?? true;
      if (options.color !== undefined) {
        const material = (child.material as THREE.MeshStandardMaterial).clone();
        material.color.setHex(options.color);
        child.material = material;
      }
    });
    return object;
  }

  animations(id: AssetId) { return this.models.get(id)?.animations ?? []; }
}
