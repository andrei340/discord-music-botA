// deploy-commands.js
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'ban',
    description: 'Banează un utilizator',
    options: [
      { name: 'user', type: 6, description: 'User to ban', required: true },
      { name: 'reason', type: 3, description: 'Motivul', required: false }
    ],
  },
  {
    name: 'kick',
    description: 'Dă kick unui utilizator',
    options: [
      { name: 'user', type: 6, description: 'User to kick', required: true },
      { name: 'reason', type: 3, description: 'Motivul', required: false }
    ],
  },
  {
    name: 'purge',
    description: 'Șterge mesaje (bulk delete)',
    options: [
      { name: 'count', type: 4, description: 'Câte mesaje (2-100)', required: true }
    ],
  },
  {
    name: 'warn',
    description: 'Avertizează un utilizator',
    options: [
      { name: 'user', type: 6, description: 'Utilizatorul de avertizat', required: true },
      { name: 'reason', type: 3, description: 'Motivul avertismentului', required: false }
    ],
  },
  {
    name: 'mute',
    description: 'Dă timeout unui utilizator',
    options: [
      { name: 'user', type: 6, description: 'Utilizatorul de mutat', required: true },
      { name: 'duration', type: 4, description: 'Durata în minute', required: true },
      { name: 'reason', type: 3, description: 'Motivul', required: false }
    ],
  },
  {
    name: 'unmute',
    description: 'Elimină timeout-ul unui utilizator',
    options: [
      { name: 'user', type: 6, description: 'Utilizatorul de unmutat', required: true }
    ],
  },
  {
    name: 'level',
    description: 'Verifică nivelul și XP-ul unui utilizator',
    options: [
      { name: 'user', type: 6, description: 'Utilizatorul (opțional)', required: false }
    ],
  },
  {
    name: 'play',
    description: 'Redă muzică de pe YouTube (link sau nume)',
    options: [
      { name: 'query', type: 3, description: 'Link YouTube sau nume melodie', required: true }
    ],
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Înregistrare comenzi...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Comenzi înregistrate!');
  } catch (error) {
    console.error(error);
  }
})();
