/* Minimal browser-side UI SFX player.
   Uses the CC0 audio assets published with the `uisfx` npm package, served from a CDN
   (no bundler in this environment). Same semantics as createUISFX():
   lazy AudioContext created only from a real user gesture, cue cache, loop handles,
   enabled/volume/pack control, stopAll(), destroy(). */
(function () {
  var CDNS = [
    'https://unpkg.com/uisfx/sounds/',
    'https://cdn.jsdelivr.net/npm/uisfx/sounds/'
  ];

  function createUISFX(opts) {
    opts = opts || {};
    var pack = opts.pack || 'glass';
    var volume = typeof opts.volume === 'number' ? opts.volume : 0.7;
    var enabled = !!opts.enabled;
    var ctx = opts.context || null;
    var ownsCtx = !ctx;
    var master = null;
    var buffers = {};      // "pack/cue" -> AudioBuffer | Promise
    var active = [];       // live sources
    var unlocked = false;
    var destroyed = false;

    function ensureCtx() {
      if (destroyed) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (!master) {
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return ctx;
    }

    function load(cue) {
      var key = pack + '/' + cue;
      if (buffers[key]) return Promise.resolve(buffers[key]);
      var c = ensureCtx();
      if (!c) return Promise.reject();
      var i = 0;
      var attempt = function () {
        if (i >= CDNS.length) return Promise.reject();
        var url = CDNS[i++] + pack + '/' + cue + '.mp3';
        return fetch(url).then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.arrayBuffer();
        }).then(function (ab) {
          return new Promise(function (res, rej) { c.decodeAudioData(ab, res, rej); });
        }).catch(attempt);
      };
      var p = attempt().then(function (buf) { buffers[key] = buf; return buf; });
      buffers[key] = p;
      return p;
    }

    /* Unlock from a genuine gesture. Kept synchronous so the context resumes
       inside the same event task. */
    function unlock() {
      if (unlocked || destroyed) return;
      var c = ensureCtx();
      if (!c) return;
      unlocked = true;
      // warm the cues most likely to fire first
      ['hover', 'press', 'forward', 'open', 'toggle-on', 'toggle-off'].forEach(load);
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });

    function play(cue, o) {
      o = o || {};
      if (!enabled || destroyed) return null;
      if (!unlocked && !o.force) return null;   // never autoplay / queue stale cues
      var c = ensureCtx();
      if (!c) return null;
      var stopped = false, source = null;
      var gain = c.createGain();
      gain.gain.value = typeof o.volume === 'number' ? o.volume : 1;
      gain.connect(master);
      var handle = {
        cue: cue,
        stop: function () {
          stopped = true;
          if (source) { try { source.stop(); } catch (e) {} }
          var k = active.indexOf(handle);
          if (k > -1) active.splice(k, 1);
        }
      };
      active.push(handle);
      load(cue).then(function (buf) {
        if (stopped || destroyed || !enabled) return;
        source = c.createBufferSource();
        source.buffer = buf;
        source.loop = !!o.loop;
        source.connect(gain);
        source.onended = function () { if (!o.loop) handle.stop(); };
        source.start(0);
      }).catch(function () { handle.stop(); });
      return handle;
    }

    return {
      play: play,
      get enabled() { return enabled; },
      setEnabled: function (v) {
        enabled = !!v;
        if (!enabled) this.stopAll();
      },
      setVolume: function (v) {
        volume = v;
        if (master) master.gain.value = v;
      },
      setPack: function (p) { pack = p; },
      stopAll: function () { active.slice().forEach(function (h) { h.stop(); }); },
      destroy: function () {
        this.stopAll();
        destroyed = true;
        ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
          window.removeEventListener(evt, unlock, { capture: true });
        });
        buffers = {};
        var closing = (ownsCtx && ctx && ctx.close) ? ctx.close() : Promise.resolve();
        ctx = null; master = null;
        return closing;
      }
    };
  }

  window.createUISFX = createUISFX;
})();
