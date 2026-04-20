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

const createProtectionCard = (
  active: boolean,
  onToggle: () => void,
): HTMLDivElement => {
  const card = document.createElement('div');
  card.className = 'card';

  const cardHeader = document.createElement('div');
  cardHeader.className = 'card-header';

  const title = document.createElement('h3');
  title.textContent = 'Protection';
  cardHeader.appendChild(title);

  const toggle = document.createElement('button');
  toggle.className = active ? 'toggle active' : 'toggle inactive';
  toggle.textContent = active ? 'On' : 'Off';
  toggle.addEventListener('click', onToggle);
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

const retrieveData = async (): Promise<Data> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (
    result[STORAGE_KEY] || {
      blacklist: [],
      whitelist: [],
      active: true,
    }
  );
};

const saveData = async (data: Data): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
};

const renderList = (
  list: HTMLElement,
  items: string[],
  onRemove: (index: number) => void,
  onEdit: (index: number, newValue: string) => void,
): void => {
  list.innerHTML = '';
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'list-item';

    const text = document.createElement('span');
    text.textContent = item;
    li.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.className = 'edit-btn';
    editBtn.addEventListener('click', () => {
      li.classList.add('editing');

      const input = document.createElement('input');
      input.type = 'text';
      input.value = item;
      input.className = 'edit-input';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = '✓';
      saveBtn.className = 'save-btn';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✕';
      cancelBtn.className = 'cancel-btn';

      const editActions = document.createElement('div');
      editActions.className = 'edit-actions';
      editActions.appendChild(saveBtn);
      editActions.appendChild(cancelBtn);

      li.innerHTML = '';
      li.appendChild(input);
      li.appendChild(editActions);
      input.focus();

      const save = (): void => {
        const newValue = input.value.trim();
        if (newValue && newValue !== item && !items.includes(newValue)) {
          onEdit(index, newValue);
        } else if (newValue === item || items.includes(newValue)) {
          renderList(list, items, onRemove, onEdit);
        }
      };

      const cancel = (): void => {
        renderList(list, items, onRemove, onEdit);
      };

      saveBtn.addEventListener('click', save);
      cancelBtn.addEventListener('click', cancel);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
      });
    });
    actions.appendChild(editBtn);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => onRemove(index));
    actions.appendChild(removeBtn);

    li.appendChild(actions);
    list.appendChild(li);
  });
};

const render = (data: Data): HTMLDivElement => {
  const container = createContainer();

  let currentData = data;

  const protectionCard = createProtectionCard(data.active, () => {
    const newData = { ...currentData, active: !currentData.active };
    saveData(newData).then(() => updateUI(newData));
  });
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

  const updateUI = (newData: Data): void => {
    currentData = newData;
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '';
      app.appendChild(render(currentData));
    }
  };

  renderList(
    blacklistList,
    data.blacklist,
    (index) => {
      const newData = {
        ...currentData,
        blacklist: currentData.blacklist.filter((_, i) => i !== index),
      };
      saveData(newData).then(() => updateUI(newData));
    },
    (index, newValue) => {
      const newBlacklist = [...currentData.blacklist];
      newBlacklist[index] = newValue;
      const newData = { ...currentData, blacklist: newBlacklist };
      saveData(newData).then(() => updateUI(newData));
    },
  );

  renderList(
    whitelistList,
    data.whitelist,
    (index) => {
      const newData = {
        ...currentData,
        whitelist: currentData.whitelist.filter((_, i) => i !== index),
      };
      saveData(newData).then(() => updateUI(newData));
    },
    (index, newValue) => {
      const newWhitelist = [...currentData.whitelist];
      newWhitelist[index] = newValue;
      const newData = { ...currentData, whitelist: newWhitelist };
      saveData(newData).then(() => updateUI(newData));
    },
  );

  blacklistAddBtn.addEventListener('click', () => {
    const value = blacklistInput.value.trim();
    if (value && !currentData.blacklist.includes(value)) {
      const newData = {
        ...currentData,
        blacklist: [...currentData.blacklist, value],
      };
      saveData(newData).then(() => updateUI(newData));
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
      saveData(newData).then(() => updateUI(newData));
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

const init = async (): Promise<void> => {
  const data = await retrieveData();
  const container = render(data);
  const app = document.getElementById('app');
  if (app) {
    app.appendChild(container);
  }
};

init();