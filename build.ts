// import { rm } from 'node:fs/promises';
import { Effect, pipe } from 'effect';
import type { BunFile } from 'bun';

type Files = BunFile[];

const TEMPORARY_PATH = 'tmp/';
const BUILD_PATH = 'build/';

const getStatics = (): Effect.Effect<Files> => {
  const files: Files = [];

  const manifest = Bun.file('manifest.json');
  if (manifest) files.push(manifest);

  const html = Bun.file('index.html');
  if (html) files.push(html);

  return Effect.succeed(files);
};

const getSource = (): Effect.Effect<BunFile> => {
  const file = Bun.file('src/index.ts');

  return Effect.succeed(file);
};

const getSourceText = (file: BunFile): Effect.Effect<string> =>
  Effect.promise(() => {
    return file.text();
  });

const compileSource = (dest: string, source: string): Effect.Effect<number> =>
  Effect.promise(() => {
    // TODO: Add module bundling & transpiling
    return Bun.write(dest, source);
  });

const getCompiledSource: Effect.Effect<BunFile> = Effect.gen(function* () {
  const file = yield* getSource();
  const source = yield* getSourceText(file);
  const tempPath = `${TEMPORARY_PATH}/index.ts`;
  yield* compileSource(tempPath, source);

  return Bun.file(tempPath);
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

// const deleteTmp = () =>
//   Effect.promise(() => {
//     return rm('tmp');
//   });

const build = pipe(
  Effect.all([getStatics(), getCompiledSource]),
  Effect.flatMap(mergeInput),
  Effect.flatMap(writeOutput),
  // Effect.tap(deleteTmp),
);

Effect.runPromise(build);
