## **ES6 Class**

Now you can use class as route or service, see below:

### **Route**
```javascript
class RouteA {
	
	constructor (app, db, error) { //Use the constructor for injections.

		app.get('/getsome', (req, res) => {

			this.getSome().then((data) => {

				res.json(data);
			}, (err) => {

				res.json(error.throw(err));
			});
		});
	}

	getSome() {
		//...
	}
}

module.exports.main = RouteA;
//Optional,may be array of string or a string uring space and/or comma.
module.exports.$inject = [
'app',
'db',
'error'
];
```

### **Service**
```javascript
module.exports = class DataClass {
	
	constructor(error, connection, socketio) { //WARNING eloader emits error if detect a circular reference.

		this.connect(connection).then((query) => {
			
			this.query = query;
		}, (err) => {
			
			error.throw(err);
		});
	}

	connect(con) {
		//...
	}
}

module.exports.$name = 'db';
module.exports.$inject = 'error,connection socket.io';
```

