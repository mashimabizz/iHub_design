const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const config = getDefaultConfig(projectRoot);

const packageAliases = {
  "@ihub/core": path.join(workspaceRoot, "packages/core"),
  "@ihub/design": path.join(workspaceRoot, "packages/design"),
  "@ihub/supabase": path.join(workspaceRoot, "packages/supabase"),
};

config.watchFolders = (config.watchFolders ?? []).filter((folder) =>
  fs.existsSync(folder),
);
config.resolver.nodeModulesPaths = (
  config.resolver.nodeModulesPaths ?? []
).filter((folder) => fs.existsSync(folder));
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  ...packageAliases,
};

module.exports = config;
