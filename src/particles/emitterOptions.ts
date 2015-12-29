/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='./valueTypes.ts'/>

module GpuParticles {

	// https://docs.unrealengine.com/latest/INT/Engine/Rendering/ParticleSystems/Reference/index.html

	export interface EmitterOptions {
		name: string,
		enabled: boolean,
		emitterRotation: ValueWithDistribution<THREE.Vector3>,
		emitterPosition: ValueWithDistribution<THREE.Vector3>,

		// per particle values
		// TODO size by speed works per axis, giving pseudo motion blur
		lifetime:        ValueWithDistribution<number>,
		initialPosition: ValueWithDistribution<THREE.Vector3>,
		initialRotation: ValueWithDistribution<THREE.Vector3>,
		rotationalVelocity: ValueWithDistribution<THREE.Vector3>,
		initialVelocity: ValueWithDistribution<THREE.Vector3>,
		turbulenceOverLife: ValueWithDistribution<StartEndRange<number>>, // turbulence
		sizeOverLife:    ValueWithDistribution<StartEndRange<number>>,
		sizeBySpeed:     ValueWithDistribution<THREE.Vector2>,
		constantAcceleration: ValueWithDistribution<THREE.Vector3>,
		colorOverLife:   ValueWithDistribution<StartEndRange<ParticleColor>>,
		opacityOverLife: ValueWithDistribution<StartEndRange<number>>,
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

}
