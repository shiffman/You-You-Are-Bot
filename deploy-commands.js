require('dotenv').config();

const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Note to self: define options for command arguments
const commands = [
  new SlashCommandBuilder()
    .setName('generate-you')
    .setDescription('Generates a new tweet')
    .addStringOption((option) =>
      option.setName('prompt').setDescription('A prompt').setRequired(false)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

rest
  .put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENTID,
      process.env.DISCORD_SERVERID
    ),
    {
      body: commands,
    }
  )
  .then(() => console.log('Successfully registered application commands.'))
  .catch(console.error);
