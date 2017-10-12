class Cache {

	constructor(value, isPath) {

		this.value = value || null;
		this.isPath = isPath || false;
	}

	/**
	 * Gets the object for use as service
	 * @return {Object} The service
	 */
	get($inject) {

		let out = null;
		if (this.isPath) {

			out = require(this.value);
		} else {

			out = this.value;
		}
		
		if (typeof $inject !== 'function') return out;
		if (out.$inject) out.$inject = $inject;
		return out;
	}
}

module.exports = Cache;