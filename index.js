/**
 * 	@description Loads directory modules and injects dependencies.
 * 	@author Eliézer Augusto de Moraes Andrade
 * 	@version 1.2.0
 */

//TODO: Move eloader to class inheriting Events

const fs = require('fs');
const path = require('path');
const Events  = require('events');

const directory = require('./directory.js');
const Cache = require('./Cache.js');

class EloaderEvents extends Events {

	async ask(event, obj, path) {
		let res = {stop: false};
        let t = this.emit(event, obj, res, path);
        return res;
	}
}

const events = new EloaderEvents();

/**
 * Regex to get function params.
 * @type {RegExp}
 */
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

let $$cache = {};
let $$routeDirs = [];
let $$serviceDirs = [];


/**
 * @public
 * @deprecated Will be removed in future releases. Use eloder.on('run.error')
 * @description Called on throw exception in run. Can be overwritten.
 * @param       {String} Module path.
 * @param       {Exception/String} Error.
 * @return      {Boolean} True to stop load another files.
 */
let fallback = function (path, err) {
	
	// By default continue loadind another files.
	return null; 
};

/**
 * Check if will exit on error.
 * @param  {String/Error} error The error
 * @return {Boolean} False if error dont stop the process.
 */
let throws = function (error, path) {
	
	if (!error instanceof Error) {
		error = new Error(error);
	}

	//Check for deprecated method.
	if (path) {

		let res = fallback(path,error);
		if (res !== null) {
			console.warn('[Deprecated Error]  ', path,'\n[Details]', error);

			if (res === true) {
				return process.exit(1);
			} else {

				return false;
			}
		}
	}
	

	events.ask('error', error, path).then((res) => {

		if (res.stop) {

			events.emit('warn', 'Stopped.');
			process.exit(1);
		}
	});

	return false;
};

/**
 * @public
 * @description Add a personal object istance to cache. Now warning if try overwrite an object.
 * @param       {String} Dependency name. 
 * @param       {Object} Dependency isntance.
 * @return      {Object} Eloader instance.
 * @throws 		{Exception} If name are not present.
 * @throws 		{Exception} If name already exists as another node module.
 */
let add = function (name, object) {

	addObject(name, object);
	return this;
}

/**
 * @description Store an object to be injected. Name can't be equal node modules. (Including installed packages).
 * @param 		{String} Name to be used in injection.
 * @return 		{Object} Eloader instance.
 * @throws		{Exception} If name are not present.
 * @throws		{Exception} If name already exists as another node module.
 */
let addObject = function (name, object) {
	
	events.emit('info', '[AddObject] => ' + name);

	if (!name) {
		events.emit('warn','Name is required!');
		return this;
	}
	if (isNodeModule(name)) {
	
		events.emit('warn', 'This module ['+ name +'] already exists in node!');
		return this;
	}
	if ($$cache[name]) {

		events.emit('warn', 'Name ['+ name +'] already in use!');
		return this; //fix
	} 

	$$cache[name] = new Cache(object);
	return this;
}

/**
 * @public
 * @description Add a directory of routes.
 * @param 		{String} Route directory.
 * @param       {Boolean} True to search inside directories.
 * @return 		{Object} Eloader instance.
 * @throws 		{Exception} If param is not a directory.
 */
let addRoutes = function (dir, recursive) {

	events.emit('info', '[AddRoutes] => ' + dir);
	$$routeDirs.push(new directory.Route(dir, recursive));
	return this;
}

/**
 * @public
 * @description Add a directory with modules to be used as service. Modules needs exports $name to be injected.
 * @param       {String} Dependency directory
 * @param 		{Boolean} True to search inside directories.
 * @return 		{Object} Eloader instance.
 * @throws 		{Exception} If param is not a directory.
 */
let addServices = function (dir, recursive) {

	events.emit('info', '[AddServices] => ' + dir);
	$$serviceDirs.push(new directory.Service(dir, recursive));
	return this;
}

