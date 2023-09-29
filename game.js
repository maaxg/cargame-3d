import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { bodyToMesh } from "./three-conversion-utils";

const wheelOptions = {
  radius: 0.5,
  directionLocal: new CANNON.Vec3(0, -1, 0),
  suspensionStiffness: 30,
  suspensionRestLength: 0.3,
  frictionSlip: 1.4,
  dampingRelaxation: 2.3,
  dampingCompression: 4.4,
  maxSuspensionForce: 100000,
  rollInfluence: 0.01,
  axleLocal: new CANNON.Vec3(0, 0, 1),
  chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
  maxSuspensionTravel: 0.3,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: true,
};

class Game {
  constructor() {
    this.useVisuals = true;

    this.stats;
    this.camera;
    this.scene;
    this.renderer;
    this.debug = true;
    this.debugPhysics = true;
    this.fixedTimeStep = 1.0 / 60.0;

    this.js = { forward: 0, turn: 0 };
    this.clock = new THREE.Clock();

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
    this.scene = new THREE.Scene();
    this.scene.backgroundIntensity = 0.1;
    this.scene.background = new THREE.Color(0xa0a0a0);

    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(new THREE.Vector3(0, 1, 0));

    this.renderer = new THREE.WebGL1Renderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    document.body.appendChild(this.renderer.domElement);

    this.camera.position.z = 3;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.initPhysics();
  }

  addVisual(body) {
    const mesh = bodyToMesh(body, body.material);
    mesh.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.scene.add(mesh);
    return mesh;
  }

  addWheels() {
    wheelOptions.chassisConnectionPointLocal.set(-1, 0, 1);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(-1, 0, -1);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(1, 0, 1);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(1, 0, -1);
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.world);

    const wheelBodies = [];
    this.wheelMaterial = new CANNON.Material("wheel");
    this.vehicle.wheelInfos.forEach((wheel) => {
      const cylinderShape = new CANNON.Cylinder(
        wheel.radius,
        wheel.radius,
        wheel.radius / 2,
        20
      );
      const wheelBody = new CANNON.Body({
        mass: 0,
        material: this.wheelMaterial,
      });

      wheelBody.type - CANNON.Body.KINEMATIC;
      wheelBody.collisionFilterGroup = 0;
      const quaternion = new CANNON.Quaternion().setFromEuler(
        -Math.PI / 2,
        0,
        0
      );
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
      wheelBodies.push(wheelBody);
      this.addVisual(wheelBody);
      this.world.addBody(wheelBody);
    });

    // Update the wheel bodies
    this.world.addEventListener("postStep", () => {
      for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
        this.vehicle.updateWheelTransform(i);
        const transform = this.vehicle.wheelInfos[i].worldTransform;
        const wheelBody = wheelBodies[i];
        wheelBody.position.copy(transform.position);
        wheelBody.quaternion.copy(transform.quaternion);
      }
    });
  }

  initCar() {
    this.groundMaterial = new CANNON.Material("groundMaterial");

    const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 1));
    const chassisBody = new CANNON.Body({
      mass: 150,
      material: this.groundMaterial,
    });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(0, 4, 0);
    chassisBody.angularVelocity.set(0, 0.5, 0);

    this.addVisual(chassisBody);
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody,
    });

    this.addWheels(this.vehicle);
  }

  addGround() {
    const sizeX = 64;
    const sizeZ = 64;

    const matrix = [];

    for (let i = 0; i < sizeX; ++i) {
      matrix.push([]);
      for (let j = 0; j < sizeZ; j++) {
        if (i === 0 || j === 0 || i === sizeX - 1 || j === sizeZ - 1) {
          const height = 3;
          matrix[i].push(height);
          continue;
        }
        const height =
          Math.cos((i / sizeX) * Math.PI * 5) *
            Math.cos((j / sizeZ) * Math.PI * 5) *
            2 +
          2;
        matrix[i].push(height);
      }
    }

    const groundMaterial = new CANNON.Material("ground");
    const heightFieldShape = new CANNON.Heightfield(matrix, {
      elementSize: 100 / sizeX,
    });
    const heightfieldBody = new CANNON.Body({
      mass: 0,
      mateiral: groundMaterial,
    });
    heightfieldBody.addShape(heightFieldShape);

    heightfieldBody.position.set(
      -(sizeX * heightFieldShape.elementSize) / 2,
      -1,
      (sizeZ * heightFieldShape.elementSize) / 2
    );
    heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(heightfieldBody);
    // this.addVisual(heightfieldBody);

    const wheel_ground = new CANNON.ContactMaterial(
      this.wheelMaterial,
      groundMaterial,
      {
        friction: 0.3,
        restitution: 0,
        contactEquationStiffness: 1000,
      }
    );

    this.world.addContactMaterial(wheel_ground);
  }

  controlCar() {
    document.addEventListener("keydown", (event) => {
      const maxSteerVal = 0.5;
      const maxForce = 150;
      const brakeForce = 1000000;

      switch (event.key) {
        case "w":
        case "ArrowUp":
          this.vehicle.applyEngineForce(-maxForce, 2);
          this.vehicle.applyEngineForce(-maxForce, 3);
          break;

        case "s":
        case "ArrowDown":
          this.vehicle.applyEngineForce(maxForce, 2);
          this.vehicle.applyEngineForce(maxForce, 3);
          break;

        case "a":
        case "ArrowLeft":
          this.vehicle.setSteeringValue(maxSteerVal, 0);
          this.vehicle.setSteeringValue(maxSteerVal, 1);
          break;

        case "d":
        case "ArrowRight":
          this.vehicle.setSteeringValue(-maxSteerVal, 0);
          this.vehicle.setSteeringValue(-maxSteerVal, 1);
          break;

        case "b":
          this.vehicle.setBrake(brakeForce, 0);
          this.vehicle.setBrake(brakeForce, 1);
          this.vehicle.setBrake(brakeForce, 2);
          this.vehicle.setBrake(brakeForce, 3);
          break;
      }
    });
  }

  initPhysics() {
    this.physics = {};

    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -10, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0;

    this.debugRenderer = new CannonDebugger(this.scene, this.world);
    this.initCar();
    this.addGround();
    this.controlCar();

    this.animate();
  }

  animate() {
    const game = this;

    requestAnimationFrame(() => game.animate());
    this.world.step(this.fixedTimeStep);
    this.debugRenderer.update();
    this.camera.lookAt(
      new THREE.Vector3(
        this.vehicle.chassisBody.position.x,
        this.vehicle.chassisBody.position.y,
        this.vehicle.chassisBody.position.z
      )
    );

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
