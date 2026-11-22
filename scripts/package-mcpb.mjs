import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(root, 'mcpb', 'manifest.json'), 'utf8'));
if (process.argv.length > 2) {
  throw new Error('The universal MCPB build does not accept a platform or architecture.');
}

if (!process.env.npm_execpath) {
  throw new Error('Run this script through "npm run pack:mcpb".');
}

const temp = await mkdtemp(join(tmpdir(), 'genesys-cloud-mcpb-'));
const staging = join(temp, 'bundle');
const nativeStaging = join(temp, 'native');
const releaseDir = join(root, 'release');
const output = join(releaseDir, `${packageJson.name}-${packageJson.version}.mcpb`);
const nativeTargets = [
  { platform: 'win32', architecture: 'x64', packageName: 'keyring-win32-x64-msvc' },
  { platform: 'win32', architecture: 'arm64', packageName: 'keyring-win32-arm64-msvc' },
  { platform: 'darwin', architecture: 'x64', packageName: 'keyring-darwin-x64' },
  { platform: 'darwin', architecture: 'arm64', packageName: 'keyring-darwin-arm64' },
];

function runNodeScript(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status ?? 'unknown'}.`);
  }
}

try {
  await mkdir(staging, { recursive: true });
  await mkdir(nativeStaging, { recursive: true });
  await cp(join(root, 'dist'), join(staging, 'dist'), { recursive: true });
  await cp(join(root, 'package.json'), join(staging, 'package.json'));
  await cp(join(root, 'package-lock.json'), join(staging, 'package-lock.json'));
  await writeFile(
    join(staging, 'manifest.json'),
    `${JSON.stringify(
      {
        ...manifest,
        version: packageJson.version,
      },
      null,
      2,
    )}\n`,
  );

  for (const { platform, architecture, packageName } of nativeTargets) {
    runNodeScript(
      process.env.npm_execpath,
      ['ci', '--omit=dev', '--no-audit', '--no-fund', `--os=${platform}`, `--cpu=${architecture}`],
      staging,
    );
    await cp(
      join(staging, 'node_modules', '@napi-rs', packageName),
      join(nativeStaging, packageName),
      { recursive: true },
    );
  }

  for (const { packageName } of nativeTargets) {
    await cp(
      join(nativeStaging, packageName),
      join(staging, 'node_modules', '@napi-rs', packageName),
      { recursive: true },
    );
  }
  await rm(join(staging, 'package-lock.json'), { force: true });
  await mkdir(releaseDir, { recursive: true });
  await rm(output, { force: true });

  const mcpbPackageDir = join(root, 'node_modules', '@anthropic-ai', 'mcpb');
  const mcpbPackage = JSON.parse(await readFile(join(mcpbPackageDir, 'package.json'), 'utf8'));
  const cliPath = join(mcpbPackageDir, mcpbPackage.bin);
  runNodeScript(cliPath, ['pack', staging, output], root);

  console.log(`Created ${output}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
