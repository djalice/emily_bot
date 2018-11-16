require('dotenv').config();
const Eris = require("eris");
const PrivateChannel = require("eris/lib/structures/PrivateChannel");
const Role = require("eris/lib/structures/Role");
const Log = require("./Log.js");
const Location = require("./Location.js");
const ScrollMessage = require("./ScrollMessage.js");
const createScrollMessage = ScrollMessage.createScrollMessage;
//const Tutorial = require("./Tutorial.js");
var bot = new Eris(process.env.BOT_KEY);

// TOML読み込み関連
const toml = require('toml');
const {promisify} = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);


const ADMIN_ROLE_NAME = "Admin";

const MY_ID = "427105620957593621";		// 自分のID
const TEST = process.env.TEST;
var ID_TEAROOM;	// 茶室のサーバーID
var ID_SANDBOX;	// 砂場chID
if(TEST) {
	console.log("*** test mode ***");
	ID_TEAROOM = "426959115517165579";	// 茶室のサーバーID
	ID_SANDBOX = '426959115517165582';	// 砂場chID
} else {
	ID_TEAROOM = "407242527389777927";	// 茶室のサーバーID
	ID_SANDBOX = '427112710816268299';	// 砂場chID
}
const ID_MATCHA_CH = '415459179524915201';	// 抹茶buzz監視チャンネルID
const REACTION_FEEL_MATCHA_POWER = 'e_desyu:415856247443685376';// チェック済みの抹茶buzzに付けるリアクション

const CALL_NAME = "エミリー";				// いわゆるプレフィックス

const STATE_CANCEL_TIME = 3* 60 * 1000;	// ユーザー毎の状態をクリアするまでの時間
const LOCATION_MOVE_INTERVAL = 60 * 60*1000;
const SELECT_MENU_INTERVAL = 5 * 60 * 1000;	// 食事のメニューを選ぶ間隔
const EAT_INTERVAL = 10 * 60 * 1000;		// 食事を食べる間隔

// チャンネルのタイプ
const CH_TYPE = {
	GUILD_TEXT : 0,
	DM : 1,
	GUILD_VOICE : 2,
	GROUP_DM : 3,
	GUILD_CATEGORY : 4
};

/////////////////////////////////////////////////////////////////////////////////////
// ログ出力用
const LOGGING_LEVEL = 3;    // Lvが高いほど詳細なログ
const IS_FUNCTION_LOG = false;
const IS_PARAM_LOG = true;

function FUNCTION_LOG(t, lv=2) {
	if(IS_FUNCTION_LOG && lv<=LOGGING_LEVEL) console.log("[f]" + t);
}

function PARAM_LOG(obj, lv=3) {
	if(IS_PARAM_LOG && lv<=LOGGING_LEVEL) console.dir(obj);
}


/////////////////////////////////////////////////////////////////////////////////////
const func_list = {
	"defaultSendMsg" : defaultSendMsg,
	"resLovecall" : resLovecall,
	"resPlayRPS" : resPlayRPS,
	"resCountServerMember" : resCountServerMember,
	"resWhereIdol" : resWhereIdol,
	"resComfort" : resComfort,
	"resNiramekko" : resNiramekko,
	"resHello" : resHello,
	"resSingPlease" : resSingPlease,
	"resSetNickName" : resSetNickname,
	"resSetTimer" : resSetTimer,
	"resShowRoles" : resShowRoles,
	"resSetAnnounce" : resSetAnnounce,
	"resDeleteAnnounce" : resDeleteAnnounce,
	"resShowAnnounce" : resShowAnnounce,
	"resCatLanguage" : resCatLanguage,
	"resMoveChannel" : resMoveChannel
};
/////////////////////////////////////////////////////////////////////////////////////
class ResponseMessage
{
	constructor(data = null)
	{
		FUNCTION_LOG("ResponseMessage constructor() start", 10);
		if (data == null) {
			// とりあえずメモリ確保用のデフォルトコンストラクタ
			this.msg = "";
			this.prob = 1;
			this.func = "defaultSendMsg";
		} else {
			// msg（返答メッセージ）とprob（抽選確率）は必須
			this.msg = data['res'];
			this.prob = data['prob'];

			// 未使用
			if (typeof data['state']!== "undefined") {
				this.state = data['state'];
			}

			// 未使用
			if (typeof data['prev_state']!== "undefined") {
				this.prev_state = data['prev_state'];
			}

			// 固有関数の設定
			if (typeof data['func']!== "undefined") {
				this.func = data['func'];
				PARAM_LOG(this.func, 5);
			} else {
				this.func = "defaultSendMsg";
			}

			// 親愛度上昇値の設定
			if (typeof data['affection'] !== "undefined") {
				this.affection = Number(data['affection']);
			} else {
				this.affection = 1;
			}

			// チャンネルフィルタ
			if (typeof data['public'] !== "undefined") {
				this.public = Boolean(data['public']);
			} else {
				this.public = true;
			}

			// チャンネルフィルタ
			if (typeof data['private'] !== "undefined") {
				this.private = Boolean(data['private']);
			} else {
				this.private = true;
			}

			// 親愛度フィルタ
			if (typeof data['lock_affection'] !== "undefined") {
				this.lock_affection = Number(data['lock_affection']);
			} else {
				this.lock_affection = undefined;
			}

			if (typeof data['unlock_affection'] !== "undefined") {
				this.unlock_affection = Number(data['unlock_affection']);
			} else {
				this.unlock_affection = undefined;
			}

			if (typeof data['counter'] !== "undefined") {
				this.counter = data['counter'];
			} else {
				this.counter = undefined;
			}

			if (typeof data['sleep'] !== "undefined") {
				this.sleep = Boolean(data['sleep']);
			} else {
				this.sleep = false;
			}

			if (typeof data['type'] !== "undefined") {
				this.type = data['type'];
			} else {
				this.type = 'plane';
			}

			if (typeof data['location'] !== "undefined") {
				this.location = data['location'];
			} else {
				this.location = 'match';
			}

			FUNCTION_LOG("ResponseMessage constructor() end", 10);
		}
	}

	/**
	 * 与えられたメッセージに対して個別処理をする
	 * @param {Message} call_msg 
	 */
	funcFire(call_msg)
	{
		FUNCTION_LOG("funcFire() start");

		if(typeof func_list[this.func]!=="undefined"){
			func_list[this.func](call_msg, this);
			user_note[call_msg.author.id].addAffection(this.affection);
			Log.state(this.func + "() fired");
		} else {
			Log.state("func none");
		}
		FUNCTION_LOG("funcFire() end");
	}
}



/////////////////////////////////////////////////////////////////////////////////////
class Music {
	constructor(title, artist, lyrics, humming) {
		this.title = title;
		this.artist = artist;
		this.lyrics = lyrics;
		this.humming = humming;
	}
}

/////////////////////////////////////////////////////////////////////////////////////
class MusicLib {
	constructor() {
		this.lib = new Array();
	}

	add(music) {
		FUNCTION_LOG(music.title + " add");
		this.lib.push(music);
	}

	clear() {
		FUNCTION_LOG("MusicLib clear");
		this.lib = new Array();
	}

	// 曲名で検索
	search(title) {
		let music = new Music("","","");
		for(music of this.lib) {
			let regexp = new RegExp(music.title, 'g');
			if(regexp.test(title)) {
				Log.state(music.title + " find");
				return music;
			}
		}
		return null;
	}

	randomSelect() {
		let hum_lib = new Array();
		for(let music of this.lib) {
			if(music.humming != null) {
				hum_lib.push(music);
			}
		}

		let i = random(0, hum_lib.length-1);
		return hum_lib[i];
	}
}

/////////////////////////////////////////////////////////////////////////////////////
class UserNote
{
	constructor(id=null) {
		if(id == null) {
			this.id = "";
		} else {
			this.id = id;
		}

		this.nickname = "仕掛け人さま";
		this.affection = 0;
		this.affection_period = 100;
		this.schedule = new Array();
		this.schedule_tmp = new Array();
		this.present_limit = null;
	}

	readToml(id) {
		FUNCTION_LOG("readToml() start", 5);
		let result = false;
		let data = null;
	
		let obj = fs.readFileSync("./UserNote/" + id + ".toml", 'utf-8')
		data = toml.parse(obj); // TOMLパーズ
		this.id = data['id'];
		this.nickname = data['nickname'];
		this.affection = Number(data['affection']);
		this.affection_period = Math.floor(this.affection / 100) * 100 + 100;
		if(typeof data['present_limit'] !== "undefined") {
			if(data['present_limit'] == "") {
				this.present_limit = null;
			} else {
				this.present_limit = moment(data['present_limit'], ["YYYYMMDD"]);
			}
		} else {
			this.present_limit = null;
		}

		for(let schedule of data['schedule']) {
			let details = new Array();
			for(let key in schedule) {
				details[key] = schedule[key];
			}
			this.schedule.push(details);
		}
		PARAM_LOG(this, 99);
		result = true;
	
		FUNCTION_LOG("readToml() end", 5);
		return result;
	}

	writeToml() {
		FUNCTION_LOG("writeToml() start");
		let output = "";

		output += `id="${this.id}"\n\n`;
		output += `nickname="${this.nickname}"\n\n`;
		output += `affection="${this.affection}"\n\n`;
		if(this.present_limit != null) {
			output += `present_limit="${this.present_limit.format("YYYYMMDD")}"\n\n`;
		} else {
			output += `present_limit=""\n\n`;
		}

		output += "schedule = [\n";
		for(let details of this.schedule) {
			output += "{ ";
			for(let key in details) {
				output += `${key}="${details[key]}", `;
			}
			output += "},\n"
		}

		output += "]";

		fs.writeFileSync("./UserNote/" + this.id + ".toml", output);
		FUNCTION_LOG("writeToml() end");
	}

	addAffection(d) {
		this.affection += d;
		FUNCTION_LOG("affection(" + d + ")->" + this.affection);
		this.writeToml();
	}

	addSchedule(schedule) {
		this.schedule.push(schedule);
		this.writeToml();
	}

	deleteSchedule(sid) {
		FUNCTION_LOG(`deleteSchedule(${sid}) start`);
		for(let i=0; i<this.schedule.length; ++i) {
			if(this.schedule[i]['id'] == sid) {
				this.schedule.splice(i, 1);
				this.writeToml();
				return;
			}
		}
	}
}

