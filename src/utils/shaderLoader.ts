/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='./http.ts'/>

// inspired by https://github.com/pyalot/webgl-deferred-irradiance-volumes/blob/master/lib/webgl/shader.coffee

module Utils {

	const VERTEX_SHADER_START = /\[.*vertex.*shader.*]/;
	const FRAGMENT_SHADER_START = /\[.*fragment.*shader.*]/;
	const INCLUDE_FILE_REGEX = /#include.+"(.+)"/;

	interface ShaderTexts {
		vertex: string,
		fragment: string
	}

	interface LineData {
		line: number,
		text: string,
		path: string,
		substituteText?: FileLinesData
	}
	type FileLinesData = Array<LineData>;


	export class ShaderLoader {

		load(shaderUrl: string): Q.Promise<ShaderTexts> {
			return Utils.Http({
							url: shaderUrl
						}).then((resp) => {
							return this.preprocess(resp, shaderUrl);
						}).then((lines) => {
							let arr1 = this.resolveIncludes(lines.vertex, shaderUrl),
							    arr2 = this.resolveIncludes(lines.fragment, shaderUrl),
							    promises = arr1.concat(arr2);
							return Q.all(promises).then(() => lines);
						})
						.then((lines) => {
							return {
								vertex:   this.applyIncludes(lines.vertex),
								fragment: this.applyIncludes(lines.fragment)
							};
						});
		}

		private preprocess(text: string, path: string): {vertex: FileLinesData, fragment: FileLinesData} {
			let lines = splitLines(text, path),
					currentShader: string,
					shaders = {
						vertex: [],
						fragment: []
					};

			_.each(lines, line => {
				if (line.text.match(VERTEX_SHADER_START)){
					currentShader = 'vertex';
				} else if (line.text.match(FRAGMENT_SHADER_START)) {
					currentShader = 'fragment';
				} else if (currentShader !== undefined) {
					shaders[currentShader].push(line);
				}
			});

			return shaders;
		}

		private resolveIncludes(lines: FileLinesData, path: string): Array<Q.Promise<FileLinesData>> {
			let result = [],
					includesPromises = [],
					dirname = extractDirName(path);

			_.each(lines, line => {
				let includedFileName = line.text.match(INCLUDE_FILE_REGEX);
				if (includedFileName !== undefined && includedFileName !== null){
					let fileToInclude = dirname + '/' + includedFileName[1],
							fileContentPromise = getIncludedFile(fileToInclude);
					fileContentPromise.then(v => {
						line.substituteText = v;
					});
					includesPromises.push(fileContentPromise);
				} else {
					result.push(line);
				}
			});

			return includesPromises;
		}

		private applyIncludes(file: FileLinesData): string {
			let toString,
					lineToString = line => {
						let text = line.text;
						if (line.substituteText !== undefined){
							text = toString(line.substituteText);
						}
						return text;
					};
			toString = (lx) => { return _.map(lx, lineToString).join('\n'); }

			return toString(file);
		}

	}

	function getIncludedFile(path: string): Q.Promise<FileLinesData> {
		// TODO no preprocessing of includes
		return Utils.Http({
						url: path
					}).then(v => {
						return splitLines(v, path);
					});
	}

	function extractDirName(path: string): string{
		let dirname = path.split('/')
    dirname.pop()
    return dirname.join('/')
	}

	function splitLines(text: string, path?: string): FileLinesData {
		path = path || '';
		let lines = text.split('\n');
		return _.map(lines, (e: string, i: number) => {
			return {
				line: i,
				text: lines[i],
				path: path
			};
		});
	}
}
