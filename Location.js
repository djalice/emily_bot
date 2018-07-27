"use strict";

// TOML読み込み関連
const toml = require('toml');
const {promisify} = require('util');
const fs = require('fs');
const readFileSync = promisify(fs.readFile);

// 茶室
const DEFAULT_GUILD = '407242527389777927';
const DEFAULT_CHANNEL = '427112710816268299';
// テストサーバー
//const DEFAULT_GUILD = '426959115517165579';
//const DEFAULT_CHANNEL = '426959115517165582';

var Log;
var bot;

var Location = function(bot_, log_) {
	bot = bot_;
	Log = log_;
	this.guild = DEFAULT_GUILD;
	this.channel = DEFAULT_CHANNEL;
	this.map = new Array();
}

Location.prototype.move = function(guild, channel=null) {
	this.guild = guild;
	if(channel != null) {
		this.channel = channel;
	} else {
		do {
			let i = random(0, this.map[guild].length);
			let ch = this.map[this.guild][i];
			if(this.channel != ch) {
				this.channel = ch;
				break;
			}
		} while(true);
	}
	Log.state("ch move:"+this.channel);
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

function random(min, max)
{
	return Math.floor((Math.random() * max) + min);
}

module.exports = Location;