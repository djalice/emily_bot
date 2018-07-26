"use strict";

// TOML読み込み関連
const toml = require('toml');
const {promisify} = require('util');
const fs = require('fs');
const readFileSync = promisify(fs.readFile);

var Log;
var bot;

var Location = function(bot_, log_) {
	bot = bot_;
	Log = log_;
	this.guild = '407242527389777927';
	this.channel = '427112710816268299';
	this.map = new Array();
	this.stay = false;
}

Location.prototype.move = function(guild, channel) {
	this.guild = guild;
	this.channel = channel;
}

Location.prototype.readMap = function(fname) {
	readFileSync(fname)
	.then(obj => {
		var data = toml.parse(obj); // TOMLパーズ
		for(let gid in data) {
			this.map[gid] = data[gid];
		}
	}).catch(err => {
		Log.error(err, true);
	});
}

module.exports = Location;