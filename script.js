const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyToggle = document.getElementById('historyToggle');
const closeHistory = document.getElementById('closeHistory');
const themeToggle = document.getElementById('themeToggle');
const soundToggle = document.getElementById('soundToggle');
const introOverlay = document.getElementById('introOverlay');
const modePills = document.querySelectorAll('.mode-pill');
const buttons = document.querySelectorAll('.key');

const state = {
  expression: '',
  lastResult: '0',
  history: [],
  memory: 0,
  scientificMode: false,
  theme: 'dark',
  soundEnabled: true,
  historyOpen: false,
  error: false,
};

function init() {
  bindEvents();
  renderHistory();
  setTheme(state.theme);
  setTimeout(() => {
    introOverlay.classList.add('hidden');
  }, 900);
  updateDisplay();
}

function bindEvents() {
  buttons.forEach((button) => {
    button.addEventListener('click', () => handleButtonPress(button));
  });

  modePills.forEach((pill) => {
    pill.addEventListener('click', () => toggleScientificMode(pill.dataset.mode));
  });

  historyToggle.addEventListener('click', () => toggleHistory(true));
  closeHistory.addEventListener('click', () => toggleHistory(false));
  themeToggle.addEventListener('click', toggleTheme);
  soundToggle.addEventListener('click', toggleSound);
  resultEl.addEventListener('click', copyResult);
  document.addEventListener('keydown', handleKeyboardInput);
}

function handleButtonPress(button) {
  playFeedback();
  createRipple(button);
  button.classList.add('pressed');
  setTimeout(() => button.classList.remove('pressed'), 160);

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action) {
    runAction(action);
    return;
  }

  if (value !== undefined) {
    appendValue(value);
  }
}

function runAction(action) {
  switch (action) {
    case 'clear':
      clearEntry();
      break;
    case 'all-clear':
      resetCalculator();
      break;
    case 'negate':
      negateCurrent();
      break;
    case 'equals':
      evaluate();
      break;
    case 'toggle-history':
      toggleHistory(!state.historyOpen);
      break;
    case 'memory-add':
      memoryAdd();
      break;
    case 'memory-subtract':
      memorySubtract();
      break;
    case 'memory-recall':
      memoryRecall();
      break;
    case 'memory-clear':
      memoryClear();
      break;
    default:
      break;
  }
}

function appendValue(value) {
  if (state.error) {
    state.expression = '';
    state.error = false;
  }

  if (value === '.' && state.expression.endsWith('.')) {
    return;
  }

  if (value === '.' && state.expression === '') {
    state.expression = '0.';
    updateDisplay();
    return;
  }

  if (state.expression === '0' && !['.', '+', '-', '*', '/', '^', '(', ')', '%'].includes(value)) {
    state.expression = value;
    updateDisplay();
    return;
  }

  if (state.expression === '' && ['+', '-', '*', '/', '^', '%'].includes(value)) {
    state.expression = '0';
  }

  state.expression += value;
  updateDisplay();
}

function clearEntry() {
  if (state.error) {
    resetCalculator();
    return;
  }

  state.expression = state.expression.slice(0, -1);
  if (state.expression === '') {
    state.expression = '0';
  }
  updateDisplay();
}

function resetCalculator() {
  state.expression = '';
  state.lastResult = '0';
  state.error = false;
  updateDisplay();
}

function negateCurrent() {
  if (!state.expression || state.expression === '0') {
    state.expression = '-';
  } else if (state.expression.startsWith('-')) {
    state.expression = state.expression.slice(1);
  } else {
    state.expression = `-${state.expression}`;
  }
  updateDisplay();
}

function evaluate() {
  if (!state.expression || state.expression === '0') {
    return;
  }

  const expr = state.expression.replace(/×/g, '*').replace(/÷/g, '/');

  try {
    const result = safeEvaluate(expr);
    if (!Number.isFinite(result)) {
      throw new Error('Invalid expression');
    }

    state.lastResult = formatNumber(result);
    state.expression = state.lastResult;
    state.error = false;
    state.history.unshift({
      expression: expr,
      result: state.lastResult,
    });
    state.history = state.history.slice(0, 12);
    renderHistory();
    animateValue(resultEl, result);
    updateDisplay();
  } catch (error) {
    state.error = true;
    state.expression = 'Error';
    state.lastResult = 'Error';
    triggerErrorAnimation();
    updateDisplay();
  }
}

