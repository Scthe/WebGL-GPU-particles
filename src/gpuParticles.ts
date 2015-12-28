/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path='./utils/utils.ts'/>

module GpuParticles {

	type BufferAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

	interface SpawnParticleOptions {
		position?: THREE.Vector3,
		velocity?: THREE.Vector3,
		positionRandomness?: number,
		velocityRandomness?: number,
		color?: number,
		colorRandomness?: number,
		turbulence?: number,
		lifetime?: number,
		size?: number,
		sizeRandomness?: number
	}

	export class GpuParticles extends THREE.Object3D {

		// general
		private cfg: any;
		/** time in simulation */
		private time: number;
		private particleCount: number;
		private particleIterator: number;
		/** if needs updating */
		private particleUpdate: boolean;
		/** used when marking particles as dirty - to minimize updated particles count */
		private offset: number;
		/** used when marking particles as dirty - to minimize updated particles count */
		private count: number;
		// cpu
		private particleVertices:				 Float32Array;  // x,y,z
		private particlePositionAndTime: Float32Array;  // x,y,z,time
		private particleMiscData:        Float32Array;  // velocity, color, size, lifespan
		// object & geom
		private particlePointsObject: THREE.Points;
		private particleShaderMat: THREE.ShaderMaterial;
		private particleShaderGeom: THREE.BufferGeometry;
		private posStartAttr: BufferAttr;
		private velColAttr:   BufferAttr;


		constructor(){
			super();
			this.time = 0;
			this.particleCount = 1000;
			this.particleIterator = 0;
			this.particleUpdate = false;
			this.offset = 0;
			this.count = 0;
			this.cfg = config.particles;
		}

		init(shaderLoader: Utils.ShaderLoader) {
			this.particleCount = this.cfg.system.count;
			this.particleUpdate = false;

			this.initBuffers();

			this.particleShaderGeom = new THREE.BufferGeometry();
		  this.particleShaderGeom.addAttribute('position', new THREE.BufferAttribute(this.particleVertices, 3));
		  this.particleShaderGeom.addAttribute('particlePositionAndTime', new THREE.BufferAttribute(this.particlePositionAndTime, 4).setDynamic(true));
		  this.particleShaderGeom.addAttribute('particleMiscData', new THREE.BufferAttribute(this.particleMiscData, 4).setDynamic(true));
		  this.posStartAttr = this.particleShaderGeom.getAttribute('particlePositionAndTime')
		  this.velColAttr   = this.particleShaderGeom.getAttribute('particleMiscData');

			let materialPromise = this.createMaterial(shaderLoader),
					particlesCreated = materialPromise.then((material) => {
						this.particleShaderMat = material;
						this.particlePointsObject = new THREE.Points(this.particleShaderGeom, this.particleShaderMat);
						this.particlePointsObject.frustumCulled = false;
						this.add(this.particlePointsObject);
					});

			return particlesCreated;
		}

		private createMaterial(shaderLoader: Utils.ShaderLoader): Q.Promise<THREE.ShaderMaterial> {
			var particleNoiseTex  = THREE.ImageUtils.loadTexture(this.cfg.system.noiseTexture),
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

					var m = new THREE.ShaderMaterial(materialOptions);
					m.defaultAttributeValues.particlePositionAndTime = [0, 0, 0, 0];
					m.defaultAttributeValues.particleMiscData = [0, 0, 0, 0];

					return m;
				});

