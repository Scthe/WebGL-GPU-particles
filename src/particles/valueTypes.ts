/// <reference path='../../typings/tsd.d.ts'/>

module GpuParticles {

  ///////////////////////////////
  /// ValueConfig
  ///////////////////////////////

  export type RawValue<R> = R | number;
  export type RawValueFactory<R> = (...any) => RawValue<R>;
  export type Value<R> = RawValue<R> | RawValueFactory<R>;


  export class ValueConfig<T> {
      _baseValue: StartEndValues<Value<T>>;
      _distribution: number;

      constructor(start: Value<T>, end?: Value<T>){
        this._baseValue = new StartEndValues(start, end);
        this._distribution = 0;
      }

      distribution(distribution: number): ValueConfig<T>{
        this._distribution = distribution;
        return this;
      }

      baseValue(seLens: StartEndLens<Value<T>>, value: Value<T>): ValueConfig<T>{
        let v = seLens(this._baseValue),
            type = getValueType(v),
            converter = getValueConverter(type);

        // numbers are passed by value, hence this pseudo reflection
        if (seLens === StartEndValues.StartLens){
          converter.set(this._baseValue, 'start', value);
        } else {
          converter.set(this._baseValue, 'end', value);
        }

        return this;
      }

      getBaseValue(seLens: StartEndLens<Value<T>>, ifFunctionThenArgs: any[]): RawValue<T> {
        let value: Value<T> = seLens(this._baseValue);

        if (_.isFunction(value)){
          let valOfThis = ifFunctionThenArgs.shift() || window,
              rawValueFactory: RawValueFactory<T> = <any> value;
          return rawValueFactory.apply(valOfThis, ifFunctionThenArgs);
        } else {
          return <any>value;
        }
      }

      getDistribution(): number{
        return this._distribution;
      }
  }

///////////////////////////////
/// ValueType
///////////////////////////////

  export enum ValueType { // TODO add Function
    NUMBER, VECTOR2, VECTOR3, COLOR
  }

  export function getValueType(vv: any): ValueType {
    return (typeof vv === 'number')      ? ValueType.NUMBER :
           (vv instanceof THREE.Color)   ? ValueType.COLOR :
           (vv instanceof THREE.Vector3) ? ValueType.VECTOR3 :
           (vv instanceof THREE.Vector2) ? ValueType.VECTOR2 :
           undefined;
  }

///////////////////////////////
/// StartEndValues
///////////////////////////////

  export type StartEndLens<U> = (v: StartEndValues<U>) => U;

  export class StartEndValues<R> {
    start: R;
    end: R;

    constructor(start: R, end?: R){
      this.start = start;
      this.end = end !== undefined ? end : start;
    }

    startValue(): R { return this.start; }

    endValue(): R {
      if (this.useStartValueAsEndValue()){
        this.end = this.cloneStartValue();
      }
      return this.end;
    }

    private cloneStartValue(): R {
      let v = this.startValue(),
          type = getValueType(v),
          converter = getValueConverter(type);
      return <any>converter.clone(v);
    }

    private useStartValueAsEndValue(){ return this.end === undefined; }

    static StartLens<U>(v: StartEndValues<U>): U { return v.start; }
    static EndLens  <U>(v: StartEndValues<U>): U { return v.end; }
  }

///////////////////////////////
/// ValueTransformOptions
///////////////////////////////

  // TODO moke this array of transformers: [mul255, clampMin, clampMax, toInt]
  export interface ValueTransformOptions {
    clampMin?: number;
    clampMax?: number;
    mul?: number;
    isInt?: boolean;
  }

  export function colorTransformsOptions(): ValueTransformOptions {
    return {
      mul: 255,
      // clampMin: 0,
      // clampMax: 255,
      isInt: true
    };
  }

///////////////////////////////
/// ValueConverters
///////////////////////////////

  type NumberProvider = (v: number) => number;

  let valueConverters: ValueConverter<any>[] = [];

  function declareValueConverter<U>(valueType: ValueType, converter: ValueConverter<U>){
    valueConverters[valueType] = converter;
  }

