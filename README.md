# Eloader #

Loads directory modules and injects dependencies.

## Install
```shell
$ npm install eloader --save-dev
```

## Usage

__index.js__
```javascript
const load = require('eloader');
const db = require('./services/db.js');

let numbers = [2,4];

db.add(0);

load.add('db', db)
	.add('num', numbers)
	.run(__dirname + '\\routes\\');
```

__./services/db.js__
```javascript
/**
 * List itens.
 * @type {Array}
 */
let $list = [];

/**
 * Push itens in $list
 * @param {object} anything.
 */
let add = function (item) {

	$list.push(item);
}

/**
 * Show all list content.
 */
let list = function () {
	
	console.log('Length: ' + $list.length);
	for (let i = 0; i < $list.length; i++) {
		console.log((i+1) + '\t:' + $list[i]);
	}
}

exports.add = add;
exports.list = list;
```

__./routes/route1.js__
```javascript
/**
 * Route without $inject
 * @param  {Object} Equivalent require('fs');
 * @param  {Object} services/db.js
 * @param  {Array}  Array in index.js:4.
 */
let main = function (fs, db, num) {
	
	if (typeof fs.statSync === 'function') console.log('fs.statSync is a function');

	db.add(1);
	db.add(num[0]);
	db.list();
}

exports.main = main;
```

__./routes/route2.js__
```javascript
/**
 * Route with $inject. Add 3 and 4 to db.$list
 * @param  {Object} services/db.js
 * @param  {Array} array in index.js:4.
 */
let main = function (db, fromInject) {

	db.add(3);
	db.add(fromInject[1]);
	db.list();
}

exports.main = main;
exports.$inject = ['db', 'num'];
```
