/**
 * 	@description Loads directory modules and injects dependencies.
 * 	@author Eliézer Augusto de Moraes Andrade
 * 	@version 1.1.1
 */

const fs = require('fs');
const path = require('path');
const Cache = require('./Cache.js');

/**
 * Regex to get function params.
 * @type {RegExp}
 */
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

let $$cache = {};
let $$routeDirs = [];
let $$serviceDirs = [];

//TODO: Separate when will look for subdir by routes and services.
//TODO: Create a .ignore
let $includeDirs = {
	routes : true,
	services : true
};

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
 * @throws 		{Exception} If name are not present.
 * @throws 		{Exception} If name already exists as another node module.
 */
let addObject = function (name, object) {
	
	if (!name) throw 'Name is required!';
	if (isNodeModule(name)) throw 'This module ['+ name +'] already exists in node!';
	if ($$cache[name]) return console.warn( 'Name ['+ name +'] already in use!');

	$$cache[name] = new Cache(object);

	return this;
}

/**
 * @public
 * @description Add a directory of routes.
 * @param 		{String} Route directory.
 * @return 		{Object} Eloader instance.
 * @throws 		{Exception} If param is not a directory.
 */
let addRoutes = function (dir) {

	dir = resolve(dir);
	$$routeDirs.push(dir);
	return this;
}

/**
 * @public
 * @description Add a directory with modules to be used as service. Modules needs exports $name to be injected.
 * @param {String} Dependency directory
 * @return {Object} Eloader instance.
 * @throws {Exception} If param is not a directory.
 */
let addServices = function (dir) {

	dir = resolve(dir);
	$$serviceDirs.push(dir);
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

			throw 'Service ' + name + ' not found!';
		}

		return cache.get();
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
 */
let load = function (path) {
	let instances = [];
	let module = require(path);
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
 * Load all directories added by addRoutes and addServices
 * @param {Boolean} Search in sub directories.
 * @return {[type]} [description]
 */
let loadList = function (includeDirs) {

	while ($$serviceDirs.length > 0) {

		let services = searchDir( $$serviceDirs.pop(), includeDirs);

		for (let i = 0; i < services.length; i++) {

			loadService(null, services[i]);
		}
	}

	while ($$routeDirs.length > 0) {

		let routes = searchDir($$routeDirs.pop(), includeDirs);

		for (let j = 0; j < routes.length; j++ ) {
			
			try {
				load(routes[j]);
			} catch (err) {
				if (fallback(routes[j], err)) return;
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
let loadService = function (name, path) {
	
	let req = require(path);

	name = name || req.$name;

	if (!name) {

		return;
	}

	$$cache[name] = new Cache(path, true);
}

/**
 * @private
 * @description Resolve and check if is a directory.
 * @param  {String} Directory.
 * @return {String} Resolved path.
 * @throws {Exception} If dir is not a directory.
 */
let resolve = function (dir) {
	
	dir = path.resolve(dir);
	if (!fs.statSync(dir).isDirectory()) throw 'Must be a directory! Found: ' + dir;
	return dir;
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
		
		fallback('', err);
	}

	return this; //Just for retrocompatibility because it needs to load another route dir.
}

/**
 * @private
 * @description Scan the directory for js files.
 * @param  {String} Directory.
 * @return {[type]}     [description]
 */
let searchDir = function (dir, includeDirs) {
	
	let out = [];
	let ls = fs.readdirSync(dir);

	for (let i = 0; i < ls.length; i++) {

		let file = path.join(dir,ls[i]);
		let stat = fs.statSync(file);

		if (stat.isFile() && path.extname(file).toLowerCase() === '.js') {
			out.push(file);
		}

		if (stat.isDirectory() && includeDirs) {

			out = out.concat( searchDir(file, includeDirs) );
			continue;
		}
	}

	return out;
}

//Since 1.0
module.exports.run = run;
module.exports.add = add;					//Add Object (Keep to retrocompatibility)
module.exports.get = get;					//Eloader require version.
module.exports.load = load;					
module.exports.fallback = fallback;			//On error loading routes.

//New 1.1
module.exports.addRoutes = addRoutes;		//Add directory of routes to be loaded on run.
module.exports.addServices = addServices;	//Add directory of services to be loaded on run.
module.exports.addObject = addObject;		//Add an Object like add.

