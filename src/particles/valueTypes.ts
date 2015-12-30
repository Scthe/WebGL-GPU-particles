/// <reference path='../../typings/tsd.d.ts'/>

module GpuParticles {

  export type ParticleColor = THREE.Color | number;
  let isOfTypeParticleColor = (val: any) => { return (typeof val === 'number') || (val instanceof THREE.Color); } // TS does not do this for us

  interface ValueGetter {
      (n: number): any;
  }

  ///
  /// Types classes
  ///

  export class StartEndRange<T> {
    _startValue: T;
    _endValue: T;

    constructor(startValue: T, endValue?: T){
      this._startValue = startValue;
      this._endValue = endValue;
    }

    startValue(): T { return this._startValue; }
    endValue()  : T { return this.useStartValueAsEndValue() ? this._startValue : this._endValue; }
    useStartValueAsEndValue(){ return this._endValue === undefined; }
  }

  export class ValueWithDistribution<T>{
    value: T;
    distribution: number;

    constructor(value: T, distribution?: number){
      this.value = value;
      this.distribution = distribution !== undefined ? distribution : -1.0;
    }
  }

  ///
  /// Values providers
  ///

  interface ValueReaderOpt {
    ifFunctionThenArgs?: any[];
    /** even though we have separate ParticleColor type, we need to handle this case if we were provided number */
    isColor?: boolean;
    // TODO add isRange?: boolean to auto convert to StartEndRange
  }
  let defaultValueReaderOpt: ValueReaderOpt = {
    ifFunctionThenArgs: [],
    isColor: false,
  }

  interface Vec extends THREE.Vector {
    toArray(xyz?: number[], offset?: number): number[];
    fromArray(xyz: number[], offset?: number): THREE.Vector;
  }

  export function valueReaderProvider(randFunction: Function): Function {
    let rand2 = () => { // from [0..1] to [-1..1]
      return randFunction() * 2 - 1;
    },
    reader = new ValueReader(rand2);

    return _.bind(reader.read, reader);
  }


  class ValueReader {

    randFunction: Function;

    constructor(randFunction: Function) {
      this.randFunction = randFunction;
    }

    read<T>(rawValue: any, opt?: ValueReaderOpt): T {
      opt = opt || {};
      let opt2 = _.extend({}, defaultValueReaderOpt, opt);

      if (_.isFunction(rawValue)){
        // get value to further process
        let tmp: T = rawValue.apply(window, opt2.ifFunctionThenArgs);
        return <T><any>this.read(tmp, opt2);
      } else {

        // wrap in VWD with no distribution - this will effectively make it const and allow for unified processing
        let vv = rawValue instanceof ValueWithDistribution ? rawValue : new ValueWithDistribution(rawValue, 0.0);
        return <T><any>this.getValueFromDistribution(opt2, vv);
      }
    }

    private getValueFromDistribution<T>(opt: ValueReaderOpt, distr: ValueWithDistribution<T>): T {
      let baseVal: T = distr.value,
          handlers = { // we are going to switch on type of T
            number:  this.getValueFromDistributionNum,
            Vector2: this.getValueFromDistributionV,
            Vector3: this.getValueFromDistributionV,
            StartEndRange: this.getValueFromDistributionSER,
            Color:   this.getValueFromDistributionColor,
          },
          handlerForThisCase: string = (opt.isColor && isOfTypeParticleColor(baseVal)) ? 'Color' :
                                       (typeof baseVal === 'number') ? 'number' :
                                       (baseVal instanceof THREE.Vector3) ? 'Vector3' :
                                       (baseVal instanceof THREE.Vector2) ? 'Vector2' :
                                       (baseVal instanceof StartEndRange) ? 'StartEndRange' : '';

      if (handlerForThisCase.length > 0 && handlers.hasOwnProperty(handlerForThisCase)){
        return handlers[handlerForThisCase].call(this, opt, distr);
      } else {
        throw "Could not randomize particle parameter: " + JSON.stringify(baseVal);
      }
    }

    // for some reason we cannot use polymorphism on generics argument..
    // I don't think even Java allows for that (type erasure)
    // writting everything by hand:

    private getValueFromDistributionImpl(opt: ValueReaderOpt, distribution: number, value: number): number {
      return value + this.randFunction() * distribution;
    }

    private getValueFromDistributionNum(opt: ValueReaderOpt, distr: ValueWithDistribution<number>): number{
      return this.getValueFromDistributionImpl(opt, distr.distribution, distr.value);
    }

    private getValueFromDistributionV(opt: ValueReaderOpt, distr: ValueWithDistribution<Vec>){
      let arr =  distr.value.toArray();
      _.map(arr, (v: number) => {
        return this.getValueFromDistributionImpl(opt, distr.distribution, v);
      });
      return (<Vec>distr.value.clone()).fromArray(arr);
    }

    private getValueFromDistributionSER<T>(opt: ValueReaderOpt, distr: ValueWithDistribution<StartEndRange<T>>): StartEndRange<T> {
      let baseVal: StartEndRange<T> = distr.value,
          startVWD = new ValueWithDistribution(baseVal.startValue(), distr.distribution),
          endVWD   = new ValueWithDistribution(baseVal.endValue(), distr.distribution),
          startVal: T, endVal: T;

      startVal = this.getValueFromDistribution<T>(opt, startVWD);
      if (baseVal.useStartValueAsEndValue()){
        endVal = startVal;
      } else {
        endVal = this.getValueFromDistribution<T>(opt, endVWD);
      }

      return new StartEndRange(startVal, endVal);
    }

    private getValueFromDistributionColor<ParticleColor>(opt: ValueReaderOpt, distr: ValueWithDistribution<ParticleColor>): ParticleColor {
      opt.isColor = false;
      // we will handle color as vector
      let asColor: THREE.Color = (new THREE.Color()).set(<any>distr.value), // TS, WTF?
          vec = (new THREE.Vector3()).fromArray(asColor.toArray()),
          newValues = this.getValueFromDistribution(opt, new ValueWithDistribution(vec, distr.distribution)),
          newValuesArr = _.map(newValues.toArray(), (v) => { return Math.floor(255 * Math.max(0.0, Math.min(1.0, v))); });
      return <ParticleColor><any> asColor.fromArray(newValuesArr); // TS, WTF?
    }

  }

}
