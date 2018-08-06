"use strict";
const async = require('async');
const Log = require('./Log.js');

function ScrollMessage() {
}

ScrollMessage.createScrollMessage = function(bot, ch_id, text, _callback) {
	// 文字列[数値]文字列[数値]文字列[数値]...となっていることが前提
	let phrases = text.split(/\[|]/);

	let first_phrase = phrases[0];
	let last_msg = new Object();
	var res_msg;
	let last_msg_id;
	let last_msg_content;

	let script = "async.series([";

	for(let i=1; i<phrases.length;++i) {
		if(isNaN(phrases[i]) == true) {
			script += `
				(callback) => {
					res_msg = res_msg + phrases[${i}];
					bot.editMessage(ch_id, obj.id, res_msg);
					callback(null);
				},\n`;
		} else {
			// 値が数値のときはsleepの設定をする
			script += `
				(callback) => {
					sleep(${phrases[i]}, () => callback(null));
				},\n`;
		}
	}
	script += `
	(callback) => {
		if(_callback != null) {
			_callback();
		}
	}`;
	script += "],() => {});";

	Log.state(script);

	bot.createMessage(ch_id, first_phrase)
	.then(obj => {
		res_msg = obj.content;
		eval(script);
	}).catch(e =>{
		Log.error(e, true);
	});
}

function sleep(time, callback)
{
	setTimeout(() => {
		callback(null);
	}, time);
}

module.exports = ScrollMessage;