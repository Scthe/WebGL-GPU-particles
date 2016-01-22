/// <reference path='../../typings/tsd.d.ts'/>

module GpuParticles {

///////////////////////////////
/// ValueTypes2
///////////////////////////////

  export enum ValueTypes2 {
    NUMBER, VECTOR2, VECTOR3, COLOR
  }

  function getValueTypeName(vv: any): string {
    return (typeof vv === 'number')      ? ValueTypes2[ValueTypes2.NUMBER] :
           (vv instanceof THREE.Color)   ? ValueTypes2[ValueTypes2.COLOR] :
           (vv instanceof THREE.Vector3) ? ValueTypes2[ValueTypes2.VECTOR3] :
           (vv instanceof THREE.Vector2) ? ValueTypes2[ValueTypes2.VECTOR2] :
           undefined;
  }

///////////////////////////////
/// StartEndValues
///////////////////////////////

  export class StartEndValues<R> {
    start: R;
    end: R;

    constructor(start: R, end?: R){
      this.start = start;
      this.end = end !== undefined ? end : start;
    }

    startValue(): R { return this.start; }

    endValue(): R {
      if (this.end === undefined && this.useStartValueAsEndValue()){
        this.end = <R><any>this.cloneStartvalue();
      }
      return this.end;
    }

    private useStartValueAsEndValue(){ return this.end === undefined; }

    private cloneStartvalue(){
      let baseVal: any = this.startValue();
      return (typeof baseVal === 'number')      ? baseVal :
             (baseVal instanceof THREE.Color)   ? new THREE.Color(baseVal) :
             (baseVal instanceof THREE.Vector3) ? new THREE.Vector3(baseVal) :
             (baseVal instanceof THREE.Vector2) ? new THREE.Vector2(baseVal) :
             undefined;
    }

    static StartLens<U>(v: StartEndValues<U>): U { return v.start; }
    static EndLens  <U>(v: StartEndValues<U>): U { return v.end; }
  }
  type StartEndLens<U> = (v: StartEndValues<U>) => U;

///////////////////////////////
/// ValueReader2Opt
///////////////////////////////

  interface ValueReader2Opt {
    clampMin?: number;
    clampMax?: number;
    mul?: number;
    isInt?: boolean;
  }
  let colorValueReader2Opt = {
    mul: 255,
    clampMin: 0,
    clampMax: 255,
    isInt: true
  };

///////////////////////////////
/// ValueConverter
///////////////////////////////

  type NumberProvider = (v: number) => number;

  interface ValueConverter<R>{
    fromNumber(value: number): R;

    getValue(numberProvider: NumberProvider, v: R): R;
  }

  let valueConverters: ValueConverter<any>[] = [];

  function declareValueConverter<U>(valueType: ValueTypes2, converter: ValueConverter<U>){
    valueConverters[valueType] = converter;
  }

  function getValueConverter<U>(type: ValueTypes2): ValueConverter<U>{
    let converter = valueConverters[type];
    if (converter === undefined){
      throw new Error(`No value converter for ${ValueTypes2[type]}(${type})`);
    }
    return converter;
  }

  ///////////////////////////////
  /// ValueLens
  ///////////////////////////////
  export interface ValueLens<T> {
			value?: number,
			range?: {
				start: number,
				end: number,
			},
			distribution?: number
  }

///////////////////////////////
/// ValueFactory2
///////////////////////////////

  type RawValueFactory<U> = (...any) => RawValue<U>;

  type RawValue<R> = R | number | StartEndValues<R> | StartEndValues<number>;

  type Value<R> = RawValue<R> | RawValueFactory<R>;

  export class ValueFactory2<T> {

    private rand: () => number;
    private type: ValueTypes2;
    private opt: ValueReader2Opt;
    private baseValue: Value<T>;
    private distribution: number;


    constructor(type: ValueTypes2, opt?: ValueReader2Opt){
      this.type = type;
      this.setOptions(opt);

      this.rand =  () => { // from [0..1] to [-1..1]
        return Math.random() * 2 - 1;
      };
    }

    private setOptions(opt?: ValueReader2Opt){
      opt = opt || {};

      if (this.type === ValueTypes2.COLOR){
        this.opt = colorValueReader2Opt;
      } else {
        this.opt = opt;
      }
    }

    getValue(...ifFunctionThenArgs: any[]): T {
      return this.__getValue(StartEndValues.StartLens, ifFunctionThenArgs);
    }

    getStartEndValues(...ifFunctionThenArgs: any[]): StartEndValues<T> {
      return new StartEndValues<T>(
        this.__getValue(StartEndValues.StartLens, addNewLastArg(ifFunctionThenArgs, 'start')),
        this.__getValue(StartEndValues.EndLens,   addNewLastArg(ifFunctionThenArgs, 'end'))
      );

      function addNewLastArg(args: any[], arg: any){
        return args.splice(-1, 0, arg)
      }
    }

