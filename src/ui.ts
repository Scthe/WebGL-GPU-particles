/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./particles/emitterOptions.ts"/>
/// <reference path="./particles/valueTypes.ts"/>

var dat: any;

module App {

	import ValueType = GpuParticles.ValueType;
	import ValueFactory = GpuParticles.ValueFactory;
	import EmitterOptions = GpuParticles.EmitterOptions;
	import Emitter = GpuParticles.Emitter;

	enum ValueMode {
		RANGE, VALUE
	}

	interface ValueFactoryUI {
		mode: ValueMode,
		min: number,
		max: number,
		distr_min: number,
		distr_max: number
	}

	export class UI {

		constructor(){
		}

		init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, app: App): void {
			console.log('ui init');
			let gui = new dat.GUI();

			// general options
			UI.addColorCtrls(gui, config.background, 'background', v => {
				renderer.setClearColor(config.background);
			});

			// for all emitters
			let emOpts = app.getParticleSystem().getEmitters();
			_.each(emOpts, (v) =>{
				this.addEmitterControls(gui, v);
			});
		}

		addEmitterControls(gui, emitter: Emitter): void {
			let emitterOpt: EmitterOptions = emitter.getEmitterOptions(),
			    folder = gui.addFolder('Emitter'), innerFolder;
			folder.open();

			folder.add(emitter, 'visible');
			/*
			folder.add(emitterOpt, 'count', 1000, 1000000).onFinishChange(function(value) {
				// emitterOpt.count = value;
				emitter.init(emitterOpt);
			});
			folder.add(emitterOpt, 'spawnRate', 100, 50000);
			// UI.addVectorCtrls(folder, '', emitterOpt.emitterPosition, 500); // TODO fix
			*/

			this.addControls(folder, 'lifetime', emitterOpt.lifetime, {
				mode: ValueMode.VALUE,
				min: 0.5,
				max: 7,
				distr_min: 0,
				distr_max: 3
			});

			/*
			// initialPosition
			innerFolder = folder.addFolder('Initial particle position');
			UI.assertType(emitterOpt.initialPosition, 'ValueWithDistribution');
			let ip: VWD<THREE.Vector3> = <any>emitterOpt.initialPosition;
			UI.assertType(ip.value, 'Vector3');
			UI.addVectorCtrls(innerFolder, '', ip.value, 50);
			innerFolder.add(ip, 'distribution', 0, 20).name('rand');

			// initialVelocity
			innerFolder = folder.addFolder('Initial Velocity');
			UI.assertType(emitterOpt.initialVelocity, 'ValueWithDistribution');
			let iv: VWD<THREE.Vector3> = <any>emitterOpt.initialVelocity;
			UI.assertType(iv.value, 'Vector3');
			// UI.addVectorCtrls(innerFolder, '', iv.value, 50); // TODO - may require serious changes, see note in emitter.ts
			innerFolder.add(iv, 'distribution', 0, 255).name('rand');
			*/

			innerFolder = folder.addFolder('turbulence');
			this.addControls(innerFolder, 'turbulence', emitterOpt.turbulenceOverLife, {
				mode: ValueMode.RANGE,
				min: 0.0,
				max: 1.0,
				distr_min: 0,
				distr_max: 1.0
			});

			innerFolder = folder.addFolder('size');
			this.addControls(innerFolder, 'size', emitterOpt.sizeOverLife, {
				mode: ValueMode.RANGE,
				min: 0.0,
				max: 0.99,
				distr_min: 0,
				distr_max: 1.0
			});

			/*
			// colorOverLife
			innerFolder = folder.addFolder('color');
			UI.assertType(emitterOpt.colorOverLife, 'ValueWithDistribution');
			let col: VWD<StartEndRange<THREE.Color>> = <any>emitterOpt.colorOverLife;
			UI.assertType(col.value, 'StartEndRange');
			// UI.assertType(col.value.startValue(), 'THREE.Color');
			// UI.assertType(col.value.endValue(), 'THREE.Color');
			UI.addColorCtrls(innerFolder, col.value._startValue, 'start', (v) => {
				col.value._startValue.setStyle(v);
			});
			UI.addColorCtrls(innerFolder, col.value._endValue, 'end', (v) => {
				col.value._endValue.setStyle(v);
			})
			innerFolder.add(col, 'distribution', 0, 1).name(`rand`).onChange((v) => {
				let col: any = emitter.getEmitterOptions().colorOverLife;
				col.distribution = v;
			});
			*/

			innerFolder = folder.addFolder('opacity');
			this.addControls(innerFolder, 'opacity', emitterOpt.opacityOverLife, {
				mode: ValueMode.RANGE,
				min: 0.0,
				max: 1.0,
				distr_min: 0,
				distr_max: 1.0
			});
		}

		private addControls<U>(gui: any, name: string, valueFactory: ValueFactory<U>, opt: ValueFactoryUI){
			let type = valueFactory.getType(),
					widgetFactory = this.getUIWidgetFactory(type);

			widgetFactory(gui, name, valueFactory, opt);
		}

		private getUIWidgetFactory(type: ValueType): any{
			let uiWidgetFactory = {};
			uiWidgetFactory[ValueType.NUMBER] = UI.addNumberUI;
			uiWidgetFactory[ValueType.VECTOR3] = UI.addVec3UI;
			uiWidgetFactory[ValueType.COLOR] = UI.addColUI;

			let f = uiWidgetFactory[type];

			if (f === undefined){
				throw new Error(`No uiWidgetFactory for ${ValueType[type]}(${type})`);
			}
			return f;
		}

		private static addNumberUI(gui: any, name: string, valueFactory: ValueFactory<number>, opt: ValueFactoryUI){
			let cfg = valueFactory.getConfig(),
			    bv = cfg._baseValue;

			if (opt.mode === ValueMode.VALUE){
				gui.add(bv, 'start', opt.min, opt.max).name(name);
			} else {
				gui.add(bv, 'start', opt.min, opt.max).name(`${name} start`);
				gui.add(bv, 'end', opt.min, opt.max).name(`${name} end`);
			}
			gui.add(cfg, '_distribution', opt.distr_min, opt.distr_max).name(`${name} rand`);
		}

		private static addVec3UI(){
		}

		private static addColUI(){
		}

/*
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
			gui.add(vv.value, '_startValue', 0.0, 1.0).name(`${name} start`);
			gui.add(vv.value, '_endValue',   0.0, 1.0).name(`${name} end`);
			gui.add(vv, 'distribution',      0.0, 1.0).name(`${name} rand`);
		}
*/

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
