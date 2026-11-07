'use strict';
let games = [];
let view = 'all';
let toastTimer;
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
  art.append(node('span', 'art-symbol', game.type === 'web' ? '🌐' : '🎮'));
  art.append(node('span', 'type-tag', game.type === 'web' ? 'GRA ONLINE' : 'WINDOWS EXE'));
  const fav = node('button', 'favorite' + (game.favorite ? ' selected' : ''), game.favorite ? '★' : '☆');
  fav.title = game.favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych';
  fav.setAttribute('aria-label', fav.title);
  fav.addEventListener('click', async () => {try {await window.nova.favorite(game.id);} catch(e){errorMessage(e);}});
  art.append(fav); card.append(art);
  const info = node('div','game-info');
  const name = node('div','game-title',game.name); name.title = game.name;
  const meta = node('div','game-meta',`${game.plays || 0} uruchomień · ${game.type === 'web' ? 'Przeglądarka' : 'Windows'}`);
  info.append(name,meta);
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
  actions.append(play,remove); info.append(actions); card.append(info);
  return card;
}
function render() {
  $('statGames').textContent = String(games.length);
  $('statFav').textContent = String(games.filter(g => g.favorite).length);
  $('statPlays').textContent = String(games.reduce((n,g) => n + (Number(g.plays)||0),0));
  $('navCount').textContent = String(games.length);
  const titles = {all:'Twoja biblioteka',favorites:'Ulubione gry',recent:'Ostatnio grane'};
  $('viewTitle').firstChild.textContent = titles[view]+' ';
  const query = $('search').value.toLocaleLowerCase('pl').trim();
  const type = $('typeFilter').value;
  let list = games.filter(g => (view === 'all' || (view === 'favorites' ? g.favorite : g.lastPlayed)) && (type === 'all' || type === g.type) && g.name.toLocaleLowerCase('pl').includes(query));
  const sort = $('sort').value;
  if (view === 'recent') list.sort((a,b) => String(b.lastPlayed).localeCompare(String(a.lastPlayed)));
  else if (sort === 'name') list.sort((a,b) => a.name.localeCompare(b.name,'pl'));
  else if (sort === 'played') list.sort((a,b) => (b.plays||0)-(a.plays||0));
  else list.sort((a,b) => String(b.addedAt).localeCompare(String(a.addedAt)));
  $('shownCount').textContent = `(${list.length})`;
  const grid = $('gameGrid'); grid.replaceChildren(...list.map(makeCard));
  $('empty').hidden = list.length > 0;
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
  const input = {name:$('gameName').value,type:$('gameType').value,target:$('gameTarget').value};
  try {await window.nova.add(input); closeModal(); showToast('Gra dodana do biblioteki!');}
  catch(e) {$('formError').textContent=e.message; $('formError').hidden=false;}
});
for(const btn of document.querySelectorAll('[data-view]')) btn.addEventListener('click',() => {
  view=btn.dataset.view;
  for(const el of document.querySelectorAll('[data-view]')) el.classList.toggle('active',el===btn);
  render();
});
for (const id of ['search','typeFilter','sort']) $(id).addEventListener(id==='search'?'input':'change',render);
$('exportBtn').addEventListener('click',async () => {try {if(await window.nova.export()) showToast('Kopia biblioteki została zapisana.');}catch(e){errorMessage(e);}});
window.nova.subscribe(next => {games=next;render();});
window.nova.list().then(next => {games=next;render();}).catch(errorMessage);
