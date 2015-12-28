/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./app.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./utils/shaderLoader.ts"/>

'use strict';

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

	sceneLoadedPromise.then(() => {
		animloop();
	});
}


function onResize(e) {
	console.log('resize (' + config.width() + 'x' + config.height() + ')');

	let camera = app.getCamera();
	camera.aspect = config.camera.aspect();
	camera.updateProjectionMatrix();

	renderer.setSize(config.width(), config.height());
}

function animloop(){

	if (window.hasOwnProperty('requestAnimFrame')){
		let w: any = window;
		w.requestAnimFrame(animloop);
	}

	app.update();

	renderer.render(scene, app.getCamera());
}

init();
