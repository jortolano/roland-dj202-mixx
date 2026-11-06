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
const writes = [];
let nextTimer = 1;
let now = 0;
const key = (g, k) => `${g}:${k}`;
const getValue = (g, k) => Number(values.get(key(g, k)) || 0);
function setValue(g, k, v) {
  assert.equal(typeof g, 'string');
  writes.push([g, k, v]);
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

// Shift+hold clears focus without touching routing, for every FX slot/unit.
for (const unit of [1, 2]) {
  const eu = dj.effectUnit[unit];
  for (const slot of [1, 2, 3]) {
    const button = eu.button[slot];
    button.unshift();
    press(button, 127); advance(300); press(button, 0);
    assert.equal(getValue(eu.group, 'focused_effect'), slot);
    const enabled = getValue(button.effectGroup, 'enabled');
    const routing = getValue(button.routingGroup, button.routingControl);
    button.shift();
    press(button, 127); advance(300);
    assert.equal(getValue(eu.group, 'focused_effect'), 0);
    button.unshift(); // Release Shift before the held FX button.
    press(button, 0); advance(600);
    assert.equal(getValue(button.effectGroup, 'enabled'), enabled);
    assert.equal(getValue(button.routingGroup, button.routingControl), routing);

    // Shift+tap retains routing, commits on release, and ignores a stray release.
    button.shift(); press(button, 127); advance(100);
    assert.equal(getValue(button.routingGroup, button.routingControl), routing);
    button.unshift(); press(button, 0);
    assert.equal(getValue(button.routingGroup, button.routingControl), Number(!routing));
    press(button, 0);
    assert.equal(getValue(button.effectGroup, 'enabled'), enabled);

    // Pressing Shift after starting a normal hold must not change that gesture.
    press(button, 127); button.shift(); advance(300); press(button, 0);
    assert.equal(getValue(eu.group, 'focused_effect'), slot);
    button.unshift(); advance(600);
  }
}
messages.length = 0; setValue(fx.effectGroup, 'enabled', 1);
assert.ok(messages.some(m => m[0] === 0x98 && m[1] === 0 && m[2] === 127));
press(fx, 127); advance(100); press(fx, 0);
assert.equal(getValue(fx.effectGroup, 'enabled'), 0);

// Play hold uses the brake path; a short tap still toggles transport.
// Exercise the actual global Shift handler and effect selection in both directions.
setValue(dj.effectUnit[1].group, 'focused_effect', 2);
const mode = dj.effectUnit[1].effectMode;
press(mode, 127); press(mode, 0);
assert.equal(getValue('[EffectRack1_EffectUnit1_Effect2]', 'effect_selector'), 1);
dj.shiftButton(0, 0, 127, 0, '');
assert.equal(fx.fxShifted, true);
press(mode, 127);
dj.shiftButton(0, 0, 0, 0, '');
press(mode, 0);
assert.equal(getValue('[EffectRack1_EffectUnit1_Effect2]', 'effect_selector'), -1);
assert.equal(fx.fxShifted, false);

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

// Pads on all four decks: deletion stays deletion; Cue Loop uses native controls.
for (const deck of [1, 2, 3, 4]) {
  const side = deck % 2 ? left : right;
  const group = `[Channel${deck}]`;
  side.setCurrentDeck(group);
  const pads = side.padSection;
  const cue = pads.hotcueButton[1];
  setValue(group, 'track_loaded', 1);
  setValue(group, 'play', 1);
  pads.mode = dj.PadMode.HOTCUE;
  cue.shift(); writes.length = 0;
  press(cue, 127, group); press(cue, 0, group);
  assert.deepEqual(writes, [[group, 'hotcue_1_clear', 1], [group, 'hotcue_1_clear', 0]]);

  cue.unshift(); press(cue, 127, group);
  cue.shift(); press(cue, 0, group);
  assert.equal(getValue(group, 'hotcue_1_activate'), 0);
  cue.unshift();
  pads.mode = dj.PadMode.CUELOOP;
  for (const exists of [0, 1]) {
    setValue(group, 'hotcue_1_enabled', exists);
    setValue(group, 'bpm', 0); // No manual division by BPM/sample rate.
    writes.length = 0;
    press(cue, 127, group); press(cue, 0, group);
    assert.deepEqual(writes, [[group, 'beatloop_size', 2],
      [group, 'hotcue_1_cueloop', 1], [group, 'hotcue_1_cueloop', 0]]);
  }
  cue.shift(); writes.length = 0;
  press(cue, 127, group); cue.unshift(); press(cue, 0, group);
  assert.deepEqual(writes, [[group, 'beatloop_size', 2],
    [group, 'hotcue_1_gotoandloop', 1], [group, 'hotcue_1_gotoandloop', 0]]);

  setValue(group, 'track_loaded', 0); writes.length = 0;
  press(cue, 127, group); press(cue, 0, group);
  assert.equal(writes.length, 0);
  setValue(group, 'loop_enabled', 1); writes.length = 0;
  press(pads.loopExit, 127, group); press(pads.loopExit, 0, group);
  assert.deepEqual(writes, [[group, 'loop_enabled', 0]]);
  assert.equal(getValue(group, 'play'), 1);

  messages.length = 0;
  setValue(group, 'loop_start_position', 44100);
  setValue(group, 'loop_end_position', -1);
  assert.ok(messages.some(m => m[1] === 0x15 && m[2] === 127));
  assert.ok(messages.some(m => m[1] === 0x16 && m[2] === 0));
}
left.setCurrentDeck('[Channel1]');
right.setCurrentDeck('[Channel2]');

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
