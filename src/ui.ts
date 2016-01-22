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
			UI.addColorCtrls(gui, 'background', config.background, v => {
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

			innerFolder = folder.addFolder('Initial particle position');
			this.addControls(innerFolder, '', emitterOpt.initialPosition, { // TODO not working as a vector
				mode: ValueMode.VALUE,
				min: -50.0,
				max: 50.0,
				distr_min: 0,
				distr_max: 20.0
			});

			// TODO - may require serious changes, see note in emitter.ts
			innerFolder = folder.addFolder('Initial Velocity');
			this.addControls(innerFolder, '', emitterOpt.initialVelocity, { // TODO not working as a vector
				mode: ValueMode.VALUE,
				min: -0.5,
				max: 0.5,
				distr_min: 0,
				distr_max: 255.0
			});

			innerFolder = folder.addFolder('turbulence');
			this.addControls(innerFolder, '', emitterOpt.turbulenceOverLife, {
				mode: ValueMode.RANGE,
				min: 0.0,
				max: 1.0,
				distr_min: 0,
				distr_max: 1.0
			});

			innerFolder = folder.addFolder('size');
			this.addControls(innerFolder, '', emitterOpt.sizeOverLife, {
				mode: ValueMode.RANGE,
				min: 0.0,
				max: 0.99,
				distr_min: 0,
				distr_max: 1.0
			});

			innerFolder = folder.addFolder('color');
			this.addControls(innerFolder, 'color', emitterOpt.colorOverLife, {
				mode: ValueMode.RANGE,
				min: 0.0,
				max: 0.0,
				distr_min: 0,
				distr_max: 1.0
			});

			innerFolder = folder.addFolder('opacity');
			this.addControls(innerFolder, '', emitterOpt.opacityOverLife, {
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

		private static addVec3UI(gui: any, name: string, valueFactory: ValueFactory<THREE.Vector3>, opt: ValueFactoryUI){
			let cfg = valueFactory.getConfig(),
					bv = cfg._baseValue;

			// UI.addVectorCtrls(gui, name, bv.startValue(), opt); // TODO this works, but emitter does not use values properly
			gui.add(cfg, '_distribution', opt.distr_min, opt.distr_max).name(`${name} rand`);
		}

		private static addColUI(gui: any, name: string, valueFactory: ValueFactory<THREE.Color>, opt: ValueFactoryUI){
			let cfg = valueFactory.getConfig(),
			    bv = cfg._baseValue;

			if (_.isFunction(bv.startValue()) || _.isFunction(bv.endValue())) return;


			if (opt.mode === ValueMode.VALUE){
				bv.start = new THREE.Color(<any>bv.startValue());

				UI.addColorCtrls(gui, 'value', <any>bv.startValue());
			} else {
				bv.start = new THREE.Color(<any>bv.startValue());
				bv.end = new THREE.Color(<any>bv.endValue());

				UI.addColorCtrls(gui, 'start', <any>bv.startValue());
				UI.addColorCtrls(gui, 'end', <any>bv.endValue());
			}
			gui.add(cfg, '_distribution', opt.distr_min, opt.distr_max).name(`${name} rand`);
		}

		static addVectorCtrls(gui: any, name: string, vec: any, opt: ValueFactoryUI){
			let spacer = name.length > 0 ? ' ' : '',
			    vv = new THREE.Vector3();
			if (isVector(vec)){ vv = vv.add(vec); }

			let g1 = gui.add(vv, 'x', opt.min, opt.max).name(`${name}${spacer}x`).onChange(onChange),
			    g2 = gui.add(vv, 'y', opt.min, opt.max).name(`${name}${spacer}y`).onChange(onChange),
			    g3 = gui.add(vv, 'z', opt.min, opt.max).name(`${name}${spacer}z`).onChange(onChange);

			function onChange(e){
				if (!isVector(vec)) return;

				vec.setX(g1.getValue());
				vec.setY(g2.getValue());
				vec.setZ(g3.getValue());
			}

			function isVector(v: any){
				return GpuParticles.getValueType(vec) === ValueType.VECTOR3;
			}
		}


		/**
		 * dat.gui and three does not interoperate nicely on colors
		 */
		static addColorCtrls(gui: any, name: string, col: THREE.Color, cb?: Function){
			let prop = 'color',
			    dummy = {};
			dummy[prop] = `#${col.getHexString()}`;

			name = name || prop;

			gui.addColor(dummy, prop).name(name).onChange((value) => {
				col.setStyle(value);
				if (cb) cb(value);
			});
		}

	}

}