/////////////////////////////////////////////////////////////////////////////////////
var STATE = {
	NEUTRAL : 'NEUTRAL',
	SINGING : 'SINGING',
	SLEEPING : 'SLEEPING',
	LUNCH_SELECT : 'LUNCH_SELECT',
	LUNCH_EATING : 'LUNCH_EATING',
	WAIT_CALL : 'WAIT_CALL',
	TALKING : 'TALKING',
	SCHEDULE_INPUT_READY : 'SCHEDULE_INPUT_READY',
	SCHEDULE_INPUT_YESNO : 'SCHEDULE_INPUT_YESNO',
	SCHEDULE_DELETE : 'SCHEDULE_DELETE',
	SCHEDULE_CHECK : 'SCHEDULE_CHECK'
};

class EmilyState
{
	constructor(bot_, log_) {
		this.state = STATE.NEUTRAL;
		this.prev_state = STATE.NEUTRAL;
		this.play_alone_timer = null;
		this.personal_state = new Array();
		this.state_cancel_timer = new Array();
		this.location = new Location(bot_, log_);
		this.location_move_timer = null;
//		this.tutorial = new Tutorial(bot, this);
	}

	setState(s, aid=null) {
		if(aid != null) {
			this.personal_state[aid] = s;
			if(s != STATE.NEUTRAL) {
				// 何かの状態からNEUTRALに戻ったときはキャンセルタイマーを作動させない
				this.stateCancelTimer(aid);
			}
			Log.state(`状態を設定しました(${s}, ${aid})`);
		} else {
			this.prev_state = this._state;
			this.state = s;
			Log.state(`状態を設定しました(${s})`);
		}
		this.refleshActivity();
	}

	getState(aid=null) {
		if(aid != null) {
			return this.personal_state[aid] != undefined ? this.personal_state[aid] : STATE.NEUTRAL;
		} else {
			return this.state;
		}
	}

	getPrevState() {
		return this.prev_state;
	}

	reset() {
		this.state = STATE.NEUTRAL;
		this.prev_state = STATE.NEUTRAL;
	}

	// ひとり遊びを始めるまでのタイマー作動
	setPlayAloneTimer() {
		if(this.play_alone_timer != null) {
			clearTimeout(this.play_alone_timer);
		}

		let msec = 3600000 * 2;
		if(random(0,100) < 50) {
			return;
		}
		this.play_alone_timer = setTimeout(function(){
			playAlone();
		}, msec);
	}

	// 眠りにつく
	sleepIn(ch_id = ID_SANDBOX) {
		this.stopLocationMoveTimer();	// 寝るときは勝手に移動しないように
		this.location.move(ID_TEAROOM, ID_SANDBOX);
		this.setState(STATE.SLEEPING);
		let res = randomResponsePick(sleep_msg['sleepin']);
		sendMsg(this.location.channel, res.msg);
		sendMsgWithTyping(this.location.channel, ":sleeping: すぅ…すぅ……", 5000);
	}

	// 眠りから目覚める
	sleepOut(ch_id = ID_SANDBOX) {
		this.startLocationMoveTimer();	// 起きたら移動できるように
		this.setState(STATE.NEUTRAL);
		let res = randomResponsePick(sleep_msg['sleepout']);
		sendMsg(ch_id, res.msg);
	}

	// ユーザー個別のエミリーの状態をキャンセルするタイマー作動
	stateCancelTimer(aid, sec=STATE_CANCEL_TIME) {
		let t = this;
		if(this.state_cancel_timer[aid] != null) {
			clearTimeout(this.state_cancel_timer[aid]);
			this.state_cancel_timer[aid] = null;
		}
		this.state_cancel_timer[aid] = setTimeout(function(){
			Log.state("*** State Cancel ***");
			t.setState(STATE.NEUTRAL, aid);
			t.startLocationMoveTimer();
		}, sec);
	}

	// 親愛度が一定数を越える毎にプレゼントを贈る
	present(msg) {
		var gid = ID_TEAROOM;
		var aid = msg.author.id;
		var rid;
		if(TEST) {
			rid = '449768011960680449';
		} else {
			rid = '450320539647737856';
		}
		var guild = bot.guilds.find((g)=>{return g.id==gid;});
		var role = guild.roles.find((r)=>{return r.id==rid;});

		if(guild.members.find((m)=>{return m.id==aid;})){
			// プレゼントをもらおうとしているユーザーが茶室にいる
			bot.addGuildMemberRole(gid, aid, rid).then(() => {
				Log.state(`addGuildMemberRole(${gid}, ${aid}, ${rid}`);
				// DMにメッセージを送る
				// 次の親愛度閾値の設定とプレゼントの期限を書込み
				let role_name = role.name.toString();
				let item_name = role_name.replace("エミリーに貰った", "");
				let res_msg = `:blush: あの、%nickname%…日頃の感謝をこめて、ささやかながら贈り物をさせてくださいませんか？…はい。\n\`\`\`エミリーから"${item_name}"をもらった\n※本日から1週間、役職"${role_name}"が付与されます。\`\`\``;
				sendDM(msg.author, res_msg);
				user_note[aid].affection_period += 100;
				user_note[aid].present_limit = moment().add(8, 'd'); // 期限は7日（8日目の0時に消す
				user_note[aid].writeToml();
	
			}).catch(e => {
				Log.error(e, true);
			});
		} else {
			// ユーザーが茶室にいないときはお誘いのメッセージ
			let res_msg =
				":slightly: %nickname%…いつも私のお話相手をしてくださって、ありがとうございます。感謝の気持ちとして、ささやかですが贈り物を…。\n" +
				":thinking: Oh my god! お、贈り物を茶室に忘れてきてしまいました……。\n" +
				":blush: あの…もう少しお話もしたいですし、もしよろしければ一緒についてきていただけませんか…？\n" +
				"https://discord.gg/YHVsB9S";
			sendMsg(getChannelID(msg), res_msg, aid);
		}
	}

	// チャンネル間を移動する
	startLocationMoveTimer() {
		Log.state("startLocationMoveTimer()");
		if(this.location_move_timer != null) {
			clearInterval(this.location_move_timer);
		}

		var t = this;
		this.location_move_timer = setInterval(function(){
			t.location.move(ID_TEAROOM);
			t.refleshActivity();
		}, LOCATION_MOVE_INTERVAL);
	}

	// チャンネル間の移動を中止する
	stopLocationMoveTimer() {
		Log.state("stopLocationMoveTimer()");
		if(this.location_move_timer != null) {
			clearInterval(this.location_move_timer);
			this.location_move_timer = null;
		}
	}

	isMovable() {
		let result = true;
		let state = this.getState();
		if(state == STATE.SINGING
			|| state == STATE.SLEEPING
			|| state == STATE.LUNCH_SELECT
			|| state == STATE.LUNCH_EATING
			|| this.isTalking() == true
		) {
			result = false;
		}
		Log.state("isMovable:"+result);
		return result;
	}

	refleshActivity() {
		let ch = bot.getChannel(this.location.channel);
		let act = "";
		switch(this.getState()) {
			case STATE.NEUTRAL:
				if(this.isTalking() && ch.type==CH_TYPE.GUILD_TEXT) {
					act = ch.name + "でお話中です";
				} else {
					act = ch.name + "にいます";
				}
				break;
			case STATE.LUNCH_SELECT:
			case STATE.LUNCH_EATING:
				act = ch.name + "で昼食をとっています";
				break;
			case STATE.SINGING:
				act = ch.name + "で歌っています";
				break;
			case STATE.SLEEPING:
				act = ch.name + "でおやすみ中です"
				break;
		}
		var game = new Object();
		game.name = act;
		bot.editStatus("online", game);
		Log.state("activity:" + game.name);
	}

	// 話し中
	isTalking()
	{
		for(let aid in this.personal_state) {
			if(this.personal_state[aid] != STATE.NEUTRAL) {
				return true;
			}
		}
		return false;
	}
}

/////////////////////////////////////////////////////////////////////////////////////
class Lunch
{
	constructor() {
		this.select_menu_msg_id = null;
		this.eat_msg_ids = new Array();
		this.menus = new Array();
		this.select_menu_timer = null;
		this.channel = ID_SANDBOX;
	}

	addMenu(emoji) {
		if(this.menus.length < 3) {
			this.menus.push(emoji);
			Log.param(emoji);

			if(this.menus.length == 3) {
				clearInterval(this.select_menu_timer);
				this.eatStart();
			}
		} else {
			// 3つ以上は食べきれない
		}
	}

	start() {
		emily_state.setState(STATE.LUNCH_SELECT);
		sendMsg(this.channel, ":blush: （今日は何食べようかなぁ…）")
		.then(msg => {
			this.select_menu_msg_id = msg.id;
		});

		let t = this;
		t.select_menu_timer = setInterval(function(){
			// 一定時間置きに自分でメニューを選ぶ
			let keys = Object.keys(foods);
			let f = keys[random(0, keys.length-1)];
			if(foods[f][1] == 'main' || foods[f][1] == 'sub' || foods[f][1] == 'sweet') {
				bot.addMessageReaction(t.channel, t.select_menu_msg_id, f);
			}
		}, SELECT_MENU_INTERVAL);
	}

	eatStart() {
		emily_state.setState(STATE.LUNCH_EATING);
		sendMsgWithTyping(this.channel, ":smile: 決めました！\n:slightly: では…いただきます。", 2000);
		let t = this;
		t.eat();
		let timer = setInterval(function() {
			if(t.menus.length == 0) {
				sendMsg(t.channel, ":slightly: ごちそうさまでした。");
				emily_state.setState(STATE.NEUTRAL);
				emily_state.startLocationMoveTimer();
				clearInterval(timer);
			} else {
				t.eat();
			}
		}, EAT_INTERVAL);
	}

	eat() {
		let meal = this.menus.shift();
		bot.sendChannelTyping(this.channel);
		let t = this;
		// thenで後処理するときはsendMsgWithTypingが使えない
		setTimeout(function(){
			sendMsg(t.channel, ":blush: もぐもぐ" + meal.name)
			.then(msg => {
				Log.state(`${meal.name}を食べました`, true);
				t.eat_msg_ids.push(msg.id);
			});
		}, EAT_INTERVAL);
	}
}

var moment = new require('moment');
class Cron
{
	constructor() {
		this.per10min_timer = null;
		this.per1hour_timer = null;
	}

