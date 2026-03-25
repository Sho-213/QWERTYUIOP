const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATA_FILE = "data.json";

function load() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = load();

/* メッセージカウント */

client.on("messageCreate", (msg) => {

  if (msg.author.bot) return;
  if (!msg.guild) return;

  const guildId = msg.guild.id;
  const userId = msg.author.id;

  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) {
    data[guildId][userId] = { messages: 0, level: 1, weekly: 0, time: Date.now() };
  }

  data[guildId][userId].messages += 1;
  data[guildId][userId].weekly += 1;

  if (data[guildId][userId].messages >= 50) {

    data[guildId][userId].messages = 0;
    data[guildId][userId].level += 1;

    msg.channel.send(`${msg.author} レベル${data[guildId][userId].level}になりました！`);

  }

  save(data);

});

/* コマンド */

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) {
    data[guildId][userId] = { messages: 0, level: 1, weekly: 0, time: Date.now() };
  }

  if (interaction.commandName === "level") {

    const need = 50 - data[guildId][userId].messages;

    await interaction.reply(
      `レベル: ${data[guildId][userId].level}\nあと${need}メッセージでレベルアップ`
    );

  }

  if (interaction.commandName === "ranking") {

    const users = Object.entries(data[guildId])
      .sort((a, b) => b[1].weekly - a[1].weekly)
      .slice(0, 5);

    let text = "📊今までのランキング\n\n";

    for (let i = 0; i < users.length; i++) {

      const user = await client.users.fetch(users[i][0]);

      text += `${i + 1}位 ${user.username} : ${users[i][1].weekly}メッセージ\n`;

    }

    interaction.reply(text);

  }

});

/* Slashコマンド登録 */

const commands = [

  new SlashCommandBuilder()
    .setName("level")
    .setDescription("自分のレベルを見る"),

  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("今週のランキングを見る")

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("コマンド登録完了");

})();

client.once("clientReady", () => {
  console.log("Bot起動");
});

client.login(TOKEN);