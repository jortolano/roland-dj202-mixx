const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual effect-unit constructor with a minimal Mixxx host.
const source = fs.readFileSync('Roland_DJ-202-scripts.js', 'utf8');
const start = source.indexOf('DJ202.EffectUnit = function(unitNumber)');
const end = source.indexOf('DJ202.EffectUnit.prototype =', start);
let focus = 0;
let writes = [];
const context = {
  DJ202: { EffectButton: function() {}, EffectModeButton: function() {} },
  components: {
    ComponentContainer: function() {},
    Pot: function(options) { Object.assign(this, options); this.unshift(); }
  },
  engine: {
    setValue() {}, softTakeover() {}, softTakeoverIgnoreNextValue() {},
    makeConnection() {}, getValue() { return focus; },
    setParameter(...args) { writes.push(args); }
  }
};
vm.runInNewContext(source.slice(start, end), context);
for (const unit of [1, 2]) {
  const fx = new context.DJ202.EffectUnit(unit);
  for (const value of [0, 64, 127]) {
    focus = 0; writes = [];
    fx.knob.input(0, 0, value, 0);
    assert.deepEqual(writes, [1, 2, 3].map(n =>
      [`[EffectRack1_EffectUnit${unit}_Effect${n}]`, 'meta', value / 127]));
  }
  focus = 2; writes = [];
  fx.knob.input(0, 0, 127, 0);
  assert.deepEqual(writes, [[`[EffectRack1_EffectUnit${unit}_Effect2]`, 'meta', 1]]);
  fx.knob.shift(); writes = [];
  fx.knob.input(0, 3, 64, 0);
  assert.deepEqual(writes, [[`[EffectRack1_EffectUnit${unit}]`, 'mix', 64 / 127]]);
  fx.knob.unshift(); focus = 0; writes = [];
  fx.knob.input(0, 0, 127, 0);
  assert.equal(writes.length, 3);
}
console.log('FX: both units, full range, focus and Shift passed.');