/**
 * @public
 * @description Gets the instance in cache or from require.
 * @param       {String} Dependency name. Can be node module.
 * @return      {Object} Dependency instance. If node_module or node, the require of this.
 * @throws		If cant resolve the name as node module or registred service.
 */
let get = function (name) {

	try {

		let module = require.resolve(name);
		return require(name);
	} catch (err) {

		let cache = $$cache[name];
		if (!cache) {

			events.emit('warn','Service ' + name + ' not found!');
			return null;
		}

		return cache.get(get);
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
 * Try resolve a name as node module.
 * @param  {String} Name of the module.
 * @return {Boolean} True if exists a module with this name.
 */
let isNodeModule = function (name) {
	try {

		require.resolve(name);

		return true;
	} catch (err) {

		return false;
	}
}

/**
 * @public
 * @description If defined $inject get modules from it and execute, else call loadHard.
 * @param       {String} Module path.
 * @return 		{Boolean} True if module loads.
 */
let load = function (path) {
	let instances = [];
	let module = require(path);
	if (typeof module.main !== 'function') {

		events.emit('warn','Module without main.');
		return false;
	}
	//Simple
	if (Array.isArray(module.$inject) && module.$inject.length > 0) {

		for (let i = 0; i < module.$inject.length; i++) {

			let mod = get(module.$inject[i])
			if (mod === null) return false;
			
			instances.push(mod);
		}

		module.main.apply(null, instances);
	} else {
		//Hard
		return loadHard(path, module);
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
		let mod = get(list[i]);
		if (mod === null) return false;
		instances.push(mod);
	}

	module.main.apply(null, instances);
	return true;
}

/**
 * Load all directories added by addRoutes and addServices
 * @param {Boolean} Search in sub directories.
 */
let loadList = function (includeDirs) {

	while ($$serviceDirs.length > 0) {

		let services = $$serviceDirs.pop().searchSync(includeDirs);

		for (let i = 0; i < services.length; i++) {

			loadService(services[i]);
		}
	}

	while ($$routeDirs.length > 0) {

		let routes = $$routeDirs.pop().searchSync(includeDirs);

		for (let j = 0; j < routes.length; j++ ) {
			
			try {
				if (!load(routes[j])) {

					throws('Not loaded ' + routes[j], routes[j]);
				}
			} catch(err) {
				throws(err, routes[j]);
			}
		}
	}
}


/**
 * @private
 * @description Load service.
 * @param  {String} name [description]
 * @param  {String} path [description]
 * @return {[type]}      [description]
 */
let loadService = function (path) {
	
	let req = require(path);

	let name = req.$name;

	if (!name) {

		events.emit('warn', 'Ignore '+ path);
		return;
	}

	$$cache[name] = new Cache(path, true);
}

/**
 * @public
 * @description Start to load modules.
 * @param       {String} Initial path to search for files.
 * @optional    {Boolean} Includes directories in search.
 * @return      {Object} Instance of this module.
 */
let run = function (path, includeDirs) {

	if (path) addRoutes(path);

	try {

		loadList(includeDirs);
	} catch (err) {
		
		throws(err);
	}

	events.emit('load', true);

	return this; //Just for retrocompatibility because it needs to load another route dir.
				 //run('\\routesA') in 1.1 use addRoutes();
				 //run('\\routesB')
}

//New 1.2		
module.exports = events;					//Emits errors, warns and info.

//New 1.1
module.exports.addRoutes = addRoutes;		//Add directory of routes to be loaded on run.
module.exports.addServices = addServices;	//Add directory of services to be loaded on run.
module.exports.addObject = addObject;		//Add an Object like add.

//Since 1.0
module.exports.run = run;
module.exports.add = add;					//Add Object (Keep to retrocompatibility)
module.exports.get = get;					//Like require.
module.exports.load = load;					
module.exports.fallback = fallback;			//@deprecated On error loading routes.