function safeEvaluate(expr) {
  const normalized = expr
    .replace(/sqrt\(/g, 'sqrt(')
    .replace(/sin\(/g, 'sin(')
    .replace(/cos\(/g, 'cos(')
    .replace(/tan\(/g, 'tan(')
    .replace(/log\(/g, 'log(')
    .replace(/ln\(/g, 'ln(')
    .replace(/\^/g, '**')
    .replace(/%/g, '*0.01');

  const sanitized = normalized
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\blog\b/g, 'Math.log10')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\bpi\b/gi, 'Math.PI');

  const prepared = transformFactorials(sanitized);
  return Function(`'use strict'; return (${prepared})`)();
}

function transformFactorials(expression) {
  return expression.replace(/(\d+(?:\.\d+)?)!/g, (_, value) => `factorial(${value})`);
}

function factorial(n) {
  const value = Number(n);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Factorial only supports non-negative integers');
  }
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

function updateDisplay() {
  expressionEl.textContent = state.expression || '0';
  if (state.error) {
    resultEl.textContent = 'Error';
    return;
  }
  animateValue(resultEl, Number(state.lastResult || 0));
}

function animateValue(element, toValue) {
  const startValue = Number(element.dataset.value || 0);
  const startTime = performance.now();
  const duration = 500;

  const fromValue = Number.isFinite(startValue) ? startValue : 0;
  const endValue = Number(toValue);

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = fromValue + (endValue - fromValue) * eased;
    element.textContent = formatNumber(current);
    element.dataset.value = current;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = formatNumber(endValue);
      element.dataset.value = endValue;
    }
  };

  requestAnimationFrame(tick);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return 'Error';
  }
  const rounded = Number(value.toFixed(10));
  return String(rounded);
}

function triggerErrorAnimation() {
  resultEl.classList.remove('error-shake');
  void resultEl.offsetWidth;
  resultEl.classList.add('error-shake');
  setTimeout(() => resultEl.classList.remove('error-shake'), 600);
}

function toggleScientificMode(mode) {
  state.scientificMode = mode === 'scientific';
  document.body.classList.toggle('scientific-active', state.scientificMode);
  modePills.forEach((pill) => pill.classList.toggle('active', pill.dataset.mode === mode));
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(state.theme);
}

function setTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  soundToggle.textContent = state.soundEnabled ? '🔊' : '🔈';
}

function playFeedback() {
  if (!state.soundEnabled) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 780;
  gainNode.gain.value = 0.015;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
  oscillator.stop(context.currentTime + 0.14);
  context.close();
}

function toggleHistory(force) {
  state.historyOpen = force ?? !state.historyOpen;
  historyPanel.classList.toggle('open', state.historyOpen);
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<div class="history-item"><span class="expr">Your calculations will appear here.</span><span class="result">Ready</span></div>';
    return;
  }

  historyList.innerHTML = state.history
    .map(
      (item) => `
        <div class="history-item">
          <span class="expr">${item.expression}</span>
          <span class="result">${item.result}</span>
        </div>
      `
    )
    .join('');
}

function memoryAdd() {
  const value = Number(state.lastResult || 0);
  state.memory += value;
  state.expression = `M+ ${formatNumber(state.memory)}`;
  updateDisplay();
}

function memorySubtract() {
  const value = Number(state.lastResult || 0);
  state.memory -= value;
  state.expression = `M- ${formatNumber(state.memory)}`;
  updateDisplay();
}

function memoryRecall() {
  state.expression = String(formatNumber(state.memory));
  state.lastResult = String(formatNumber(state.memory));
  updateDisplay();
}

function memoryClear() {
  state.memory = 0;
  state.expression = 'MC';
  updateDisplay();
}

function copyResult() {
  navigator.clipboard.writeText(state.lastResult).catch(() => {});
  resultEl.textContent = 'Copied';
  setTimeout(() => {
    resultEl.textContent = state.lastResult;
  }, 650);
}

function handleKeyboardInput(event) {
  const { key } = event;
  const allowed = /[0-9+\-*/.^()%]/;

  if (key === 'Enter') {
    event.preventDefault();
    evaluate();
    return;
  }

  if (key === 'Backspace') {
    event.preventDefault();
    clearEntry();
    return;
  }

  if (key === 'Escape') {
    event.preventDefault();
    resetCalculator();
    return;
  }

  if (allowed.test(key)) {
    event.preventDefault();
    appendValue(key);
    return;
  }
}

function createRipple(button) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.2;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${(button.clientWidth - size) / 2}px`;
  ripple.style.top = `${(button.clientHeight - size) / 2}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

init();