			return materialCreatedPromise;
		}

		private initBuffers() {
			// new hyper compressed attributes
			var particleVertices        = new Float32Array(this.particleCount * 3), // x,y,z
					particlePositionAndTime = new Float32Array(this.particleCount * 4), // x,y,z,time
					particleMiscData        = new Float32Array(this.particleCount * 4); // velocity, color, size, lifespan

			for (let i = 0; i < this.particleCount; i++) {
				let vcsl = [Utils.decodeFloat(128, 128, 0, 0), Utils.decodeFloat(0, 254, 0, 254), 1,0];
				Utils.fillParticleDataOnIdx(particlePositionAndTime, i*4, [100,0,0,0]);
				Utils.fillParticleDataOnIdx(particleVertices,        i*3, [0,0,0]);
				Utils.fillParticleDataOnIdx(particleMiscData,        i*4, vcsl);
			}

			this.particleVertices = particleVertices;
			this.particlePositionAndTime = particlePositionAndTime;
			this.particleMiscData = particleMiscData;
		}

		spawnParticle(options?: SpawnParticleOptions) {
			let maxVel = this.cfg.system.maxVel,
					maxSource = this.cfg.system.maxSource,
					rand = () => {return Math.random() - .5; },
					opt = _.clone(config.particles.spawnOptions);
			if (options !== undefined) {
				opt = _.extend(opt, options);
			}

			let i = this.particleIterator; // next free slot

			// positions
			let posStartAttrValues = [
						opt.position.x + ((rand()) * opt.positionRandomness),
						opt.position.y + ((rand()) * opt.positionRandomness),
						opt.position.z + ((rand()) * opt.positionRandomness),
						this.time + (rand() * 2e-2) //startTime
			];
			// velocity, forces
			let velStartValues = [
				opt.velocity.x + (rand()) * opt.velocityRandomness,
				opt.velocity.y + (rand()) * opt.velocityRandomness,
				opt.velocity.z + (rand()) * opt.velocityRandomness
			];
			velStartValues = _.map(velStartValues, (val) => { // clamp to 0..1
				let mod = (val + maxVel) / (maxVel + maxVel);
				return Math.floor(maxSource * mod);
			});
	    let turbulence = Math.floor(opt.turbulence * 254);
			// color
			let rgb = Utils.hexToRgb(opt.color);
			for (let c = 0; c < rgb.length; c++) {
				let colV = Math.floor(rgb[c] + ((rand()) * opt.colorRandomness) * 254);
				rgb[c] = Math.max(0, Math.min(colV, 254));
			}

			let vcsl = [
				Utils.decodeFloat(velStartValues[0], velStartValues[1], velStartValues[2], turbulence),
				Utils.decodeFloat(rgb[0], rgb[1], rgb[2], 254),
				opt.size + (rand()) * opt.sizeRandomness,
				opt.lifetime
			];

			if (this.posStartAttr instanceof THREE.BufferAttribute) {
				var posStartArr = (<THREE.BufferAttribute> this.posStartAttr).array,
						velColArr   = (<THREE.BufferAttribute> this.velColAttr).array;
			} else if (this.posStartAttr instanceof THREE.InterleavedBufferAttribute){
				var posStartArr = (<THREE.InterleavedBufferAttribute> this.posStartAttr).data.array,
						velColArr   = (<THREE.InterleavedBufferAttribute> this.velColAttr).data.array;
			} else {
				throw "Could not spawn particle - unknown buffer type";
			}
			Utils.fillParticleDataOnIdx(posStartArr, i*4, posStartAttrValues);
			Utils.fillParticleDataOnIdx(velColArr,   i*4, vcsl);


			if (this.offset === 0) {
				this.offset = this.particleCount;
			}
			++this.count;
			++this.particleIterator;
			this.particleIterator = this.particleIterator >= this.particleCount ? 0 : this.particleIterator;

			this.particleUpdate = true;
		}

		update(time) {
			this.time = time;
			this.particleShaderMat.uniforms['uTime'].value = time;

			this.geometryUpdate();
		}

		private geometryUpdate() {
			if (!this.particleUpdate) return;
      this.particleUpdate = false;

			// set the range of values that is dirty
			type BufferData = {
				needsUpdate: boolean,
				updateRange: {
					count: number,
					offset: number
				}
			};
			var posStartData: BufferData, velColData: BufferData;
			if (this.posStartAttr instanceof THREE.BufferAttribute) {
				posStartData = <THREE.BufferAttribute> this.posStartAttr;
				velColData   = <THREE.BufferAttribute> this.velColAttr;
			} else if (this.posStartAttr instanceof THREE.InterleavedBufferAttribute){
				posStartData = (<THREE.InterleavedBufferAttribute> this.posStartAttr).data;
				velColData   = (<THREE.InterleavedBufferAttribute> this.velColAttr).data;
			} else {
				throw "Could not spawn particle - unknown buffer type";
			}
			// if we can get away with a partial buffer update, do so
			if (this.offset + this.count < this.particleCount) {
        posStartData.updateRange.offset = velColData.updateRange.offset = this.offset * 4;
        posStartData.updateRange.count  = velColData.updateRange.count  = this.count * 4;
      } else {
        posStartData.updateRange.offset = 0;
        posStartData.updateRange.count  = velColData.updateRange.count = this.particleCount * 4;
      }

      posStartData.needsUpdate = true;
      velColData.needsUpdate = true;

      this.offset = 0;
      this.count = 0;
	  }

	}

}
