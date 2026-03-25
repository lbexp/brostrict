import { Effect, pipe } from 'effect';
import { build } from 'esbuild';

import type { BunFile } from 'bun';

type Files = BunFile[];

const TEMPORARY_PATH = 'tmp/';
const BUILD_PATH = 'build/';
const ENTRY = 'src/index.ts';

const getStatics = (): Effect.Effect<Files> => {
  const files: Files = [];

  const manifest = Bun.file('manifest.json');
  if (manifest) files.push(manifest);

  const html = Bun.file('index.html');
  if (html) files.push(html);

  const icon = Bun.file('icon.png');
  if (icon) files.push(icon);

  return Effect.succeed(files);
};

const compileSource = (entry: string, dest: string): Effect.Effect<number> =>
  Effect.promise(async () => {
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
  });

const getCompiledSource: Effect.Effect<BunFile> = Effect.gen(function* () {
  const dest = `${TEMPORARY_PATH}/index.js`;
  yield* compileSource(ENTRY, dest);

  return Bun.file(dest);
});

const mergeInput = ([statics, source]: [Files, BunFile]) => {
  const files: Files = [...statics, source];

  return Effect.succeed(files);
};

const writeOutput = (files: Files): Effect.Effect<boolean> =>
  Effect.promise(async () => {
    const fileWrites = files.map((file) => {
      const name = file.name || Bun.randomUUIDv7();
      const isTmp = name.startsWith(TEMPORARY_PATH);
      const path = `${BUILD_PATH}/${isTmp ? name.substring(TEMPORARY_PATH.length) : name}`;
      const output = Bun.file(path);

      return Bun.write(output, file);
    });

    await Promise.all(fileWrites);

    return Promise.resolve(true);
  });

const buildPipeline = pipe(
  Effect.all([getStatics(), getCompiledSource]),
  Effect.flatMap(mergeInput),
  Effect.flatMap(writeOutput),
);

Effect.runPromise(buildPipeline);
