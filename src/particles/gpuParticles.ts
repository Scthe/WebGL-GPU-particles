/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../config.ts'/>
/// <reference path='./emitter.ts'/>
/// <reference path='../clock.ts'/>

module GpuParticles {

	type BufferAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

	let defaultParticleSpawnOptions: EmitterOptions = {
		name: 'particle emitter',
		visible: true,
		count: 1000,
		spawnRate: 100,
		// emitterRotation: new THREE.Vector3(),
		emitterPosition: new THREE.Vector3(),

		// per particle values
		lifetime:                 new ValueWithDistribution(2.0, 0.5),
		initialPosition:          new ValueWithDistribution(new THREE.Vector3(), 0.3),
		// initialRotation: new ValueWithDistribution(new THREE.Vector3(), 0.3),
		// rotationalVelocity: ValueWithDistribution<THREE.Vector3>,
		initialVelocity:          new ValueWithDistribution(new THREE.Vector3(), 2),
		turbulenceOverLife:       new ValueWithDistribution(new StartEndRange(127, 127), 0.0),
		sizeOverLife:    new ValueWithDistribution(new StartEndRange(5.0, 20.0), 1.0),
		// sizeBySpeed:     new ValueWithDistribution<THREE.Vector2>,
		// constantAcceleration: new ValueWithDistribution<THREE.Vector3>,
		colorOverLife:   new ValueWithDistribution(new StartEndRange(0xE65A46, 0x00FFFF), 0.1),
		opacityOverLife: new StartEndRange(1.0, 0.0)
	};


	export class GpuParticles extends THREE.Object3D {

		private cfg: any;
		private emiters: Emitter[];
		private particleShaderMat: THREE.ShaderMaterial;


		constructor(){
			super();
			this.cfg = config.particles;
			this.emiters = [];
		}

		init(shaderLoader: Utils.ShaderLoader) {
			let materialPromise = this.createBaseMaterial(shaderLoader),
					particlesCreated = materialPromise.then((material) => {
						this.particleShaderMat = material;

						_.each(this.cfg.emitters, (emitterCfg: EmitterOptions) => {
							let emitter = new Emitter();
							this.add(emitter); // this will set parent property
							emitter.init(emitterCfg, material);
							this.emiters.push(emitter);
						})
					});

			return particlesCreated;
		}

		defaultSpawnOptions(): EmitterOptions{
			return defaultParticleSpawnOptions;
		}

		getEmitterOpts(): EmitterOptions[]{
			return _.pluck(this.emiters, 'opt');
		}

		private createBaseMaterial(shaderLoader: Utils.ShaderLoader): Q.Promise<THREE.ShaderMaterial> {
			let particleNoiseTex  = THREE.ImageUtils.loadTexture(this.cfg.noiseTexture),
			    particleSpriteTex = THREE.ImageUtils.loadTexture(this.cfg.spriteTexture);
			particleNoiseTex.wrapS  = particleNoiseTex.wrapT  = THREE.RepeatWrapping;
			particleSpriteTex.wrapS = particleSpriteTex.wrapT = THREE.RepeatWrapping;

			let materialOptions = {
		    transparent: true,
		    depthWrite: false,
		    uniforms: {
		      "uTime": {
		        type: "f",
		        value: 0.0
		      },
		      "uScale": {
		        type: "f",
		        value: 1.0
		      },
		      "tNoise": {
		        type: "t",
		        value: particleNoiseTex
		      },
		      "tSprite": {
		        type: "t",
		        value: particleSpriteTex
		      }
		    },
		    blending: THREE.AdditiveBlending,
		    vertexShader:   '',
		    fragmentShader: ''
		  };

			let materialCreatedPromise = shaderLoader.load(this.cfg.simulationShader)
				.then(shaderTexts => {
					materialOptions.vertexShader = shaderTexts.vertex;
					materialOptions.fragmentShader = shaderTexts.fragment;

					let m = new THREE.ShaderMaterial(materialOptions);
					m.defaultAttributeValues.particlePositionAndTime = [0, 0, 0, 0];
					m.defaultAttributeValues.particleMiscData = [0, 0, 0, 0];

					return m;
				});

			return materialCreatedPromise;
		}

		update(clockDeltaData: App.ClockDeltaData) {
			if (this.particleShaderMat === undefined) return;

			this.particleShaderMat.uniforms['uTime'].value = clockDeltaData.timeFromSimulationStart;

			if (clockDeltaData.delta > 0) {
				_.each(this.emiters, emitter => { this.updateEmiter(clockDeltaData, emitter); });
			}
		}

		private updateEmiter (clockDeltaData: App.ClockDeltaData, emitter: Emitter): void {
			if (!emitter.visible) return;

			for (var x = 0; x < emitter.opt.spawnRate * clockDeltaData.delta; x++) {
				emitter.spawnParticle(clockDeltaData);
			}

			emitter.update(clockDeltaData);
		};

	}

}
