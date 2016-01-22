/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./particles/gpuParticles.ts"/>
/// <reference path='./utils/shaderLoader.ts'/>
/// <reference path='./clock.ts'/>

module App {

	export class App {

		private shaderLoader: Utils.ShaderLoader;
		private camera: THREE.PerspectiveCamera;
		private particleSystem: GpuParticles.GpuParticles;

		constructor(){
			this.shaderLoader = new Utils.ShaderLoader();
		}

		init(scene: THREE.Scene): Q.Promise<THREE.Scene> {
			// let loadedDefer = Q.defer<THREE.Scene>();

			// this.controls = new THREE.OrbitControls(this.camera);

			this.camera = this.createCamera(config.camera, 'camera');
			var auxObjects = this.createAuxObjects();

			this.particleSystem = new GpuParticles.GpuParticles();
			var particleSystemLoaded = this.particleSystem.init(this.shaderLoader);

			var sceneAddObjects = (objectsArray: Array<THREE.Object3D>) => {
				_.each(objectsArray, (o) => { scene.add(o); })
			};
			scene.add(this.camera);
			scene.add(this.particleSystem);
			sceneAddObjects(auxObjects);

			if (config.fog.enabled){
				scene.fog = new THREE.FogExp2(config.fog.color, config.fog.density);
			}

			// return this.loadedDefer.promise;
			return particleSystemLoaded.then(() => scene);
		}

		private createCamera(cameraOpt, name: string): THREE.PerspectiveCamera {
			var camera = new THREE.PerspectiveCamera(
											cameraOpt.angle,
											cameraOpt.aspect(),
											cameraOpt.near,
											cameraOpt.far);
			camera.name = cameraOpt.name;
			camera.lookAt(cameraOpt.lookAt);
			camera.position.set(cameraOpt.position.x, cameraOpt.position.y, cameraOpt.position.z);
			return camera;
		}

		private createAuxObjects(): Array<THREE.Object3D>{
			/*
			var sphereMaterial = new THREE.MeshLambertMaterial({
				color: 0xCC0000
			});
			var radius = 50, segments = 16, rings = 16;
			this.sphere = new THREE.Mesh(
				new THREE.SphereGeometry(radius, segments, rings),
				sphereMaterial);
			*/
			return [];
		}

		update(){
			let clockDeltaData = createClockDeltaData();

			// this.controls.update();

			this.particleSystem.update(clockDeltaData);
		}

		getCamera(){
			return this.camera;
		}

		getParticleSystem(): GpuParticles.GpuParticles{
			return this.particleSystem;
		}

		// getControls(){
			// return this.controls;
		// }
	}

}