  export function getValueConverter<U>(type: ValueType): ValueConverter<U>{
    let converter = valueConverters[type];
    if (converter === undefined){
      throw new Error(`No value converter for ${ValueType[type]}(${type})`);
    }
    return converter;
  }

  export interface ValueConverter<R>{
    clone(value: R): R;
    set(object: any, prop: string, newValue: R): void;
    fromNumber(value: number): R;
    getValue(numberProvider: NumberProvider, v: R): R;
  }

  ///
  /// implementstions follow
  ///

  class NumberValueConverter implements ValueConverter<number> {

    clone(value: number): number{ return value; }
    fromNumber(value: number): number { return value; }

    set(object: any, prop: string, newValue: number): void{
      object[prop] = newValue;
    }

    getValue(numberProvider: NumberProvider, value: number): number {
      return numberProvider(value);
    }
  }
  declareValueConverter(ValueType.NUMBER, new NumberValueConverter());

  class Vector3ValueConverter implements ValueConverter<THREE.Vector3> {

    fromNumber(value: number){ return new THREE.Vector3(value, value, value); }

    clone(value: THREE.Vector3): THREE.Vector3{
      let vec = new THREE.Vector3();
      this._set(vec, value);
      return vec;
    }

    set(object: any, prop: string, newValue: THREE.Vector3): void{
      let vec: THREE.Vector3 = object[prop];
      this._set(vec, newValue);
    }

    private _set(vec: THREE.Vector3, newValue: THREE.Vector3): void{
      vec.setX(newValue.x);
      vec.setY(newValue.y);
      vec.setZ(newValue.z);
    }

    getValue(numberProvider: NumberProvider, value: THREE.Vector3): THREE.Vector3 {
      return new THREE.Vector3(numberProvider(value.x),
                               numberProvider(value.y),
                               numberProvider(value.z));
    }
  }
  declareValueConverter(ValueType.VECTOR3, new Vector3ValueConverter());

  class Vector2ValueConverter implements ValueConverter<THREE.Vector2> {

    fromNumber(value: number){ return new THREE.Vector2(value, value); }

    clone(value: THREE.Vector2): THREE.Vector2{
      let vec = new THREE.Vector2();
      this._set(vec, value);
      return vec;
    }

    set(object: any, prop: string, newValue: THREE.Vector2): void{
      let vec: THREE.Vector2 = object[prop];
      this._set(vec, newValue);
    }

    private _set(vec: THREE.Vector2, newValue: THREE.Vector2): void{
      vec.setX(newValue.x);
      vec.setY(newValue.y);
    }

    getValue(numberProvider: NumberProvider, value: THREE.Vector2): THREE.Vector2 {
      return new THREE.Vector2(numberProvider(value.x),
                               numberProvider(value.y));
    }
  }
  declareValueConverter(ValueType.VECTOR2, new Vector2ValueConverter());

  class ColorValueConverter implements ValueConverter<THREE.Color> {

    clone(value: THREE.Color): THREE.Color{ return new THREE.Color(value); }
    fromNumber(value: number){ return (new THREE.Color()).set(value); }

    set(object: any, prop: string, newValue: THREE.Color): void{
      let col: THREE.Color = object[prop];
      col.set(newValue);
    }

    getValue(numberProvider: NumberProvider, value: THREE.Color): THREE.Color {
      let valueAsVec: THREE.Vector3 = new THREE.Vector3(value.r, value.g, value.b),
          vec3Converter = getValueConverter<THREE.Vector3>(ValueType.VECTOR3),
          newValues = vec3Converter.getValue(numberProvider, valueAsVec),
          arr = newValues.toArray();

      for (let i = 0; i < arr.length; i++){
        let v = arr[i];
        while(v < 0){ v += 255; }
        arr[i] = Math.floor(v % 256);
      }

      return (new THREE.Color()).fromArray(arr);
    }
  }
  declareValueConverter(ValueType.COLOR, new ColorValueConverter());


}