	initPer10min() {
		// 現在の時刻
		let now = moment();

		// 次の毎時10分後
		let future = moment().add(10, 'm');
		let future_arr = future.toArray();
		future_arr[4] = future_arr[4] - future_arr[4] % 10;
		future_arr[5] = 0;
		future_arr[6] = 0;
		future = moment(future_arr);

		let msec = future.diff(now);
		Log.state(now.format("HH:mm:ss"), true);
		Log.state(future.format("HH:mm:ss"), true);
		Log.state(msec, true);
		setTimeout(this.setPer10min, msec);
	}

	setPer10min() {
		this.per10min = function() {
			let time = moment().format("HH:mm:ss");
			Log.state("per10min[" + time + "]", true);
		}

		this.per10min();
		this.per10min_timer = setInterval(this.per10min, 600000);
	}

	initPer1hour() {
		// 現在の時刻
		let now = moment();

		// 1時間後
		let future = moment().add(1, 'h');
		let future_arr = future.toArray();
		future_arr[4] = 0;
		future_arr[5] = 0;
		future_arr[6] = 0;
		future = moment(future_arr);

		let msec = future.diff(now);
		Log.state("現在時刻:" + now.format("HH:mm:ss"), true);
		Log.state("次の同期時刻:" + future.format("HH:mm:ss"), true);
		setTimeout(this.setPer1hour, msec);
	}

	setPer1hour() {
		this.per1hour = function() {
			let time = moment().format("HH:mm:ss");
			Log.state("現在時刻[" + time + "]");
			
			let h = moment().hour();
			switch(h) {
				case 0:
					deletePresent();
					break;
				case 1:
					emily_state.sleepIn();
					break;
				case 2:
				case 3:
				case 4:
				case 5:
					// 1時間ごとに低確率で自発的に寝言
					if(random(0,100)<10) {
						let res = randomResponsePick(sleep_msg['sleeping']);
						sendMsg(ID_SANDBOX, res.msg);
					}
					break;
				case 6:
					emily_state.sleepOut();
					emily_state.setPlayAloneTimer();
					break;
				case 7:
					//calender();
					break;
				case 11:
					// 11:50くらいに他チャンネルにいたら戻る
					setTimeout(function(){
						let cid = emily_state.location.channel;
						let is_talking = emily_state.isTalking();
						if(cid != ID_SANDBOX && is_talking) {
							sendMsg(cid, ":blush: あっ、もうすぐお昼ですね。一旦戻りますけど、よかったらご一緒にいかがですか？");
							emily_state.location.move(ID_TEAROOM, ID_SANDBOX);
							emily_state.refleshActivity();
							emily_state.stopLocationMoveTimer(); // 移動しないように一旦タイマーストップ
						}
					}, 50*60*1000);
					break;
				case 12:
					emily_state.location.move(ID_TEAROOM, ID_SANDBOX);
					emily_state.refleshActivity();
					emily_state.stopLocationMoveTimer();
					sendMsg(ID_SANDBOX, ":smile: お昼になりましたね！さあ、昼食に参りましょう♪");
					if(switch_lunch) {
						setTimeout(function(){
							lunch.start();
						}, 3*60*1000);
					}
					break;
				case 15:
					// sendMsg(ID_SANDBOX, `:smile: ${moment().hour()}時ですっ♪`);
					break;
				default:
					break;
			}

			// 毎時スケジュールをクロールして、該当するものがあれば通知する
			let s_list = scheduleCrawl(user_note);
			if(s_list != null) {
				scheduleAlert(s_list);
			}

			// 毎時お知らせをチェックして、あれば通知する
			let hash = moment().format("MDH");
			if(announce[hash] != undefined) {
				let content = new Object();
				content.content = "@everyone\n" + "```" + announce[hash] + "```";
				content.disableEveryone = false;
				content.content = replaceEmoji(content.content);  // 絵文字変換
				bot.createMessage(process.env.ANNOUNCE_CHANNEL, content);
				Log.state(`ハッシュ[${hash}]のお知らせをしました`, true);
				delete announce[hash];

			}
		} // ↑ここに1時間ごとの処理を入れる

		this.per1hour();
		this.per1hour_timer = setInterval(this.per1hour, 60*60*1000);
	}

}

function calender()
{
	// カレンダーに予定があったらみんなに知らせる
	let calender = {
		'06/02' : "@everyone\n:smile: みなさま！今日は何の日か、もちろんご存じですよね？\nそう！私たち765プロの大和撫子がお送りする第五回目の公演、\"BRAND NEW PERFORM@NCE!!!\"の公演1日目です！\n:thinking: 入場券はお忘れないですか？本人確認できる証書などはありますか？七色色彩発光棒は…ええとそれから…。\n:blush: あっ…これからみなさまに勇姿を見せようというのに、私がこれではいけませんね…。\n:slightly: 最高の舞台をお届けするため、全力を尽くして参りました。みなさまも、悔いのないように、楽しんでくださいね！では、会場でお会いしましょう！",
		'06/03' : "@everyone\n:smile: みなさま、昨日は本当にありがとうございました！\n:blush: 普段あまり歌わないような楽曲を歌わせていただきましたが、いかがでしたでしょうか…？\n:smile: さて、今日は公演2日目です！最後まで楽しんでくださいね！"
	};
	let today = moment().format("MM/DD");
	Log.state("today:"+today);
	if(typeof calender[today] !== 'undefined') {
		let content = new Object();
		content.content = calender[today];
		content.disableEveryone = false;
		content.content = replaceEmoji(content.content);  // 絵文字変換
		bot.createMessage('407270063658369074', content);
	}
}

function deletePresent()
{
	FUNCTION_LOG("deletePresent() start");
	bot.guilds.find(function(guild) {
		// 茶室限定
		if(guild.id == ID_TEAROOM) {
			guild.members.forEach(function(member){
				if((user_note[member.id] != undefined) // UserNoteが存在する
					&& (user_note[member.id].present_limit != null) // プレゼントの期限が設定されている
					&& (user_note[member.id].present_limit.format("YYYYMMDD") == moment().format("YYYYMMDD")) // 今日が期限の日
				) {
						Log.state("member.id:"+member.id);
						member.removeRole('450320539647737856').then(obj => {
						user_note[member.id].present_limit = null;
						user_note[member.id].writeToml();
						console.log("remove OK");
					}).catch(e => {
						console.log(e);
					});
				}
			});
		}
	});
}
/////////////////////////////////////////////////////////////////////////////////////
var emily_state = new EmilyState(bot, Log);
var user_note = new Array();

// 茶室の固有絵文字変換テーブル
const emoji = {
	':neutoral:' : '<:e_neutoral_face_large:415889765586698240>',
	':smile:' : '<:e_smile_large:415889131055480856>',
	':thinking:' : '<:e_thinking_large:415860618424221706>',
	':blush:' : '<:e_blush_large:415889131462197248>',
	':slightly:' : '<:e_slightly_smile_large:415889530403422209>',
	':desyu:' : '<:e_desyu:415856247443685376>',
	':daruma:' : '<:e_:417336851452657674>',
	':sleeping:' : '<:e_sleeping:432542576441163776>',
	':singing:' : '<:e_singing:431034523808038923>'
};

const foods = {
	'🍔' : ['ハンバーガー','main','like',''],
	'🌭' : ['ホットドッグ',	'main','like',''],
	'🍕' : ['ピザ',		'main',	'like',	''],
	'🍝' : ['スパゲティ','main','like',	''],
	'🌮' : ['タコス',	'main',	'like',	''],
	'🌯' : ['ブリトー',	'main',	'like',	''],
	'🍜' : ['ラーメン',	'main',	'like',	''],
	'🍲' : ['シチュー',	'main',	'like',	''],
	'🍣' : ['寿司',		'main',	'like',	''],
	'🍱' : ['弁当',		'main',	'like',	''],
	'🍛' : ['カレー',	'main',	'like',	''],
	'🍙' : ['おにぎり',	'main',	'like',	''],
	'🍚' : ['ご飯',		'main',	'like',	''],
	'🍞' : ['パン',		'main',	'like',	''],
	'🥐' : ['クロワッサン',	'main',	'like',	''],
	'🥖' : ['フランスパン',	'main',	'like',	''],
	'🥘' : ['パエリア',		'main',	'like',	''],
	'🥙' : ['ピタサンド',	'main',	'like',	''],
	'🍅' : ['トマト',	'sub',	'like',	''],
	'🍆' : ['茄子',		'sub',	'like',	''],
	'🌶' : ['唐辛子',	'sub',	'like',	''],
	'🌽' : ['玉蜀黍',	'sub',	'like',	''],
	'🍠' : ['薩摩芋',	'sub',	'like',	''],
	'🧀' : ['チーズ',	'sub',	'like',	''],
	'🍗' : ['鶏肉',		'sub',	'like',	''],
	'🍖' : ['肉',		'sub',	'like',	''],
	'🍤' : ['エビフライ','sub',	'like',	''],
	'🍳' : ['目玉焼き',	'sub',	'like',	''],
	'🍟' : ['フライドポテト','sub',	'like',	''],
	'🍥' : ['魚肉',		'sub',	'like',	''],
	'🍢' : ['おでん',	'sub',	'like',	''],
	'🥑' : ['アボカド',	'sub',	'like',	''],
	'🥒' : ['胡瓜',		'sub',	'like',	''],
	'🥓' : ['ベーコン',	'sub',	'like',	''],
	'🥔' : ['馬鈴薯',	'sub',	'like',	''],
	'🥕' : ['人参',		'sub',	'like',	''],
	'🥚' : ['卵',		'sub',	'like',	''],
	'🥗' : ['サラダ',	'sub',	'like',	''],
	'🍯' : ['蜂蜜',		'sweet','like',	''],
	'🍏' : ['青林檎',	'sweet','like',	''],
	'🍎' : ['林檎',		'sweet','like',	''],
	'🍐' : ['梨',		'sweet','like',	''],
	'🍊' : ['蜜柑',		'sweet','like',	''],
	'🍋' : ['檸檬',		'sweet','like',	''],
	'🍌' : ['バナナ',	'sweet','like',	''],
	'🍉' : ['西瓜',		'sweet','like',	''],
	'🍇' : ['葡萄',		'sweet','like',	''],
	'🍓' : ['苺',		'sweet','like',	''],
	'🍈' : ['メロン',	'sweet','like',	''],
	'🍒' : ['さくらんぼ','sweet','like',''],
	'🍑' : ['桃',		'sweet','like',	''],
	'🍍' : ['パイナップル','sweet','like',''],
	'🍡' : ['団子',		'sweet','like',	''],
	'🍘' : ['煎餅',		'sweet','like',	''],
	'🍧' : ['かき氷',	'sweet','like',	''],
	'🍨' : ['アイスクリーム','sweet',	'like',	''],
	'🍦' : ['ソフトクリーム','sweet',	'like',	''],
	'🍰' : ['ショートケーキ','sweet',	'like',	''],
	'🎂' : ['ホールケーキ',	'sweet',	'like',	''],
	'🍮' : ['プリン',		'sweet',	'like',	''],
	'🍬' : ['キャンディ',	'sweet',	'like',	''],
	'🍭' : ['キャンディ',	'sweet',	'like',	''],
	'🍫' : ['チョコレート',	'sweet',	'like',	''],
	'🍿' : ['ポップコーン',	'sweet',	'like',	''],
	'🍩' : ['ドーナツ',		'sweet',	'like',	''],
	'🍪' : ['クッキー',		'sweet',	'like',	''],
	'🥜' : ['ナッツ',		'sweet',	'like',	''],
	'🥝' : ['キウイ',		'sweet',	'like',	''],
	'🥞' : ['パンケーキ',	'sweet',	'like',	''],
	'🍺' : ['ビール',	'alcohol',	'like',	''],
	'🍻' : ['ビール',	'alcohol',	'like',	''],
	'🍷' : ['ワイン',	'alcohol',	'like',	''],
	'🍸' : ['カクテル',	'alcohol',	'like',	''],
	'🍾' : ['シャンパン','alcohol',	'like',	''],
	'🍶' : ['日本酒',	'alcohol',	'like',	''],
	'🥂' : ['シャンパン','alcohol',	'like',	''],
	'🥃' : ['ウイスキー','alcohol',	'like',	''],
	'🍵' : ['お茶',  'drink',	'like',	''],
	'☕' : ['珈琲', 'drink',	'like',	''],
	'🍼' : ['哺乳瓶', 'drink',	'like',	''],
	'🥛' : ['牛乳',  'drink',	'like',	''],
	'🍹' : ['トロピカルドリンク','drink',	'like',	'']
};

