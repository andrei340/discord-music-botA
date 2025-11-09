// index.js
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const fs = require('fs');
const play = require('play-dl');
require('dotenv').config();

// Setează path-ul ffmpeg pentru prism-media și DisTube
const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;

const dbPath = './database.json';

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ warnings: {}, levels: {}, xp: {} }));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    console.error('Eroare la citirea bazei de date, se creează una nouă:', err);
    const freshDB = { warnings: {}, levels: {}, xp: {} };
    fs.writeFileSync(dbPath, JSON.stringify(freshDB, null, 2));
    return freshDB;
  }
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const distube = new DisTube(client, {
  emitNewSongOnly: true,
  nsfw: false,
  ffmpeg: {
    path: ffmpegPath
  },
  plugins: [
    new SpotifyPlugin(),
    new SoundCloudPlugin(),
    new YtDlpPlugin()
  ]
});

distube.on('playSong', (queue, song) => {
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🎵 Acum Cântă')
    .setDescription(`[${song.name}](${song.url})`)
    .addFields(
      { name: 'Durată', value: song.formattedDuration, inline: true },
      { name: 'Cerut de', value: song.user.tag, inline: true }
    )
    .setThumbnail(song.thumbnail);
  queue.textChannel.send({ embeds: [embed] });
});

distube.on('addSong', (queue, song) => {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('➕ Adăugat în Coadă')
    .setDescription(`[${song.name}](${song.url})`)
    .addFields(
      { name: 'Durată', value: song.formattedDuration, inline: true },
      { name: 'Poziție', value: `#${queue.songs.length}`, inline: true }
    )
    .setThumbnail(song.thumbnail);
  queue.textChannel.send({ embeds: [embed] });
});

distube.on('error', (channel, error) => {
  console.error('DisTube error:', error);
  if (channel) {
    channel.send(`❌ Eroare: ${error.message}`);
  }
});

