/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='./valueTypes.ts'/>

module GpuParticles {

	// https://docs.unrealengine.com/latest/INT/Engine/Rendering/ParticleSystems/Reference/index.html

	export interface EmitterOptions {
		name: string;
		visible: boolean;
		count: number;
		spawnRate: number;
		// emitterRotation: THREE.Vector3;
		emitterPosition: Function | THREE.Vector3;
		// constantAcceleration: THREE.Vector3;

		// per particle values
		// TODO allow not only ValueWithDistribution but raw values too
		// TODO size by speed works per axis, giving pseudo motion blur
		lifetime:             number | ValueWithDistribution<number>;
		initialPosition:      THREE.Vector3 | ValueWithDistribution<THREE.Vector3>;
		// initialRotation:      THREE.Vector3 | ValueWithDistribution<THREE.Vector3>;
		// rotationalVelocity:   THREE.Vector3 | ValueWithDistribution<THREE.Vector3>;
		initialVelocity:      THREE.Vector3 | ValueWithDistribution<THREE.Vector3>;
		turbulenceOverLife:   number | StartEndRange<number> | ValueWithDistribution<StartEndRange<number>>;
		sizeOverLife:         number | StartEndRange<number> | ValueWithDistribution<StartEndRange<number>>;
		// sizeBySpeed:          THREE.Vector2 | ValueWithDistribution<THREE.Vector2>;
		colorOverLife:        ParticleColor | StartEndRange<ParticleColor> | ValueWithDistribution<StartEndRange<ParticleColor>>;
		opacityOverLife:      number | StartEndRange<number> | ValueWithDistribution<StartEndRange<number>>;
		/*
		cameraOffset: {
			// see https://docs.unrealengine.com/latest/INT/Engine/Rendering/ParticleSystems/Reference/Modules/Camera/index.html
			// (it is just offset relative to camera, along depth axis)
			initialValue: number,
			scale: number
		},
		orbit: {
			chainMode: Enum{ ADD, SCALE, REPLACE},
			radius: ValueWithDistribution<number>,
			velocity: ValueWithDistribution<THREE.Vector3>,
		},
		collision: {
			damping: ValueWithDistribution<number>,
			maxCollisionDistance: number,
			iterations: number,
		}
		*/

	}

	export function unifyInternalRepresentation(opt: EmitterOptions): EmitterOptions {
		opt.lifetime        = wrapInVWD(opt.lifetime);
		opt.initialPosition = wrapInVWD(opt.initialPosition);
		opt.initialVelocity = wrapInVWD(opt.initialVelocity);
		opt.turbulenceOverLife = wrapInVWD_SER(opt.turbulenceOverLife);
		opt.sizeOverLife       = wrapInVWD_SER(opt.sizeOverLife);
		opt.colorOverLife      = unifyColorRepresentation(opt.colorOverLife);
		opt.opacityOverLife    = wrapInVWD_SER(opt.opacityOverLife);
		return opt;
	}

	function wrapInVWD(val: any): any{
		return getValueTypeName(val) === 'ValueWithDistribution' ?
		val : new ValueWithDistribution(val);
	}

	function wrapInVWD_SER(val: any): any {
		let type = getValueTypeName(val);

		if (type === 'number'){
			return new ValueWithDistribution(new StartEndRange(val));
		} else if (type === 'Color'){
			val = new THREE.Color(val);
			return new ValueWithDistribution(new StartEndRange(val));
		} else if (type === 'StartEndRange'){
			return new ValueWithDistribution(val);
		} else if (type === 'ValueWithDistribution'){
			return val;
		} else {
			throw 'Error trying to unify config representation';
		}
	}

	function unifyColorRepresentation(val: any): ValueWithDistribution<StartEndRange<THREE.Color>> {
		let type = getValueTypeName(val);
		console.log(val)

		if (type === 'number'){
			return unifyColorRepresentation(new THREE.Color(val));
		} else if (type === 'Color'){
			val = new THREE.Color(val);
			return new ValueWithDistribution(new StartEndRange(val));
		} else if (type === 'StartEndRange'){
			val._startValue = new THREE.Color(val.startValue());
			val._endValue = new THREE.Color(val.endValue());
			return new ValueWithDistribution(val);
		} else if (type === 'ValueWithDistribution'){
			let v = unifyColorRepresentation(val.value);
			v.distribution = val.distribution;
			return v;
		} else {
			throw 'Error trying to unify color representation';
		}
	}

}
