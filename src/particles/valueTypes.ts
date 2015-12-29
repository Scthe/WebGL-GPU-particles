/// <reference path='../../typings/tsd.d.ts'/>

module GpuParticles {

	export type ParticleColor = THREE.Vector3;

	///
	/// Types classes
	///

	export class StartEndRange<T> {
		_startValue: T;
		_endValue: T;

		constructor(startValue: T, endValue?: T){
			this._startValue = startValue;
			this._endValue = endValue;
		}

		startValue(): T { return this._startValue; }
		endValue(): T { return this._endValue !== undefined? this._endValue : this._startValue; }
	}

	export class ValueWithDistribution<T>{
		value: T;
		distribution: number;

		constructor(value: T, distribution?: number){
			this.value = value;
			this.distribution = distribution !== undefined ? distribution : -1.0;
		}
	}

	///
	/// Values providers
	///

	function addRandomNum(randFunction: Function, baseVal: number, distribute: number): number {
		return baseVal + randFunction() * distribute;
	}

	function addRandomV3(randFunction: Function, baseVal: THREE.Vector3, distribute: number): THREE.Vector3 {
		let newCopy = baseVal.clone();
		newCopy.set(
			addRandomNum(randFunction, newCopy.x, distribute),
			addRandomNum(randFunction, newCopy.y, distribute),
			addRandomNum(randFunction, newCopy.z, distribute)
		);
		return newCopy;
	}

	function addRandomV2(randFunction: Function, baseVal: THREE.Vector2, distribute: number): THREE.Vector2 {
		let newCopy = baseVal.clone();
		newCopy.set(
			addRandomNum(randFunction, newCopy.x, distribute),
			addRandomNum(randFunction, newCopy.y, distribute)
		);
		return newCopy;
	}

	function addRandomSER<T>(randFunction: Function, baseVal: StartEndRange<T>, distribute: number): StartEndRange<T> {
		let a: T = addRandom<T>(randFunction, baseVal._startValue, distribute),
				b: T;
		if (baseVal.startValue() === baseVal.endValue()){
			b = a;
		} else {
			b = addRandom<T>(randFunction, baseVal.endValue(),   distribute)
		}
		return new StartEndRange(a, b);
	}

	function addRandom<T>(randFunction: Function, baseVal: T, distribute: number): T {
		if (typeof baseVal === 'number'){
			let val: number = <any>baseVal;
			return <T><any>(addRandomNum(randFunction, val, distribute));
		} else if (baseVal instanceof THREE.Vector3){
			let val: THREE.Vector3 = <any>baseVal;
			return <T><any>(addRandomV3(randFunction, val, distribute));
		} else if (baseVal instanceof THREE.Vector2){
			let val: THREE.Vector2 = <any>baseVal;
			return <T><any>(addRandomV2(randFunction, val, distribute));
		} else if (baseVal instanceof StartEndRange){
			return <T><any>(addRandomSER(randFunction, <any>baseVal, distribute));
		} else {
			throw "Could not randomize particle parameter: " + JSON.stringify(baseVal);
		}
	}

	export function valueProviderFromRand(randFunction: Function): Function{
			let rand2 = () => { // form [0..1] to [-1..1]
				return randFunction() * 2 - 1;
			}
			return <T>(valueWithDistribution: ValueWithDistribution<T>) => {
				return addRandom(rand2, valueWithDistribution.value, valueWithDistribution.distribution);
			}
	}

	export function provideValue<T>(value: T): T {
		return value;
	}

}
