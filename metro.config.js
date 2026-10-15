const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Both cases are required; the bundler is case-sensitive and video assets
// otherwise fail with a cryptic resolution error.
config.resolver.assetExts.push('mov', 'MOV', 'mp4', 'MP4');

// The design reference lives in the repo as raw HTML; keep it out of the graph.
config.resolver.blockList = [/\/design\/.*/];

module.exports = config;
