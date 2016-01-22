/// <reference path='../typings/tsd.d.ts'/>
/// <reference path="./particles/emitterOptions.ts"/>
/// <reference path="./particles/valueTypes.ts"/>

// import ValueWithDistribution = GpuParticles.ValueWithDistribution;
// import StartEndRange = GpuParticles.StartEndRange;

const config = {

	background: new THREE.Color(0x2a2a2a),
	width: width,
	height: height,

	camera: {
		name: 'camera',
		angle: 28, // 45
		near: 0.1,
		far: 10000,
		aspect: () => {
			return width() / height();
		},
		position: new THREE.Vector3(0, 0, 100),
		lookAt: new THREE.Vector3()
	},

	particles: {
		noiseTexture: 'vendor/textures/perlin-512.png',
		spriteTexture: 'vendor/textures/particle2.png',
		simulationShader: 'shaders/particleSim.shader',
		emitters: [
			{
				name: 'fire projectile',
				count: 1000,
				spawnRate: 100,
				// sizeOverLife: new ValueWithDistribution(new StartEndRange(0.12, 0.93), 0.5),
				sizeOverLife: {range: {start: 0.2, end: 1.0}},
				initialVelocity: {value: 0.0, distribution: 30.0}, // [0..255]
				turbulenceOverLife: {range: {start: 0.0, end: 1.0}, distribution: 0.0}, // [0..1]
				opacityOverLife: {range: {start: 1.0, end: 0.3}},

				horizontalSpeed: 1.5, // used for elipsis
				verticalSpeed:  1.33, // used for elipsis
				emitterPosition: function (clockDeltaData: App.ClockDeltaData): THREE.Vector3 {
					return new THREE.Vector3(
						Math.sin(clockDeltaData.timeFromSimulationStart * this.horizontalSpeed) * 20,
						Math.sin(clockDeltaData.timeFromSimulationStart * this.verticalSpeed) * 10,
						Math.sin(clockDeltaData.timeFromSimulationStart * this.horizontalSpeed + this.verticalSpeed) * 5
					);
				}
			}
		],

	},

	fog: {
		enabled: false,
		color: 0xf0f0f0,
		density: 0.0005
	}
};

function width(){
	// window.innerWidth, window.innerHeight
	return document.documentElement.clientWidth;
}

function height(){
	return document.documentElement.clientHeight;
}