// TOMLから読み込むメッセージ群
// 配列はnewしとかないとだめ

// 人探しメッセージ
var where_idol_res_msg = new Array();
var WHERE_IDOL_NOT_FOUND_MSG;

// ランダムレスポンスメッセージ
var random_res_msg = new Array();

// じゃんけんの勝敗メッセージ
var rps_msg = new Array();

// ランダムレスポンスのヘルプメッセージ
var VISUAL_LESSON_MSG;

var music_lib = new MusicLib();

var sleep_msg = new Array();

var cron = new Cron();

var already = false; // 起動後readyの抑制用

var lunch = new Lunch();

var switch_lunch = true;


/////////////////////////////////////////////////////////////////////////////////////
// bot起動
bot.on("ready", () => {
	FUNCTION_LOG("Are you ready!! I'm lady!!", 0);

	if(already == false) {
		Log.setBot(bot);
		Log.setLogChannel(process.env.LOG_CHANNEL);

		// はじめよう　やればできる
		reloadMessageFile();
		emily_state.setPlayAloneTimer();
		cron.initPer1hour();
		
		emily_state.refleshActivity();
		emily_state.startLocationMoveTimer();

		readAnnounce(); // お知らせ読み込み
		already = true;

		Log.state("起動しました", true);
		Log.sendLog();
	} else {
		Log.state("起動後のreadyを検知しました。抑制します。", true);
	}
});

/////////////////////////////////////////////////////////////////////////////////////
// 誰かがサーバーに入室したとき
bot.on("guildMemberAdd", (guild, member) => {
	FUNCTION_LOG("on() guildMemberAdd start");
	PARAM_LOG(guild);
	PARAM_LOG(member);
	let id = `<@${member.id}>`;  // IDからリプライ名を生成
	let server_name = guild.name;

	let res_msg = `:smile: ${id} さま、"${server_name}"へようこそ♪ <#407254478752841729> はお読みいただけましたか？
お読みいただいている間に、おいしい抹茶を点ててまいりましたので、どうぞお召し上がりください！ :tea:
それではどうぞ、ごゆっくり…あっ、私にご用の際は、「エミリー、何ができる？」とお声かけくださいね♪`;

	sendMsgWithTyping(guild.systemChannelID, res_msg, 1000);
	FUNCTION_LOG("on() guildMemberAdd end");
});


/////////////////////////////////////////////////////////////////////////////////////
// 何らかのメッセージを取得した
bot.on("messageCreate", (msg) => {
try{
	if(msg.author.bot) {
		FUNCTION_LOG("Emily on() messageCreate start", 2);
		return;
	} else {
		FUNCTION_LOG("on() messageCreate start", 2);
	}
	let ch_id = msg.channel.id;
	let rand = random(0, 100);

	if(msg.content[0] == '$') {
		command(msg);
		return;
	}

	if(msg.author.id == MY_ID) {
		return;
	}

	// ここから下はエミリーの見える範囲で誰かが喋っている
	emily_state.setPlayAloneTimer();

	// ブロックコード内は削除して読まないようにする
	msg.content = msg.content.replace(/```(.|\n)*```/g, "");

	let aid = msg.author.id;
	let res_msg;

	// UserNoteがまだ作られていなかったら作成する
	if(user_note[aid] == undefined) {
		Log.state("New UserNote create");
		user_note[aid] = new UserNote(aid);
		user_note[aid].writeToml();
	}

	// DMを投げたときの前処理
	if(!msg.author.bot && (msg.channel.type == CH_TYPE.DM)) {
		Log.state("private channel id=" + msg.author.id, true);
		ch_id = msg.author; // sendMsgを流用するため、情報を置き換える

		// スケジュール管理（DM専用）
		// 状態による振り分けは中でやる
		if(scheduleManager(msg) == true) {
			// スケジュール管理中のときは残りの処理はやらない
			return;
		}
	}

//	if(emily_state.tutorial.onMessageCreate(msg)) {
//		return;
//	}
	
	if((res_msg = randomResponse(msg, random_res_msg)) != null) {
		if(emily_state.getState() == STATE.SLEEPING) {
			// 寝てるときはちょっと間をおいて喋る
			sendMsgWithTyping(ch_id, res_msg.msg, 2000, aid);
		} else {
			// ランダム定型文を探して、あれば返答
			res_msg.funcFire(msg);
			if(msg.channel.type == CH_TYPE.GUILD_TEXT && res_msg.location != 'any') {
				// ※DMやどこにいても反応する返答のときは状態やタイマーを変更しない
				emily_state.setState(STATE.TALKING, aid);
				emily_state.stopLocationMoveTimer();
			}
			// 親愛度100区切りでプレゼントを贈る
			if(isAffectionOverPeriod(aid) == true) {
				emily_state.present(msg);
			}
		}
	} else {
		// 呼びかけに対する応答がなかった
		if(msg.channel.id == emily_state.location.channel) {
			// 同チャンネル
			if(isCall(msg.content) && rand < 30) {
				sendMsgWithTyping(msg.channel.id, ":smile: はいっ♪なんでしょう、%nickname%。", 500, aid);
				if(msg.channel.type == CH_TYPE.GUILD_TEXT) {
					emily_state.setState(STATE.TALKING, aid);
					emily_state.stopLocationMoveTimer();
				}
			}
		} else {
			// エミリーとユーザーが別のチャンネルにいるときの反応
			if(emily_state.getState() != STATE.SLEEPING
				&& isCall(msg.content)
				&& rand<10
			) {
				// チャンネルが違うところで呼ばれたら反応だけする
				sendMsg(emily_state.location.channel, ":blush: （あら…呼ばれたかしら…）");
			}
		}
	}

} catch(e) {
	Log.state(e, true);
	sendMsg(msg.channel.id, "す、すみません…ちょっと具合が…");
	bot.disconnect();
} finally {
}
FUNCTION_LOG("on() messageCreate end", 2);
});

// Discordに接続する
bot.connect();

/////////////////////////////////////////////////////////////////////////////////////
// リアクションが追加された
bot.on("messageReactionAdd", (msg, emoji, uid) => {
	if(emily_state.getState() == STATE.LUNCH_SELECT && msg.id == lunch.select_menu_msg_id) {
		// メニュー決めのメッセージについたら献立に追加
		// 追加できるのは食べ物リスト内のドリンク以外
		if(Object.keys(foods).find((food)=>{return food == emoji.name;})) {
			switch(foods[emoji.name][1]) {
				case 'main':
				case 'sub':
				case 'sweet':
					lunch.addMenu(emoji);
					break;
			}
		}
	}

	if(emily_state.getState() == STATE.LUNCH_EATING) {
		// 食事中のメッセージ
		if(lunch.eat_msg_ids.find((id)=>{return id == msg.id;})) {
			if(Object.keys(foods).find((food)=>{return food == emoji.name;})) {
				// 食べ物リストの中にあるものであれば反応を返す
				switch(foods[emoji.name][1]) {
					case 'drink': // 飲み物をもらった
						sendMsgWithTyping(lunch.channel, `<@${uid}> :smile: ありがとうございます♪こくこく…`);
						break;
					case 'alcohol': // アルコールは飲めないのでお返し
						sendMsgWithTyping(lunch.channel, `<@${uid}> :smile: ふふっ…私が成人したら、ご一緒していただけますか？`);
						break;
					default:
						// 飲み物以外はちょっと食べさせてもらう
						let msg;
						if(user_note[uid].affection < 500) {
							msg = `<@${uid}> :smile: ひと口いただけるのですか？ありがとうございます！…おいしいです～♪`;
						} else {
							msg = `<@${uid}> :desyu: ひと口いただけるのですか？えっと…あーん♪…えへへ、おいしいでしゅ♪`;
						}
						sendMsgWithTyping(lunch.channel, msg);
						break;
				}
			}
		}
	}

	// 抹茶チャンネルのリアクションを拾う
	if(msg.channel.id == ID_MATCHA_CH) {
		bot.getMessage(msg.channel.id, msg.id)
		.then((m)=>{
			let count =  0;
			for(r in m.reactions) {
				count += m.reactions[r].count;
				if(m.reactions[r].me == true) {
					// チェック済みだったら処理しない
					return;
				}
			}
			if(count >= 3) {
				// 一定数以上のリアクションがついたら反応する
				feelMatchaPower(ID_SANDBOX, m);
			}
		});
	}
});

