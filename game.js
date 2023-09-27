import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
class Game {
  constructor() {
    this.init();
  }

  loader(asset = "") {
    const loader = new FBXLoader();
    const game = this;

    loader.load(asset, (fbx) => {
      game.car = fbx;
      game.scene.add(fbx);
      game.controls.target = fbx.position.clone();
      game.controls.update();

      fbx.traverse((evt) => {
        if (evt.isMesh) evt.castShadow = evt.receiveShadow = true;
      });
    });
  }

  init() {
    const game = this;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGL1Renderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 1, 1, 1);
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 20, 10);
    const ambient = new THREE.AmbientLight(0x707070);

    const material = new THREE.MeshPhongMaterial({ color: 0x00aaff });

    this.cube = new THREE.Mesh(geometry, material);

    this.scene.add(this.cube, light, ambient);

    this.camera.position.z = 3;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.animate();
  }

  animate() {
    const game = this;

    requestAnimationFrame(() => game.animate());

    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
