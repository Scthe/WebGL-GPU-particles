/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../config.ts'/>
/// <reference path='./emitter.ts'/>

module GpuParticles {

	type BufferAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

	let defaultParticleSpawnOptions: EmitterOptions = {
		name: 'particle emitter',
		visible: true,
		count: 1000,
		spawnRate: 100,
		emitterRotation: new THREE.Vector3(),
		emitterPosition: new THREE.Vector3(), // TODO replace with function

		// per particle values
		lifetime:                 new ValueWithDistribution(2.0, 0.5),
		initialPosition:          new ValueWithDistribution(new THREE.Vector3(), 0.3),
		// initialRotation: new ValueWithDistribution(new THREE.Vector3(), 0.3),
		// rotationalVelocity: ValueWithDistribution<THREE.Vector3>,
		initialVelocity:          new ValueWithDistribution(new THREE.Vector3(), 0.5),
		turbulenceOverLife:       new ValueWithDistribution(new StartEndRange(127, 127), 0.0),
		sizeOverLife:    new ValueWithDistribution(new StartEndRange(5.0), 1.0),
		// sizeBySpeed:     new ValueWithDistribution<THREE.Vector2>,
		// constantAcceleration: new ValueWithDistribution<THREE.Vector3>,
		colorOverLife:   new ValueWithDistribution(new StartEndRange(new THREE.Vector3(230, 90, 70)), 0.2),
		// opacityOverLife: new ValueWithDistribution<StartEndRange<number>>,
	};


	export class GpuParticles extends THREE.Object3D {

		// TODO for gui add editableProperties: ['','',..]

		private cfg: any;
		private emiters: Emitter[];
		private particleShaderMat: THREE.ShaderMaterial;
		private posStartAndTimeAttr: BufferAttr;
		private miscDataAttr:   BufferAttr;


		constructor(){
			super();
			this.cfg = config.particles;
			this.emiters = [new Emitter()];
		}

		init(shaderLoader: Utils.ShaderLoader) {
			let materialPromise = this.createBaseMaterial(shaderLoader),
					particlesCreated = materialPromise.then((material) => {
						this.particleShaderMat = material;

						_.each(this.emiters, (emitter) => {
							this.add(emitter); // this will set parent property
							emitter.init(defaultParticleSpawnOptions, material);
						})
					});

			return particlesCreated;
		}

		defaultSpawnOptions(): EmitterOptions{
			return defaultParticleSpawnOptions;
		}

		private createBaseMaterial(shaderLoader: Utils.ShaderLoader): Q.Promise<THREE.ShaderMaterial> {
			let particleNoiseTex  = THREE.ImageUtils.loadTexture(this.cfg.system.noiseTexture),
			    particleSpriteTex = THREE.ImageUtils.loadTexture(this.cfg.system.spriteTexture);
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

			let materialCreatedPromise = shaderLoader.load(this.cfg.system.simulationShader)
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

		update(delta: number, time: number) {
			delta = delta * this.cfg.system.timeScale;

			this.particleShaderMat.uniforms['uTime'].value = time;

			if (delta > 0) {
				_.each(this.emiters, emitter => { this.updateEmiter(delta, time, emitter); });
			}
		}

		private updateEmiter (delta: number, time: number, emitter: Emitter): void {
			if (!emitter.visible) return;

			// TODO move inside emitter
			let newPosition = this.cfg.position(time, this.cfg.system);
			let newOpt = {
				position: newPosition
			};

			for (var x = 0; x < emitter.opt.spawnRate * delta; x++) {
				emitter.spawnParticle(newOpt);
			}

			emitter.update(time);
		};

	}

}
