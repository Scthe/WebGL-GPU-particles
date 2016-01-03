/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../utils/utils.ts'/>
/// <reference path="./valueTypes.ts"/>
/// <reference path='../clock.ts'/>

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
		private particleVertices:        Float32Array;
		private particlePositionAndVel:  Float32Array;
		private particleColorData:       Float32Array;
		// object & geom
		private particlePointsObject:THREE.Points;
		private particleShaderMat:   THREE.ShaderMaterial;
		private particleShaderGeom:  THREE.BufferGeometry;
		private posStartAndTimeAttr: BufferAttrData;
		private particleColorAttr:   BufferAttrData;
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
		  this.particleShaderGeom.addAttribute('position', new THREE.BufferAttribute(this.particleVertices, 3).setDynamic(true));
		  this.particleShaderGeom.addAttribute('particlePositionAndVel', new THREE.BufferAttribute(this.particlePositionAndVel, 4).setDynamic(true));
		  this.particleShaderGeom.addAttribute('particleColor', new THREE.BufferAttribute(this.particleColorData, 2).setDynamic(true));
		  this.posStartAndTimeAttr = toBufferAttrData(this.particleShaderGeom.getAttribute('particlePositionAndVel'));
		  this.particleColorAttr   = toBufferAttrData(this.particleShaderGeom.getAttribute('particleColor'));
		  this.miscDataAttr        = toBufferAttrData(this.particleShaderGeom.getAttribute('position'));

			this.particleShaderMat = material;
			this.particlePointsObject = new THREE.Points(this.particleShaderGeom, this.particleShaderMat);
			this.particlePointsObject.frustumCulled = false;
			this.add(this.particlePointsObject);

			function toBufferAttrData(bufferAttr: BufferAttr): BufferAttrData {
				return bufferAttr instanceof THREE.BufferAttribute? bufferAttr : (<THREE.InterleavedBufferAttribute>bufferAttr).data;
			}
		}

		setEmitterOptions(opt: EmitterOptions, replace?: boolean): void {
			let prevOpt = replace ? this.getParticleSystem().defaultSpawnOptions() : this.opt,
			    newOpt = _.extend({}, prevOpt, opt);
			this.opt = unifyInternalRepresentation(newOpt);
			// this.opt = newOpt;
			this.visible = this.opt.visible;
		}

		private initBuffers() {
			// new hyper compressed attributes
      this.particleVertices        = new Float32Array(this.getParticleCount() * 3),
      this.particlePositionAndVel  = new Float32Array(this.getParticleCount() * 4),
      this.particleColorData       = new Float32Array(this.getParticleCount() * 2);

			let colors = [Utils.encodeUint8VectorAsFloat(128, 128, 0,   0),
                    Utils.encodeUint8VectorAsFloat(  0, 254, 0, 254)];
			for (let i = 0; i < this.getParticleCount(); i++) {
				Utils.copyArrInto(this.particlePositionAndVel, i*4, [100,0,0,0]);
				Utils.copyArrInto(this.particleVertices,       i*3, [0,0,0]);
				Utils.copyArrInto(this.particleColorData,      i*2, colors);
			}
		}

		/**
		 * Create new particle based on this emitter's options. If no place for
		 * new particle's data is found, some old one is removed
		 */
		spawnParticle(clockDeltaData: App.ClockDeltaData) {
			let rand = Math.random,
					valueReader = valueReaderProvider(rand);

			let i = this.particleIterator; // next free slot

			// get all values during spawn time
			let emitterPosition: THREE.Vector3   = valueReader(this.opt.emitterPosition, {ifFunctionThenArgs: [this.opt, clockDeltaData]} ),
			    pos            : THREE.Vector3   = valueReader(this.opt.initialPosition).add(emitterPosition),
			    vel            : THREE.Vector3   = valueReader(this.opt.initialVelocity, {min: -127, max: 127}), // TODO what if initVel.value=[400,0,0]
			    col: StartEndRange<THREE.Color>  = valueReader(this.opt.colorOverLife,   {isColor: true, isRange: true}),
			    opacity: StartEndRange<number>   = valueReader(this.opt.opacityOverLife, {isRange: true, isInt: true, mul: 255, min: 0, max: 255}),
			    scale  : StartEndRange<number>   = valueReader(this.opt.sizeOverLife,    {isRange: true, isInt: true}),
			    turbulence: StartEndRange<number>= valueReader(this.opt.turbulenceOverLife, {isRange: true, isInt: true, mul: 255, min: 0, max: 255}),
			    colSt = col.startValue(), colEnd = col.endValue();


      let buf1AttrValues = [
            pos.x, pos.y, pos.z,
            Utils.encodeUint8VectorAsFloat(vel.x + 127, vel.y + 127, vel.z + 127, 0.0)
          ],
          buf2AttrValues = [
            Utils.encodeUint8VectorAsFloat(colSt.r,  colSt.g,  colSt.b,  opacity.startValue()),
            Utils.encodeUint8VectorAsFloat(colEnd.r, colEnd.g, colEnd.b, opacity.endValue())
          ],
				  buf3AttrValues = [
					  clockDeltaData.timeFromSimulationStart,
					  valueReader(this.opt.lifetime),
					  Utils.encodeUint8VectorAsFloat(scale.startValue(),      scale.endValue(),
                                           turbulence.startValue(), turbulence.endValue())
				  ];

      Utils.copyArrInto(this.posStartAndTimeAttr.array, i*4, buf1AttrValues);
      Utils.copyArrInto(this.particleColorAttr.array,   i*2, buf2AttrValues);
			Utils.copyArrInto(this.miscDataAttr.array,        i*3, buf3AttrValues);


			if (this.offset === 0) {
				this.offset = this.getParticleCount();
			}
			++this.count;
			++this.particleIterator;
			this.particleIterator = this.particleIterator >= this.getParticleCount() ? 0 : this.particleIterator;

			this.particleUpdate = true;
		}

		update(clockDeltaData: App.ClockDeltaData) {
			this.geometryUpdate();
		}

		private geometryUpdate() {
			if (!this.particleUpdate) return;
      this.particleUpdate = false;

			// set the range of values that is dirty
			// if we can get away with a partial buffer update, do so
			let posDirtyRange   = this.posStartAndTimeAttr.updateRange,
					colDirtyRange   = this.particleColorAttr.updateRange,
					misc2DirtyRange = this.miscDataAttr.updateRange;
			if (this.offset + this.count < this.getParticleCount()) {
        posDirtyRange.offset   = this.offset * 4;
        posDirtyRange.count    = this.count  * 4;
				colDirtyRange.offset   = this.offset * 2;
				colDirtyRange.count    = this.count  * 2;
				misc2DirtyRange.offset = this.offset * 3;
				misc2DirtyRange.count  = this.count  * 3;
      } else {
        posDirtyRange.offset = 0;
        posDirtyRange.count   = this.getParticleCount() * 4;
				colDirtyRange.count   = this.getParticleCount() * 2;
				misc2DirtyRange.count = this.getParticleCount() * 3;
      }
      this.posStartAndTimeAttr.needsUpdate = true;
      this.particleColorAttr.needsUpdate = true;
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
