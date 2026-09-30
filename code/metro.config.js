const {
  withUniwindConfig: withUniwindConfig
} = require('uniwind/metro');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  extraThemes: ['dark'],
});