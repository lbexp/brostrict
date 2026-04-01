import { Effect, pipe } from 'effect';

interface Data {
  blacklist: string[];
  whitelist: string[];
  active: boolean;
}

const STORAGE_KEY = 'brostrict_data';

const retrieveData = (): Effect.Effect<Data> =>
  Effect.promise(async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (
      result[STORAGE_KEY] || {
        blacklist: [],
        whitelist: [],
        active: true,
      }
    );
  });

const saveData = (data: Data): Effect.Effect<void> =>
  Effect.promise(async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  });

const renderList = (
  list: HTMLUListElement,
  items: string[],
  onRemove: (index: number) => void,
): void => {
  list.innerHTML = '';
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'list-item';

    const text = document.createElement('span');
    text.textContent = item;
    li.appendChild(text);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => onRemove(index));
    li.appendChild(removeBtn);

    list.appendChild(li);
  });
};

const render = (data: Data): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'container';

  const toggleWrapper = document.createElement('div');
  toggleWrapper.className = 'toggle-wrapper';

  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = 'Protection';
  toggleWrapper.appendChild(toggleLabel);

  const toggle = document.createElement('button');
  toggle.id = 'toggle';
  toggle.className = data.active ? 'active' : 'inactive';
  toggle.textContent = data.active ? 'ON' : 'OFF';
  toggleWrapper.appendChild(toggle);
  container.appendChild(toggleWrapper);

  const blacklistSection = document.createElement('div');
  blacklistSection.className = 'section';
  const blacklistTitle = document.createElement('h3');
  blacklistTitle.textContent = 'Blacklist';
  blacklistSection.appendChild(blacklistTitle);

  const blacklistInputRow = document.createElement('div');
  blacklistInputRow.className = 'input-row';
  const blacklistInput = document.createElement('input');
  blacklistInput.id = 'blacklist-input';
  blacklistInput.type = 'text';
  blacklistInput.placeholder = 'Enter domain (e.g., youtube.com)';
  const blacklistAddBtn = document.createElement('button');
  blacklistAddBtn.textContent = 'Add';
  blacklistInputRow.appendChild(blacklistInput);
  blacklistInputRow.appendChild(blacklistAddBtn);
  blacklistSection.appendChild(blacklistInputRow);

  const blacklistList = document.createElement('ul');
  blacklistList.id = 'blacklist';
  blacklistList.className = 'list';
  blacklistSection.appendChild(blacklistList);
  container.appendChild(blacklistSection);

  const whitelistSection = document.createElement('div');
  whitelistSection.className = 'section';
  const whitelistTitle = document.createElement('h3');
  whitelistTitle.textContent = 'Whitelist';
  whitelistSection.appendChild(whitelistTitle);

  const whitelistInputRow = document.createElement('div');
  whitelistInputRow.className = 'input-row';
  const whitelistInput = document.createElement('input');
  whitelistInput.id = 'whitelist-input';
  whitelistInput.type = 'text';
  whitelistInput.placeholder =
    'Enter URL with path (e.g., youtube.com/pewdiepie)';
  const whitelistAddBtn = document.createElement('button');
  whitelistAddBtn.textContent = 'Add';
  whitelistInputRow.appendChild(whitelistInput);
  whitelistInputRow.appendChild(whitelistAddBtn);
  whitelistSection.appendChild(whitelistInputRow);

  const whitelistList = document.createElement('ul');
  whitelistList.id = 'whitelist';
  whitelistList.className = 'list';
  whitelistSection.appendChild(whitelistList);
  container.appendChild(whitelistSection);

  let currentData = data;

  const updateUI = (newData: Data): void => {
    currentData = newData;
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '';
      app.appendChild(render(currentData));
    }
  };

  renderList(blacklistList, data.blacklist, (index) => {
    const newData = {
      ...currentData,
      blacklist: currentData.blacklist.filter((_, i) => i !== index),
    };
    Effect.runPromise(saveData(newData)).then(() => updateUI(newData));
  });

  renderList(whitelistList, data.whitelist, (index) => {
    const newData = {
      ...currentData,
      whitelist: currentData.whitelist.filter((_, i) => i !== index),
    };
    Effect.runPromise(saveData(newData)).then(() => updateUI(newData));
  });

  toggle.addEventListener('click', () => {
    const newData = { ...currentData, active: !currentData.active };
    Effect.runPromise(saveData(newData)).then(() => updateUI(newData));
  });

  blacklistAddBtn.addEventListener('click', () => {
    const value = blacklistInput.value.trim();
    if (value && !currentData.blacklist.includes(value)) {
      const newData = {
        ...currentData,
        blacklist: [...currentData.blacklist, value],
      };
      Effect.runPromise(saveData(newData)).then(() => updateUI(newData));
      blacklistInput.value = '';
    }
  });

  whitelistAddBtn.addEventListener('click', () => {
    const value = whitelistInput.value.trim();
    if (value && !currentData.whitelist.includes(value)) {
      const newData = {
        ...currentData,
        whitelist: [...currentData.whitelist, value],
      };
      Effect.runPromise(saveData(newData)).then(() => updateUI(newData));
      whitelistInput.value = '';
    }
  });

  return container;
};

const program = pipe(
  retrieveData(),
  Effect.flatMap((data) =>
    Effect.sync(() => {
      const container = render(data);
      const app = document.getElementById('app');
      if (app) {
        app.appendChild(container);
      }
    }),
  ),
);

Effect.runPromise(program);
