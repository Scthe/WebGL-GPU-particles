/// <reference path='config.ts'/>
/// <reference path='utils.ts'/>
/// <reference path='../typings/tsd.d.ts'/>

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

	var defaultSpawnParticleOptions: SpawnParticleOptions = { // TODO move to config
		position: new THREE.Vector3(),
		velocity: new THREE.Vector3(),
		positionRandomness: 0.3,
		velocityRandomness: 0.5,
		color: 0xE65946,
		colorRandomness: 0.2,
		turbulence: 0.5,
		lifetime: 2.0,
		size: 5.0,
		sizeRandomness: 1.0,
	};

	export class GpuParticles extends THREE.Object3D {

		// general
		private time: number;
		private particleUpdate: boolean;
		private particleCount: number;
		private particleIterator: number;
		private offset: number;
		private count: number;
		private particleShaderMat: THREE.ShaderMaterial;
		private particlePointsObject: THREE.Points;
		// cpu
		private particleVertices:				 Float32Array;  // x,y,z
		private particlePositionAndTime: Float32Array;  // x,y,z,time
		private particleMiscData:        Float32Array;  // velocity, color, size, lifespan
		// gpu
		private particleShaderGeom: THREE.BufferGeometry;
		private posStartAttr: BufferAttr;
		private velColAttr:   BufferAttr;


		constructor(){
			super();
			this.time = 0;
			this.particleUpdate = false;
			this.particleCount = 1000;
			this.particleIterator = 0;
			this.offset = 0;
			this.count = 0;
		}

		// init(width: number, height: number, cameraDistance: number) {
		init() {
			// this._checkRequiredGLCapabilities(this.loadedDefer.reject);
			this.particleUpdate = false;

			this.particleShaderMat = this.createMaterial();

			this.initBuffers();

			this.particleShaderGeom = new THREE.BufferGeometry();
		  this.particleShaderGeom.addAttribute('position', new THREE.BufferAttribute(this.particleVertices, 3));
		  this.particleShaderGeom.addAttribute('particlePositionAndTime', new THREE.BufferAttribute(this.particlePositionAndTime, 4).setDynamic(true));
		  this.particleShaderGeom.addAttribute('particleMiscData', new THREE.BufferAttribute(this.particleMiscData, 4).setDynamic(true));
		  this.posStartAttr = this.particleShaderGeom.getAttribute('particlePositionAndTime')
		  this.velColAttr   = this.particleShaderGeom.getAttribute('particleMiscData');

			this.particlePointsObject = new THREE.Points(this.particleShaderGeom, this.particleShaderMat);
			this.particlePointsObject.frustumCulled = false;
			this.add(this.particlePointsObject);
		}

		private createMaterial() {
			// TODO add 'vendor' prefix?
			var particleNoiseTex  = THREE.ImageUtils.loadTexture("vendor/textures/perlin-512.png"), // TODO move to config
			    particleSpriteTex = THREE.ImageUtils.loadTexture("vendor/textures/particle2.png"); // TODO move to config
			particleNoiseTex.wrapS  = particleNoiseTex.wrapT  = THREE.RepeatWrapping;
			particleSpriteTex.wrapS = particleSpriteTex.wrapT = THREE.RepeatWrapping;

			var m = new THREE.ShaderMaterial({
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
		    vertexShader:   this.vertexShaderText(),
		    fragmentShader: this.fragmentShaderText()
		  });
			m.defaultAttributeValues.particlePositionAndTime = [0, 0, 0, 0];
		  m.defaultAttributeValues.particleMiscData = [0, 0, 0, 0];
			return m;
		}

		private initBuffers() {
			// new hyper compressed attributes
			var particleVertices        = new Float32Array(this.particleCount * 3), // x,y,z
					particlePositionAndTime = new Float32Array(this.particleCount * 4), // x,y,z,time
					particleMiscData        = new Float32Array(this.particleCount * 4); // velocity, color, size, lifespan

			for (let i = 0; i < this.particleCount; i++) {
				let vcsl = [Utils.decodeFloat(128, 128, 0, 0), Utils.decodeFloat(0, 254, 0, 254), 1,0];
				Utils.fillParticleDataOnIdx(particlePositionAndTime, i*4, [100,0,0,0]);
				Utils.fillParticleDataOnIdx(particleVertices,           i*3, [0,0,0]);
				Utils.fillParticleDataOnIdx(particleMiscData,     i*4, vcsl);
			}

			this.particleVertices = particleVertices;
			this.particlePositionAndTime = particlePositionAndTime;
			this.particleMiscData = particleMiscData;
		}

		spawnParticle(options?: SpawnParticleOptions) {
			var maxVel = 2; // TODO move to config
			var maxSource = 250; // TODO move to config
			let rand = () => {return Math.random() - .5; };

			let opt = _.clone(defaultSpawnParticleOptions)
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
				return Math.floor(maxSource * ((val + maxVel) / (maxVel + maxVel)))
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

		geometryUpdate() {
			if (!this.particleUpdate) return;
      this.particleUpdate = false;

			// set the range of values that is dirty
      // if we can get away with a partial buffer update, do so
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

		private vertexShaderText() {
			var vertexShader = [

				'precision highp float;',
				'const vec4 bitSh = vec4(256. * 256. * 256., 256. * 256., 256., 1.);',
				'const vec4 bitMsk = vec4(0.,vec3(1./256.0));',
				'const vec4 bitShifts = vec4(1.) / bitSh;',

				'#define FLOAT_MAX  1.70141184e38',
				'#define FLOAT_MIN  1.17549435e-38',

				'lowp vec4 encode_float(highp float v) {',
				'highp float av = abs(v);',

				'//Handle special cases',
				'if(av < FLOAT_MIN) {',
				'return vec4(0.0, 0.0, 0.0, 0.0);',
				'} else if(v > FLOAT_MAX) {',
				'return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;',
				'} else if(v < -FLOAT_MAX) {',
				'return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;',
				'}',

				'highp vec4 c = vec4(0,0,0,0);',

				'//Compute exponent and mantissa',
				'highp float e = floor(log2(av));',
				'highp float m = av * pow(2.0, -e) - 1.0;',

				//Unpack mantissa
				'c[1] = floor(128.0 * m);',
				'm -= c[1] / 128.0;',
				'c[2] = floor(32768.0 * m);',
				'm -= c[2] / 32768.0;',
				'c[3] = floor(8388608.0 * m);',

				'//Unpack exponent',
				'highp float ebias = e + 127.0;',
				'c[0] = floor(ebias / 2.0);',
				'ebias -= c[0] * 2.0;',
				'c[1] += floor(ebias) * 128.0;',

				'//Unpack sign bit',
				'c[0] += 128.0 * step(0.0, -v);',

				'//Scale back to range',
				'return c / 255.0;',
				'}',

				'vec4 pack(const in float depth)',
				'{',
				'const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);',
				'const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);',
				'vec4 res = fract(depth * bit_shift);',
				'res -= res.xxyz * bit_mask;',
				'return res;',
				'}',

				'float unpack(const in vec4 rgba_depth)',
				'{',
				'const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);',
				'float depth = dot(rgba_depth, bit_shift);',
				'return depth;',
				'}',

				'uniform float uTime;',
				'uniform float uScale;',
				'uniform sampler2D tNoise;',

				'attribute vec4 particlePositionAndTime;',
				'attribute vec4 particleMiscData;',

				'varying vec4 vColor;',
				'varying float lifeLeft;',

				'void main() {',

				'// unpack things from our attributes',
				'vColor = encode_float( particleMiscData.y );',

				'// convert our velocity back into a value we can use',
				'vec4 velTurb = encode_float( particleMiscData.x );',
				'vec3 velocity = vec3( velTurb.xyz );',
				'float turbulence = velTurb.w;',

				'vec3 newPosition;',

				'float timeElapsed = uTime - particlePositionAndTime.a;',

				'lifeLeft = 1. - (timeElapsed / particleMiscData.w);',

				'gl_PointSize = ( uScale * particleMiscData.z ) * lifeLeft;',

				'velocity.x = ( velocity.x - .5 ) * 3.;',
				'velocity.y = ( velocity.y - .5 ) * 3.;',
				'velocity.z = ( velocity.z - .5 ) * 3.;',

				'newPosition = particlePositionAndTime.xyz + ( velocity * 10. ) * ( uTime - particlePositionAndTime.a );',

				'vec3 noise = texture2D( tNoise, vec2( newPosition.x * .015 + (uTime * .05), newPosition.y * .02 + (uTime * .015) )).rgb;',
				'vec3 noiseVel = ( noise.rgb - .5 ) * 30.;',

				'newPosition = mix(newPosition, newPosition + vec3(noiseVel * ( turbulence * 5. ) ), (timeElapsed / particleMiscData.a) );',

				'if( velocity.y > 0. && velocity.y < .05 ) {',
				'lifeLeft = 0.;',
				'}',

				'if( velocity.x < -1.45 ) {',
				'lifeLeft = 0.;',
				'}',

				'if( timeElapsed > 0. ) {',
				'gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );',
				'} else {',
				'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
				'lifeLeft = 0.;',
				'gl_PointSize = 0.;',
				'}',
				'}'

			].join("\n");

			return vertexShader;
		}

		private fragmentShaderText() {
			var fragmentShader = [

				'float scaleLinear(float value, vec2 valueDomain) {',
				'return (value - valueDomain.x) / (valueDomain.y - valueDomain.x);',
				'}',

				'float scaleLinear(float value, vec2 valueDomain, vec2 valueRange) {',
				'return mix(valueRange.x, valueRange.y, scaleLinear(value, valueDomain));',
				'}',

				'varying vec4 vColor;',
				'varying float lifeLeft;',

				'uniform sampler2D tSprite;',

				'void main() {',

				'float alpha = 0.;',

				'if( lifeLeft > .995 ) {',
				'alpha = scaleLinear( lifeLeft, vec2(1., .995), vec2(0., 1.));//mix( 0., 1., ( lifeLeft - .95 ) * 100. ) * .75;',
				'} else {',
				'alpha = lifeLeft * .75;',
				'}',

				'vec4 tex = texture2D( tSprite, gl_PointCoord );',

				'gl_FragColor = vec4( vColor.rgb * tex.a, alpha * tex.a );',
				'}'

			].join("\n");

			return fragmentShader;
		}
	}

}
