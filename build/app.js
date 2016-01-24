/// <reference path='../../typings/tsd.d.ts'/>
var GpuParticles;
(function (GpuParticles) {
    var ValueConfig = (function () {
        function ValueConfig(start, end) {
            this._baseValue = new StartEndValues(start, end);
            this._distribution = 0;
        }
        ValueConfig.prototype.distribution = function (distribution) {
            this._distribution = distribution;
            return this;
        };
        ValueConfig.prototype.baseValue = function (seLens, value) {
            var v = seLens(this._baseValue), type = getValueType(v), converter = getValueConverter(type);
            if (seLens === StartEndValues.StartLens) {
                converter.set(this._baseValue, 'start', value);
            }
            else {
                converter.set(this._baseValue, 'end', value);
            }
            return this;
        };
        ValueConfig.prototype.getBaseValue = function (seLens, ifFunctionThenArgs) {
            var value = seLens(this._baseValue);
            if (_.isFunction(value)) {
                var valOfThis = ifFunctionThenArgs.shift() || window, rawValueFactory = value;
                return rawValueFactory.apply(valOfThis, ifFunctionThenArgs);
            }
            else {
                return value;
            }
        };
        ValueConfig.prototype.getDistribution = function () {
            return this._distribution;
        };
        return ValueConfig;
    })();
    GpuParticles.ValueConfig = ValueConfig;
    (function (ValueType) {
        ValueType[ValueType["NUMBER"] = 0] = "NUMBER";
        ValueType[ValueType["VECTOR2"] = 1] = "VECTOR2";
        ValueType[ValueType["VECTOR3"] = 2] = "VECTOR3";
        ValueType[ValueType["COLOR"] = 3] = "COLOR";
    })(GpuParticles.ValueType || (GpuParticles.ValueType = {}));
    var ValueType = GpuParticles.ValueType;
    function getValueType(vv) {
        return (typeof vv === 'number') ? ValueType.NUMBER :
            (vv instanceof THREE.Color) ? ValueType.COLOR :
                (vv instanceof THREE.Vector3) ? ValueType.VECTOR3 :
                    (vv instanceof THREE.Vector2) ? ValueType.VECTOR2 :
                        undefined;
    }
    GpuParticles.getValueType = getValueType;
    var StartEndValues = (function () {
        function StartEndValues(start, end) {
            this.start = start;
            this.end = end !== undefined ? end : start;
        }
        StartEndValues.prototype.startValue = function () { return this.start; };
        StartEndValues.prototype.endValue = function () {
            if (this.useStartValueAsEndValue()) {
                this.end = this.cloneStartValue();
            }
            return this.end;
        };
        StartEndValues.prototype.cloneStartValue = function () {
            var v = this.startValue(), type = getValueType(v), converter = getValueConverter(type);
            return converter.clone(v);
        };
        StartEndValues.prototype.useStartValueAsEndValue = function () { return this.end === undefined; };
        StartEndValues.StartLens = function (v) { return v.start; };
        StartEndValues.EndLens = function (v) { return v.end; };
        return StartEndValues;
    })();
    GpuParticles.StartEndValues = StartEndValues;
    function colorTransformsOptions() {
        return {
            mul: 255,
            isInt: true
        };
    }
    GpuParticles.colorTransformsOptions = colorTransformsOptions;
    var valueConverters = [];
    function declareValueConverter(valueType, converter) {
        valueConverters[valueType] = converter;
    }
    function getValueConverter(type) {
        var converter = valueConverters[type];
        if (converter === undefined) {
            throw new Error("No value converter for " + ValueType[type] + "(" + type + ")");
        }
        return converter;
    }
    GpuParticles.getValueConverter = getValueConverter;
    var NumberValueConverter = (function () {
        function NumberValueConverter() {
        }
        NumberValueConverter.prototype.clone = function (value) { return value; };
        NumberValueConverter.prototype.fromNumber = function (value) { return value; };
        NumberValueConverter.prototype.set = function (object, prop, newValue) {
            object[prop] = newValue;
        };
        NumberValueConverter.prototype.getValue = function (numberProvider, value) {
            return numberProvider(value);
        };
        return NumberValueConverter;
    })();
    declareValueConverter(ValueType.NUMBER, new NumberValueConverter());
    var Vector3ValueConverter = (function () {
        function Vector3ValueConverter() {
        }
        Vector3ValueConverter.prototype.fromNumber = function (value) { return new THREE.Vector3(value, value, value); };
        Vector3ValueConverter.prototype.clone = function (value) {
            var vec = new THREE.Vector3();
            this._set(vec, value);
            return vec;
        };
        Vector3ValueConverter.prototype.set = function (object, prop, newValue) {
            var vec = object[prop];
            this._set(vec, newValue);
        };
        Vector3ValueConverter.prototype._set = function (vec, newValue) {
            vec.setX(newValue.x);
            vec.setY(newValue.y);
            vec.setZ(newValue.z);
        };
        Vector3ValueConverter.prototype.getValue = function (numberProvider, value) {
            return new THREE.Vector3(numberProvider(value.x), numberProvider(value.y), numberProvider(value.z));
        };
        return Vector3ValueConverter;
    })();
    declareValueConverter(ValueType.VECTOR3, new Vector3ValueConverter());
    var Vector2ValueConverter = (function () {
        function Vector2ValueConverter() {
        }
        Vector2ValueConverter.prototype.fromNumber = function (value) { return new THREE.Vector2(value, value); };
        Vector2ValueConverter.prototype.clone = function (value) {
            var vec = new THREE.Vector2();
            this._set(vec, value);
            return vec;
        };
        Vector2ValueConverter.prototype.set = function (object, prop, newValue) {
            var vec = object[prop];
            this._set(vec, newValue);
        };
        Vector2ValueConverter.prototype._set = function (vec, newValue) {
            vec.setX(newValue.x);
            vec.setY(newValue.y);
        };
        Vector2ValueConverter.prototype.getValue = function (numberProvider, value) {
            return new THREE.Vector2(numberProvider(value.x), numberProvider(value.y));
        };
        return Vector2ValueConverter;
    })();
    declareValueConverter(ValueType.VECTOR2, new Vector2ValueConverter());
    var ColorValueConverter = (function () {
        function ColorValueConverter() {
        }
        ColorValueConverter.prototype.clone = function (value) { return new THREE.Color(value); };
        ColorValueConverter.prototype.fromNumber = function (value) { return (new THREE.Color()).set(value); };
        ColorValueConverter.prototype.set = function (object, prop, newValue) {
            var col = object[prop];
            col.set(newValue);
        };
        ColorValueConverter.prototype.getValue = function (numberProvider, value) {
            var valueAsVec = new THREE.Vector3(value.r, value.g, value.b), vec3Converter = getValueConverter(ValueType.VECTOR3), newValues = vec3Converter.getValue(numberProvider, valueAsVec), arr = newValues.toArray();
            for (var i = 0; i < arr.length; i++) {
                var v = arr[i];
                while (v < 0) {
                    v += 255;
                }
                arr[i] = Math.floor(v % 256);
            }
            return (new THREE.Color()).fromArray(arr);
        };
        return ColorValueConverter;
    })();
    declareValueConverter(ValueType.COLOR, new ColorValueConverter());
})(GpuParticles || (GpuParticles = {}));
/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='./valueTypes.ts'/>
var GpuParticles;
(function (GpuParticles) {
    function emitterOptionsFromConfig(cfg) {
        var emitterOpt = {
            name: cfg.name,
            visible: cfg.visible,
            count: cfg.count,
            spawnRate: cfg.spawnRate,
            emitterPosition: cfg.emitterPosition,
            lifetime: ValueNum('lifetime'),
            initialPosition: ValueVec3('initialPosition'),
            initialVelocity: ValueVec3('initialVelocity', { isInt: true, mul: 254, clampMin: -127, clampMax: 127 }),
            turbulenceOverLife: ValueNum('turbulenceOverLife', { isInt: true, mul: 255, clampMin: 0, clampMax: 255 }),
            sizeOverLife: ValueNum('sizeOverLife', { isInt: true, mul: 255, clampMin: 0, clampMax: 255 }),
            opacityOverLife: ValueNum('opacityOverLife', { isInt: true, mul: 255, clampMin: 0, clampMax: 255 }),
            colorOverLife: ValueCol('colorOverLife')
        };
        return emitterOpt;
        function ValueNum(prop, opt) {
            return new GpuParticles.ValueFactory(GpuParticles.ValueType.NUMBER, cfg[prop], opt);
        }
        function ValueVec3(prop, opt) {
            return new GpuParticles.ValueFactory(GpuParticles.ValueType.VECTOR3, cfg[prop], opt);
        }
        function ValueCol(prop, opt) {
            return new GpuParticles.ValueFactory(GpuParticles.ValueType.COLOR, cfg[prop], opt);
        }
    }
    GpuParticles.emitterOptionsFromConfig = emitterOptionsFromConfig;
})(GpuParticles || (GpuParticles = {}));
/// <reference path='../typings/tsd.d.ts'/>
/// <reference path="./particles/emitterOptions.ts"/>
/// <reference path="./particles/valueTypes.ts"/>
var ValueConfig = GpuParticles.ValueConfig;
var config = {
    background: new THREE.Color(0x2a2a2a),
    width: width,
    height: height,
    camera: {
        name: 'camera',
        angle: 28,
        near: 0.1,
        far: 10000,
        aspect: function () {
            return width() / height();
        },
        position: new THREE.Vector3(0, 0, 100),
        lookAt: new THREE.Vector3()
    },
    particles: {
        noiseTexture: 'build/vendor/textures/perlin-512.png',
        spriteTexture: 'build/vendor/textures/particle2.png',
        simulationShader: 'build/shaders/particleSim.shader',
        emitters: [
            {
                name: 'fire projectile',
                count: 1000,
                spawnRate: 100,
                turbulenceOverLife: new ValueConfig(0.0, 1.0),
                opacityOverLife: new ValueConfig(1.0, 0.3),
                horizontalSpeed: 1.5,
                verticalSpeed: 1.33,
                emitterPosition: function (clockDeltaData) {
                    return new THREE.Vector3(Math.sin(clockDeltaData.timeFromSimulationStart * this.horizontalSpeed) * 20, Math.sin(clockDeltaData.timeFromSimulationStart * this.verticalSpeed) * 10, Math.sin(clockDeltaData.timeFromSimulationStart * this.horizontalSpeed + this.verticalSpeed) * 5);
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
function width() {
    return document.documentElement.clientWidth;
}
function height() {
    return document.documentElement.clientHeight;
}
/// <reference path='../config.ts'/>
/// <reference path='../../typings/tsd.d.ts'/>
var Utils;
(function (Utils) {
    var UINT8_VIEW = new Uint8Array(4);
    var FLOAT_VIEW = new Float32Array(UINT8_VIEW.buffer);
    function encodeUint8VectorAsFloat(x, y, z, w) {
        UINT8_VIEW[0] = Math.floor(w);
        UINT8_VIEW[1] = Math.floor(z);
        UINT8_VIEW[2] = Math.floor(y);
        UINT8_VIEW[3] = Math.floor(x);
        return FLOAT_VIEW[0];
    }
    Utils.encodeUint8VectorAsFloat = encodeUint8VectorAsFloat;
    function copyArrInto(arr, arrBaseIdx, vals) {
        for (var i = 0; i < vals.length && arrBaseIdx + i < arr.length; i++) {
            arr[arrBaseIdx + i] = vals[i];
        }
    }
    Utils.copyArrInto = copyArrInto;
    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
    }
    Utils.rgbToHex = rgbToHex;
    function hexToRgb(hex) {
        var r = hex >> 16;
        var g = (hex & 0x00FF00) >> 8;
        var b = hex & 0x0000FF;
        if (r > 0)
            r--;
        if (g > 0)
            g--;
        if (b > 0)
            b--;
        return [r, g, b];
    }
    Utils.hexToRgb = hexToRgb;
})(Utils || (Utils = {}));
/// <reference path='../typings/tsd.d.ts'/>
var App;
(function (App) {
    var timeFromSimulationStart = 0, clock;
    function createClockDeltaData() {
        clock = clock || new THREE.Clock(true);
        var delta = clock.getDelta();
        timeFromSimulationStart += delta;
        var clockDeltaData = {};
        Object.defineProperty(clockDeltaData, 'clockStartTime', { value: clock.startTime });
        Object.defineProperty(clockDeltaData, 'delta', { value: delta });
        Object.defineProperty(clockDeltaData, 'timeFromSimulationStart', { value: timeFromSimulationStart });
        return clockDeltaData;
    }
    App.createClockDeltaData = createClockDeltaData;
})(App || (App = {}));
/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../utils/utils.ts'/>
/// <reference path="./valueTypes.ts"/>
/// <reference path='../clock.ts'/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GpuParticles;
(function (GpuParticles) {
    ;
    var Emitter = (function (_super) {
        __extends(Emitter, _super);
        function Emitter() {
            _super.call(this);
        }
        Emitter.prototype.init = function (opt, material) {
            this.particleIterator = 0;
            this.dirtyStatus = {
                needsUpdate: false,
                offset: 0,
                count: 0
            };
            this.updateEmitterOptions(opt);
            this.cleanBuffers();
            this.initBuffers();
            this.particleShaderGeom = new THREE.BufferGeometry();
            this.particleShaderGeom.addAttribute('position', new THREE.BufferAttribute(this.particleVertices, 3).setDynamic(true));
            this.particleShaderGeom.addAttribute('particlePositionAndVel', new THREE.BufferAttribute(this.particlePositionAndVel, 4).setDynamic(true));
            this.particleShaderGeom.addAttribute('particleColor', new THREE.BufferAttribute(this.particleColorData, 2).setDynamic(true));
            this.posStartAndTimeAttr = toBufferAttrData(this.particleShaderGeom.getAttribute('particlePositionAndVel'));
            this.particleColorAttr = toBufferAttrData(this.particleShaderGeom.getAttribute('particleColor'));
            this.miscDataAttr = toBufferAttrData(this.particleShaderGeom.getAttribute('position'));
            if (material !== undefined) {
                this.particleShaderMat = material;
            }
            if (this.particleShaderMat === undefined) {
                throw new Error('Emitter material cannot be null');
            }
            this.particlePointsObject = new THREE.Points(this.particleShaderGeom, this.particleShaderMat);
            this.particlePointsObject.frustumCulled = false;
            this.add(this.particlePointsObject);
            function toBufferAttrData(bufferAttr) {
                return bufferAttr instanceof THREE.BufferAttribute ? bufferAttr : bufferAttr.data;
            }
        };
        Emitter.prototype.recreateWithParticleCount = function (particleCount) {
            this.opt.count = particleCount;
            this.init.call(this, undefined);
        };
        Emitter.prototype.cleanBuffers = function () {
            if (this.particlePointsObject === undefined)
                return;
            this.remove(this.particlePointsObject);
            if (this.particlePointsObject.geometry) {
                this.particlePointsObject.geometry.dispose();
                this.particlePointsObject.geometry = undefined;
            }
        };
        Emitter.prototype.initBuffers = function () {
            this.particleVertices = new Float32Array(this.getParticleCount() * 3),
                this.particlePositionAndVel = new Float32Array(this.getParticleCount() * 4),
                this.particleColorData = new Float32Array(this.getParticleCount() * 2);
            var colors = [Utils.encodeUint8VectorAsFloat(128, 128, 0, 0),
                Utils.encodeUint8VectorAsFloat(0, 254, 0, 254)];
            for (var i = 0; i < this.getParticleCount(); i++) {
                Utils.copyArrInto(this.particlePositionAndVel, i * 4, [100, 0, 0, 0]);
                Utils.copyArrInto(this.particleVertices, i * 3, [0, 0, 0]);
                Utils.copyArrInto(this.particleColorData, i * 2, colors);
            }
        };
        Emitter.prototype.spawnParticle = function (clockDeltaData) {
            var o = this.opt, __pack = Utils.encodeUint8VectorAsFloat, emitterPosition = _.isFunction(o.emitterPosition) ?
                o.emitterPosition.call(this.opt, clockDeltaData)
                : o.emitterPosition;
            var position = o.initialPosition.getValue().add(emitterPosition), velocity = o.initialVelocity.getValue(), lifetime = o.lifetime.getValue(), col = o.colorOverLife.getStartEndValues(), opacity = o.opacityOverLife.getStartEndValues(), scale = o.sizeOverLife.getStartEndValues(), turbulence = o.turbulenceOverLife.getStartEndValues(), colSt = col.startValue(), colEnd = col.endValue();
            var buf1AttrValues = [
                position.x,
                position.y,
                position.z,
                __pack(velocity.x + 127, velocity.y + 127, velocity.z + 127, 0.0)
            ], buf2AttrValues = [
                __pack(colSt.r, colSt.g, colSt.b, opacity.startValue()),
                __pack(colEnd.r, colEnd.g, colEnd.b, opacity.endValue())
            ], buf3AttrValues = [
                clockDeltaData.timeFromSimulationStart,
                lifetime,
                __pack(scale.startValue(), scale.endValue(), turbulence.startValue(), turbulence.endValue())
            ];
            Utils.copyArrInto(this.posStartAndTimeAttr.array, this.particleIterator * 4, buf1AttrValues);
            Utils.copyArrInto(this.particleColorAttr.array, this.particleIterator * 2, buf2AttrValues);
            Utils.copyArrInto(this.miscDataAttr.array, this.particleIterator * 3, buf3AttrValues);
            this.markBuffersAsDirty();
        };
        Emitter.prototype.markBuffersAsDirty = function () {
            if (this.dirtyStatus.offset === 0) {
                this.dirtyStatus.offset = this.getParticleCount();
            }
            ++this.dirtyStatus.count;
            this.dirtyStatus.needsUpdate = true;
            ++this.particleIterator;
            this.particleIterator = this.particleIterator >= this.getParticleCount() ? 0 : this.particleIterator;
        };
        Emitter.prototype.update = function (clockDeltaData) {
            this.geometryUpdate();
        };
        Emitter.prototype.geometryUpdate = function () {
            if (!this.dirtyStatus.needsUpdate)
                return;
            this.dirtyStatus.needsUpdate = false;
            var posDirtyRange = this.posStartAndTimeAttr.updateRange, colDirtyRange = this.particleColorAttr.updateRange, misc2DirtyRange = this.miscDataAttr.updateRange;
            if (this.dirtyStatus.offset + this.dirtyStatus.count < this.getParticleCount()) {
                posDirtyRange.offset = this.dirtyStatus.offset * 4;
                posDirtyRange.count = this.dirtyStatus.count * 4;
                colDirtyRange.offset = this.dirtyStatus.offset * 2;
                colDirtyRange.count = this.dirtyStatus.count * 2;
                misc2DirtyRange.offset = this.dirtyStatus.offset * 3;
                misc2DirtyRange.count = this.dirtyStatus.count * 3;
            }
            else {
                posDirtyRange.offset = 0;
                posDirtyRange.count = this.getParticleCount() * 4;
                colDirtyRange.count = this.getParticleCount() * 2;
                misc2DirtyRange.count = this.getParticleCount() * 3;
            }
            this.posStartAndTimeAttr.needsUpdate = true;
            this.particleColorAttr.needsUpdate = true;
            this.miscDataAttr.needsUpdate = true;
            this.dirtyStatus.offset = 0;
            this.dirtyStatus.count = 0;
        };
        Emitter.prototype.getParticleSystem = function () {
            return this.parent;
        };
        Emitter.prototype.getParticleCount = function () {
            return Math.floor(this.getEmitterOptions().count);
        };
        Emitter.prototype.getEmitterOptions = function () {
            return this.opt;
        };
        Emitter.prototype.updateEmitterOptions = function (updateSet) {
            if (this.opt !== undefined && updateSet === undefined)
                return;
            var cfg = _.extend({}, this.getParticleSystem().defaultSpawnOptions(), updateSet);
            this.opt = _.extend({}, cfg, GpuParticles.emitterOptionsFromConfig(cfg));
            this.visible = this.opt.visible;
        };
        return Emitter;
    })(THREE.Object3D);
    GpuParticles.Emitter = Emitter;
})(GpuParticles || (GpuParticles = {}));
/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='../config.ts'/>
/// <reference path='./emitter.ts'/>
/// <reference path='../clock.ts'/>
/// <reference path="./valueTypes.ts"/>
var GpuParticles;
(function (GpuParticles_1) {
    var defaultParticleSpawnOptions = {
        name: 'particle emitter',
        visible: true,
        count: 1000,
        spawnRate: 100,
        emitterPosition: new THREE.Vector3(),
        lifetime: new GpuParticles_1.ValueConfig(2.0).distribution(0.5),
        initialPosition: new GpuParticles_1.ValueConfig(0.0).distribution(0.5),
        initialVelocity: new GpuParticles_1.ValueConfig(0.0).distribution(0.0),
        turbulenceOverLife: new GpuParticles_1.ValueConfig(0.0).distribution(0.0),
        sizeOverLife: new GpuParticles_1.ValueConfig(0.2, 1.0).distribution(0.3),
        colorOverLife: new GpuParticles_1.ValueConfig(0xE65A46, 0x00FFFF).distribution(0.0),
        opacityOverLife: new GpuParticles_1.ValueConfig(1.0, 0.0)
    };
    var GpuParticles = (function (_super) {
        __extends(GpuParticles, _super);
        function GpuParticles() {
            _super.call(this);
            this.cfg = config.particles;
            this.emiters = [];
        }
        GpuParticles.prototype.init = function (shaderLoader) {
            var _this = this;
            var materialPromise = this.createBaseMaterial(shaderLoader), particlesCreated = materialPromise.then(function (material) {
                _this.particleShaderMat = material;
                _.each(_this.cfg.emitters, function (emitterCfg) {
                    var emitter = new GpuParticles_1.Emitter();
                    _this.add(emitter);
                    emitter.init(emitterCfg, material);
                    _this.emiters.push(emitter);
                });
            });
            return particlesCreated;
        };
        GpuParticles.prototype.defaultSpawnOptions = function () {
            return defaultParticleSpawnOptions;
        };
        GpuParticles.prototype.getEmitters = function () {
            return this.emiters;
        };
        GpuParticles.prototype.createBaseMaterial = function (shaderLoader) {
            var particleNoiseTex = THREE.ImageUtils.loadTexture(this.cfg.noiseTexture), particleSpriteTex = THREE.ImageUtils.loadTexture(this.cfg.spriteTexture);
            particleNoiseTex.wrapS = particleNoiseTex.wrapT = THREE.RepeatWrapping;
            particleSpriteTex.wrapS = particleSpriteTex.wrapT = THREE.RepeatWrapping;
            var materialOptions = {
                transparent: true,
                depthWrite: false,
                uniforms: {
                    "uTime": {
                        type: "f",
                        value: 0.0
                    },
                    "uScale": {
                        type: "f",
                        value: 1.0
                    },
                    "tNoise": {
                        type: "t",
                        value: particleNoiseTex
                    },
                    "tSprite": {
                        type: "t",
                        value: particleSpriteTex
                    }
                },
                blending: THREE.AdditiveBlending,
                vertexShader: '',
                fragmentShader: ''
            };
            var materialCreatedPromise = shaderLoader.load(this.cfg.simulationShader)
                .then(function (shaderTexts) {
                materialOptions.vertexShader = shaderTexts.vertex;
                materialOptions.fragmentShader = shaderTexts.fragment;
                var m = new THREE.ShaderMaterial(materialOptions);
                m.defaultAttributeValues.particlePositionAndTime = [0, 0, 0, 0];
                m.defaultAttributeValues.particleMiscData = [0, 0, 0, 0];
                return m;
            });
            return materialCreatedPromise;
        };
        GpuParticles.prototype.update = function (clockDeltaData) {
            var _this = this;
            if (this.particleShaderMat === undefined)
                return;
            this.particleShaderMat.uniforms['uTime'].value = clockDeltaData.timeFromSimulationStart;
            if (clockDeltaData.delta > 0) {
                _.each(this.emiters, function (emitter) { _this.updateEmiter(clockDeltaData, emitter); });
            }
        };
        GpuParticles.prototype.updateEmiter = function (clockDeltaData, emitter) {
            if (!emitter.visible)
                return;
            var toEmitCount = Math.min(emitter.getParticleCount() / 5, emitter.getEmitterOptions().spawnRate * clockDeltaData.delta);
            for (var x = 0; x < toEmitCount; x++) {
                emitter.spawnParticle(clockDeltaData);
            }
            emitter.update(clockDeltaData);
        };
        ;
        return GpuParticles;
    })(THREE.Object3D);
    GpuParticles_1.GpuParticles = GpuParticles;
})(GpuParticles || (GpuParticles = {}));
/// <reference path='../../typings/tsd.d.ts'/>
var Utils;
(function (Utils) {
    var HttpMethod;
    (function (HttpMethod) {
        HttpMethod[HttpMethod["CONNECT"] = 0] = "CONNECT";
        HttpMethod[HttpMethod["DELETE"] = 1] = "DELETE";
        HttpMethod[HttpMethod["GET"] = 2] = "GET";
        HttpMethod[HttpMethod["HEAD"] = 3] = "HEAD";
        HttpMethod[HttpMethod["OPTIONS"] = 4] = "OPTIONS";
        HttpMethod[HttpMethod["PATCH"] = 5] = "PATCH";
        HttpMethod[HttpMethod["POST"] = 6] = "POST";
        HttpMethod[HttpMethod["PUT"] = 7] = "PUT";
        HttpMethod[HttpMethod["TRACE"] = 8] = "TRACE";
    })(HttpMethod || (HttpMethod = {}));
    var ResponseConverter;
    (function (ResponseConverter) {
        ResponseConverter[ResponseConverter["TEXT"] = 0] = "TEXT";
        ResponseConverter[ResponseConverter["JSON"] = 1] = "JSON";
    })(ResponseConverter || (ResponseConverter = {}));
    var defaultHttpOpt = {
        method: HttpMethod.GET,
        timeoutMS: 0,
        data: null,
        async: true,
        responseConverter: ResponseConverter.TEXT
    };
    function Http(opt) {
        var defered = Q.defer(), $window = window, timeoutId;
        opt = getOpt(opt);
        if ($window.XMLHttpRequest) {
            var request = new $window.XMLHttpRequest();
        }
        else {
            var request = new $window.ActiveXObject('Microsoft.XMLHTTP');
        }
        var methodStr = HttpMethod[opt.method];
        request.open(methodStr, opt.url, opt.async);
        request.onreadystatechange = function () {
            if (request.readyState !== 4)
                return;
            if (request.status >= 200 && request.status < 300) {
                defered.resolve(request.response);
            }
        };
        request.onerror = function onRequestError(err) {
            defered.reject(err);
        };
        if (opt.timeoutMS !== undefined && opt.timeoutMS > 0) {
            timeoutId = setTimeout(function () {
                timeoutId = undefined;
                if (defered.promise.isPending) {
                    request.abort();
                    defered.reject('Request timed out');
                }
            }, opt.timeoutMS);
        }
        request.send(opt.data);
        var p = defered.promise
            .finally(function () {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        })
            .then(function (resp) {
            return convertResponse(opt, resp);
        });
        return p;
    }
    Utils.Http = Http;
    function getOpt(opt) {
        var opt_ = _.extend({}, defaultHttpOpt, opt);
        if (opt_.data !== undefined && opt_.data !== null) {
            if (typeof opt_.data === 'object') {
                opt_.data = JSON.stringify(opt_.data);
            }
        }
        else {
            opt_.data = null;
        }
        return opt_;
    }
    function convertResponse(opt, resp) {
        if (resp === undefined || resp === null)
            return undefined;
        if (opt.responseConverter === ResponseConverter.JSON) {
            resp = JSON.parse(resp);
        }
        return resp;
    }
})(Utils || (Utils = {}));
/// <reference path='../../typings/tsd.d.ts'/>
/// <reference path='./http.ts'/>
var Utils;
(function (Utils) {
    var VERTEX_SHADER_START = /\[.*vertex.*shader.*]/;
    var FRAGMENT_SHADER_START = /\[.*fragment.*shader.*]/;
    var INCLUDE_FILE_REGEX = /#include.+"(.+)"/;
    var ShaderLoader = (function () {
        function ShaderLoader() {
        }
        ShaderLoader.prototype.load = function (shaderUrl) {
            var _this = this;
            return Utils.Http({
                url: shaderUrl
            }).then(function (resp) {
                return _this.preprocess(resp, shaderUrl);
            }).then(function (lines) {
                var arr1 = _this.resolveIncludes(lines.vertex, shaderUrl), arr2 = _this.resolveIncludes(lines.fragment, shaderUrl), promises = arr1.concat(arr2);
                return Q.all(promises).then(function () { return lines; });
            })
                .then(function (lines) {
                return {
                    vertex: _this.applyIncludes(lines.vertex),
                    fragment: _this.applyIncludes(lines.fragment)
                };
            });
        };
        ShaderLoader.prototype.preprocess = function (text, path) {
            var lines = splitLines(text, path), currentShader, shaders = {
                vertex: [],
                fragment: []
            };
            _.each(lines, function (line) {
                if (line.text.match(VERTEX_SHADER_START)) {
                    currentShader = 'vertex';
                }
                else if (line.text.match(FRAGMENT_SHADER_START)) {
                    currentShader = 'fragment';
                }
                else if (currentShader !== undefined) {
                    shaders[currentShader].push(line);
                }
            });
            return shaders;
        };
        ShaderLoader.prototype.resolveIncludes = function (lines, path) {
            var result = [], includesPromises = [], dirname = extractDirName(path);
            _.each(lines, function (line) {
                var includedFileName = line.text.match(INCLUDE_FILE_REGEX);
                if (includedFileName !== undefined && includedFileName !== null) {
                    var fileToInclude = dirname + '/' + includedFileName[1], fileContentPromise = getIncludedFile(fileToInclude);
                    fileContentPromise.then(function (v) {
                        line.substituteText = v;
                    });
                    includesPromises.push(fileContentPromise);
                }
                else {
                    result.push(line);
                }
            });
            return includesPromises;
        };
        ShaderLoader.prototype.applyIncludes = function (file) {
            var toString, lineToString = function (line) {
                var text = line.text;
                if (line.substituteText !== undefined) {
                    text = toString(line.substituteText);
                }
                return text;
            };
            toString = function (lx) { return _.map(lx, lineToString).join('\n'); };
            return toString(file);
        };
        return ShaderLoader;
    })();
    Utils.ShaderLoader = ShaderLoader;
    function getIncludedFile(path) {
        return Utils.Http({
            url: path
        }).then(function (v) {
            return splitLines(v, path);
        });
    }
    function extractDirName(path) {
        var dirname = path.split('/');
        dirname.pop();
        return dirname.join('/');
    }
    function splitLines(text, path) {
        path = path || '';
        var lines = text.split('\n');
        return _.map(lines, function (e, i) {
            return {
                line: i,
                text: lines[i],
                path: path
            };
        });
    }
})(Utils || (Utils = {}));
/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./particles/gpuParticles.ts"/>
/// <reference path='./utils/shaderLoader.ts'/>
/// <reference path='./clock.ts'/>
var App;
(function (App_1) {
    var App = (function () {
        function App() {
            this.shaderLoader = new Utils.ShaderLoader();
        }
        App.prototype.init = function (scene) {
            // let loadedDefer = Q.defer<THREE.Scene>();
            this.camera = this.createCamera(config.camera, 'camera');
            var auxObjects = this.createAuxObjects();
            this.particleSystem = new GpuParticles.GpuParticles();
            var particleSystemLoaded = this.particleSystem.init(this.shaderLoader);
            var sceneAddObjects = function (objectsArray) {
                _.each(objectsArray, function (o) { scene.add(o); });
            };
            scene.add(this.camera);
            scene.add(this.particleSystem);
            sceneAddObjects(auxObjects);
            if (config.fog.enabled) {
                scene.fog = new THREE.FogExp2(config.fog.color, config.fog.density);
            }
            return particleSystemLoaded.then(function () { return scene; });
        };
        App.prototype.createCamera = function (cameraOpt, name) {
            var camera = new THREE.PerspectiveCamera(cameraOpt.angle, cameraOpt.aspect(), cameraOpt.near, cameraOpt.far);
            camera.name = cameraOpt.name;
            camera.lookAt(cameraOpt.lookAt);
            camera.position.set(cameraOpt.position.x, cameraOpt.position.y, cameraOpt.position.z);
            return camera;
        };
        App.prototype.createAuxObjects = function () {
            return [];
        };
        App.prototype.update = function () {
            var clockDeltaData = App_1.createClockDeltaData();
            this.particleSystem.update(clockDeltaData);
        };
        App.prototype.getCamera = function () {
            return this.camera;
        };
        App.prototype.getParticleSystem = function () {
            return this.particleSystem;
        };
        return App;
    })();
    App_1.App = App;
})(App || (App = {}));
/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./config.ts'/>
/// <reference path="./particles/emitterOptions.ts"/>
/// <reference path="./particles/valueTypes.ts"/>
var dat;
var App;
(function (App) {
    var ValueType = GpuParticles.ValueType;
    var ValueMode;
    (function (ValueMode) {
        ValueMode[ValueMode["RANGE"] = 0] = "RANGE";
        ValueMode[ValueMode["VALUE"] = 1] = "VALUE";
    })(ValueMode || (ValueMode = {}));
    var UI = (function () {
        function UI() {
        }
        UI.prototype.init = function (renderer, scene, app) {
            var _this = this;
            console.log('ui init');
            var gui = new dat.GUI();
            UI.addColorCtrls(gui, 'background', config.background, function (v) {
                renderer.setClearColor(config.background);
            });
            var emOpts = app.getParticleSystem().getEmitters();
            _.each(emOpts, function (v) {
                _this.addEmitterControls(gui, v);
            });
        };
        UI.prototype.addEmitterControls = function (gui, emitter) {
            var emitterOpt = emitter.getEmitterOptions(), folder = gui.addFolder('Emitter'), innerFolder;
            folder.open();
            folder.add(emitter, 'visible').name('Visible');
            folder.add(emitterOpt, 'count', 1000, 1000000).name('Particle count').onFinishChange(function (value) {
                emitter.recreateWithParticleCount(value);
            });
            folder.add(emitterOpt, 'spawnRate', 100, 50000).name('Spawn rate');
            this.addControls(folder, 'Lifetime', emitterOpt.lifetime, {
                mode: ValueMode.VALUE,
                min: 0.5,
                max: 7,
                distr_min: 0,
                distr_max: 3
            });
            innerFolder = folder.addFolder('Initial particle position');
            this.addControls(innerFolder, '', emitterOpt.initialPosition, {
                mode: ValueMode.VALUE,
                min: -50.0,
                max: 50.0,
                distr_min: 0,
                distr_max: 20.0
            });
            innerFolder = folder.addFolder('Turbulence');
            this.addControls(innerFolder, '', emitterOpt.turbulenceOverLife, {
                mode: ValueMode.RANGE,
                min: 0.0,
                max: 1.0,
                distr_min: 0,
                distr_max: 1.0
            });
            innerFolder = folder.addFolder('Size');
            this.addControls(innerFolder, '', emitterOpt.sizeOverLife, {
                mode: ValueMode.RANGE,
                min: 0.0,
                max: 0.99,
                distr_min: 0,
                distr_max: 1.0
            });
            innerFolder = folder.addFolder('Color');
            this.addControls(innerFolder, 'color', emitterOpt.colorOverLife, {
                mode: ValueMode.RANGE,
                min: 0.0,
                max: 0.0,
                distr_min: 0,
                distr_max: 0.05
            });
            innerFolder = folder.addFolder('Opacity');
            this.addControls(innerFolder, '', emitterOpt.opacityOverLife, {
                mode: ValueMode.RANGE,
                min: 0.0,
                max: 1.0,
                distr_min: 0,
                distr_max: 1.0
            });
        };
        UI.prototype.addControls = function (gui, name, valueFactory, opt) {
            var type = valueFactory.getType(), widgetFactory = this.getUIWidgetFactory(type);
            widgetFactory(gui, name, valueFactory, opt);
        };
        UI.prototype.getUIWidgetFactory = function (type) {
            var uiWidgetFactory = {};
            uiWidgetFactory[ValueType.NUMBER] = UI.addNumberUI;
            uiWidgetFactory[ValueType.VECTOR3] = UI.addVec3UI;
            uiWidgetFactory[ValueType.COLOR] = UI.addColUI;
            var f = uiWidgetFactory[type];
            if (f === undefined) {
                throw new Error("No uiWidgetFactory for " + ValueType[type] + "(" + type + ")");
            }
            return f;
        };
        UI.addNumberUI = function (gui, name, valueFactory, opt) {
            var cfg = valueFactory.getConfig(), bv = cfg._baseValue;
            if (opt.mode === ValueMode.VALUE) {
                gui.add(bv, 'start', opt.min, opt.max).name(name);
            }
            else {
                gui.add(bv, 'start', opt.min, opt.max).name(name + " start");
                gui.add(bv, 'end', opt.min, opt.max).name(name + " end");
            }
            gui.add(cfg, '_distribution', opt.distr_min, opt.distr_max).name(name + " rand");
        };
        UI.addVec3UI = function (gui, name, valueFactory, opt) {
            var cfg = valueFactory.getConfig(), bv = cfg._baseValue;
            gui.add(cfg, '_distribution', opt.distr_min, opt.distr_max).name(name + " rand");
        };
        UI.addColUI = function (gui, name, valueFactory, opt) {
            var cfg = valueFactory.getConfig(), bv = cfg._baseValue;
            if (_.isFunction(bv.startValue()) || _.isFunction(bv.endValue()))
                return;
            if (opt.mode === ValueMode.VALUE) {
                bv.start = new THREE.Color(bv.startValue());
                UI.addColorCtrls(gui, 'value', bv.startValue());
            }
            else {
                bv.start = new THREE.Color(bv.startValue());
                bv.end = new THREE.Color(bv.endValue());
                UI.addColorCtrls(gui, 'start', bv.startValue());
                UI.addColorCtrls(gui, 'end', bv.endValue());
            }
            gui.add(cfg, '_distribution', opt.distr_min, opt.distr_max).name(name + " rand");
        };
        UI.addVectorCtrls = function (gui, name, vec, opt) {
            var spacer = name.length > 0 ? ' ' : '', vv = new THREE.Vector3();
            if (isVector(vec)) {
                vv = vv.add(vec);
            }
            var g1 = gui.add(vv, 'x', opt.min, opt.max).name("" + name + spacer + "x").onChange(onChange), g2 = gui.add(vv, 'y', opt.min, opt.max).name("" + name + spacer + "y").onChange(onChange), g3 = gui.add(vv, 'z', opt.min, opt.max).name("" + name + spacer + "z").onChange(onChange);
            function onChange(e) {
                if (!isVector(vec))
                    return;
                vec.setX(g1.getValue());
                vec.setY(g2.getValue());
                vec.setZ(g3.getValue());
            }
            function isVector(v) {
                return GpuParticles.getValueType(vec) === ValueType.VECTOR3;
            }
        };
        UI.addColorCtrls = function (gui, name, col, cb) {
            var prop = 'color', dummy = {};
            dummy[prop] = "#" + col.getHexString();
            name = name || prop;
            gui.addColor(dummy, prop).name(name).onChange(function (value) {
                col.setStyle(value);
                if (cb)
                    cb(value);
            });
        };
        return UI;
    })();
    App.UI = UI;
})(App || (App = {}));
/// <reference path='../typings/tsd.d.ts'/>
/// <reference path='./app.ts'/>
/// <reference path='./config.ts'/>
/// <reference path='./ui.ts'/>
/// <reference path="./utils/shaderLoader.ts"/>
'use strict';
var renderer, scene, app, ui;
function init() {
    console.log('init()');
    renderer = new THREE.WebGLRenderer();
    scene = new THREE.Scene();
    app = new App.App();
    ui = new App.UI();
    renderer.setClearColor(config.background);
    renderer.setSize(config.width(), config.height());
    var sceneLoadedPromise = app.init(scene);
    sceneLoadedPromise.then(function () {
        console.log('scene loaded');
        ui.init(renderer, scene, app);
    }).done();
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onResize);
    animloop();
}
function onResize(e) {
    console.log('resize (' + config.width() + 'x' + config.height() + ')');
    var camera = app.getCamera();
    camera.aspect = config.camera.aspect();
    camera.updateProjectionMatrix();
    renderer.setSize(config.width(), config.height());
}
function animloop() {
    if (window.hasOwnProperty('requestAnimFrame')) {
        var w = window;
        w.requestAnimFrame(animloop);
    }
    app.update();
    renderer.render(scene, app.getCamera());
}
init();
/// <reference path='../../typings/tsd.d.ts'/>
var GpuParticles;
(function (GpuParticles) {
    var ValueFactory = (function () {
        function ValueFactory(type, config, opt) {
            this.type = type;
            this.config = config;
            this.setOptions(opt);
            this.rand = function () {
                return Math.random() * 2 - 1;
            };
        }
        ValueFactory.prototype.setOptions = function (opt) {
            if (this.type === GpuParticles.ValueType.COLOR) {
                this.transformOptions = GpuParticles.colorTransformsOptions();
            }
            else {
                this.transformOptions = opt || {};
            }
        };
        ValueFactory.prototype.getValue = function () {
            var ifFunctionThenArgs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                ifFunctionThenArgs[_i - 0] = arguments[_i];
            }
            return this.__getValue(GpuParticles.StartEndValues.StartLens, ifFunctionThenArgs);
        };
        ValueFactory.prototype.getStartEndValues = function () {
            var ifFunctionThenArgs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                ifFunctionThenArgs[_i - 0] = arguments[_i];
            }
            return new GpuParticles.StartEndValues(this.__getValue(GpuParticles.StartEndValues.StartLens, addNewLastArg(ifFunctionThenArgs, 'start')), this.__getValue(GpuParticles.StartEndValues.EndLens, addNewLastArg(ifFunctionThenArgs, 'end')));
            function addNewLastArg(args, arg) {
                return args.splice(-1, 0, arg);
            }
        };
        ValueFactory.prototype.__getValue = function (seLens, ifFunctionThenArgs) {
            var rawValue = this.config.getBaseValue(seLens, ifFunctionThenArgs), converter = GpuParticles.getValueConverter(this.type), baseValue = (typeof rawValue === 'number') ?
                converter.fromNumber(rawValue) :
                rawValue;
            return converter.getValue(_.bind(this.getValueAsNumber, this), baseValue);
        };
        ValueFactory.prototype.getValueAsNumber = function (baseValue) {
            var v = baseValue + this.rand() * (this.config.getDistribution() / 2), opt = this.transformOptions;
            if (opt.mul !== undefined) {
                v *= opt.mul;
            }
            if (opt.clampMin !== undefined) {
                v = Math.max(v, opt.clampMin);
            }
            if (opt.clampMax !== undefined) {
                v = Math.min(v, opt.clampMax);
            }
            if (opt.isInt) {
                v = Math.floor(v);
            }
            return v;
        };
        ValueFactory.prototype.getConfig = function () {
            return this.config;
        };
        ValueFactory.prototype.getType = function () {
            return this.type;
        };
        return ValueFactory;
    })();
    GpuParticles.ValueFactory = ValueFactory;
})(GpuParticles || (GpuParticles = {}));
