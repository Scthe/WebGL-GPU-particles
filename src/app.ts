/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./gpuParticles.ts"/>

module App {

	export class App {

		private loadedDefer: Q.Deferred<THREE.Scene>;
		private camera;
		private clock: THREE.Clock;
		private tick: number;
		private particleSystem: GpuParticles.GpuParticles;

		constructor(){
			// console.log('App()');

			this.loadedDefer = Q.defer<THREE.Scene>();
		}

		init(scene: THREE.Scene): Q.Promise<THREE.Scene> {
			this.clock = new THREE.Clock(true)
			this.tick = 0;

			// camera
			var cameraOpt = config.camera;
			this.camera = new THREE.PerspectiveCamera(
				28, //cameraOpt.angle,
				cameraOpt.aspect(),
				cameraOpt.near,
				cameraOpt.far);
			this.camera.name = 'camera';
			// this.camera.lookAt(cameraOpt.lookAt);
			// this.camera.position.setVector(cameraOpt.position);
			this.camera.position.setZ(100); // TODO

			// this.controls = new THREE.OrbitControls(this.camera);

			/*
			var sphereMaterial = new THREE.MeshLambertMaterial({
				color: 0xCC0000
			});
			var radius = 50, segments = 16, rings = 16;
			this.sphere = new THREE.Mesh(
				new THREE.SphereGeometry(radius, segments, rings),
				sphereMaterial);
			*/

			// light
/*
			var lightCfg = config.lights;
			_.each(lightCfg, (lCfg) => {
				var pointLight = new THREE.PointLight(lCfg.color);
				pointLight.name = lCfg.name;
				// pointLight.position.setVector(lCfg.position);

				var props = ['intensity', 'distance', 'decay'];
				_.each(props, p => {
					if(lCfg.hasOwnProperty(p)){
						pointLight[p] = lCfg[p];
					}
				});

				scene.add(pointLight);
			});
			*/

			// scene.fog = new THREE.FogExp2(config.fog.color, config.fog.density);

			this.particleSystem = new GpuParticles.GpuParticles();
			this.particleSystem.init();
			scene.add(this.particleSystem);

			// scene.add(this.sphere);
			scene.add(this.camera);

			return this.loadedDefer.promise;
		}

		update(){
			// this.controls.update();
			var spawnerOptions = {
				spawnRate: 5000,
				horizontalSpeed: 1.5,
				verticalSpeed: 1.33,
				timeScale: 1
			}

			var delta = this.clock.getDelta() * spawnerOptions.timeScale;
			this.tick = Math.max(this.tick + delta, 0);


			if (delta > 0) {
				var spawnOpt = {
					position: new THREE.Vector3(
						Math.sin(this.tick * spawnerOptions.horizontalSpeed) * 20,
						Math.sin(this.tick * spawnerOptions.verticalSpeed) * 10,
						Math.sin(this.tick * spawnerOptions.horizontalSpeed + spawnerOptions.verticalSpeed) * 5
					)
				};

				for (var x = 0; x < spawnerOptions.spawnRate * delta; x++) {
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
