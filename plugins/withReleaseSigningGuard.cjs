const { withAppBuildGradle } = require("expo/config-plugins");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

module.exports = function withReleaseSigningGuard(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = "// Gaav Bajar release signing guard";
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += "\n" + readFileSync(join(__dirname, "release-signing.gradle"), "utf8");
    }
    return config;
  });
};
// The guard runs after signing configuration (including EAS injection) is applied.
