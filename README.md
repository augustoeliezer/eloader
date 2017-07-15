# **Eloader** Just add and run.
Load all  modules in  directory and injects dependencies.
Just add your services modules and run parsing the path of the routes.

## **Install**
```shell
$ npm install eloader
```

## **How to**
Exists two types of modules: Route and Service.

**Service:** This module will be injected in routes. Since 1.0 you don't need to register node_modules, obviously you can not use a existent name. Example: **fs**. In version 1.1 you can load all modules in a directory, but this needs export a $name.

**Routes:** The module wich implement your rest api. You need export a main to be executed on load. Optionaly you can export a $inject with all dependency to be injected.

## **Samples**
### Loading a directory of routes
Just exports a **main**.
For better perfomance exports **$inject** as an array with the dependencies.
```javascript
let myMain = function(app,db) {

	app.get('/route1/add', function (err, data) {
		
		return db.add(data);
	});
}

module.exports.main = myMain;
module.exports.$inject = ['app','db']; //Not required.
```
**Warning:** If you swap any dependency in $inject, the **main** will receive it in this sequence.
In the example above **app** will be **db** and vice versa.


### Loading a directory of modules
Just exports a $name to be used in injection.
```javascript
let func = function(a,b) { return a+b; };

module.exports.do = func;
module.exports.$name = 'sum'; //Loader will ignore modules without this.
```

### Simple example
```javascript
const eloader = require('eloader');
const express = require('express');
let app = express();

let options = {debug: false};

eloader.add('options', options)
	   .add('options', {}) //Fixed in 1.1. Older overwrite if already exists.
       .add('app', app)
	   .run('./loginRoute');
```

### Example with 1.1
```javascript
const eloader = require('eloader');
const express = require('express');

let options = {debug: false};

eloader.addObject('options', options) //New methods
	   .addServices('services')	  //This will be loaded first.
	   .addRoutes('routes')		  //This third
	   .run('loginRoute');		  //This second
```

If you have to load some route first, add this directory in run.

**Example:** The route which implements login. See the second example.

## **API**


```add(name, object)```/```addObject(name, object)``` Add an instance of an object.
 | Name | Type | Description | 
 | --- | --- | --- | 
 | name | String | Name to be used in injection. | 
 | object | Object | An object to be used in injection. | 


```addServices(directory)``` Add a directory with modules to be used as service.
 | Name | Type | Description | 
 | --- | --- | --- | 
 | directory | String | Path to modules | 
**Warning:** Throws error if it is not a directory.

```addRoutes(directory)``` Add a directory of routes.
 | Name | Type | Description | 
 | --- | --- | --- | 
 | directory | String | Path to modules. | 

**Warning:** Throws error if it is not a directory.
**Note:** All adds above returns the eloader instance.

```run(directory, includeSubDirs)``` Start to load modules.
 | Name | Type | Description | 
 | --- | --- | --- | 
 | directory | String | Path to modules. (Routes) | 
 | includeDirs | String | Includes directories in search | 
**Note:** Services is loaded first for the injection.
**Note:** The last route directory added will be load first. So if you add a directory in ```run()``` this will be executed first.

```fallback(path, err)``` Called after an error on load any route, or another throw in ```run()```.
 | Name | Type | Description | 
 | --- | --- | --- | 
 | path | String | If on load a route, the path to the route. | 
 | err | Exception | The error | 
**Note:** This dont is called if an error throw on add a directory.

```load(path)``` Load a route
 | Name | Type | Description | 
 | --- | --- | --- | 
 | path | String | Path to module. | 

```get(name)``` Like require, but return objects added by addObject.
 | Name | Type | Description | 
 | --- | --- | --- | 
 | name | String | Service name. | 

## **Author**
Eliézer Augusto de Moraes Andrade

## **License**
MIT
