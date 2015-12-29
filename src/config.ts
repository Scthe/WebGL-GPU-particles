/// <reference path='../typings/tsd.d.ts'/>
/// <reference path="./particles/emitterOptions.ts"/>
/// <reference path="./particles/valueTypes.ts"/>

// TODO type ValueWithDistribution<T> = GpuParticles.ValueWithDistribution<T>;
// type StartEndRange<T> = GpuParticles.StartEndRange<T>;

const config = {

	background: new THREE.Color(0x404040),
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

	lights: [
		/*{
			name: 'light_1',
			intensity: 1.0,
			distance: 2200,
			color: 0xffffff,
			position: new THREE.Vector3(570, 420, 80)
		}, {
			name: 'light_2',
			color: 0xebc3a1,
			intensity: 0.35,
			distance: 2100,
			decay: 0.5,
			position: new THREE.Vector3(-400, 375, 130)
		}, {
			name: 'light_3',
			color: 0xa1c8eb,
			intensity: 0.15,
			distance: 2100,
			decay: 0.6,
			position: new THREE.Vector3(-150, 40, -420)
		}*/
	],

	particles: {
		timeScale: 1,
		noiseTexture: 'vendor/textures/perlin-512.png',
		spriteTexture: 'vendor/textures/particle2.png',
		simulationShader: 'shaders/particleSim.shader',
		emitters: [
			{
				name: 'fire projectile',
				count: 1000,
				spawnRate: 100,
				sizeOverLife: new GpuParticles.ValueWithDistribution(new GpuParticles.StartEndRange(20.0), 1.0),
				turbulenceOverLife: new GpuParticles.ValueWithDistribution(new GpuParticles.StartEndRange(200), 0.0),
				horizontalSpeed: 1.5, // used for elipsis
				verticalSpeed:  1.33, // used for elipsis
				emitterPosition: (tick: number, opt: any): THREE.Vector3 => {
					return new THREE.Vector3(
						Math.sin(tick * opt.horizontalSpeed) * 20,
						Math.sin(tick * opt.verticalSpeed) * 10,
						Math.sin(tick * opt.horizontalSpeed + opt.verticalSpeed) * 5
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


// export config;
