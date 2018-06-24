"use strict";

var moment = new require('moment');

const IS_FUNCTION_LOG = false;
const IS_PARAM_LOG = true;
const IS_STATE_LOG = true;

function Log() {
}

Log.setBot = function(bot) {
	this.bot = bot;
}

Log.setLogChannel = function(chid) {
	this.channel_id = chid;
}

Log.state = function(t, toDiscord=false) {
	const p = "[s]";
	let date = "[" + moment().format("HH:mm:ss") + "]";
	if(IS_STATE_LOG) console.log(date + p + t);
	if(toDiscord == true) {
		poolLog(date + p + t);
	}
}

Log.func = function(t, toDiscord=false) {
	const p = "[f]";
	let date = "[" + moment().format("HH:mm:ss") + "]";
	if(IS_FUNCTION_LOG) console.log(date + p + t);
	if(toDiscord == true) {
		poolLog(date + p + t);
	}
}

Log.param = function(obj, toDiscord=false) {
	if(IS_PARAM_LOG) console.dir(obj);
	if(toDiscord == true) {
		poolLog(t);
	}
}

// ログをためる
var poolLog = function(log) {
	pool += log + "\n";

	// あふれないうちにログをはいておく
	if(pool.length > 1000) {
		Log.bot.createMessage(Log.channel_id, pool);
		pool = "";
	}
}

// 一定時間おきにログをはく
var pool = "";
Log.sendLog = function() {
	setInterval(function() {
		if(pool != "") {
			Log.bot.createMessage(Log.channel_id, pool);
			pool = "";
		}
	}, 60000);
}

module.exports = Log;