const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const libraries = process.argv[2] || 'D:/Mixx/controllers';
const values = new Map();
const connections = new Set();
const timers = new Map();
const messages = [];
const brakes = [];
let nextTimer = 1;
let now = 0;
const key = (g, k) => `${g}:${k}`;
const getValue = (g, k) => Number(values.get(key(g, k)) || 0);
function setValue(g, k, v) {
  assert.equal(typeof g, 'string');
  values.set(key(g, k), v);
  for (const c of [...connections]) {
    if (c.group === g && c.control === k) c.callback(v, g, k);
  }
}
function advance(ms) {
  const end = now + ms;
  for (;;) {
    const next = [...timers].filter(([, t]) => t.at <= end)
      .sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break;
    const [id, t] = next;
    now = t.at;
    if (t.once) timers.delete(id); else t.at += t.interval;
    const callback = t.callback;
    callback(); // Mixxx does not invoke callbacks as button methods.
  }
  now = end;
}
const engine = {
  getValue, setValue, getParameter: getValue, setParameter: setValue,
  softTakeover() {}, softTakeoverIgnoreNextValue() {},
  beginTimer(interval, callback, once) {
    assert.ok(Number.isFinite(interval) && interval > 0);
    const id = nextTimer++;
    timers.set(id, {at: now + interval, interval, callback, once});
    return id;
  },
  stopTimer(id) { timers.delete(id); },
  makeConnection(group, control, callback) {
    const c = {group, control, callback};
    connections.add(c);
    return {
      trigger() { callback(getValue(group, control), group, control); },
      disconnect() { connections.delete(c); }
    };
  },
  scratchDisable() {}, isScratching() { return false; },
  brake(...args) { brakes.push(args); }, softStart(...args) { brakes.push(args); }
};
const context = vm.createContext({
  console, engine,
  Date: class extends Date { constructor() { super(now); } },
  midi: { sendShortMsg(...args) { messages.push(args); }, sendSysexMsg() {} },
  bpm: {tapButton() {}},
  script: {
    deckFromGroup(g) { return Number(g.match(/\d+/)[0]); },
    toggleControl(g, k) { setValue(g, k, !getValue(g, k)); },
    triggerControl(g, k) { setValue(g, k, 1); setValue(g, k, 0); }
  }
});
for (const file of ['lodash.mixxx.js', 'midi-components-0.0.js']) {
  vm.runInContext(fs.readFileSync(path.join(libraries, file), 'utf8'), context);
}
vm.runInContext(fs.readFileSync('Roland_DJ-202-scripts.js', 'utf8'), context);
const dj = context.DJ202;
setValue('[Master]', 'num_samplers', 16);
setValue('[App]', 'num_samplers', 16);
dj.init();
const press = (button, value, group = button.group) =>
  button.input(0, button.midi?.[1] || 0, value, 0x90, group);
const left = dj.leftDeck;

// Sync short/long press and double-tap window expire on the actual button.
press(left.sync, 127); advance(100); press(left.sync, 0);
advance(501);
assert.equal(left.sync.isDoubleTap, false);
assert.equal(getValue('[Channel1]', 'sync_enabled'), 0);
press(left.sync, 127); advance(300);
assert.equal(getValue('[Channel1]', 'sync_enabled'), 1);
press(left.sync, 0); advance(501);
messages.length = 0;
setValue('[Channel1]', 'sync_enabled', 0);
assert.ok(messages.some(m => m[0] === 0x90 && m[1] === 0x03));
left.sync.shift(); messages.length = 0;
setValue('[Channel1]', 'quantize', 1);
assert.ok(messages.some(m => m[0] === 0x90 && m[1] === 0x02));
left.sync.unshift();
setValue('[Channel1]', 'file_bpm', 123);
press(left.sync, 127); advance(50); press(left.sync, 0);
advance(50); press(left.sync, 127); press(left.sync, 0);
assert.equal(getValue('[Channel1]', 'bpm'), 123);
advance(501);

// Slip double-tap state must expire, so a later single press remains momentary.
press(left.slipModeButton, 127); press(left.slipModeButton, 0);
advance(501);
assert.equal(left.slipModeButton.doubleTapped, false);
press(left.slipModeButton, 127); press(left.slipModeButton, 0);
assert.equal(getValue('[Channel1]', 'slip_enabled'), 0);

// Long FX press focuses without toggling; animation returns to actual LED state.
const fx = dj.effectUnit[1].button[1];
press(fx, 127); advance(300); press(fx, 0); advance(600);
assert.equal(getValue('[EffectRack1_EffectUnit1]', 'focused_effect'), 1);
assert.equal(getValue(fx.effectGroup, 'enabled'), 0);
messages.length = 0; setValue(fx.effectGroup, 'enabled', 1);
assert.ok(messages.some(m => m[0] === 0x98 && m[1] === 0 && m[2] === 127));
press(fx, 127); advance(100); press(fx, 0);
assert.equal(getValue(fx.effectGroup, 'enabled'), 0);

// Play hold uses the brake path; a short tap still toggles transport.
setValue('[Channel1]', 'play', 1);
press(left.play, 127, '[Channel1]'); advance(350); press(left.play, 0, '[Channel1]');
assert.equal(brakes.length, 1);
assert.equal(brakes[0][0], 1);

// Holding deck select returns to the original deck on release.
press(left.setDeck, 127, '[Channel1]'); advance(350);
assert.equal(left.currentDeck, '[Channel3]');
press(left.setDeck, 0, '[Channel1]');
assert.equal(left.currentDeck, '[Channel1]');

// Keylock hold enters/exits key adjustment mode.
press(left.keylock, 127); advance(350);
assert.equal(left.padSection.paramPlusMinus.isSongKeyMode, true);
press(left.keylock, 0);
assert.equal(left.padSection.paramPlusMinus.isSongKeyMode, false);
left.padSection.paramPlusMinus.songKeyMode(true);
messages.length = 0;
setValue('[Channel1]', 'pitch_adjust', 1);
assert.ok(messages.some(m => m[0] === 0x94 && m[1] === 0x42 && m[2] === 127));
left.padSection.paramPlusMinus.songKeyMode(false);

// The right-hand unit also receives independent state and LED updates.
const right = dj.rightDeck;
press(right.sync, 127); advance(300); press(right.sync, 0);
assert.equal(getValue('[Channel2]', 'sync_enabled'), 1);
messages.length = 0;
setValue('[Channel2]', 'sync_enabled', 0);
assert.ok(messages.some(m => m[0] === 0x91 && m[1] === 0x03));
messages.length = 0;
setValue(dj.effectUnit[2].button[2].effectGroup, 'enabled', 1);
assert.ok(messages.some(m => m[0] === 0x99 && m[1] === 1 && m[2] === 127));

// No mapping-owned callbacks survive shutdown, including active FX flashing.
fx.flash();
press(left.sync, 127);
dj.shutdown();
assert.equal(timers.size, 0);
assert.equal(connections.size, 0);
advance(2000);
dj.init();
dj.shutdown();
assert.equal(timers.size, 0);
assert.equal(connections.size, 0);
console.log('Callbacks: real Mixxx components, gestures, LEDs and shutdown passed.');
