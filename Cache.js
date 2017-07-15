/**
 * 	@description Stores Object or Path
 * 	@author Eliézer Augusto de Moraes Andrade
 * 	@version 1.0.0
 */

let Cache = function (value, isPath) {
	
	this.isPath = isPath || false;
	this.value = value || null;

	 /**
	 * Gets the stored object or require if a path.
	 * @return {Object} Service instance
	 */
	this.get = function () {
		
		if (this.isPath) {

			return require(this.value);
		}

		return this.value;
	}
}

module.exports = Cache;