/////////////////////////////////////////////////////////////////////////////////////
// authorのDMチャンネルを取得してメッセージを投げる
function sendDM(author, res_msg)
{
	FUNCTION_LOG("sendDM() start", 2);
	author.getDMChannel().then(ch => {
		let msg = replaceEmoji(res_msg);
		msg = replaceVariant(msg, author.id);
		bot.createMessage(ch.id, msg);
		PARAM_LOG(msg, 0);
	});
	FUNCTION_LOG("sendDM() end", 2);
}


/////////////////////////////////////////////////////////////////////////////////////
const EARLY_MORNING = 0;    // 早朝
const MORNING = 1;          // 朝
const AFTERNOON = 2;        // 昼
const EVENING = 3;          // 夕方
const NIGHT = 4;            // 夜
const MIDNIGHT = 5;         // 深夜

function getTimeZone(date)
{
	let hour = date.getHours();
	let time_zone = MORNING;

	if(hour>=0 && hour<=3) {
		time_zone = MIDNIGHT;
	} else if(hour>=4 && hour<=5) {
		time_zone = EARLY_MORNING;
	} else if(hour>=6 && hour<=9) {
		time_zone = MORNING;
	} else if(hour>=10 && hour<=13) {
		time_zone = AFTERNOON;
	} else if(hour>=14 && hour<=18) {
		time_zone = EVENING;
	} else if(hour>=19 && hour<=23) {
		time_zone = MIDNIGHT;
	} else {
		console.log("無効な時間:" + hour);
	}
	return time_zone;
}

/////////////////////////////////////////////////////////////////////////////////////
//textが文字列に含まれているかチェック
function textFind(msg_text, check_text)
{
	let regexp = new RegExp(check_text, 'g');
	return regexp.test(msg_text);
}

/////////////////////////////////////////////////////////////////////////////////////
// createMessageの簡易表記wrap
function sendMsg(ch_id, text, aid=null)
{
	let res_msg;
	res_msg = replaceEmoji(text);  // 絵文字変換

	if(aid != null) {
		res_msg = replaceVariant(res_msg, aid);
	}
	PARAM_LOG(res_msg, 0);
	if(ch_id.id == undefined) {
		return bot.createMessage(ch_id, res_msg);
	} else {
		return sendDM(ch_id, res_msg);
	}
}

/////////////////////////////////////////////////////////////////////////////////////
// createMessageの簡易表記wrap
function sendMsgWithTyping(ch_id, text, msec=500, aid=null)
{
	let res_msg = replaceEmoji(text);  // 絵文字変換

	if(aid != null) {
		res_msg = replaceVariant(res_msg, aid);
	}

	if(ch_id.id == undefined) {
		bot.sendChannelTyping(ch_id);
	} else {
		bot.sendChannelTyping(ch_id.id);
	}

	setTimeout(function() {
		if(ch_id.id == undefined) {
			bot.createMessage(ch_id, res_msg);
		} else {
			sendDM(ch_id, res_msg);
		}
	}, msec);
}

/////////////////////////////////////////////////////////////////////////////////////
// 絵文字の置換をする
// :emoji: -> <:emoji:1234567890>の形に置換する
function replaceEmoji(text)
{
	let emoji_id;

	for(emoji_id in emoji) {
		if(text.includes(emoji_id)) {
			let reg = new RegExp(emoji_id, 'g');
			text = text.replace(reg, emoji[emoji_id]);
		}
	}

	return text;
}

/**
 * UserNoteで設定した表記に変更する
 * @param {String} text 
 * @param {String} id 
 */
function replaceVariant(text, id)
{
	let nick;
	if(user_note[id].affection < 10) {
		nick = "仕掛け人さま";
	} else {
		nick = user_note[id].nickname;
	}

	if(text.match(/%nickname%/g) != null) {
		text = text.replace(/%nickname%/g, nick);
	}
	if(text.match(/%stutter_nick%/g) != null) {
		// どもったときの名前（し、仕掛け人さま）
		stutter_nick = nick[0] + "、" + nick;
		text = text.replace(/%stutter_nick%/g, stutter_nick);
	}
	if(text.match(/%sleep_nick%/g) != null) {
		// 寝言
		if(nick.length == 1) {
			sleep_nick = nick;
		} else if(nick.length == 2) {
			sleep_nick = nick[0] + "……" + nick[1];
		} else {
			sleep_nick = nick[0] + "……" + nick[nick.length-2] + nick[nick.length-1];
		}
		text = text.replace(/%sleep_nick%/g, sleep_nick);
	}
	if(text.match(/%mention%/g) != null) {
		let aid = `<@${id}>`;
		text = text.replace(/%mention%/g, aid);
	}
	if(text.match(/%emily_location%/g) != null) {
		let clink = ` <#${emily_state.location.channel}> `;
		text = text.replace(/%emily_location%/g, clink);
	}
	return text;
}

/////////////////////////////////////////////////////////////////////////////////////
// 最小値と最大値を決められるrandom
function random(min, max)
{
	return Math.floor((Math.random() * max) + min);
}


/**
 * callMapのkeyにcall_msgが含まれていたらランダムに返答を返す
 * @param {String} call_msg
 * @param {Array} callMap
 * callMapはStringをキーとするResponseMessage[]の配列とする
 * @returns {ResponseMessage | null}
 */
function randomResponse(call_msg, callMap)
{
	Log.func("randomResponse() start");
	Log.func("arg->" + call_msg);
	let index;
	let res = null;

	for(index in callMap) {
		PARAM_LOG(index, 9);
		let is_include = textFind(call_msg.content, index);
		if(is_include) {
			PARAM_LOG(index);
			let resMap = null;
			let isSleep = (emily_state.getState() == STATE.SLEEPING);
			let isLocationMatch =
				(call_msg.channel.type == CH_TYPE.DM) ||
				(call_msg.channel.id == emily_state.location.channel);

			if(isSleep) {
				if(resMap == null) {
					resMap = new Array();
				}
				// フィルターをかけた寝言はデフォルトと足してから抽選
				resMap = resMap.concat(sleep_msg['sleeping']);
			}

			resMap = responseFilterSleep(callMap[index], isSleep);
			// 新たにフィルターを追加するときはこの下に配置
			resMap = responseFilterLocation(resMap, isLocationMatch);
			resMap = responseFilterMessageType(call_msg, resMap);
			resMap = responseFilterAffection(resMap, user_note[call_msg.author.id]);

			res = randomResponsePick(resMap);
			break;
		} else {
		}
	}
	Log.func("randomResponse() end");
	return res;
}

/**
 * メッセージタイプ（DMか否か）でフィルタリングする
 * @param {Message} msg 
 * @param {ResponseMessage[]} resMap
 * @returns {ResponseMessage[] | null}
 */
function responseFilterMessageType(msg, resMap)
{
	Log.func("responseFilterMessageType()");
	if(resMap == null) {
		return null;
	}

	let result = new Array();
	for(let res of resMap) {
		if(res.public && res.private) {
			result.push(res);
		} else if(!res.public && res.private) {
			if(msg.channel.constructor === PrivateChannel) {
				result.push(res);
			}
		} else if(res.public && !res.private) {
			if(msg.channel.constructor !== PrivateChannel) {
				result.push(res);
			}
		}
	}
	return result.length != 0 ? result : null;
}

/**
 * 親愛度でフィルターをかける
 * lock_affection : affection以上になったら除外する
 * unlock_affection : affection以上になったら開放する
 * @param {Message} msg 
 * @param {ResponseMessage[]} resMap 
 * @param {UserNote} user_note
 * @returns {ResponseMessage[] | null}
 */
function responseFilterAffection(resMap, user_note)
{
	Log.func("responseFilterAffection()");
	if(resMap == null) {
		return null;
	}

	let result = new Array();
	for(let res of resMap) {
		if(res.unlock_affection == undefined && res.lock_affection == undefined) {
			result.push(res);
		} else if(res.unlock_affection <= user_note.affection) {
			result.push(res);
		} else if(res.lock_affection > user_note.affection) {
			result.push(res);
		}
	}

	return result.length != 0 ? result : null;
}

/**
 * 寝言または寝言でないかどうかでフィルターをかける
 * @param {ResponseMap[]} resMap 
 * @param {Boolean} bool
 * @returns {ResponseMessage[] | null}
 */
function responseFilterSleep(resMap, bool)
{
	Log.func("responseFilterSleep():"+bool);
	let result = new Array();
	for(let res of resMap) {
		if(res.sleep == bool) {
			result.push(res);
		}
	}

	return result.length != 0 ? result : null;
}

/**
 * エミリーの居場所と発言元チャンネルが一致しているかどうかでフィルターをかける
 * @param {ResponseMap[]} resMap 
 * @param {Boolean} loc_match 
 * @returns {ResponseMessage[] | null}
 */
function responseFilterLocation(resMap, loc_match)
{
	if(resMap == null) {
		return null;
	}

	let result = new Array();
	for(let res of resMap) {
		switch(res.location) {
		case 'unmatch':
			if(loc_match == false) {
				result.push(res);
			}
			break;
		case 'any':
			result.push(res);
			break;
		case 'match':
		default:
			if(loc_match == true) {
				result.push(res);
			}
			break;
		}
	}

	return result.length != 0 ? result : null;
}

/******************************************************************************
 * 設定されている確率でランダムに返答を選択する
 * @param {ResponseMessage[]} resMap 
 * @returns {ResponseMessage | null}
 */
function randomResponsePick(resMap)
{
	Log.func("randomResponsePick() start");
	if(resMap == null) {
		return null;
	}

	let totalProbability = 0;
	let probability = 0;
	let cumlativeProbability = 0;
	let res = null;
	let prob = 0;

	for(res of resMap) {
		if (res != "") {
			prob = Number(res.prob);
			totalProbability += prob;
		} else {
			// コールだけ登録されててレスポンスがないときは即戻る
			Log.state("response none");
			Log.func("randomResponsePick() end");
			return null;
		}
	}

	probability = Math.floor(Math.random() * totalProbability);

	for(res of resMap) {
		prob = res.prob;
		cumlativeProbability += prob;
		if(probability < cumlativeProbability) {
			PARAM_LOG(res.msg);
			Log.func("randomResponsePick() end");
			return res;
		}
	}

	Log.state("response none");
	Log.func("randomResponsePick() end");
	return null;
}


/******************************************************************************
 * 名前を呼ばれる、またはリプライされているか判定
 * @param {String} text
 * @return {boolean}
 */
function isCall(text)
{
	//  名前                        リプライ
	if (text.includes(CALL_NAME) || text.includes(MY_ID)) {
		return true;
	}

	return false;
}


