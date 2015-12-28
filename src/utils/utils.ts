/// <reference path='../config.ts'/>
/// <reference path='../../typings/tsd.d.ts'/>

module Utils {

	type F32Arr = Array<number> | Float32Array | ArrayLike<number>;

	// construct a couple small arrays used for packing variables into floats etc
	var UINT8_VIEW = new Uint8Array(4);
	var FLOAT_VIEW = new Float32Array(UINT8_VIEW.buffer);

	export function decodeFloat(x: number, y: number, z: number, w: number) {
		UINT8_VIEW[0] = Math.floor(w)
		UINT8_VIEW[1] = Math.floor(z)
		UINT8_VIEW[2] = Math.floor(y)
		UINT8_VIEW[3] = Math.floor(x)
		return FLOAT_VIEW[0]
	}

	export function fillParticleDataOnIdx (arr: F32Arr, idx: number, vals: Array<number>): void {
		for (let i = 0; i < vals.length; i++) {
				arr[idx + i] = vals[i];
		}
	}

	export function rgbToHex(r: number, g: number, b: number): string {
		return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);

		function componentToHex(c: number) {
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		}
	}

	export function hexToRgb(hex: number): Array<number> {
		var r = hex >> 16;
		var g = (hex & 0x00FF00) >> 8;
		var b = hex & 0x0000FF;

		if (r > 0) r--;
		if (g > 0) g--;
		if (b > 0) b--;

		return [r, g, b];
	}

}
