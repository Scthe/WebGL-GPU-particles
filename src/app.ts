/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./gpuParticles.ts"/>

module App {

	export class App {

		private loadedDefer: Q.Deferred<THREE.Scene>;
		private camera: THREE.PerspectiveCamera;
		private clock: THREE.Clock;
		private tick: number;
		private particleSystem: GpuParticles.GpuParticles;

		constructor(){
			this.loadedDefer = Q.defer<THREE.Scene>();
		}

		init(scene: THREE.Scene): Q.Promise<THREE.Scene> {
			this.clock = new THREE.Clock(true)
			this.tick = 0;

			// this.controls = new THREE.OrbitControls(this.camera);

			this.camera = this.createCamera(config.camera, 'camera');
			var lights = this.createLights(config.lights);
			var auxObjects = this.createAuxObjects();

			this.particleSystem = new GpuParticles.GpuParticles();
			this.particleSystem.init();

			var sceneAddObjects = (objectsArray: Array<THREE.Object3D>) => {
				_.each(objectsArray, (o) => { scene.add(o); })
			};
			scene.add(this.camera);
			scene.add(this.particleSystem);
			sceneAddObjects(lights);
			sceneAddObjects(auxObjects);

			if (config.fog.enabled){
				scene.fog = new THREE.FogExp2(config.fog.color, config.fog.density);
			}

			return this.loadedDefer.promise;
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

		private createLights(lightCfg): Array<THREE.PointLight> {
			var lightsArr = [],
					createLight = (lCfg) => {
						var pointLight = new THREE.PointLight(lCfg.color);
						pointLight.name = lCfg.name;
						pointLight.position.set(lCfg.position.x, lCfg.position.y, lCfg.position.z);

						var props = ['intensity', 'distance', 'decay'];
						_.each(props, p => {
							if (lCfg.hasOwnProperty(p)){
								pointLight[p] = lCfg[p];
							}
						});

						lightsArr.push(pointLight);
					};

			_.each(lightCfg, createLight);

			return lightsArr;
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
			// this.controls.update();
			this.updateParticles(config.particles);
		}

		private updateParticles(opt): void{
			var delta = this.clock.getDelta() * opt.system.timeScale;
			this.tick = Math.max(this.tick + delta, 0);

			var systemPosition = opt.position(this.tick, opt.system);

			if (delta > 0) {
				var spawnOpt = _.extend({}, opt.spawnOptions);
				spawnOpt.position = systemPosition;

				for (var x = 0; x < opt.system.spawnRate * delta; x++) {
					this.particleSystem.spawnParticle(spawnOpt);
				}
			}

			this.particleSystem.update(this.tick);
		}

		getCamera(){
			return this.camera;
		}

		// getControls(){
			// return this.controls;
		// }
	}

}
