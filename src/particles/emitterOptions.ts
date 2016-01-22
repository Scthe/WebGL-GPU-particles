/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='./valueTypes.ts'/>

module GpuParticles {

	// https://docs.unrealengine.com/latest/INT/Engine/Rendering/ParticleSystems/Reference/index.html

	export interface EmitterOptions {
		name: string,
		visible: boolean,
		count: number,
		spawnRate: number,
		// emitterRotation: THREE.Vector3;
		emitterPosition: Function | THREE.Vector3,
		// constantAcceleration: THREE.Vector3;

		// per particle values
		lifetime: ValueFactory<number>,
		initialPosition:    ValueFactory<THREE.Vector3>,
		// initialRotation:    ValueFactory<THREE.Vector3>,
		// rotationalVelocity: ValueFactory<THREE.Vector3>,
		initialVelocity:    ValueFactory<THREE.Vector3>,
		turbulenceOverLife: ValueFactory<number>,
		sizeOverLife:       ValueFactory<number>,
		// sizeBySpeed:        ValueFactory<THREE.Vector2>, // TODO works per axis, giving pseudo motion blur
		colorOverLife:      ValueFactory<THREE.Color>,
		opacityOverLife:    ValueFactory<number>,

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

	export function emitterOptionsFromConfig(cfg: any): EmitterOptions {

		var emitterOpt: EmitterOptions = { // TODO move to particle system?
			name: cfg.name,
			visible: cfg.visible,
			count: cfg.count,
			spawnRate: cfg.spawnRate,
			emitterPosition: cfg.emitterPosition,

			lifetime           : ValueNum('lifetime'),
			initialPosition    : ValueVec3('initialPosition'),
			initialVelocity    : ValueVec3('initialVelocity',   {isInt: true, mul: 254, clampMin: -127, clampMax: 127}), // TODO what if initVel.value=[400,0,]
			turbulenceOverLife : ValueNum('turbulenceOverLife', {isInt: true, mul: 255, clampMin: 0, clampMax: 255}),
			sizeOverLife       : ValueNum('sizeOverLife',       {isInt: true, mul: 255, clampMin: 0, clampMax: 255}),
			opacityOverLife    : ValueNum('opacityOverLife',    {isInt: true, mul: 255, clampMin: 0, clampMax: 255}),
			colorOverLife      : ValueCol('colorOverLife')
		}

		return emitterOpt;

		function ValueNum(prop: string, opt?: ValueTransformOptions){
			return new ValueFactory<number>(ValueType.NUMBER, cfg[prop], opt);
		}

		function ValueVec3(prop: string, opt?: ValueTransformOptions){
			return new ValueFactory<THREE.Vector3>(ValueType.VECTOR3, cfg[prop], opt);
		}

		function ValueCol(prop: string, opt?: ValueTransformOptions){
			return new ValueFactory<THREE.Color>(ValueType.COLOR, cfg[prop], opt);
		}
	}

}