function getChannelID(msg)
{
	if(msg.channel.constructor === PrivateChannel) {
		return msg.author;
	} else {
		return msg.channel.id;
	}
}


function playAlone()
{
	FUNCTION_LOG("playAlone() start");

	if(emily_state.getState() == STATE.SLEEPING
		|| emily_state.getState() == STATE.LUNCH_SELECT
		|| emily_state.getState() == STATE.LUNCH_EATING) {
		// 寝ているときは一人遊びをしない
		return;
	}

	let ch = bot.getChannel(emily_state.location.channel);
	bot.getMessage(ch.id, ch.lastMessageID)
	.then((last_msg)=>{
		if(last_msg.author.bot) {
			// そのチャンネルで最後に喋ったのがエミリーのときは鼻歌は歌わない
			Log.state("playAlone skipped");
			return;
		} else {
	let msg = new Object();
	msg.channel = new Object();
	msg.channel.id = emily_state.location.channel;
	resSingPlease(msg, null, true);
	emily_state.setPlayAloneTimer();
		}
	});
}

// じゃんけんの勝敗チェック
// win, lose, draw, none, cheatのどれか
function checkRPS(call_msg, res_msg)
{
	let rps_result = null;
	let match_result;
	let regexp;
	const another_paper = unescape("\uD83D\uDD90");
	const another_rock = unescape("\uD83D\uDC4A");

	// パーの絵文字が2つあるので、片方を置き換えて処理を1つにする
	if(call_msg.includes(another_paper)) {
		regexp = new RegExp(another_paper, 'g');
		call_msg = call_msg.replace(regexp, '✋');
		console.log("checkRPS() paper replaced.");
	}

	// グーの絵文字が2つあるので、片方を置き換えて処理を1つにする
	if(call_msg.includes(another_paper)) {
		regexp = new RegExp(another_rock, 'g');
		call_msg = call_msg.replace(regexp, '✊');
		console.log("checkRPS() rock replaced.");
	}

	// じゃんけんの手の数が0なら後出し、2つ以上ならズルとみなす
	match_result = call_msg.match(/(✊|✌|✋)/g);
	if(match_result == null) {
		rps_result = 'none';      // いずれも見つからなかった

	} else if(match_result.length > 1) {
		rps_result = 'cheat';   // 2つ以上あったらズルしてる

	} else if(call_msg.includes("✊")) {
		if(res_msg.includes("✊")) {
			rps_result = 'draw';
		} else if( res_msg.includes("✌")) {
			rps_result = 'lose';
		} else if(res_msg.includes("✋")) {
			rps_result = 'win';
		}

	} else if(call_msg.includes("✌")) {
		if(res_msg.includes("✊")) {
			rps_result = 'win';
		} else if( res_msg.includes("✌")) {
			rps_result = 'draw';
		} else if(res_msg.includes("✋")) {
			rps_result = 'lose';
		}

	} else if(call_msg.includes("✋")) {
		if(res_msg.includes("✊")) {
			rps_result = 'lose';
		} else if( res_msg.includes("✌")) {
			rps_result = 'win';
		} else if(res_msg.includes("✋")) {
			rps_result = 'draw';
		}

	} else {
		rps_result = 'none';    // いずれも含まれなかった
	}

	console.log("checkRPS() ret="+rps_result);
	return rps_result;
}


// ランダムメッセージのTOMLデータ読み込み
function readRandomResponseMessage(filename)
{
	FUNCTION_LOG("readRandomResponseMessage() start");
	FUNCTION_LOG("filename->" + filename);
	let data = null;
	let callMap = new Array();
	let call_count = 0;
	let res_count = 0;

	let obj = fs.readFileSync(filename, 'utf-8')
	data = toml.parse(obj); // TOMLパーズ
	for(call_msg in data) {
		call_count += 1;
		PARAM_LOG(call_msg, 9);
		// 各コールに対してのループ
		callMap[call_msg] = new Array(); // 1コールに対するレスポンス配列のメモリを確保
		let resMap = new Array();               // レスポンス配列のメモリを確保

		for(res_data of data[call_msg]) {
			res_count += 1;
			// 1コールに対するレスポンスを全て読み込む
			res = new ResponseMessage(res_data);
			PARAM_LOG(res.msg, 9);
			resMap.push(res);
		}
		callMap[call_msg] = resMap; // 1コールに対するレスポンスマップを設定
	}

	Log.state(`${filename} ${call_count} calls ${res_count} responses read`, true);
	FUNCTION_LOG("readRandomResponseMessage() end");
	return callMap;
}

// その他メッセージデータ読み込み
function readGeneralMessage()
{
	FUNCTION_LOG("readGeneralMessage() start");
	let result = false;
	let data = null;

	let obj = fs.readFileSync("general_msg.toml", 'utf-8')
	data = toml.parse(obj); // TOMLパーズ

	VISUAL_LESSON_MSG = data['visual_lesson_msg'];
	VOCAL_LESSON_MSG = data['vocal_lesson_msg'];
	WHERE_IDOL_NOT_FOUND_MSG = data['where_idol_not_found_msg'];

	result = true;

	FUNCTION_LOG("readGeneralMessage() end");
	return result;
}

function readMusic()
{
	FUNCTION_LOG("readMusic() start");
	let result = false;
	let data = null;
	let music;
	let dir = './music/';
	let path = "";
	let file_count = 0;

	music_lib.clear();
	fs.readdir(dir, function(err, files){
		// ディレクトリ内のファイル毎に対して
		for(file of files) {
			file_count += 1;
			path = dir + file;
			let obj = fs.readFileSync(path, 'utf-8')
			data = toml.parse(obj); // TOMLパーズ
			let humming;
			if(typeof data['humming'] !== "undefined") {
				humming = data['humming'];
			} else {
				humming = null;
			}
			music = new Music(
				data['title'],
				data['artist'],
				data['lyrics'],
				humming);
			music_lib.add(music);
			result = true;
		}
		Log.state(`${dir} ${file_count} files read`, true);
	});

	FUNCTION_LOG("readMusic() end");
	return result;
}

function readUserNote()
{
	FUNCTION_LOG("readUserNote() start");
	let result = false;
	let dir = './UserNote/';

	fs.readdir(dir, function(err, files){
		// ディレクトリ内のファイル毎に対して
		let count = 0;
		for(file of files) {
			PARAM_LOG(file, 99);
			let path = dir + file;
			let id = file.split(".")[0];
			user_note[id] = new UserNote();
			user_note[id].readToml(id);
			count++;
		}
		Log.state(`UserNote: ${count}files read`);
	})

	FUNCTION_LOG("readUserNote() end");
	return result;
}

// TOMLファイルの読み込み
function reloadMessageFile()
{
	readGeneralMessage();
	rps_msg = readRandomResponseMessage("rps_msg.toml");
	random_res_msg = readRandomResponseMessage("random_response_msg.toml");
	random_res_msg["(ビジュアル|表現力)レッスン"][0].msg = VISUAL_LESSON_MSG;
	where_idol_res_msg = readRandomResponseMessage("where_idol_res_msg.toml");
	status_offline_msg = readRandomResponseMessage("status_offline_msg.toml");
	sleep_msg = readRandomResponseMessage("sleep_msg.toml");
	readMusic();
	readUserNote();
	emily_state.location.readMap("location_map.toml");
}


function command(call_msg)
{
	FUNCTION_LOG("command()");
	let member = call_msg.member;
	let msg = call_msg.content;

	let help_msg = `$state [sleepin sleepout reset]
$cron [force reset]
$delete present
$reload
$switch lunch`;
	
	if(hasRole(member, ADMIN_ROLE_NAME)) {
		if(msg == "$reload") {
			reloadMessageFile();
		} else if(msg == "$state sleepin") {
			emily_state.sleepIn(call_msg.channel.id);
		} else if(msg == "$state sleepout") {
			emily_state.sleepOut(call_msg.channel.id);
		} else if(msg == "$state reset") {
			emily_state.reset();
		} else if(msg == "$cron force") {
			cron.setPer1hour();
		} else if(msg == "$cron reset") {
			cron.initPer1hour();
		} else if(msg == "$delete present") {
			deletePresent();
		} else if(msg == "$help") {
			bot.createMessage(call_msg.channel.id, help_msg);
		} else if(msg == "switch lunch") {
			switch_lunch = switch_lunch ? false : true;
			Log.state(`switch_lunch:${switch_lunch}`, true);
		}
		if(TEST && msg == "$test") {
		}
	}
}


