/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../utils/utils.ts'/>
/// <reference path="./valueTypes.ts"/>

module GpuParticles {

	type BufferAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

	export class Emitter extends THREE.Object3D {

		// general
		opt: EmitterOptions;
		/** time in simulation */
		private time: number;
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
		private posStartAndTimeAttr: BufferAttr;
		private miscDataAttr:   BufferAttr;


		constructor(){
			super();
			this.time = 0;
			this.particleIterator = 0;
			this.particleUpdate = false;
			this.offset = 0;
			this.count = 0;
		}

		init(opt: EmitterOptions, material:THREE.ShaderMaterial) {
			this.setEmitterOptions(opt, true);
			this.particleUpdate = false;

			this.initBuffers();

			this.particleShaderGeom = new THREE.BufferGeometry();
		  this.particleShaderGeom.addAttribute('position', new THREE.BufferAttribute(this.particleVertices, 3));
		  this.particleShaderGeom.addAttribute('particlePositionAndTime', new THREE.BufferAttribute(this.particlePositionAndTime, 4).setDynamic(true));
		  this.particleShaderGeom.addAttribute('particleMiscData', new THREE.BufferAttribute(this.particleMiscData, 4).setDynamic(true));
		  this.posStartAndTimeAttr = this.particleShaderGeom.getAttribute('particlePositionAndTime')
		  this.miscDataAttr        = this.particleShaderGeom.getAttribute('particleMiscData');

			this.particleShaderMat = material;
			this.particlePointsObject = new THREE.Points(this.particleShaderGeom, this.particleShaderMat);
			this.particlePointsObject.frustumCulled = false;
			this.add(this.particlePointsObject);
		}

		setEmitterOptions(opt: EmitterOptions, replace?: boolean): void {
			let prevOpt = replace ? this.getParticleSystem().defaultSpawnOptions() : this.opt;
			this.opt = _.extend({}, prevOpt, opt);
			this.visible = this.opt.visible;
		}

		private initBuffers() {
			// new hyper compressed attributes
			var particleVertices        = new Float32Array(this.getParticleCount() * 3), // x,y,z
					particlePositionAndTime = new Float32Array(this.getParticleCount() * 4), // x,y,z,time
					particleMiscData        = new Float32Array(this.getParticleCount() * 4); // velocity, color, size, lifespan

			for (let i = 0; i < this.getParticleCount(); i++) {
				let vcsl = [Utils.decodeFloat(128, 128, 0, 0), Utils.decodeFloat(0, 254, 0, 254), 1,0];
				Utils.fillParticleDataOnIdx(particlePositionAndTime, i*4, [100,0,0,0]);
				Utils.fillParticleDataOnIdx(particleVertices,        i*3, [0,0,0]);
				Utils.fillParticleDataOnIdx(particleMiscData,        i*4, vcsl);
			}

			this.particleVertices = particleVertices;
			this.particlePositionAndTime = particlePositionAndTime;
			this.particleMiscData = particleMiscData;
		}

