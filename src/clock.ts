/// <reference path='../typings/tsd.d.ts'/>

module App {

	export interface ClockDeltaData {
		clockStartTime: number;
		delta: number;
		currentTime: number;
		// tickId: number;
	}

	var currentTime = 0,
	    clock;

	export function createClockDeltaData(): ClockDeltaData {
		clock = clock || new THREE.Clock(true);
		let delta = clock.getDelta();
		currentTime += delta;

		let clockDeltaData = {};
		Object.defineProperty(clockDeltaData, 'clockStartTime', {value: clock.startTime })
		Object.defineProperty(clockDeltaData, 'delta',          {value: delta })
		Object.defineProperty(clockDeltaData, 'currentTime',    {value: currentTime })
		return <ClockDeltaData>clockDeltaData;
	}

}
