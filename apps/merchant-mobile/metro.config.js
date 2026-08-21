// Metro must be told about the monorepo explicitly: it needs to watch the
// workspace root so edits in packages/* hot-reload, and to resolve modules from
// the root node_modules as well as the app's own.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// The workspace uses a hoisted layout (.npmrc), so a package must not be
// resolved twice from two different node_modules trees.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