client.once('clientReady', () => {
  console.log(`Botul este online ca ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, member, guild } = interaction;

  // Helper: verifica permisiuni ale user-ului
  function hasPerm(permission) {
    return member.permissions.has(PermissionsBitField.Flags[permission]);
  }

  // Helper: verifica permisiuni ale bot-ului
  function botHasPerm(permission) {
    return guild.members.me.permissions.has(PermissionsBitField.Flags[permission]);
  }

  if (commandName === 'ban') {
    const target = options.getUser('user');
    const reason = options.getString('reason') || 'Nedefinit';
    const targetMember = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id).catch(()=>null);

    if (!hasPerm('BanMembers')) return interaction.reply({ content: 'Nu ai permisiunea BanMembers.', ephemeral: true });
    if (!botHasPerm('BanMembers')) return interaction.reply({ content: 'Botul nu are permisiunea BanMembers.', ephemeral: true });

    if (!targetMember) return interaction.reply({ content: 'Utilizatorul nu a fost găsit pe server.', ephemeral: true });

    if (!targetMember.bannable) return interaction.reply({ content: 'Nu pot ban-a acest utilizator (posibil are rol mai mare decât botul).', ephemeral: true });

    try {
      await targetMember.ban({ reason });
      return interaction.reply({ content: `✅ ${target.tag} a fost banat. Motiv: ${reason}` });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: 'Eroare la ban. Vezi log.', ephemeral: true });
    }
  }

  if (commandName === 'kick') {
    const target = options.getUser('user');
    const reason = options.getString('reason') || 'Nedefinit';
    const targetMember = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id).catch(()=>null);

    if (!hasPerm('KickMembers')) return interaction.reply({ content: 'Nu ai permisiunea KickMembers.', ephemeral: true });
    if (!botHasPerm('KickMembers')) return interaction.reply({ content: 'Botul nu are permisiunea KickMembers.', ephemeral: true });

    if (!targetMember) return interaction.reply({ content: 'Utilizatorul nu a fost găsit pe server.', ephemeral: true });

    if (!targetMember.kickable) return interaction.reply({ content: 'Nu pot da kick acestui utilizator.', ephemeral: true });

    try {
      await targetMember.kick(reason);
      return interaction.reply({ content: `✅ ${target.tag} a fost kick-uit. Motiv: ${reason}` });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: 'Eroare la kick. Vezi log.', ephemeral: true });
    }
  }

  if (commandName === 'purge') {
    const count = options.getInteger('count');
    if (!hasPerm('ManageMessages')) return interaction.reply({ content: 'Nu ai permisiunea ManageMessages.', ephemeral: true });
    if (!botHasPerm('ManageMessages')) return interaction.reply({ content: 'Botul nu are permisiunea ManageMessages.', ephemeral: true });

    if (count < 2 || count > 100) return interaction.reply({ content: 'Count trebuie să fie între 2 și 100.', ephemeral: true });

    try {
      await interaction.deferReply({ ephemeral: true });
      const fetched = await interaction.channel.bulkDelete(count, true);
      return interaction.editReply({ content: `✅ Am șters ${fetched.size} mesaje.` });
    } catch (err) {
      console.error(err);
      if (interaction.deferred) {
        return interaction.editReply({ content: 'Eroare la ștergere (bulkDelete). Mesajele mai vechi de 14 zile nu pot fi șterse prin bulkDelete.' });
      }
      return interaction.reply({ content: 'Eroare la ștergere (bulkDelete). Mesajele mai vechi de 14 zile nu pot fi șterse prin bulkDelete.', ephemeral: true });
    }
  }

  if (commandName === 'warn') {
    const target = options.getUser('user');
    const reason = options.getString('reason') || 'Nedefinit';
    const targetMember = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id).catch(()=>null);

    if (!hasPerm('ModerateMembers')) return interaction.reply({ content: 'Nu ai permisiunea ModerateMembers.', ephemeral: true });

    if (!targetMember) return interaction.reply({ content: 'Utilizatorul nu a fost găsit pe server.', ephemeral: true });

    const db = loadDB();
    const warnKey = `${guild.id}_${target.id}`;
    
    if (!db.warnings[warnKey]) {
      db.warnings[warnKey] = [];
    }
    
    const warnData = {
      reason: reason,
      moderator: member.user.tag,
      timestamp: Date.now()
    };
    
    db.warnings[warnKey].push(warnData);
    saveDB(db);

    const warnCount = db.warnings[warnKey].length;
    let autoAction = '';

    if (botHasPerm('ManageRoles')) {
      try {
        const existingWarnRoles = targetMember.roles.cache.filter(role => role.name.startsWith('⚠️'));
        for (const role of existingWarnRoles.values()) {
          await targetMember.roles.remove(role);
        }

        const displayCount = Math.min(warnCount, 3);
        const roleName = `⚠️ ${displayCount} ${displayCount === 1 ? 'Warn' : 'Warns'}`;
        let warnRole = guild.roles.cache.find(role => role.name === roleName);
        
        if (!warnRole) {
          warnRole = await guild.roles.create({
            name: roleName,
            color: displayCount === 3 ? 0xFF6600 : displayCount === 2 ? 0xFF9900 : 0xFFCC00,
            reason: 'Sistem automat de avertismente'
          });
        }
        
        await targetMember.roles.add(warnRole);
      } catch (err) {
        console.error('Eroare la atribuirea rolului de warn:', err);
      }
    }

    if (warnCount >= 7) {
      if (botHasPerm('BanMembers') && targetMember.bannable) {
        try {
          await targetMember.ban({ reason: `Auto-ban: ${warnCount} avertismente` });
          autoAction = '\n🔨 **Acțiune Automată**: Ban permanent (7+ avertismente)';
        } catch (err) {
          console.error(err);
          autoAction = '\n⚠️ Nu am putut aplica ban automat.';
        }
      }
    } else if (warnCount >= 5) {
      if (botHasPerm('KickMembers') && targetMember.kickable) {
        try {
          await targetMember.kick(`Auto-kick: ${warnCount} avertismente`);
          autoAction = '\n👢 **Acțiune Automată**: Kick (5+ avertismente)';
        } catch (err) {
          console.error(err);
          autoAction = '\n⚠️ Nu am putut aplica kick automat.';
        }
      }
    } else if (warnCount >= 3) {
      if (botHasPerm('ModerateMembers') && targetMember.moderatable) {
        try {
          await targetMember.timeout(10 * 60 * 1000, `Auto-mute: ${warnCount} avertismente`);
          autoAction = '\n🔇 **Acțiune Automată**: Mute 10 minute (3+ avertismente)';
        } catch (err) {
          console.error(err);
          autoAction = '\n⚠️ Nu am putut aplica mute automat.';
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(warnCount >= 7 ? 0xFF0000 : warnCount >= 5 ? 0xFF3300 : warnCount >= 3 ? 0xFF6600 : 0xFF9900)
      .setTitle('⚠️ Utilizator Avertizat')
      .setDescription(`**Sistem de Gradare:**\n3 warns = Mute 10 min\n5 warns = Kick\n7 warns = Ban${autoAction}`)
      .addFields(
        { name: 'Utilizator', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: member.user.tag, inline: true },
        { name: 'Motiv', value: reason },
        { name: 'Total Avertismente', value: `${warnCount}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'mute') {
    const target = options.getUser('user');
    const duration = options.getInteger('duration');
    const reason = options.getString('reason') || 'Nedefinit';
    const targetMember = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id).catch(()=>null);

    if (!hasPerm('ModerateMembers')) return interaction.reply({ content: 'Nu ai permisiunea ModerateMembers.', ephemeral: true });
    if (!botHasPerm('ModerateMembers')) return interaction.reply({ content: 'Botul nu are permisiunea ModerateMembers.', ephemeral: true });

    if (duration <= 0 || duration > 40320) return interaction.reply({ content: 'Durata trebuie să fie între 1 și 40320 minute (28 zile).', ephemeral: true });

    if (!targetMember) return interaction.reply({ content: 'Utilizatorul nu a fost găsit pe server.', ephemeral: true });

    if (!targetMember.moderatable) return interaction.reply({ content: 'Nu pot aplica timeout acestui utilizator.', ephemeral: true });

    try {
      await targetMember.timeout(duration * 60 * 1000, reason);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔇 Utilizator Muted')
        .addFields(
          { name: 'Utilizator', value: `${target.tag}`, inline: true },
          { name: 'Durată', value: `${duration} minute`, inline: true },
          { name: 'Moderator', value: member.user.tag, inline: true },
          { name: 'Motiv', value: reason }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: 'Eroare la aplicarea timeout-ului.', ephemeral: true });
    }
  }

  if (commandName === 'unmute') {
    const target = options.getUser('user');
    const targetMember = interaction.guild.members.cache.get(target.id) || await interaction.guild.members.fetch(target.id).catch(()=>null);

    if (!hasPerm('ModerateMembers')) return interaction.reply({ content: 'Nu ai permisiunea ModerateMembers.', ephemeral: true });
    if (!botHasPerm('ModerateMembers')) return interaction.reply({ content: 'Botul nu are permisiunea ModerateMembers.', ephemeral: true });

    if (!targetMember) return interaction.reply({ content: 'Utilizatorul nu a fost găsit pe server.', ephemeral: true });

    if (!targetMember.moderatable) return interaction.reply({ content: 'Nu pot modifica timeout-ul acestui utilizator.', ephemeral: true });

    try {
      await targetMember.timeout(null);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔊 Utilizator Unmuted')
        .addFields(
          { name: 'Utilizator', value: `${target.tag}`, inline: true },
          { name: 'Moderator', value: member.user.tag, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: 'Eroare la eliminarea timeout-ului.', ephemeral: true });
    }
  }

  if (commandName === 'level') {
    const target = options.getUser('user') || interaction.user;
    
    const db = loadDB();
    const userKey = `${guild.id}_${target.id}`;
    
    const userLevel = db.levels[userKey] || 1;
    const userXp = db.xp[userKey] || 0;
    
    const xpNeeded = userLevel * 100;

    const embed = new EmbedBuilder()
      .setColor(0x00AAFF)
      .setTitle('📊 Level & XP')
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Utilizator', value: target.tag },
        { name: 'Level', value: `${userLevel}`, inline: true },
        { name: 'XP', value: `${userXp}/${xpNeeded}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'play') {
    const query = options.getString('query');
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Trebuie să fii într-un canal vocal pentru a reda muzică!', ephemeral: true });
    }

    if (!botHasPerm('Connect') || !botHasPerm('Speak')) {
      return interaction.reply({ content: '❌ Nu am permisiunile necesare (Connect și Speak) pentru a intra în canalul vocal!', ephemeral: true });
    }

    await interaction.reply({ content: `🔍 Caut: **${query}**...` });

    try {
      await distube.play(voiceChannel, query, {
        member: member,
        textChannel: interaction.channel
      });
    } catch (err) {
      console.error(err);
      await interaction.followUp({ content: `❌ Eroare la redarea muzicii: ${err.message}` });
    }
  }

});

client.login(process.env.TOKEN);