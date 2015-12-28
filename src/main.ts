/// <reference path='app.ts'/>
/// <reference path='config.ts'/>
/// <reference path='../typings/tsd.d.ts'/>

'use strict';

/*
module THREE {
	class Vector3 {
		setVector(v) {
			this.setX(v.x);
			this.setY(v.y);
			this.setZ(v.z);
		}
	}
}
*/

var renderer, scene, app;


function init() {
	console.log('init()');

	renderer = new THREE.WebGLRenderer();
	scene = new THREE.Scene();
	app = new App.App();

	// renderer.setClearColor(config.background);
	renderer.setSize(config.width(), config.height());

	var sceneLoadedPromise = app.init(scene);

	// var ui = new UI();
	// sceneLoadedPromise.then(() => {
		// ui.init(renderer, scene, app);
	// });

	document.body.appendChild(renderer.domElement);

	window.addEventListener('resize', onResize);

	animloop();
}


function onResize(e) {
	console.log('resize (' + config.width() + 'x' + config.height() + ')');

	let camera = app.getCamera();
	camera.aspect = config.camera.aspect();
	camera.updateProjectionMatrix();

	renderer.setSize(config.width(), config.height());
}

interface Aaa{
	requestAnimFrame: Function
}

function animloop(){

	// let w: Aaa = <Aaa>window;
	if (window.hasOwnProperty('requestAnimFrame')){
		let w: any = window;
		w.requestAnimFrame(animloop); // TODO better interop with other browsers
	}

	app.update();

	renderer.render(scene, app.getCamera());

}

init();
