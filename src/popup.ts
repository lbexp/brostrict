import { Effect, pipe } from 'effect';

interface Data {
  blacklist: string[];
  whitelist: string[];
  active: boolean;
}

const STORAGE_KEY = 'brostrict_data';

const createContainer = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'container';
  return container;
};

const createProtectionCard = (active: boolean): HTMLDivElement => {
  const card = document.createElement('div');
  card.className = 'card';

  const cardHeader = document.createElement('div');
  cardHeader.className = 'card-header';

  const title = document.createElement('h3');
  title.textContent = 'Protection';
  cardHeader.appendChild(title);

  const toggle = document.createElement('button');
  toggle.id = 'toggle';
  toggle.className = active ? 'toggle active' : 'toggle inactive';
  toggle.textContent = active ? 'On' : 'Off';
  cardHeader.appendChild(toggle);

  card.appendChild(cardHeader);
  return card;
};

const createListCard = (
  id: string,
  title: string,
  placeholder: string,
): {
  card: HTMLDivElement;
  list: HTMLUListElement;
  addBtn: HTMLButtonElement;
  input: HTMLInputElement;
} => {
  const card = document.createElement('div');
  card.className = 'card';

  const cardHeader = document.createElement('div');
  cardHeader.className = 'card-header';

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  cardHeader.appendChild(titleEl);

  card.appendChild(cardHeader);

  const inputRow = document.createElement('div');
  inputRow.className = 'input-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';

  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);
  card.appendChild(inputRow);

  const list = document.createElement('ul');
  list.id = id;
  list.className = 'list';
  card.appendChild(list);

  return { card, list, addBtn, input };
};

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
  list: HTMLElement,
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
  const container = createContainer();

  const protectionCard = createProtectionCard(data.active);
  container.appendChild(protectionCard);

  const {
    card: blacklistCard,
    list: blacklistList,
    addBtn: blacklistAddBtn,
    input: blacklistInput,
  } = createListCard('blacklist', 'Blacklist', 'youtube.com');
  container.appendChild(blacklistCard);

  const {
    card: whitelistCard,
    list: whitelistList,
    addBtn: whitelistAddBtn,
    input: whitelistInput,
  } = createListCard('whitelist', 'Whitelist', 'youtube.com/video');
  container.appendChild(whitelistCard);

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

  const toggle = document.getElementById('toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const newData = { ...currentData, active: !currentData.active };
      Effect.runPromise(saveData(newData)).then(() => updateUI(newData));
    });
  }

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

  blacklistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      blacklistAddBtn.click();
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

  whitelistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      whitelistAddBtn.click();
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