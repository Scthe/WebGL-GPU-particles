/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./particles/emitterOptions.ts"/>

var dat: any;

module App {

	import VWD = GpuParticles.ValueWithDistribution;
	import SER = GpuParticles.StartEndRange;
	import ParticleColor = GpuParticles.ParticleColor;
	import EmitterOptions = GpuParticles.EmitterOptions;
	type VWD_SER_number = ValueWithDistribution<StartEndRange<number>>;

	export class UI {

		constructor(){
		}

		init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, app: App): void {
			console.log('ui init');
			let cfg = config,
		    gui = new dat.GUI();

			// general
			UI.addColorCtrls(gui, cfg.background, 'background', v => {
				renderer.setClearColor(config.background);
			});

			let emOpts = app.getParticleSystem().getEmitterOpts();
			_.each(emOpts, (v) =>{
				this.addEmitterControls(gui, v);
			});
		}

		addEmitterControls(gui, eOpt: EmitterOptions): void {
			let folder = gui.addFolder(eOpt.name), innerFolder;
			folder.open();

			folder.add(eOpt, 'visible'); // TODO fix
			folder.add(eOpt, 'count', 1000, 1000000); // TODO fix
			folder.add(eOpt, 'spawnRate', 100, 50000);
			UI.addVectorCtrls(folder, '', eOpt.emitterPosition, 500);

			// lifetime
			UI.assertType(eOpt.lifetime, 'ValueWithDistribution');
			let ltVWD: VWD<number> = <any>eOpt.lifetime;
			UI.assertType(ltVWD.value, 'number');
			folder.add(ltVWD, 'value', 0.5, 7).name('lifetime');
			folder.add(ltVWD, 'distribution', 0, 3).name('lifetime rand');

			// initialPosition
			UI.assertType(eOpt.initialPosition, 'ValueWithDistribution');
			let ip: VWD<THREE.Vector3> = <any>eOpt.initialPosition;
			UI.assertType(ip.value, 'Vector3');
			innerFolder = folder.addFolder('Initial particle position');
			UI.addVectorCtrls(innerFolder, '', ip.value, 50);
			innerFolder.add(ip, 'distribution', 0, 3).name('rand');
			// innerFolder.open();

			// initialVelocity
			UI.assertType(eOpt.initialVelocity, 'ValueWithDistribution');
			let iv: VWD<THREE.Vector3> = <any>eOpt.initialVelocity;
			UI.assertType(ip.value, 'Vector3');
			innerFolder = folder.addFolder('Initial Velocity');
			// UI.addVectorCtrls(innerFolder, '', iv.value, 50); // TODO - may require serious changes, see note in emitter.ts
			innerFolder.add(ip, 'distribution', 0, 3).name('rand');
			// innerFolder.open();

			// turbulenceOverLife
			innerFolder = folder.addFolder('turbulence');
			UI.addVWD_SER_number_Ctrls(innerFolder, '', eOpt.turbulenceOverLife);

			// sizeOverLife TODO fix
			innerFolder = folder.addFolder('size');
			UI.addVWD_SER_number_Ctrls(innerFolder, '', eOpt.sizeOverLife);

			// colorOverLife TODO add color selector
			innerFolder = folder.addFolder('color');
			UI.assertType(eOpt.colorOverLife, 'ValueWithDistribution');
			let col: VWD<StartEndRange<THREE.Color>> = <any>eOpt.colorOverLife;
			UI.assertType(col.value, 'StartEndRange');
			// UI.assertType(col.value.startValue(), 'THREE.Color');
			// UI.assertType(col.value.endValue(), 'THREE.Color');
			UI.addColorCtrls(innerFolder, col.value._startValue, 'start')
			UI.addColorCtrls(innerFolder, col.value._endValue, 'end')
			innerFolder.add(col, 'distribution', 0, 1).name(`rand`);

			// opacityOverLife
			innerFolder = folder.addFolder('opacity');
			UI.addVWD_SER_number_Ctrls(innerFolder, '', eOpt.opacityOverLife);
		}

		static assertType(val: any, type: string){
			if (GpuParticles.getValueTypeName(val) !== type){
				throw `Expected value of type ${type}, got ${JSON.stringify(val)}`;
			}
		}

		static addVectorCtrls(gui, name: string, pos: any, range: number){
			let vv = new THREE.Vector3();
			if (GpuParticles.getValueTypeName(pos) === 'Vector3'){
				vv = vv.add(pos);
			}
			let spacer = name.length > 0 ? ' ' : '';
			let g1 = gui.add(vv, 'x', -range, range).name(name + spacer + 'x').onChange(onChange);
			let g2 = gui.add(vv, 'y', -range, range).name(name + spacer + 'y').onChange(onChange);
			let g3 = gui.add(vv, 'z', -range, range).name(name + spacer + 'z').onChange(onChange);

			function onChange(e){
				if (GpuParticles.getValueTypeName(pos) === 'Vector3'){
					pos.setX(g1.getValue());
					pos.setY(g2.getValue());
					pos.setZ(g3.getValue());
				}
			}
		}

		static addVWD_SER_number_Ctrls(gui, name: string, val: any){
			UI.assertType(val, 'ValueWithDistribution');
			UI.assertType(val.value, 'StartEndRange');
			UI.assertType(val.value.startValue(), 'number');
			UI.assertType(val.value.endValue(), 'number');

			let vv: VWD_SER_number = val;
			gui.add(vv.value, '_startValue', 0, 1).name(`${name} start`);
			gui.add(vv.value, '_endValue', 0, 1).name(`${name} end`);
			gui.add(vv, 'distribution', 0, 1).name(`${name} rand`);
		}

		/**
		 * dat.gui and three does not interoperate nicely on colors
		 */
		static addColorCtrls(gui, colorObj: THREE.Color, name?: string, cb?: Function){
			let prop = 'color',
			    a = {};
			name = name || prop;
			a[prop] = `#${colorObj.getHexString()}`;

			gui.addColor(a, prop).name(name).onChange((value) => {
				colorObj.setStyle(value);
				if (cb) cb(value);
			});
		}

	}

}
