/// <reference path='../../typings/tsd.d.ts'/>

module GpuParticles {

  export class ValueFactory<T> {

    private rand: () => number;
    private type: ValueType;
    private transformOptions: ValueTransformOptions;
    private config: ValueConfig<T>;


    constructor(type: ValueType, config: ValueConfig<T>, opt?: ValueTransformOptions){
      this.type = type;
      this.config = config;
      this.setOptions(opt);

      this.rand = () => { // from [0..1] to [-1..1]
        return Math.random() * 2 - 1;
      };
    }

    private setOptions(opt?: ValueTransformOptions){
      if (this.type === ValueType.COLOR){
        this.transformOptions = colorTransformsOptions();
      } else {
        this.transformOptions = opt || {};
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
      let rawValue: RawValue<T> = this.config.getBaseValue(seLens, ifFunctionThenArgs),
          converter: ValueConverter<T> = getValueConverter<T>(this.type),
          baseValue: T = (typeof rawValue === 'number') ?
                           converter.fromNumber(rawValue) :
                           rawValue;

          return converter.getValue(_.bind(this.getValueAsNumber, this), baseValue);
    }

    private getValueAsNumber(baseValue: number): number {
      let v = baseValue + this.rand() * (this.config.getDistribution() / 2), // half distribution since rand operates on [-1, 1] range - twice the normal
          opt = this.transformOptions;

      if (opt.mul      !== undefined){ v *= opt.mul; }
      if (opt.clampMin !== undefined){ v = Math.max(v, opt.clampMin); }
      if (opt.clampMax !== undefined){ v = Math.min(v, opt.clampMax); }
      if (opt.isInt                 ){ v = Math.floor(v); }

      return v;
    }

    getConfig(){
      return this.config;
    }

    getType(){
      return this.type;
    }

  }

}