function scheduleManager(msg)
{
	FUNCTION_LOG("scheduleManager() start");
	let aid = msg.author.id;
	let cid = msg.channel.id;
	let state = emily_state.getState(aid);
	let text = msg.content;

	switch(state) {
		case STATE.SCHEDULE_INPUT_READY:
			let d = text.match(/(\d+)月(\d+)日(\d+)時に(.+)/);
			if(d != null) {
				let month = d[1], day = d[2], hour = d[3], note = d[4];
				note = note.replace(/[\"'`.*+?^=!:${}()|[\]\/\\]/g, "");
				user_note[aid].schedule_tmp = {
					'id' : moment().format("x"),
					'month' : month,
					'day' : day,
					'hour' : hour,
					'note' : note,
					'channel' : cid
				};
				sendMsgWithTyping(cid, ":neutoral: えっと……（かきかき）", 50);
				let res_msg = `\`\`\`
${month}/${day} ${hour}時
${note}
\`\`\`
:blush: ……これであってますか？ \`(うん/ちがうよ/やっぱりいい)\``;
				emily_state.setState(STATE.SCHEDULE_INPUT_YESNO, aid);
				sendMsgWithTyping(cid, res_msg, 3000);
			} else {
				sendMsg(cid, "も、もう1回…！ `(XX月XX日XX時に〇〇)`");
			}
			return true;
		case STATE.SCHEDULE_INPUT_YESNO:
			if(textFind(text, "うん")) {
				emily_state.setState(STATE.NEUTRAL, aid);
				sendMsg(cid, ":smile: わかりました！その時になったら、ご連絡しますね！");
				if(msg.channel.constructor === PrivateChannel) {
					// DMからなら非公開設定
					user_note[aid].schedule_tmp['private'] = 'true';
				} else {
					// 公開設定
					user_note[aid].schedule_tmp['private'] = 'false';
				}
				user_note[aid].addSchedule(user_note[aid].schedule_tmp);
				user_note[aid].schedule_tmp = new Array();  // 一時保存をクリアする

			} else if(textFind(text, "ちがうよ")) {
				emily_state.setState(STATE.SCHEDULE_INPUT_READY, aid);
				sendMsg(cid, ":blush: も、申し訳ございません…！もう一度お願いします！ `(XX月XX日XX時に〇〇)`");
				user_note[aid].schedule_tmp = new Array();

			} else if(textFind(text, "やっぱ.*いい")) {
				emily_state.setState(STATE.NEUTRAL, aid);
				sendMsg(cid, ":thinking: そうですか…");
				user_note[aid].schedule_tmp = new Array();
			} else {
				sendMsg(cid, ":neutoral: も、もう1回…！ `(うん/ちがうよ/やっぱりいい)`");
			}
			return true;
		case STATE.SCHEDULE_DELETE:
			let index = text.match(/(\d+)番目を消して/);
			if(index != null) {
				let sid = user_note[aid].schedule[index[1]-1]['id'];
				user_note[aid].deleteSchedule(sid);
				emily_state.setState(STATE.NEUTRAL, aid);
				sendMsg(cid, ":slightly: はい。では、取り消しておきますね。");
			} else if(textFind(text, "やっぱ.*いい")) {
				emily_state.setState(STATE.NEUTRAL, aid);
				sendMsgWithTyping(cid, ":slightly: わかりました。また何かありましたら、お呼びくださいね。");
			} else {
				sendMsg(cid, ":blush: も、申し訳ございません…！もう一度お願いします！");
			}
			return true;
		case STATE.SCHEDULE_CHECK:
			if(textFind(text, "追加したい")) {

			} else if(textFind(text, "変更したい")) {

			} else if(textFind(text, "消したい")) {

			}
			return true;
		default:
			if(textFind(text, "エミリー.*予定.*(覚えて|入れて|入れたい)")) {
				if(user_note[aid].schedule.length != 3) {
					emily_state.setState(STATE.SCHEDULE_INPUT_READY, aid);
					sendMsgWithTyping(cid, ":slightly: わかりました。帳面に記録しますので、ご予定を教えてください。 `(XX月XX日XX時に〇〇)`");
					//emily_state.stateCancelTimer(aid);
				} else {
					sendMsg(cid, ":thinking: すみません、あいにく帳面がいっぱいで…どれかを消すことはできますか？", 50);
					sendMsg(cid, getScheduleList(msg));
				}
				return true;

			} else if(textFind(text, "エミリー.*予定.*見せて")) {
				sendMsgWithTyping(cid, ":blush: えっと、%nickname%の今の予定は…", 50, aid);
				let list = getScheduleList(msg);
				list += ":slightly: ……ですね。";
				sendMsgWithTyping(cid, list, 3000);
				return true;
			} else if(textFind(text, "エミリー.*予定.*消したい")) {
				sendMsgWithTyping(cid, ":slightly: わかりました。何番目でしょうか？ `X番目を消して/やっぱりいい`", 50);
				sendMsgWithTyping(cid, getScheduleList(msg), 50);
				emily_state.setState(STATE.SCHEDULE_DELETE, aid);
				return true;
			}
		break;
	}
	FUNCTION_LOG("scheduleManager() end");
	return false;
}

function getScheduleList(msg)
{
	let aid = msg.author.id;
	let isPrivateCh = (msg.channel.constructor === PrivateChannel) ? true : false;
	let list = "```\n";

	for(i=0; i<user_note[aid].schedule.length; ++i) {
		let schedule = user_note[aid].schedule[i];
		let date = `${schedule['month']}/${schedule['day']}`;
		let hour = schedule['hour'] + "時";
		let note = (schedule['private']=="true" && isPrivateCh==false) ? "*****" : schedule['note'];
		list += `${i+1}. ${date} ${hour} ${note}\n`;
	}
	list += "```\n";
	return list;
}


function scheduleCrawl(user_notes)
{
	FUNCTION_LOG("scheduleCrawl() start");
	let list = new Array();
	let aid;

	for(aid in user_notes) {
		let m = moment().get('month') + 1;
		let d = moment().get('date');
		let h = moment().get('hour');
		let s = user_notes[aid].schedule;

		for(let i=0; i<s.length; ++i) {
			if(Number(s[i]['month']) == m && Number(s[i]['day']) == d && Number(s[i]['hour']) == h) {
				s[i]['aid'] = aid;
				s[i]['index'] = i;
				Log.state(`${aid} schedule push`);
				list.push(s[i]);
			}
		}
	}

	if(list.length == 0) {
		Log.state("scheduleCrawl() end *list empty*");
		return null;
	} else {
		PARAM_LOG(list);
		Log.state("登録された予定が見つかったので通知", true);
		return list;
	}
}

function scheduleAlert(s_list)
{
	FUNCTION_LOG("scheduleAlert() start");
	PARAM_LOG(s_list);
	for(s of s_list) {
		let id = s['id'];
		let cid = s['channel'];
		let m = s['month'];
		let d = s['day'];
		let h = s['hour'];
		let note = s['note'];
		let isPrivate = s['private'];
		let aid = s['aid'];
		let msg = `:smile: %mention% お時間になりました～！ええと…\`\`\`\n${m}/${d} ${h}:00\n${note}\n\`\`\`:smile: ですっ♪ %nickname% 、お役にたてましたか？`;
		sendMsg(cid, msg, aid);
		Log.state(`[${aid}] id:${id} 予定を通知`, true);
		user_note[aid].deleteSchedule(id);
	}
	FUNCTION_LOG("scheduleAlert() end");
}


/**
 * 親愛度が区切りを越えたかどうか判定
 * @param {String} aid Author ID
 */
function isAffectionOverPeriod(aid)
{
	FUNCTION_LOG("isAffectionOverPeriod() start");
	Log.state("affection:" + user_note[aid].affection);
	Log.state("period:" + user_note[aid].affection_period);
	if(user_note[aid].affection >= user_note[aid].affection_period) {
		Log.state(`${aid}の親愛度が${user_note[aid].affection_period}に到達しました`, true);
		return true;
	} else {
		return false;
	}
}


/**
 * 役職を持っているかチェック
 * @param {Member} member 
 * @param {String} role_name 
 */
function hasRole(member, role_name)
{
	let ID_ALICE = '327384188611198978';
	let ID_ARLE = '227774872665718785';
	FUNCTION_LOG("hasRole()");

	if(member.id == ID_ALICE || member.id == ID_ARLE) {
		return true;
	}

	// サーバーの役職からrole_nameを見つけて取得
	let role = member.guild.roles.find(function(r){return r.name == role_name;});

	// 役職が見つからない
	if(role == undefined) {
		return false;
	}

	// memberが役職を持っているかチェック
	for(r of member.roles) {
		if(r == role.id) {
			Log.state(`${member.user.username} has "${role_name}"`);
			return true;
		}
	}

	return false;
}


/////////////////////////////////////////////////////////////////////////////////////
// 何も定義されていないときのデフォルト返答処理
function defaultSendMsg(call_msg, res)
{
	FUNCTION_LOG("defaultSendMsg() start");
	FUNCTION_LOG("arg->" + call_msg);
	FUNCTION_LOG("arg->" + res);

	let aid = call_msg.author.id;
	if(res.type == 'scroll') {
		let msg = replaceVariant(replaceEmoji(res.msg), aid);
		createScrollMessage(bot, call_msg.channel.id, msg, null);
	} else {
		sendMsgWithTyping(call_msg.channel.id, res.msg, 500, aid);
	}
	FUNCTION_LOG("defaultSendMsg() end");
}

// 愛を囁かれたときの反応
function resLovecall(call_msg, res)
{
	sendMsg(call_msg.channel.id, res.msg);
	let msg = replaceVariant("私も%nickname%のことが、大好きですよ♪\nえへへ…。", call_msg.author.id);
	sendDM(call_msg.author, msg);
}

// じゃんけん
function resPlayRPS(call_msg, res)
{
	FUNCTION_LOG("resPlayRPS() start");
	let ch_id = getChannelID(call_msg);
	let aid = call_msg.author.id;

	sendMsg(ch_id, res.msg, aid);

	let rps_result = checkRPS(call_msg.content, res.msg);
	let after_res = randomResponsePick(rps_msg[rps_result]);
	if(after_res != null) {
		sendMsg(ch_id, after_res.msg, aid);
	}
	FUNCTION_LOG("resPlayRPS() end");
}

// 茶室の人数を数える
function resCountServerMember(call_msg, res)
{
	FUNCTION_LOG("resCountServerMember() start");
	let count = bot.guilds.get(call_msg.member.guild.id).memberCount;
	let aid = call_msg.author.id;
	sendMsgWithTyping(call_msg.channel.id, `現在茶室には、%nickname%と私を含めて${count}名の方がいらっしゃいますよ。`, 500, aid);
	FUNCTION_LOG("resCountServerMember() end");
}

// 人探し
function resWhereIdol(call_msg, res)
{
	FUNCTION_LOG("resWhereIdol() start");
	// 劇場の大和撫子の居場所を聞いたら教えてくれる
	let idol;
	let result;
	let ch_id = getChannelID(call_msg);

	for (idol in where_idol_res_msg) {
		PARAM_LOG(idol);
		if (textFind(call_msg.content, idol)) {
			result = randomResponsePick(where_idol_res_msg[idol]);
			break;
		}
	}

	if(result != null) {
		let aid = call_msg.author.id;
		sendMsgWithTyping(ch_id, result.msg, 500, aid);
	} else {
		sendMsgWithTyping(ch_id, WHERE_IDOL_NOT_FOUND_MSG);
	}
	FUNCTION_LOG("resWhereIdol() end");
}

// はげます
function resComfort(call_msg, res)
{
	FUNCTION_LOG("resComfort() start");
	let ch_id = getChannelID(call_msg);

	sendMsg(ch_id, ":neutoral: …！");
	sendMsg(ch_id, "てててて…");
	sendMsg(ch_id, ":blush: （こしょこしょ…）");

	res_msg = `
pain pain go away...
…ご存じですか？「いたいのいたいの とんでいけ～」です♪ふふっ。
なんだか辛いような口調をされていたように思えたので…私の勘違いなら良いのですが…。`;

	// 会話中のユーザーのDMチャンネルを取得してメッセージを投げる
	sendDM(call_msg.author, res_msg);
	FUNCTION_LOG("resComfort() end");
}

// にらめっこ
function resNiramekko(call_msg, res)
{
	let ch_id = getChannelID(call_msg);
	let aid = call_msg.author.id;
	let res_msg;

	sendMsg(ch_id, res.msg, aid);

	if(random(0, 100) < 40) {
		res_msg = ":smile: …ぷっ、うふふっ…！もう、%nickname%ったら！私の負け、です♪";
	} else {
		res_msg = ":daruma: ……ぷしゅー";
	}

	setTimeout(function() {
		sendMsg(ch_id, res_msg, call_msg.author.id);
		PARAM_LOG(res_msg, 0);
	}, 2000);
}

// こんにちは
function resHello(call_msg, res)
{
	let ch_id = getChannelID(call_msg);
	sendMsgWithTyping(ch_id, `あっ、 %mention% さん♪`, 500, call_msg.author.id);
}


// 歌って
const async = require('async');
function resSingPlease(call_msg, res, is_humming=false)
{
	FUNCTION_LOG("resSingPlease() start");

	let ch_id = call_msg.channel.id;
	let search_title = /「(.*)」/.exec(call_msg.content);

	let music = null;
	if(!is_humming) {
		// 指定された曲名で選曲
		music = music_lib.search(search_title[1]);
	} else {
		// 鼻歌はランダム選曲
		music = music_lib.randomSelect();
	}

	if(emily_state.getState() == STATE.SINGING) {
		sendMsg(ch_id, ":thinking: す、すみません…！少しお待ちいただけますでしょうか…！");
		Log.state("state singing");
		return;
	}

	if(music == null) {
		let aid = call_msg.author.id;
		res_msg = ":blush: すみません…その曲についてはよく知らなくて…よろしければ、%nickname%が教えてくださいませんか？";
		Log.state(`「${search_title}」を要求されましたが歌えませんでした`, true);
		sendMsgWithTyping(ch_id, res_msg, 500, aid);
		return;
	} else {
		emily_state.stopLocationMoveTimer(); // 歌ってる間は移動しない
		emily_state.setState(STATE.SINGING);
	}

	// 文字列[数値]文字列[数値]文字列[数値]...となっていることが前提
	let phrases = null;
	if(!is_humming) {
		phrases = replaceEmoji(music.lyrics).split(/\[|]/);
	} else {
		phrases = replaceEmoji(music.humming).split(/\[|]/);
	}

	let first_phrase = phrases[0];
	let delim = " ";
	let last_msg = new Object();
	var res_msg;
	let last_msg_id;
	let last_msg_content;

	let script = "async.series([";

	for(i=1; i<phrases.length;++i) {
		PARAM_LOG(phrases[i], 0);
		if(isNaN(phrases[i]) == true) {
			// 値が数値でなければ歌詞として扱う（鼻歌のときは変数置換処理はしない）
			if(!is_humming) {
				phrases[i] = replaceVariant(phrases[i], call_msg.author.id);
			}
			script += `
				(callback) => {
					res_msg = res_msg + delim + phrases[${i}];
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
		emily_state.setState(STATE.NEUTRAL);
	}`;
	script += "],() => {});";

	Log.state(script);

	if(!is_humming) {
		first_phrase = replaceVariant(first_phrase, call_msg.author.id);
	}
	bot.createMessage(ch_id, first_phrase)
	.then(obj => {
		res_msg = obj.content;
		eval(script);
	}).catch(e =>{
		emily_state.setState(STATE.NEUTRAL);
		sendMsg(ch_id, ":blush: けほっ、けほっ…す、すみません…！（おかしいな…");
	});
	FUNCTION_LOG("resSingPlease() end");
}

function sleep(time, callback)
{
	setTimeout(() => {
		callback(null);
	}, time);
}

function resSetNickname(call_msg, res)
{
	let ch_id = getChannelID(call_msg);
	let aid = call_msg.author.id;
	let name = /「(.*)」.*呼んで/.exec(call_msg.content);

	if(name[1].match(/[\"'`.*+?^=!:${}()|[\]\/\\]/g) != null) {
		// 記号は基本的に受け付けないようにする
		sendMsg(ch_id, ":thinking: 申し訳ございません…出来たら、私が読める呼び方にしていただけると…");
	} else if(name[1].length >= 10) {
		// 10文字より多い名前は受け付けないようにする
		sendMsg(ch_id, ":thinking: 申し訳ございません…長すぎるとお呼びしづらいので、出来たら10文字以内にしていただけると…");
	} else {
		//user_note[aid].id = aid;
		user_note[aid].nickname = name[1];
		if(user_note[aid].affection < 10) {
			sendMsgWithTyping(ch_id, ":blush: あっ…え、えっと…わかりました…。そ、そのうち…。");
		} else {
			sendMsgWithTyping(ch_id, `:smile: はい、では「${name[1]}」とお呼びしますね。`);
		}
		user_note[aid].writeToml();
	}
}


function resSetTimer(call_msg, res)
{
	let min = /(\d+)分.*教えて/.exec(call_msg.content)[1];
	min = Number(min);
	if(!Number.isInteger(min)) {
		// 整数でない
		return;
	}

	let ch_id = getChannelID(call_msg);
	let msec = min * 60 * 1000;
	sendMsg(ch_id, ":slightly: わかりました。では、お時間になりましたらお伝えしますね。");
	Log.state("set timer after " + msec);

	setTimeout(function () {
		let aid = call_msg.author.id;
		sendMsg(ch_id, res.msg, aid);
	}, msec);
}

function resShowRoles(call_msg, res)
{
	var list = "";
	call_msg.member.guild.roles.forEach(function(role) {
		list += `${role.name} : ${role.id}\n`;
	});

	sendMsg(call_msg.channel.id, list);
}

var announce = new Array();
function resSetAnnounce(msg)
{
	if(hasRole(msg.member, ADMIN_ROLE_NAME) == false) {
		return;
	}

	let data = msg.content.match(/.+\n(\d+)\/(\d+) (\d+):00\n([\S\s]*)/);
	let month, day, hour;
	let announce_msg;

	if(data != null) {
		month = data[1], day = data[2], hour = data[3];
		announce_msg = data[4];
	} else {
		sendMsg(msg.channel.id, "登録できませんでした…。");
		return;
	}

	let check_msg = "この内容でお知らせを登録しました。\n" +
					`${month}/${day} ${hour}:00` +
					"```" +
					announce_msg +
					"```";
	let hash = month + day + hour;

	announce[hash] = announce_msg;
	if(!fs.existsSync("./Announce")) {
		fs.mkdirSync("./Announce");
	}
	fs.writeFileSync("./Announce/" + hash + ".txt", announce_msg);
	sendMsg(msg.channel.id, check_msg);
	Log.state(`set announce hash[${hash}]`, true);
}

function resDeleteAnnounce(msg)
{
	if(hasRole(msg.member, ADMIN_ROLE_NAME) == false) {
		return;
	}

	let d = msg.content.match(/\[(\d+)]/);
	let hash;
	if(d == null) {
		sendMsg(msg.channel.id, "削除できませんでした…。");
		return;
	}

	hash = d[1];
	if(deleteAnnounce(hash) == true) {
		sendMsg(msg.channel.id, `hash[${hash}] のお知らせを削除しました。`);
		Log.error(`delete announce hash[${hash}`);
	} else {
		sendMsg(msg.channel.id, "削除できませんでした…。");
		return;
	}
}

function resShowAnnounce(msg)
{
	if(hasRole(msg.member, ADMIN_ROLE_NAME) == false) {
		return;
	}

	let list = "";
	for(hash in announce) {
		let prev = announce[hash].match(/^\S*/);
		list += `[${hash}] ${prev}～\n`;
	}

	if(list != "") {
		sendMsg(msg.channel.id, `お知らせの一覧です。\n${list}`);
	} else {
		sendMsg(msg.channel.id, "今、みなさまにお知らせする事項はないようです。");
	}
}

function readAnnounce()
{
	let dir = "./Announce/";
	fs.readdir(dir, function(err, files){
		if(err) {
			return;
		}
		// ディレクトリ内のファイル毎に対して
		for(let file of files) {
			let path = dir + file;
			let obj = fs.readFileSync(path, 'utf-8')
			let hash = file.split(".")[0];
			announce[hash] = obj;
		}
	})
}

function deleteAnnounce(hash)
{
	if(announce[hash] != undefined) {
		delete announce[hash];
		fs.unlink(`./Announce/${hash}.txt`, function(err){
			if(err) {
				Log.error("unlink fail.");
				return false;
			}
		});
	} else {
		Log.error(`${hash} undefined`);
		return false;
	}

	return true;
}

function feelMatchaPower(cid, embed_target)
{
	bot.getMessage(embed_target.channel.id, embed_target.id)
	.then((msg)=>{
		let embed = {
			'type' : "rich",
			'description' : msg.content,
			'author' : {
				name: msg.author.username,
				icon_url: msg.member.avatarURL
			}
		};

		if(msg.attachments.length != 0) {
			embed['image'] = {url: msg.attachments[0].url};
		}
	
		let content = {
			'content' : "<:e_desyu:415856247443685376>くんくん…どこからか、美味しい抹茶のにおいがしましゅ…♪",
			'embed' : embed
		};
	
		bot.createMessage(cid, content);
		msg.addReaction(REACTION_FEEL_MATCHA_POWER);
	});

}

function resCatLanguage(call_msg, res)
{
	let cid = call_msg.channel.id;
	bot.sendChannelTyping(cid);
	setTimeout(()=>{
		sendMsg(cid, ":smile: にゃあ、にゃあ♪\n:blush: …なんて、えへへ……")
		.then((msg)=>{
			setTimeout(()=>{
				msg.delete("resCatLanguage")
				.then(()=>{
					sendMsg(cid, ":neutoral: ……%nickname%は何も見ていません…いいですね？", call_msg.author.id);
				});
			}, 4000);
		});
	}, 2000);
}

function resMoveChannel(call_msg, res)
{
	if(isCall(call_msg.content) && call_msg.channel.type == CH_TYPE.GUILD_TEXT && emily_state.isMovable()) {
		Log.state("ユーザーの呼び出しによりチャンネルを移動", true);
		emily_state.location.move(call_msg.channel.guild.id, call_msg.channel.id);
		emily_state.refleshActivity();
		sendMsgWithTyping(emily_state.location.channel, ":smile: はいっ♪おまたせしました！", 3000);
		emily_state.setState(STATE.TALKING, call_msg.author.id);
		emily_state.stopLocationMoveTimer();
	}
}
// ↑↑↑ここに固有処理を追加していく
/////////////////////////////////////////////////////////////////////////////////////
