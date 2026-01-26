import { Effect, pipe } from 'effect';

/*
 * Start - Type declarations
 */

interface Data {
  blacklist: string[];
  active: boolean;
}

/*
 * End - Type declarations
 */

/*
 * Start -- Const declarations
 */

const BLACKLIST_STORAGE_KEY = 'blacklist';
const ACTIVE_STORAGE_KEY = 'active';

/*
 * End -- Const declarations
 */

/*
 * Non-effect functions
 */

const addUrl = () => {
  const list = document.getElementById('blacklist');
  const input = document.getElementById('url-input') as HTMLInputElement;
  const item = document.createElement('p');

  if (input && list) {
    item.textContent = input.value;
    list.appendChild(item);
  }
};

/*
 * End -- Non-effect functions
 */

/*
 * Start -- Effects
 */

const retrieveData = (): Effect.Effect<Data> =>
  Effect.promise(async () => {
    const result = await chrome.storage.local.get([BLACKLIST_STORAGE_KEY]);

    try {
      const blacklist = JSON.parse(result[BLACKLIST_STORAGE_KEY]) as string[];
      const active = JSON.parse(result[ACTIVE_STORAGE_KEY]) as boolean;

      return {
        blacklist,
        active,
      };
    } catch {
      console.error('Failed to parse data');
      return {
        blacklist: [],
        active: false,
      };
    }
  });

const render = (data: Data): Effect.Effect<boolean, Error> => {
  const container = document.getElementById('app');

  if (container) {
    const { blacklist, active } = data;
    const urlWrapper = document.createElement('div');
    urlWrapper.setAttribute('class', 'url-wrapper');

    const urlInput = document.createElement('input');
    urlInput.setAttribute('id', 'url-input');
    urlInput.setAttribute('class', 'url-input');

    const urlAdd = document.createElement('button');
    urlAdd.setAttribute('id', 'url-add');
    urlAdd.setAttribute('class', 'url-add');
    urlAdd.addEventListener('click', addUrl);

    urlWrapper.appendChild(urlInput);
    urlWrapper.appendChild(urlAdd);
    container.appendChild(urlWrapper);

    const list = document.createElement('div');
    list.setAttribute('id', 'blacklist');
    list.setAttribute('class', 'blacklist');

    blacklist.forEach((value) => {
      const item = document.createElement('p');
      item.textContent = value;
      list.appendChild(item);
    });
    container.appendChild(list);

    const onOffWrapper = document.createElement('div');
    onOffWrapper.setAttribute('class', 'on-off-wrapper');
    const onOffButton = document.createElement('button');
    onOffButton.setAttribute('id', 'on-off');
    onOffButton.setAttribute('class', 'on-off-button');
    onOffWrapper.appendChild(onOffButton);
    onOffButton.classList.add(active ? 'on' : 'off');
    onOffButton.textContent = active ? 'ON' : 'OFF';
    container.appendChild(onOffWrapper);

    return Effect.succeed(true);
  }

  return Effect.fail(new Error("Can't find the app container"));
};

/*
 * End -- Effects
 */

const program = pipe(retrieveData(), Effect.flatMap(render));
Effect.runPromise(program);
