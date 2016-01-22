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
		lifetime: ValueFactory2<number>,
		initialPosition:    ValueFactory2<THREE.Vector3>,
		// initialRotation:    ValueFactory2<THREE.Vector3>,
		// rotationalVelocity: ValueFactory2<THREE.Vector3>,
		initialVelocity:    ValueFactory2<THREE.Vector3>,
		turbulenceOverLife: ValueFactory2<number>,
		sizeOverLife:       ValueFactory2<number>,
		// sizeBySpeed:        ValueFactory2<THREE.Vector2>, // TODO works per axis, giving pseudo motion blur
		colorOverLife:      ValueFactory2<THREE.Color>,
		opacityOverLife:    ValueFactory2<number>,

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

	// export interface EmitterConfig extends EmitterData<ValueLens>{}

	// export interface EmitterOptions extends EmitterData<ValueFactory2>{}

	// export function emitterOptionsFromConfig(cfg: EmitterConfig): EmitterOptions {
	export function emitterOptionsFromConfig(cfg: any): EmitterOptions {
		var emitterOpt: EmitterOptions = { // TODO move to particle system?
			name: cfg.name,
			visible: cfg.visible,
			count: cfg.count,
			spawnRate: cfg.spawnRate,
			emitterPosition: cfg.emitterPosition,

			lifetime : new ValueFactory2<number>(ValueTypes2.NUMBER),
			initialPosition    : new ValueFactory2<THREE.Vector3>(ValueTypes2.VECTOR3),
			initialVelocity    : new ValueFactory2<THREE.Vector3>(ValueTypes2.VECTOR3, {clampMin: -127, clampMax: 127}), // TODO what if initVel.value=[400,0,]
			turbulenceOverLife : new ValueFactory2<number>(ValueTypes2.NUMBER, {isInt: true, mul: 255, clampMin: 0, clampMax: 255}),
			sizeOverLife       : new ValueFactory2<number>(ValueTypes2.NUMBER, {isInt: true, mul: 255, clampMin: 0, clampMax: 255}),
			opacityOverLife    : new ValueFactory2<number>(ValueTypes2.NUMBER, {isInt: true, mul: 255, clampMin: 0, clampMax: 255}),
			colorOverLife      : new ValueFactory2<THREE.Color>(ValueTypes2.COLOR),
		}

		let valueProperties = ['lifetime', 'initialPosition', 'initialVelocity', 'turbulenceOverLife', 'sizeOverLife', 'opacityOverLife', 'colorOverLife'];

		_.each(valueProperties, (vpName) => {
			let vCfg: ValueLens<any> = cfg[vpName],
			    vf: ValueFactory2<any> = emitterOpt[vpName];
			    // eLens = e[vpName].getValueLens();

			// e[vpName].setBaseValue(); = vCfg.distribution || 0.0;
			// e[vpName].distribution = vCfg.distribution || 0.0;
			vf.setBaseValue(getValueFromValueLens(vCfg));
			vf.setDistribution(vCfg.distribution || 0.0);
		});

		return emitterOpt;
	}

	function getValueFromValueLens(vl: ValueLens<any>): any{
		return (vl.range !== undefined)? new StartEndValues(vl.range.start, vl.range.end) : vl.value;
	}
}