    private __getValue(seLens: StartEndLens<T>, ifFunctionThenArgs: any[]): T {
      let baseValueOrNumber: T | number = this.getBaseValue(seLens, ifFunctionThenArgs),
          converter: ValueConverter<T> = getValueConverter<T>(this.type),
          baseValue: T = (typeof baseValueOrNumber === 'number') ?
                           converter.fromNumber(baseValueOrNumber) :
                           baseValueOrNumber;

          return converter.getValue(_.bind(this.getValueAsNumber, this), baseValue);
    }

    private getBaseValue(seLens: StartEndLens<T>, ifFunctionThenArgs: any[]): T | number {
      let value: RawValue<T>;

      if (_.isFunction(this.baseValue)){
        let valOfThis = ifFunctionThenArgs.shift() || window;
        value = <any>(<any>this.baseValue).apply(valOfThis, ifFunctionThenArgs);
      } else {
        value = <any>this.baseValue;
      }

      if (value === undefined){
        throw new Error('Could not produce value, either baseValue or baseValueFromFunction must be defined');
      }

      return (value instanceof StartEndValues) ? seLens(<any>value) : <any>value;
    }

    private getValueAsNumber(baseValue: number): number {
      let v = baseValue + this.rand() * (this.distribution / 2); // half distribution since rand operates on [-1, 1] range - twice the normal

      if (this.opt.mul      !== undefined){ v *= this.opt.mul; }
      if (this.opt.clampMin !== undefined){ v = Math.max(v, this.opt.clampMin); }
      if (this.opt.clampMax !== undefined){ v = Math.min(v, this.opt.clampMax); }
      if (this.opt.isInt                 ){ v = Math.floor(v); }

      return v;
    }

    /*
    setBaseValue(value: RawValue<T> | RawValueFactory<T>){
      if (value !== undefined){
        this.baseValue = value;
      }
    }
    */
   /*
    getValueLens(): ValueLens<T>{
      let self = this,
          lens = {
            set value(value: Value<T>){
              self.baseValue = value;
            },
            set distribution(value: number){
              self.distribution = value;
            }
          },
          range = {
            set start(value: number){
              // self.distribution = value;
            },
            set end(value: number){
              // self.distribution = value;
            }
          };

      Object.defineProperty(lens, 'range', {value: range })

      return lens;
   }
   */

    setBaseValue(val: Value<T>){
      this.baseValue = val;
    }

    setDistribution(distr: number){
      this.distribution= distr;
    }

    getType(){
      return this.type;
    }

  }


///////////////////////////////
///
///////////////////////////////

  class NumberValueConverter implements ValueConverter<number> {
    fromNumber(value: number){ return value; }

    getValue(numberProvider: NumberProvider, value: number): number {
      return numberProvider(value);
    }
  }
  declareValueConverter(ValueTypes2.NUMBER, new NumberValueConverter());

  class Vector3ValueConverter implements ValueConverter<THREE.Vector3> {
    fromNumber(value: number){ return new THREE.Vector3(value, value, value); }

    getValue(numberProvider: NumberProvider, value: THREE.Vector3): THREE.Vector3 {
      return new THREE.Vector3(numberProvider(value.x),
                               numberProvider(value.y),
                               numberProvider(value.z));
    }
  }
  declareValueConverter(ValueTypes2.VECTOR3, new Vector3ValueConverter());

  class Vector2ValueConverter implements ValueConverter<THREE.Vector2> {
    fromNumber(value: number){ return new THREE.Vector2(value, value); }

    getValue(numberProvider: NumberProvider, value: THREE.Vector2): THREE.Vector2 {
      return new THREE.Vector2(numberProvider(value.x),
                               numberProvider(value.y));
    }
  }
  declareValueConverter(ValueTypes2.VECTOR2, new Vector2ValueConverter());

  class ColorValueConverter implements ValueConverter<THREE.Color> {
    fromNumber(value: number){ return (new THREE.Color()).set(value); }

    getValue(numberProvider: NumberProvider, value: THREE.Color): THREE.Color {
      let valueAsVec: THREE.Vector3 = new THREE.Vector3(value.r, value.g, value.b),
          vec3Converter = getValueConverter<THREE.Vector3>(ValueTypes2.VECTOR3),
          newValues = vec3Converter.getValue(numberProvider, valueAsVec);

      return (new THREE.Color()).fromArray(newValues.toArray());
    }
  }
  declareValueConverter(ValueTypes2.COLOR, new ColorValueConverter());

}
