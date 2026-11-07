'use strict';
let games = [];
let view = 'all';
let editingId = null;
let currentSettings = {nickname:'Gracz NOVA',theme:'purple'};
let toastTimer;
function formatPlaytime(ms) {
  const minutes = Math.floor(Math.max(0, Number(ms) || 0) / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} godz. ${String(minutes % 60).padStart(2, '0')} min` : `${minutes} min`;
}

const $ = id => document.getElementById(id);
const modal = $('addModal');
function showToast(message) {
  const el = $('toast'); el.textContent = message; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => {el.hidden = true;}, 3300);
}
function errorMessage(error) {showToast('⚠ ' + (error?.message || 'Wystąpił błąd.'));}
function openModal() {$('addForm').reset(); $('formError').hidden = true; syncType(); modal.showModal(); $('gameName').focus();}
function closeModal() {modal.close();}
function syncType() {
  const web = $('gameType').value === 'web';
  $('targetLabel').textContent = web ? 'Adres strony gry' : 'Plik EXE';
  $('gameTarget').placeholder = web ? 'https://twoja-gra.pages.dev' : 'Wybierz plik .exe';
  $('browseBtn').hidden = web;
}
function node(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}
function makeCard(game) {
  const card = node('article', 'game');
  const art = node('div','game-art');
  if (game.cover && /^data:image\/(png|jpeg|webp);base64,/.test(game.cover)) {
    const img = node('img','cover-image'); img.src = game.cover; img.alt = 'Okładka: ' + game.name; art.append(img);
  } else art.append(node('span', 'art-symbol', game.type === 'web' ? '🌐' : '🎮'));
  art.append(node('span', 'type-tag', game.type === 'web' ? 'GRA ONLINE' : 'WINDOWS EXE'));
  const fav = node('button', 'favorite' + (game.favorite ? ' selected' : ''), game.favorite ? '★' : '☆');
  fav.title = game.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych';
  fav.setAttribute('aria-label', fav.title);
  fav.addEventListener('click', async () => {try {await window.nova.favorite(game.id);} catch(e){errorMessage(e);}});
  art.append(fav); card.append(art);
  const info = node('div','game-info');
  const name = node('div','game-title',game.name); name.title = game.name;
  const meta = node('div','game-meta',`${game.plays || 0} uruchomień · ${game.category || 'Inne'} · ${game.type === 'web' ? 'WWW (czas nieliczony)' : 'Windows'}`);
  info.append(name,meta);
  const time = node('div', 'game-time', game.type === 'local' ? `◷ Czas gry: ${formatPlaytime(game.playtimeMs)}` : '◷ Czas gry online: nieobsługiwany');
  info.append(time);
  const actions = node('div','game-actions');
  const play = node('button','play','▶  GRAJ TERAZ');
  play.addEventListener('click',async () => {
    play.disabled = true;
    try {await window.nova.launch(game.id); showToast(`Uruchomiono: ${game.name}`);}
    catch(e) {errorMessage(e);} finally {play.disabled = false;}
  });
  const remove = node('button','remove','✕'); remove.title = 'Usuń z biblioteki'; remove.setAttribute('aria-label','Usuń '+game.name);
  remove.addEventListener('click',async () => {
    if (!confirm(`Usunąć „${game.name}” z biblioteki? Sama gra nie zostanie usunięta z dysku.`)) return;
    try {await window.nova.remove(game.id); showToast('Usunięto z biblioteki.');}catch(e){errorMessage(e);}
  });
  const edit = node('button','remove','✎'); edit.title = 'Edytuj grę i okładkę';
  edit.addEventListener('click',()=>{
    editingId = game.id; $('editName').value=game.name; $('editCategory').value=game.category || 'Inne'; $('editModal').showModal();
  });
  actions.append(play,edit,remove); info.append(actions); card.append(info);
  return card;
}
function render() {
  $('statGames').textContent = String(games.length);
  $('statFav').textContent = String(games.filter(g => g.favorite).length);
  $('statPlays').textContent = String(games.reduce((n,g) => n + (Number(g.plays)||0),0));
  $('statTime').textContent = formatPlaytime(games.reduce((n,g)=>n+(Number(g.playtimeMs)||0),0));
  $('navCount').textContent = String(games.length);
  const other = view === 'settings' || view === 'achievements';
  $('gameGrid').hidden = other; $('empty').hidden = other; $('achievementsPanel').hidden = view !== 'achievements';
  $('settingsPanel').hidden = view !== 'settings';
  document.querySelector('.toolbar').hidden = other;
  $('addBtn').hidden = other;
  const titles = {all:'Twoja biblioteka',favorites:'Ulubione gry',recent:'Ostatnio grane',achievements:'Osiągnięcia',settings:'Ustawienia'};
  if (view === 'achievements') renderAchievements();
  $('viewTitle').firstChild.textContent = titles[view]+' ';
  const query = $('search').value.toLocaleLowerCase('pl').trim();
  const type = $('typeFilter').value;
  const currentCategory = $('categoryFilter').value;
  const options = ['all', ...new Set(games.map(g=>g.category || 'Inne'))].sort((a,b)=>a==='all'?-1:b==='all'?1:a.localeCompare(b,'pl'));
  if (options.join('|') !== Array.from($('categoryFilter').options).map(o=>o.value).join('|')) {
    $('categoryFilter').replaceChildren(...options.map(value => {const opt=node('option','',value === 'all' ? 'Wszystkie kategorie':value); opt.value=value;return opt;}));
    $('categoryFilter').value=options.includes(currentCategory)?currentCategory:'all';
  }
  const category=$('categoryFilter').value;
  let list = games.filter(g => (view === 'all' || (view === 'favorites' ? g.favorite : g.lastPlayed)) && (type === 'all' || type === g.type) && (category === 'all' || category === (g.category || 'Inne')) && g.name.toLocaleLowerCase('pl').includes(query));
  const sort = $('sort').value;
  if (view === 'recent') list.sort((a,b) => String(b.lastPlayed).localeCompare(String(a.lastPlayed)));
  else if (sort === 'name') list.sort((a,b) => a.name.localeCompare(b.name,'pl'));
  else if (sort === 'playtime') list.sort((a,b) => (Number(b.playtimeMs)||0)-(Number(a.playtimeMs)||0));
  else if (sort === 'played') list.sort((a,b) => (b.plays||0)-(a.plays||0));
  else list.sort((a,b) => String(b.addedAt).localeCompare(String(a.addedAt)));
  $('shownCount').textContent = `(${list.length})`;
  const grid = $('gameGrid'); grid.replaceChildren(...list.map(makeCard));
  $('empty').hidden = other || list.length > 0;
  $('emptyTitle').textContent = games.length ? 'Nie znaleziono gier' : 'Biblioteka czeka na Twoje gry';
  $('emptyDesc').textContent = games.length ? 'Zmień filtr, wyszukiwanie lub sekcję.' : 'Dodaj swój pierwszy plik EXE albo adres gry internetowej.';
  $('emptyAdd').hidden = games.length > 0;
}
for (const id of ['addHero','addBtn','emptyAdd']) $(id).addEventListener('click',openModal);
$('closeModal').addEventListener('click',closeModal);
$('cancelBtn').addEventListener('click',closeModal);
$('gameType').addEventListener('change',syncType);
$('browseBtn').addEventListener('click',async () => {
  try {const value = await window.nova.chooseExe(); if (value) { $('gameTarget').value=value; if (!$('gameName').value.trim()) $('gameName').value=value.split(/[\\/]/).pop().replace(/\.exe$/i,''); }} catch(e){errorMessage(e);}
});
$('addForm').addEventListener('submit',async event => {
  event.preventDefault();
  const input = {name:$('gameName').value,type:$('gameType').value,target:$('gameTarget').value,category:$('gameCategory').value};
  try {await window.nova.add(input); closeModal(); showToast('Gra dodana do biblioteki!');}
  catch(e) {$('formError').textContent=e.message; $('formError').hidden=false;}
});
for(const btn of document.querySelectorAll('[data-view]')) btn.addEventListener('click',() => {
  view=btn.dataset.view;
  for(const el of document.querySelectorAll('[data-view]')) el.classList.toggle('active',el===btn);
  render();
});
for (const id of ['search','typeFilter','categoryFilter','sort']) $(id).addEventListener(id==='search'?'input':'change',render);
$('exportBtn').addEventListener('click',async () => {try {if(await window.nova.export()) showToast('Kopia biblioteki została zapisana.');}catch(e){errorMessage(e);}});
window.nova.subscribe(next => {games=next;render();});
window.nova.list().then(next => {games=next;render();}).catch(errorMessage);

function renderAchievements() {
  const plays = games.reduce((sum,g)=>sum+(Number(g.plays)||0),0);
  const awards = [
    ['🎮','Pierwsza gra',games.length >= 1,'Dodaj jedną grę'],
    ['📚','Kolekcjoner',games.length >= 10,'Dodaj 10 gier'],
    ['▶','Pierwszy start',plays >= 1,'Uruchom dowolną grę'],
    ['⚡','Gracz aktywny',plays >= 25,'Uruchom gry 25 razy'],
    ['★','Ulubieniec',games.some(g=>g.favorite),'Dodaj grę do ulubionych'],
    ['🌐','Odkrywca online',games.some(g=>g.type === 'web'),'Dodaj grę internetową']
  ];
  $('achievementsList').replaceChildren(...awards.map(([icon,title,achieved,description])=>{
    const item = node('div','award'+(achieved?' achieved':''));
    item.append(node('div','award-icon',icon),node('strong','',title),node('small','',achieved?'✓ Odblokowane':description));
    return item;
  }));
}
function applySettings(value) {
  currentSettings=value;
  $('nickname').value=value.nickname || 'Gracz NOVA';
  $('themeSelect').value=['purple','blue','red','gold'].includes(value.theme)?value.theme:'purple';
  $('welcomeName').textContent=value.nickname || 'Gracz NOVA';
  document.documentElement.dataset.theme=$('themeSelect').value;
}
$('saveSettings').addEventListener('click', async ()=>{
  try {applySettings(await window.nova.saveSettings({nickname:$('nickname').value,theme:$('themeSelect').value}));showToast('Ustawienia zapisane.');}
  catch(e){errorMessage(e);}
});
$('closeEdit').addEventListener('click',()=>$('editModal').close());
$('editForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  try {await window.nova.edit(editingId,{name:$('editName').value,category:$('editCategory').value});$('editModal').close();showToast('Zmiany zapisane.');}
  catch(e){errorMessage(e);}
});
$('editCover').addEventListener('click',async()=>{
  try {if(await window.nova.setCover(editingId))showToast('Okładka dodana.');}
  catch(e){errorMessage(e);}
});
$('clearCover').addEventListener('click',async()=>{
  try {await window.nova.clearCover(editingId);showToast('Okładka usunięta.');}
  catch(e){errorMessage(e);}
});
window.nova.getSettings().then(applySettings).catch(errorMessage);
// Periodic refresh keeps time display in sync with background session checkpoints.
setInterval(async () => {
  if (document.hidden) return;
  try { games = await window.nova.list(); render(); } catch (e) {console.warn('Odświeżenie licznika:', e);}
}, 10000);

