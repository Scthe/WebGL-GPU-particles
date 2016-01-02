/// <reference path='../typings/tsd.d.ts'/>

module App {

	export interface ClockDeltaData {
		clockStartTime: number;
		delta: number;
		timeFromSimulationStart: number;
		// tickId: number;
	}

	var timeFromSimulationStart = 0,
	    clock;

	export function createClockDeltaData(): ClockDeltaData {
		clock = clock || new THREE.Clock(true);
		let delta = clock.getDelta();
		timeFromSimulationStart += delta;

		let clockDeltaData = {};
		Object.defineProperty(clockDeltaData, 'clockStartTime', {value: clock.startTime })
		Object.defineProperty(clockDeltaData, 'delta',          {value: delta })
		Object.defineProperty(clockDeltaData, 'timeFromSimulationStart', {value: timeFromSimulationStart })
		return <ClockDeltaData>clockDeltaData;
	}

}
