import { build } from 'esbuild';

import type { BunFile } from 'bun';

type Files = BunFile[];

const TEMPORARY_PATH = 'tmp/';
const BUILD_PATH = 'build/';

const getStatics = async (): Promise<Files> => {
  const files: Files = [];

  const manifest = Bun.file('manifest.json');
  if (manifest) files.push(manifest);

  const html = Bun.file('index.html');
  if (html) files.push(html);

  const blockedHtml = Bun.file('blocked.html');
  if (blockedHtml) files.push(blockedHtml);

  const icon = Bun.file('icon.png');
  if (icon) files.push(icon);

  return files;
};

const compileSource = async (entry: string, dest: string): Promise<number> => {
  await build({
    entryPoints: [entry],
    outfile: dest,
    bundle: true,
    format: 'iife',
    target: ['es6'],
    minify: true,
    sourcemap: false,
  });

  return 1;
};

const getCompiledSources = async (): Promise<Files> => {
  const popupDest = `${TEMPORARY_PATH}/index.js`;
  await compileSource('src/popup.ts', popupDest);

  const bgDest = `${TEMPORARY_PATH}/background.js`;
  await compileSource('src/background.ts', bgDest);

  return [Bun.file(popupDest), Bun.file(bgDest)];
};

const mergeInput = ([statics, sources]: [Files, Files]): Files => {
  const files: Files = [...statics, ...sources];
  return files;
};

const writeOutput = async (files: Files): Promise<boolean> => {
  const fileWrites = files.map((file) => {
    const name = file.name || Bun.randomUUIDv7();
    const isTmp = name.startsWith(TEMPORARY_PATH);
    const path = `${BUILD_PATH}/${isTmp ? name.substring(TEMPORARY_PATH.length) : name}`;
    const output = Bun.file(path);

    return Bun.write(output, file);
  });

  await Promise.all(fileWrites);
  return true;
};

const buildPipeline = async (): Promise<void> => {
  const [statics, sources] = await Promise.all([
    getStatics(),
    getCompiledSources(),
  ]);
  const files = mergeInput([statics, sources]);
  await writeOutput(files);
};

buildPipeline();