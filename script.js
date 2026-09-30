const STORAGE_KEY = 'daymark-tasks-v1';
const addForm = document.querySelector('#add-form');
const taskInput = document.querySelector('#task-input');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const taskCount = document.querySelector('#task-count');
const taskCountLabel = document.querySelector('#task-count-label');
const remainingCount = document.querySelector('#remaining-count');
const clearCompletedButton = document.querySelector('#clear-completed');
const statusMessage = document.querySelector('#status-message');
const filters = document.querySelector('.filters');

let totalStars = parseInt(localStorage.getItem('stars') || '0');
let streak = parseInt(localStorage.getItem('streak') || '0');
let lastCompletedDate = localStorage.getItem('lastCompletedDate') || null;
let tasks = loadTasks();
let activeFilter = 'all';
let draggedTaskId = null;

function loadTasks() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(s)) return [];
    return s.filter(t => t && typeof t.id === 'string').map(t => ({ id: t.id, text: t.text, completed: !!t.completed, createdAt: t.createdAt || Date.now() }));
  } catch { return []; }
}
function saveTasks() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch { } }
function makeId() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function announce(m) { statusMessage.textContent = ''; setTimeout(() => statusMessage.textContent = m, 20); }
function formatCreatedAt(ts) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(ts)); }
function createButton(label, className, action, text) { const b = document.createElement('button'); b.type = 'button'; b.className = className; b.dataset.action = action; b.title = label; b.textContent = text; return b; }
function createTaskElement(task, index, visibleTasks) {
  const item = document.createElement('li'); item.className = `task-item${task.completed ? ' is-completed' : ''}`; item.dataset.id = task.id; item.draggable = true;
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'task-checkbox'; cb.checked = task.completed; cb.dataset.action = 'toggle';
  const content = document.createElement('div'); content.className = 'task-content';
  const txt = document.createElement('span'); txt.className = 'task-text'; txt.textContent = task.text;
  const meta = document.createElement('time'); meta.className = 'task-meta'; meta.textContent = `Added ${formatCreatedAt(task.createdAt)}`;
  content.append(txt, meta);
  const actions = document.createElement('div'); actions.className = 'task-actions';
  const up = createButton('Move up', 'icon-button', 'move-up', '↑'); const down = createButton('Move down', 'icon-button', 'move-down', '↓');
  up.disabled = index === 0; down.disabled = index === visibleTasks.length - 1;
  actions.append(up, down, createButton('Edit', 'icon-button', 'edit', '✎'), createButton('Delete', 'icon-button delete-button', 'delete', '×'));
  item.append(cb, content, actions); return item;
}
function getVisibleTasks() { if (activeFilter === 'active') return tasks.filter(t => !t.completed); if (activeFilter === 'completed') return tasks.filter(t => t.completed); return tasks; }
function updateStarDisplay() { const el = document.getElementById('starCount'); if (el) el.textContent = totalStars; }
function updateStreakDisplay() { const el = document.getElementById('streakCount'); if (el) el.textContent = streak; }
function handleStreakOnComplete() {
  const today = new Date().toDateString(); const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastCompletedDate === today) return; if (lastCompletedDate === yesterday) streak += 1; else streak = 1;
  lastCompletedDate = today; localStorage.setItem('streak', streak); localStorage.setItem('lastCompletedDate', lastCompletedDate); updateStreakDisplay();
}
let shabashTimer = null;

function showShabashPopup() {
  const popup = document.getElementById('shabash-popup');
  if (!popup) return;
  popup.classList.add('show');
  clearTimeout(shabashTimer);
  shabashTimer = setTimeout(() => {
    hideShabashPopup();
  }, 1000);
}

function hideShabashPopup() {
  document.getElementById('shabash-popup')?.classList.remove('show');
  clearTimeout(shabashTimer);
}
function checkAllDone() {
  const allDone = tasks.length > 0 && tasks.every(t => t.completed === true);
  if (allDone) {
    showShabashPopup();
  } else {
    hideShabashPopup();
  }
}

