export class FakeParam {
  constructor(value) {
    this.value = value;
    this.events = [];
  }

  setValueAtTime(value, time) {
    this.events.push({ type: 'set', value, time });
    return this;
  }

  linearRampToValueAtTime(value, time) {
    this.events.push({ type: 'linear', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value, time) {
    if (!(value > 0)) throw new RangeError('an exponential ramp cannot reach zero');
    this.events.push({ type: 'exponential', value, time });
    return this;
  }

  setTargetAtTime(value, time, constant) {
    this.events.push({ type: 'target', value, time, constant });
    return this;
  }

  cancelScheduledValues(time) {
    this.events.push({ type: 'cancel', time });
    return this;
  }
}

class FakeNode {
  constructor(context, kind, parts = {}) {
    Object.assign(this, { context, kind, outputs: [], disconnected: false }, parts);
    context.nodes.push(this);
  }

  connect(target) {
    if (!target) throw new TypeError('connect needs a target');
    this.outputs.push(target);
    return target;
  }

  disconnect() {
    this.outputs = [];
    this.disconnected = true;
  }
}

class FakeSource extends FakeNode {
  start(time = 0) {
    this.started = time;
  }

  stop(time = 0) {
    this.stopped = time;
  }
}

export class FakeAudioContext {
  static made = [];

  constructor() {
    Object.assign(this, { state: 'suspended', currentTime: 0, sampleRate: 8000, nodes: [], calls: [] });
    this.destination = new FakeNode(this, 'destination');
    FakeAudioContext.made.push(this);
  }

  createGain() {
    return new FakeNode(this, 'gain', { gain: new FakeParam(1) });
  }

  createOscillator() {
    return new FakeSource(this, 'oscillator', { type: 'sine', frequency: new FakeParam(440) });
  }

  createBufferSource() {
    return new FakeSource(this, 'buffer', { buffer: null, loop: false });
  }

  createBiquadFilter() {
    return new FakeNode(this, 'filter', { type: 'lowpass', frequency: new FakeParam(350), Q: new FakeParam(1) });
  }

  createDynamicsCompressor() {
    const params = Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map((name) => [name, new FakeParam(0)]));
    return new FakeNode(this, 'compressor', params);
  }

  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, getChannelData: (index) => data[index] };
  }

  resume() {
    this.calls.push('resume');
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.calls.push('suspend');
    this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.calls.push('close');
    this.state = 'closed';
    return Promise.resolve();
  }
}

export const nodesOf = (context, kind) => context.nodes.filter((node) => node.kind === kind);

export function reaches(node, target, seen = new Set()) {
  if (node === target) return true;
  if (seen.has(node)) return false;
  seen.add(node);
  return (node.outputs ?? []).some((next) => reaches(next, target, seen));
}

export const sourcesOf = (context) => context.nodes.filter((node) => node.kind === 'oscillator' || node.kind === 'buffer');
