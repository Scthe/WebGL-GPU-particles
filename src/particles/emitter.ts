/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../utils/utils.ts'/>
/// <reference path="./valueTypes.ts"/>

module GpuParticles {

	interface BufferAttrData {
		needsUpdate: boolean,
		array: ArrayLike<number>,
		updateRange: {
			count: number,
			offset: number
		}
	};

	export class Emitter extends THREE.Object3D {

		// general
		opt: EmitterOptions;
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
		private posStartAndTimeAttr: BufferAttrData;
		private miscDataAttr:        BufferAttrData;


		constructor(){
			super();
			this.particleIterator = 0;
			this.particleUpdate = false;
			this.offset = 0;
			this.count = 0;
		}

		init(opt: EmitterOptions, material:THREE.ShaderMaterial) {
			this.setEmitterOptions(opt, true);
			this.particleUpdate = false;

			this.initBuffers();

			type BufferAttr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
			this.particleShaderGeom = new THREE.BufferGeometry();
		  this.particleShaderGeom.addAttribute('position', new THREE.BufferAttribute(this.particleVertices, 3));
		  this.particleShaderGeom.addAttribute('particlePositionAndTime', new THREE.BufferAttribute(this.particlePositionAndTime, 4).setDynamic(true));
		  this.particleShaderGeom.addAttribute('particleMiscData', new THREE.BufferAttribute(this.particleMiscData, 4).setDynamic(true));
		  this.posStartAndTimeAttr = toBufferAttrData(this.particleShaderGeom.getAttribute('particlePositionAndTime'))
		  this.miscDataAttr        = toBufferAttrData(this.particleShaderGeom.getAttribute('particleMiscData'));

			this.particleShaderMat = material;
			this.particlePointsObject = new THREE.Points(this.particleShaderGeom, this.particleShaderMat);
			this.particlePointsObject.frustumCulled = false;
			this.add(this.particlePointsObject);

			function toBufferAttrData(bufferAttr: BufferAttr): BufferAttrData {
				return bufferAttr instanceof THREE.BufferAttribute? bufferAttr : (<THREE.InterleavedBufferAttribute>bufferAttr).data;
			}
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
				let vcsl = [Utils.encodeUint8VectorAsFloat(128, 128, 0, 0), Utils.encodeUint8VectorAsFloat(0, 254, 0, 254), 1,0];
				Utils.copyArrInto(particlePositionAndTime, i*4, [100,0,0,0]);
				Utils.copyArrInto(particleVertices,        i*3, [0,0,0]);
				Utils.copyArrInto(particleMiscData,        i*4, vcsl);
			}

			this.particleVertices = particleVertices;
			this.particlePositionAndTime = particlePositionAndTime;
			this.particleMiscData = particleMiscData;
		}

		/**
		 * Create new particle based on this emitter's options. If no place for
		 * new particle's data is found, some old one is removed
		 */
		spawnParticle(particleSysTime: number) {
			let maxVel = 2, // TODO put somewhere in config
					maxSource = 250, // TODO put somewhere in config
					rand = Math.random,
					valueReader = valueReaderProvider(rand);

			let i = this.particleIterator; // next free slot

			// positions & spawnTime
			let emitterPosition: THREE.Vector3 = valueReader(this.opt.emitterPosition, {ifFunctionThenArgs: [particleSysTime, this.opt]} ),
					pos            : THREE.Vector3 = valueReader(this.opt.initialPosition).add(emitterPosition),
					posStartAndTimeAttrValues = [pos.x, pos.y, pos.z, particleSysTime];
			// velocity, forces, color
			let turbulence: number = valueReader(this.opt.turbulenceOverLife).startValue(), // TODO fix here
					vel: THREE.Vector3 = valueReader(this.opt.initialVelocity),
					col: THREE.Color   = valueReader(this.opt.colorOverLife, {isColor: true}).startValue(); // TODO fix here

			// apply normalizations when needed
			let normVelVal = (val) => { // ? clamp to 0..1 ?
						let mod = (val + maxVel) / (maxVel + maxVel);
						return Math.floor(maxSource * mod);
					};
			vel.set(normVelVal(vel.x), normVelVal(vel.y), normVelVal(vel.z));

			let vcsl = [
				Utils.encodeUint8VectorAsFloat(vel.x, vel.y, vel.z, turbulence),
				Utils.encodeUint8VectorAsFloat(col.r, col.g, col.b, 254),
				valueReader(this.opt.sizeOverLife).startValue(), // TODO fix here
				valueReader(this.opt.lifetime)
			];

			Utils.copyArrInto(this.posStartAndTimeAttr.array, i*4, posStartAndTimeAttrValues);
			Utils.copyArrInto(this.miscDataAttr.array,   i*4, vcsl);


			if (this.offset === 0) {
				this.offset = this.getParticleCount();
			}
			++this.count;
			++this.particleIterator;
			this.particleIterator = this.particleIterator >= this.getParticleCount() ? 0 : this.particleIterator;

			this.particleUpdate = true;
		}

		update(time) {
			this.geometryUpdate();
		}

		private geometryUpdate() {
			if (!this.particleUpdate) return;
      this.particleUpdate = false;

			// set the range of values that is dirty
			// if we can get away with a partial buffer update, do so
			let posDirtyRange  = this.posStartAndTimeAttr.updateRange,
					miscDirtyRange = this.miscDataAttr.updateRange;
			if (this.offset + this.count < this.getParticleCount()) {
        posDirtyRange.offset = miscDirtyRange.offset = this.offset * 4;
        posDirtyRange.count  = miscDirtyRange.count  = this.count * 4;
      } else {
        posDirtyRange.offset = 0;
        posDirtyRange.count  = miscDirtyRange.count = this.getParticleCount() * 4;
      }
      this.posStartAndTimeAttr.needsUpdate = true;
      this.miscDataAttr.needsUpdate = true;

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