		/**
		 * Create new particle based on this emitter's options. If no place for
		 * new particle's data is found, some old one is removed
		 */
		spawnParticle(options: any) {
			let maxVel = 2, // TODO put somewhere in config
					maxSource = 250, // TODO put somewhere in config
					rand = Math.random,
					randDistrValProvider = valueProviderFromRand(rand);

			let i = this.particleIterator; // next free slot

			///
			/// TODO remove old system
			///
			rand = () => {return Math.random() - .5; };
			let opt = _.clone(config.particles.spawnOptions);
			if (options !== undefined) {
				opt = _.extend(opt, options);
			}
			// positions & startTime
			let posStartAndTimeAttrValues = [
						opt.position.x + ((rand()) * opt.positionRandomness),
						opt.position.y + ((rand()) * opt.positionRandomness),
						opt.position.z + ((rand()) * opt.positionRandomness),
						this.time + (rand() * 2e-2)
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
			///
			/// END remove old system
			///

			/*
			// positions & startTime
			let pos  = randDistrValProvider(this.opt.initialPosition),
					time = this.time + ((rand() - 0.5) * 2e-2),
					posStartAndTimeAttrValues = [pos.x, pos.y, pos.z, time];
			// velocity, forces
			let turbulence = randDistrValProvider(this.opt.turbulenceOverLife),
					vel        = randDistrValProvider(this.opt.initialVelocity),
					normVelVal = (val) => { // clamp to 0..1
						let mod = (val + maxVel) / (maxVel + maxVel);
						return Math.floor(maxSource * mod);
					};
			vel.set(normVelVal(vel.x), normVelVal(vel.y), normVelVal(vel.z));
			// color
			let col = randDistrValProvider(this.opt.colorOverLife),
					normColorVal = (colV) => {
						return Math.max(0, Math.min(254, Math.floor(colV)));
					};
			col = col.startValue(); // TODO fix here
			col.set(normColorVal(col.x), normColorVal(col.y), normColorVal(col.z));

			let vcsl = [
				Utils.decodeFloat(vel.x, vel.y, vel.z, turbulence),
				Utils.decodeFloat(col.x, col.y, col.z, 254),
				5.0,2.0 // TODO use options
				// opt.size + (rand()) * opt.sizeRandomness,
				// opt.lifetime
			];
			*/

			if (this.posStartAndTimeAttr instanceof THREE.BufferAttribute) {
				var posStartArr = (<THREE.BufferAttribute> this.posStartAndTimeAttr).array,
						velColArr   = (<THREE.BufferAttribute> this.miscDataAttr).array;
			} else if (this.posStartAndTimeAttr instanceof THREE.InterleavedBufferAttribute){
				var posStartArr = (<THREE.InterleavedBufferAttribute> this.posStartAndTimeAttr).data.array,
						velColArr   = (<THREE.InterleavedBufferAttribute> this.miscDataAttr).data.array;
			} else {
				throw "Could not spawn particle - unknown buffer type";
			}
			Utils.fillParticleDataOnIdx(posStartArr, i*4, posStartAndTimeAttrValues);
			Utils.fillParticleDataOnIdx(velColArr,   i*4, vcsl);


			if (this.offset === 0) {
				this.offset = this.getParticleCount();
			}
			++this.count;
			++this.particleIterator;
			this.particleIterator = this.particleIterator >= this.getParticleCount() ? 0 : this.particleIterator;

			this.particleUpdate = true;
		}

		update(time) {
			this.time = time;
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
			if (this.posStartAndTimeAttr instanceof THREE.BufferAttribute) {
				posStartData = <THREE.BufferAttribute> this.posStartAndTimeAttr;
				velColData   = <THREE.BufferAttribute> this.miscDataAttr;
			} else if (this.posStartAndTimeAttr instanceof THREE.InterleavedBufferAttribute){
				posStartData = (<THREE.InterleavedBufferAttribute> this.posStartAndTimeAttr).data;
				velColData   = (<THREE.InterleavedBufferAttribute> this.miscDataAttr).data;
			} else {
				throw "Could not spawn particle - unknown buffer type";
			}
			// if we can get away with a partial buffer update, do so
			if (this.offset + this.count < this.getParticleCount()) {
        posStartData.updateRange.offset = velColData.updateRange.offset = this.offset * 4;
        posStartData.updateRange.count  = velColData.updateRange.count  = this.count * 4;
      } else {
        posStartData.updateRange.offset = 0;
        posStartData.updateRange.count  = velColData.updateRange.count = this.getParticleCount() * 4;
      }

      posStartData.needsUpdate = true;
      velColData.needsUpdate = true;

      this.offset = 0;
      this.count = 0;
	  }

		getParticleSystem(): GpuParticles{
			return <GpuParticles>this.parent;
		}

		private getParticleCount(): number{
			return this.opt.count;
		}
	}

}
