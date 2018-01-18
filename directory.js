const path = require('path');
const fs = require('fs');

//TODO: Create a .ignore on search dirs.
//TODO: Create a file with all files to make a quickly load without scan directory.
class Directory {

	constructor ($path = '', $recursive) {
		this.type = 'route';
		this.check($path);
		this.recursive = $recursive || false;
	}

	/**
	 * @private
	 * @description Resolve and check if is a directory.
	 * @param  {String} Directory.
	 * @return {String} Resolved path. False if dir is not a directory or not exists.
	 */
	check(dir) {
		dir = path.resolve(dir);
		if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
			
			return this.path = dir;
		}

		return this.path = undefined;
	}

	searchSync(recursive, subDir) {
		
		let out = [];
		let dir = subDir || this.path;
		let ls = fs.readdirSync(dir);

		for (let i = 0; i < ls.length; i++) {

			let file = path.join(dir,ls[i]);
			let stat = fs.statSync(file);

			if (stat.isFile() && path.extname(file).toLowerCase() === '.js') {
				out.push(file);
			}

			if (stat.isDirectory() && (this.recursive || recursive)) {

				out = out.concat( this.searchSync(this.recursive || recursive, file));
				continue;
			}
		}
		return out;
	}

	search(recursive, subDir) {

		return new Promise((ac, rj) => {

			try {
				process.nexTick(() => {

					return ac(this.searchSync(recursive, subDir));
				});
			} catch (err) {

				return rj(err);
			}
		});
	}
}

class Route extends Directory {

	constructor($path, recursive) {

		super($path, recursive);
	}
}

class Service extends Directory {

	constructor($path, recursive) {

		super($path, recursive);
		this.type = 'service';
	}
}

module.exports.Route = Route;
module.exports.Service = Service;