const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require("fs");


// ================================
// ここにDiscord Botのトークンを書く
// ================================
const TOKEN = process.env.TOKEN;


// =======================================
// ここにDiscord Developer Portalの
// Application ID（Client ID）を書く
// =======================================
const CLIENT_ID = process.env.CLIENT_ID;


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


let xpData = {};
let cooldown = {};


// ========================
// データ読み込み
// ========================
if (fs.existsSync("./xp.json")) {
  xpData = JSON.parse(fs.readFileSync("./xp.json"));
}


// ========================
// データ保存
// ========================
function saveData() {
  fs.writeFileSync("./xp.json", JSON.stringify(xpData, null, 2));
}


// ========================
// 週リセットチェック
// ========================
function weeklyReset() {

  if (!xpData.lastReset) {
    xpData.lastReset = Date.now();
  }

  let week = 7 * 24 * 60 * 60 * 1000;

  if (Date.now() - xpData.lastReset > week) {

    for (let id in xpData) {

      if (xpData[id].weeklyXP !== undefined) {
        xpData[id].weeklyXP = 0;
      }

    }

    xpData.lastReset = Date.now();

    saveData();

    console.log("週間ランキングリセット");
  }

}


// ========================
// Bot起動
// ========================
client.on("ready", async () => {

  console.log("Bot起動");

  weeklyReset();

  const commands = [

    new SlashCommandBuilder()
      .setName("level")
      .setDescription("自分のレベルを表示"),

    new SlashCommandBuilder()
      .setName("ranking")
      .setDescription("週間ランキングを見る")

  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("スラッシュコマンド登録完了");

});


// ========================
// メッセージ処理
// ========================
client.on("messageCreate", message => {

  if (message.author.bot) return;

  let id = message.author.id;

  if (!xpData[id]) {

    xpData[id] = {
      xp: 0,
      level: 1,
      weeklyXP: 0
    };

  }


  // ========================
  // XP追加
  // ========================
  xpData[id].xp += 1;
  xpData[id].weeklyXP += 1;


  // ========================
  // レベルアップ
  // ========================
  if (xpData[id].xp >= xpData[id].level * 50) {

    xpData[id].level++;

    message.channel.send(
      `${message.author.username} がレベル ${xpData[id].level} になった！`
    );

  }

  saveData();

});


// ========================
// コマンド処理
// ========================
client.on("interactionCreate", interaction => {

  if (!interaction.isChatInputCommand()) return;


  // ========================
  // /level
  // ========================
  if (interaction.commandName === "level") {

    let id = interaction.user.id;

    if (!xpData[id]) {
      xpData[id] = { xp: 0, level: 1, weeklyXP: 0 };
    }

    let xp = xpData[id].xp;
    let level = xpData[id].level;

    let nextLevelXP = level * 50;
    let remaining = nextLevelXP - xp;

    interaction.reply(
      `現在レベル: ${level}\nあと ${remaining} メッセージでレベル ${level + 1}！`
    );

  }


  // ========================
  // /ranking
  // ========================
  if (interaction.commandName === "ranking") {

    let users = Object.entries(xpData)
      .filter(u => u[1].weeklyXP !== undefined);

    users.sort((a, b) => b[1].weeklyXP - a[1].weeklyXP);

    let top = users.slice(0, 5);

    let text = "📊 今週のランキング\n\n";

    for (let i = 0; i < top.length; i++) {

      let userId = top[i][0];
      let data = top[i][1];

      text += `${i + 1}位 <@${userId}> - ${data.weeklyXP}メッセージ\n`;

    }

    interaction.reply(text);

  }

});


// ========================
// Botログイン
// ========================
client.login(process.env.TOKEN);