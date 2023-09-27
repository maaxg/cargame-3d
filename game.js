import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
class Game {
  constructor() {
    this.useVisuals = true;
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
    this.scene.background = new THREE.Color(0, 0, 0);
    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(new THREE.Vector3(0, 1, 0));

    this.renderer = new THREE.WebGL1Renderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    const addSphere = document.getElementById("addSphere");
    const addBox = document.getElementById("addBox");

    addSphere.onclick = () => {
      game.addBody();
    };
    addBox.onclick = () => {
      game.addBody(false);
    };

    this.camera.position.z = 3;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.initPhysics();
  }

  initPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -0.2, 0),
    });
    this.fixedTimeStep = 1.0 / 6.0;
    this.damping = 0.01;

    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.debugRenderer = new CannonDebugger(this.scene, this.world);

    this.groundMaterial = new CANNON.Material("ground");
    const groundBody = new CANNON.Body({
      mass: 0,
      material: this.groundMaterial,
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });

    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    this.shapes = {};
    this.shapes.sphere = new CANNON.Sphere(0.5);
    this.shapes.box = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

    this.world.addBody(groundBody);
    this.animate();
  }

  addBody(sphere = true) {
    const material = new CANNON.Material();
    const body = new CANNON.Body({
      mass: 5,
      material,
      //shape: new CANNON.Sphere(1),
    });

    if (sphere) {
      body.addShape(this.shapes.sphere);
    } else body.addShape(this.shapes.box);

    const x = Math.random() * 0.3 + 1;
    body.position.set(sphere ? -x : x, 5, 0);
    body.linearDamping = this.damping;
    // body.position.set(0, 10, 0);

    this.world.addBody(body);

    const material_ground = new CANNON.ContactMaterial(
      this.groundMaterial,
      material,
      {
        friction: 0.1,
        restitution: sphere ? 0.9 : 0.3,
      }
    );

    this.world.addContactMaterial(material_ground);
  }

  animate() {
    const game = this;

    requestAnimationFrame(() => game.animate());
    this.world.step(this.fixedTimeStep);
    this.debugRenderer.update();

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
