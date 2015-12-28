/// <reference path='../../typings/tsd.d.ts'/>

// partially inspired by https://github.com/krampstudio/aja.js/blob/master/src/aja.js

module Utils {

	enum HttpMethod {
		CONNECT,
    DELETE,
    GET,
    HEAD,
    OPTIONS,
    PATCH,
    POST,
    PUT,
    TRACE
	}

	enum ResponseConverter {
		TEXT, JSON
	}

	interface HttpOpt {
		url: string,
		method?: HttpMethod,
		timeoutMS?: number,
		data?: any,
		async?: boolean,
		responseConverter?: ResponseConverter
	}

	var defaultHttpOpt = {
		method: HttpMethod.GET,
		timeoutMS: 0,
		data: null,
		async: true,
		responseConverter: ResponseConverter.TEXT
	};

	export function Http(opt: HttpOpt): Q.Promise<any> {
		let defered = Q.defer<any>(),
				$window: any = window,
				timeoutId;

			opt = getOpt(opt);

		if ($window.XMLHttpRequest) {
				//Firefox, Opera, IE7, and other browsers will use the native object
				var request = new $window.XMLHttpRequest();
		} else {
				//IE 5 and 6 will use the ActiveX control
				var request = new $window.ActiveXObject('Microsoft.XMLHTTP');
		}

		let methodStr: string = HttpMethod[opt.method];
		request.open(methodStr, opt.url, opt.async);

		request.onreadystatechange = function () {
				if (request.readyState !== 4) return;

				if (request.status >= 200 && request.status < 300) {
					defered.resolve(request.response);
				}
		};
		request.onerror = function onRequestError (err){
        defered.reject(err);
    };

		if (opt.timeoutMS !== undefined && opt.timeoutMS > 0) {
			timeoutId = setTimeout(function() {
					timeoutId = undefined;
					if (defered.promise.isPending){
						request.abort();
						defered.reject('Request timed out');
					}
        }, opt.timeoutMS);
		}

		request.send(opt.data);

		var p = defered.promise
			.finally(() => {
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
			})
			.then((resp) => {
				return convertResponse(opt, resp);
			});

		return p;
	}

	function getOpt(opt:HttpOpt): HttpOpt {
		var opt_ = _.extend({}, defaultHttpOpt, opt);

		if (opt_.data !== undefined && opt_.data !== null){
			if (typeof opt_.data === 'object'){
				opt_.data = JSON.stringify(opt_.data);
			}
		} else {
			opt_.data = null;
		}

		return opt_;
	}

	function convertResponse(opt: HttpOpt, resp: any){
		if (resp === undefined || resp === null) return undefined;

		if (opt.responseConverter === ResponseConverter.JSON) {
			resp = JSON.parse(resp); // no way of handling errors here
		}

		return resp;
	}

}
