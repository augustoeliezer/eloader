class Cache {

	constructor(value, isPath, isClass) {

		this.value = value || null;
		this.isPath = isPath || false;
		this.isClass = isClass || false;
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
		if (!this.isClass && out.$inject) out.$inject = $inject;
		return out;
	}

	/**
	 * Only for path a module.
	 * @return {Object} The module required.
	 */
	require() {
		if (this.isPath) {
			return require(this.value);
		} else {
			return null;
		}
	}
}

module.exports = Cache;