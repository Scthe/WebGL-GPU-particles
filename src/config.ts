/// <reference path='../typings/tsd.d.ts'/>

const config = {
	camera: {
		angle: 45,
		near: 0.1,
		far: 10000,
		aspect: () => {
			return width() / height();
		},
		position: new THREE.Vector3(0, 0, 100),
		lookAt: new THREE.Vector3()
	},
	lights: [
		{
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
		}
	],
	fog: {
		color: 0xf0f0f0,
		density: 0.0005
	},
	background: new THREE.Color(0xe3e3e3),
	width: width,
	height: height
};

function width(){
	// window.innerWidth, window.innerHeight
	return document.documentElement.clientWidth;
}

function height(){
	return document.documentElement.clientHeight;
}


// export config;
