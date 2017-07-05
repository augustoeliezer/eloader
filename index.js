/**
 * 	@description Loads directory modules and injects dependencies.
 * 	@author Eliézer Augusto de Moraes Andrade
 * 	@version 1.0.0
 */

const fs = require('fs');

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 * @private
 * @description Keep 
 * @type {Array}
 */
let $$cache = {};

/**
 * @public
 * @description Called on throw exception in run. Can be overwritten.
 * @param       {String} Module path.
 * @param       {Exception/String} Error.
 * @return      {Boolean} True to stop load another files.
 */
let fallback = function (path, err) {
	
	console.error('[Error]  ', path,'\n[Details]', err);
	// By default continue loadind another files.
	return false;
};

/**
 * @public
 * @description Add a personal object istance to cache. 
 * @param       {String} Dependency name. 
 * @param       {Object} Dependency isntance.
 * @return      {Object} Eloader instance.
 * @throws 		{Exception} If module name already exists.
 */
let add = function (name, object) {

	try {
		// [Warning] Can't be a module from node or node_modules. Example: 'fs'
		if (require.resolve(name)) {

			throw 'Module already exists';
		}
	} catch (err) {

		if (object != null) {

			$$cache[name] = object;
		}
	}

	return this;
}

/**
 * @public
 * @description Gets the instance in cache or from require.
 * @param       {String} Dependency name. Can be node module.
 * @return      {Object} Dependency instance. If node_module or node, the require of this.
 */
let get = function (name) {

	try {

		let module = require.resolve(name);
		return require(name);
	} catch (err) {

		let cache = $$cache[name];
		if (cache === undefined || cache === null) {

			throw 'Module ' + name + ' not find!';
		}

		return cache;
	}
}

/**
 * @private
 * @description Gets the params of a function.
 * @param       {Function} A function
 * @return      {Array}	Array of string with the params
 */
let getParamNames = function (func) {

  let fnStr = func.toString().replace(STRIP_COMMENTS, '');
  let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

  if(result === null)

     result = [];
  return result;
};


/**
 * @public
 * @description If defined $inject get modules from it and execute, else call loadHard.
 * @param       {String} Module path.
 * @param       {Object} Module instance.
 */
let load = function (path, module) {
	let instances = [];

	if (typeof module.main !== 'function') {

		throw 'Error module without main.';
	}
	//Simple
	if (Array.isArray(module.$inject) && module.$inject.length > 0) {

		for (let i = 0; i < module.$inject.length; i++) {

			let mod = get(module.$inject[i])
			
			instances.push(mod);
		}

		module.main.apply(null, instances);
	} else {
		//Hard
		loadHard(path, module);
	}
	return true;
}

/**
 * @private
 * @description Inject modules from function params, and call it.
 * @param       {String} Module path.
 * @param       {Object}	Module instance.
 */
let loadHard = function (path, module) {
	let instances = [];

	var list = getParamNames(module.main);
	
	for (let i = 0; i < list.length; i++) {
		instances.push(get(list[i]));
	}

	module.main.apply(null, instances);
}

/**
 * @public
 * @description Execute search for modules to load.
 * @param       {String} Initial path to search for files.
 * @optional    {Boolean} Includes directories in search.
 * @return      {Object} Instance of this module.
 */
let run = function (initialPath, includeDirs) {

	fs.readdirSync(initialPath).forEach(function(file) {

		let path = initialPath+file;
	    let item = fs.statSync(path);

	    if (item.isFile() && file.toLowerCase().indexOf('.js') > 0) {

	    	try {

	    		let module = require(path);
	    		load(path,module);
	    	} catch (err) {

	    		if (fallback.call(null, path, err)) return this;
	    	}
	    } else {

	    	if (includeDirs && item.isDirectory()) {

	    		run(path + '\\', true);
	    	}
	    }
	});

	return this;
}

exports.run = run;
exports.add = add;
exports.get = get;
exports.load = load;
exports.fallback = fallback;