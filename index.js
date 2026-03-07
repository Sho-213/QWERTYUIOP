const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

/* ======= ここに自分の情報を書く ======= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

/* ===================================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const LEVEL_FILE = "levels.json";
const WEEK_FILE = "weekly.json";

/* ファイル読み込み */

function load(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let levels = load(LEVEL_FILE);
let weekly = load(WEEK_FILE);

/* メッセージカウント */

client.on("messageCreate", (msg) => {

    if (msg.author.bot) return;

    const id = msg.author.id;

    if (!levels[id]) {
        levels[id] = { messages: 0, level: 1 };
    }

    if (!weekly[id]) {
        weekly[id] = { messages: 0, time: Date.now() };
    }

    levels[id].messages += 1;
    weekly[id].messages += 1;

    if (levels[id].messages >= 50) {
        levels[id].messages = 0;
        levels[id].level += 1;

        msg.channel.send(
            `${msg.author} レベル${levels[id].level}になりました！`
        );
    }

    save(LEVEL_FILE, levels);
    save(WEEK_FILE, weekly);
});

/* Slashコマンド */

client.on("interactionCreate", async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const id = interaction.user.id;

    if (interaction.commandName === "level") {

        if (!levels[id]) {
            levels[id] = { messages: 0, level: 1 };
        }

        const need = 50 - levels[id].messages;

        await interaction.reply(
            `レベル: ${levels[id].level}\nあと${need}メッセージでレベルアップ`
        );
    }

    if (interaction.commandName === "ranking") {

        const now = Date.now();
        const week = 1000 * 60 * 60 * 24 * 7;

        const filtered = Object.entries(weekly)
            .filter(([id, data]) => now - data.time < week)
            .sort((a, b) => b[1].messages - a[1].messages)
            .slice(0, 5);

        let text = "📊今週のランキング\n\n";

        for (let i = 0; i < filtered.length; i++) {

            const user = await client.users.fetch(filtered[i][0]);

            text += `${i + 1}位 ${user.username} : ${filtered[i][1].messages}メッセージ\n`;
        }

        interaction.reply(text);
    }

});

/* コマンド登録 */

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
/* 起動 */

client.login(process.env.TOKEN);