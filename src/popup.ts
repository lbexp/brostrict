interface Data {
  blacklist: string[];
  whitelist: string[];
  active: boolean;
}

const STORAGE_KEY = 'brostrict_data';

const createMainSwitch = (
  active: boolean,
  onToggle: () => void,
): HTMLDivElement => {
  const wrap = document.createElement('div');
  wrap.className = 'main-switch';
  wrap.addEventListener('click', onToggle);

  const label = document.createElement('span');
  label.className = 'switch-label';
  label.textContent = active ? 'ON' : 'OFF';
  wrap.appendChild(label);

  const pill = document.createElement('div');
  pill.className = active ? 'switch-pill active' : 'switch-pill';

  const dot = document.createElement('div');
  dot.className = 'switch-dot';
  pill.appendChild(dot);

  wrap.appendChild(pill);
  return wrap;
};

const createSection = (
  id: string,
  type: 'block' | 'allow',
  placeholder: string,
): {
  section: HTMLDivElement;
  items: HTMLDivElement;
  addBtn: HTMLButtonElement;
  input: HTMLInputElement;
} => {
  const section = document.createElement('div');
  section.className = 'section';

  const title = document.createElement('div');
  title.className = `section-title ${type}`;
  title.textContent = type === 'block' ? 'Block Sites' : 'Allow URLs';
  section.appendChild(title);

  const inputWrap = document.createElement('div');
  inputWrap.className = 'input-wrap';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;

  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = '+';

  inputWrap.appendChild(input);
  inputWrap.appendChild(addBtn);
  section.appendChild(inputWrap);

  const items = document.createElement('div');
  items.id = id;
  items.className = 'items';
  section.appendChild(items);

  return { section, items, addBtn, input };
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

const renderItems = (
  container: HTMLElement,
  items: string[],
  onRemove: (index: number) => void,
): void => {
  container.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item';

    const text = document.createElement('span');
    text.textContent = item;
    div.appendChild(text);

    const del = document.createElement('button');
    del.textContent = '×';
    del.className = 'del';
    del.addEventListener('click', () => onRemove(index));
    div.appendChild(del);

    container.appendChild(div);
  });
};

const render = (data: Data): HTMLDivElement => {
  const container = document.createElement('div');

  let currentData = data;

  const mainSwitch = createMainSwitch(data.active, () => {
    const newData = { ...currentData, active: !currentData.active };
    saveData(newData).then(() => updateUI(newData));
  });
  container.appendChild(mainSwitch);

  const {
    section: blockSection,
    items: blockItems,
    addBtn: blockAddBtn,
    input: blockInput,
  } = createSection('blacklist', 'block', 'example.com');
  container.appendChild(blockSection);

  const {
    section: allowSection,
    items: allowItems,
    addBtn: allowAddBtn,
    input: allowInput,
  } = createSection('whitelist', 'allow', 'example.com/page');
  container.appendChild(allowSection);

  const updateUI = (newData: Data): void => {
    currentData = newData;
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '';
      app.appendChild(render(currentData));
    }
  };

  renderItems(blockItems, data.blacklist, (index) => {
    const newData = {
      ...currentData,
      blacklist: currentData.blacklist.filter((_, i) => i !== index),
    };
    saveData(newData).then(() => updateUI(newData));
  });

  renderItems(allowItems, data.whitelist, (index) => {
    const newData = {
      ...currentData,
      whitelist: currentData.whitelist.filter((_, i) => i !== index),
    };
    saveData(newData).then(() => updateUI(newData));
  });

  blockAddBtn.addEventListener('click', () => {
    const value = blockInput.value.trim();
    if (value && !currentData.blacklist.includes(value)) {
      const newData = {
        ...currentData,
        blacklist: [...currentData.blacklist, value],
      };
      saveData(newData).then(() => updateUI(newData));
      blockInput.value = '';
    }
  });

  blockInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      blockAddBtn.click();
    }
  });

  allowAddBtn.addEventListener('click', () => {
    const value = allowInput.value.trim();
    if (value && !currentData.whitelist.includes(value)) {
      const newData = {
        ...currentData,
        whitelist: [...currentData.whitelist, value],
      };
      saveData(newData).then(() => updateUI(newData));
      allowInput.value = '';
    }
  });

  allowInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      allowAddBtn.click();
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