function render() {
  if (tasks.length === 0) { totalStars = 0; localStorage.setItem('stars', '0'); }
  updateStarDisplay(); updateStreakDisplay();
  const visibleTasks = getVisibleTasks();
  const completedCount = tasks.filter(t => t.completed).length;
  const activeCount = tasks.length - completedCount;
  taskList.replaceChildren(...visibleTasks.map((t, i) => createTaskElement(t, i, visibleTasks)));
  taskList.hidden = visibleTasks.length === 0; emptyState.hidden = visibleTasks.length > 0;
  taskCount.textContent = tasks.length; taskCountLabel.textContent = tasks.length === 1 ? 'task' : 'tasks';
  remainingCount.textContent = tasks.length === 0 ? "Nothing here yet — good place to start." : `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} left `;
  clearCompletedButton.disabled = completedCount === 0;
  filters.querySelectorAll('[data-filter]').forEach(b => { const sel = b.dataset.filter === activeFilter; b.classList.toggle('is-selected', sel); b.setAttribute('aria-pressed', String(sel)); });
  checkAllDone();
}
addForm.addEventListener('submit', e => { e.preventDefault(); const text = taskInput.value.trim(); if (!text) return; tasks.unshift({ id: makeId(), text, completed: false, createdAt: Date.now() }); saveTasks(); render(); taskInput.value = ''; taskInput.focus(); });
filters.addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (!b) return; activeFilter = b.dataset.filter; render(); });
taskList.addEventListener('change', e => {
  const cb = e.target.closest('[data-action="toggle"]'); if (!cb) return;
  const task = tasks.find(t => t.id === cb.closest('[data-id]').dataset.id); if (!task) return;
  const was = task.completed; task.completed = cb.checked;
  if (task.completed && !was) handleStreakOnComplete();
  totalStars = tasks.filter(t => t.completed).length; localStorage.setItem('stars', totalStars); saveTasks(); render();
});
taskList.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]'); if (!btn) return; const item = btn.closest('[data-id]'); const id = item.dataset.id;
  if (btn.dataset.action === 'delete') { const td = tasks.find(t => t.id === id); if (td?.completed) { totalStars = Math.max(0, totalStars - 1); localStorage.setItem('stars', totalStars); } tasks = tasks.filter(t => t.id !== id); saveTasks(); render(); }
  else if (btn.dataset.action === 'move-up') { const vi = getVisibleTasks().findIndex(t => t.id === id); const target = getVisibleTasks()[vi - 1]; if (!target) return; const ci = tasks.findIndex(t => t.id === id); const ti = tasks.findIndex(t => t.id === target.id);[tasks[ci], tasks[ti]] = [tasks[ti], tasks[ci]]; saveTasks(); render(); }
  else if (btn.dataset.action === 'move-down') { const vi = getVisibleTasks().findIndex(t => t.id === id); const target = getVisibleTasks()[vi + 1]; if (!target) return; const ci = tasks.findIndex(t => t.id === id); const ti = tasks.findIndex(t => t.id === target.id);[tasks[ci], tasks[ti]] = [tasks[ti], tasks[ci]]; saveTasks(); render(); }
});
clearCompletedButton.addEventListener('click', () => { const rc = tasks.filter(t => t.completed).length; totalStars = Math.max(0, totalStars - rc); localStorage.setItem('stars', totalStars); tasks = tasks.filter(t => !t.completed); saveTasks(); render(); });
document.getElementById('close-popup')?.addEventListener('click', hideShabashPopup);
document.getElementById('shabash-popup')?.addEventListener('click', e => { if (e.target.id === 'shabash-popup') hideShabashPopup(); });
const today = new Date(); document.querySelector('#date-day').textContent = new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(today); document.querySelector('#date-month').textContent = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(today);
render();