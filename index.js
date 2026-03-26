const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

/* ======= 自分の情報 ======= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

/* ========================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const FILE = "data.json";

/* ===== データ ===== */

function load() {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

let data = load();

/* ===== メッセージ処理 ===== */

client.on("messageCreate", (msg) => {

    if (msg.author.bot) return;
    if (!msg.guild) return;

    const guildId = msg.guild.id;
    const userId = msg.author.id;

    if (!data[guildId]) data[guildId] = {};

    // リセット時間
    if (!data[guildId].resetTime) {
        data[guildId].resetTime = Date.now();
    }

    // 🔥 1週間リセット
    const week = 1000 * 60 * 60 * 24 * 7;
    if (Date.now() - data[guildId].resetTime > week) {

        for (const uid in data[guildId]) {
            if (uid === "resetTime") continue;
            data[guildId][uid].weekly = 0;
        }

        data[guildId].resetTime = Date.now();
        console.log("週間ランキングリセット");
    }

    if (!data[guildId][userId]) {
        data[guildId][userId] = {
            messages: 0,
            total: 0,
            level: 1,
            weekly: 0
        };
    }

    const user = data[guildId][userId];

    user.messages += 1; // レベル用
    user.total += 1;    // 累計
    user.weekly += 1;   // 週間

    // レベルアップ
    if (user.messages >= 50) {
        user.messages = 0;
        user.level += 1;

        msg.channel.send(`${msg.author} レベル${user.level}になりました！`);
    }

    save(data);
});

/* ===== コマンド ===== */

client.on("interactionCreate", async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) {
        data[guildId][userId] = {
            messages: 0,
            total: 0,
            level: 1,
            weekly: 0
        };
    }

    const user = data[guildId][userId];

    // レベル
    if (interaction.commandName === "level") {

        const need = 50 - user.messages;

        await interaction.reply(
            `レベル: ${user.level}\nあと${need}メッセージでレベルアップ`
        );
    }

    // 今週ランキング
    if (interaction.commandName === "ranking") {

        const users = Object.entries(data[guildId])
            .filter(([id]) => id !== "resetTime")
            .sort((a, b) => b[1].weekly - a[1].weekly)
            .slice(0, 5);

        let text = "📊今週のランキング\n\n";

        for (let i = 0; i < users.length; i++) {
            const u = await client.users.fetch(users[i][0]);
            text += `${i + 1}位 ${u.username} : ${users[i][1].weekly}メッセージ\n`;
        }

        interaction.reply(text);
    }

    // 累計ランキング
    if (interaction.commandName === "allranking") {

        const users = Object.entries(data[guildId])
            .filter(([id]) => id !== "resetTime")
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5);

        let text = "🏆累計ランキング\n\n";

        for (let i = 0; i < users.length; i++) {
            const u = await client.users.fetch(users[i][0]);
            text += `${i + 1}位 ${u.username} : ${users[i][1].total}メッセージ\n`;
        }

        interaction.reply(text);
    }

});

// 累計ランキング全員
if (interaction.commandName === "allranking_all") {

    const users = Object.entries(data[guildId])
        .filter(([id]) => id !== "resetTime")
        .sort((a, b) => b[1].total - a[1].total);

    let text = "🏆累計ランキング（全員）\n\n";
    let messages = [];

    for (let i = 0; i < users.length; i++) {

        const u = await client.users.fetch(users[i][0]);

        const line = `${i + 1}位 ${u.username} : ${users[i][1].total}メッセージ\n`;

        // 2000文字対策
        if ((text + line).length > 1900) {
            messages.push(text);
            text = "";
        }

        text += line;
    }

    if (text.length > 0) messages.push(text);

    // 最初だけreply、それ以降はfollowUp
    await interaction.reply(messages[0]);

    for (let i = 1; i < messages.length; i++) {
        await interaction.followUp(messages[i]);
    }
}

/* ===== コマンド登録 ===== */

const commands = [

    new SlashCommandBuilder()
        .setName("level")
        .setDescription("自分のレベルを見る"),

    new SlashCommandBuilder()
        .setName("ranking")
        .setDescription("今週のランキングを見る"),

    new SlashCommandBuilder()
        .setName("allranking")
        .setDescription("累計ランキングを見る")
        
    new SlashCommandBuilder()
        .setName("allranking_all")
        .setDescription("累計ランキングを全員表示")

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