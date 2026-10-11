// ============================================================================
// THE LEVEL EDITOR'S FORMS: a control for any setting of the level schema (levelSchema.js), built from its
// description: a number box with its range and its default greyed in, a list of choices, a switch, a
// { min, max } pair, a lane picker, a mix as a table with sliders, a nested { } or list of settings.
// control(S, get, set, ctx) returns the element; get() reads the setting's value and set(v) writes it
// (undefined: left out). ctx: { changed() (a value changed), rebuild() (the form should be made afresh: what
// it shows depends on the value changed), lanes(S) (the lanes to offer: [{ value, label }]) }.
// Plain DOM, as the rest of the game's pages.
// ============================================================================
import { choiceValue, choiceLabel, initialValue } from './levelSchema.js';

// an element: h('label', { class: 'x', onclick: f }, 'text', child, ...)
export const h = (tag, props, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' || k.startsWith('data-') || k === 'for' || k === 'list') el.setAttribute(k, v);
    else el[k] = v;
  }
  for (const kid of kids.flat(3)) if (kid !== undefined && kid !== null && kid !== false) el.append(kid);
  return el;
};
// an element's children replaced by these (lists of them flattened, and nothing where there is none)
export const fill = (el, ...kids) => { el.replaceChildren(...kids.flat(3).filter(kid => kid !== undefined && kid !== null && kid !== false)); return el; };
const show = (v) => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : typeof v === 'object' ? JSON.stringify(v) : String(v));
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hexOf = (n) => '#' + n.toString(16).padStart(6, '0');
const labelled = (S, ...kids) => h('label', { title: S.help || '' }, h('span', { class: 'cap' }, S.label || '', S.required ? '' : ''), ...kids);

const numberBox = (S, get, set, ctx) => {
  const d = typeof S.default === 'function' ? S.default() : S.default;
  return h('input', { type: 'number', min: S.min, max: S.max, step: S.step ?? (S.int ? 1 : 'any'), value: get() ?? '', placeholder: d !== undefined ? show(d) : '',
    oninput: (e) => { set(e.target.value === '' ? undefined : Number(e.target.value)); ctx.changed(); } });
};
// a { kind: weight } mix: a row for each kind in it (a slider, the number, its share), and one more to add a kind
const mixTable = (S, get, set, ctx) => {
  const box = h('div', { class: 'mix' });
  const write = (mix) => { set(mix); ctx.changed(); };
  const render = () => {
    const mix = get() || {}, total = Object.values(mix).reduce((a, b) => a + (Number(b) || 0), 0) || 1;
    const top = Math.max(1, ...Object.values(mix).map(w => Math.ceil(Number(w) || 0)));
    const rows = Object.entries(mix).map(([kind, w]) => {
      const share = h('span', { class: 'share' }, Math.round(w / total * 100) + '%');
      const number = h('input', { type: 'number', min: 0, step: 0.01, value: w });
      const slider = h('input', { type: 'range', min: 0, max: top, step: top > 1 ? 0.1 : 0.01, value: w });
      const put = (v, from) => {
        const m = { ...(get() || {}) };
        m[kind] = Math.max(0, Number(v) || 0);
        write(m);
        if (from !== number) number.value = m[kind];
        if (from !== slider) slider.value = m[kind];
        const sum = Object.values(m).reduce((a, b) => a + b, 0) || 1;
        box.querySelectorAll('tr[data-kind]').forEach(tr => { tr.querySelector('.share').textContent = Math.round(m[tr.dataset.kind] / sum * 100) + '%'; });
      };
      slider.addEventListener('input', () => put(slider.value, slider));
      number.addEventListener('input', () => put(number.value, number));
      return h('tr', { 'data-kind': kind }, h('td', { class: 'kind' }, kind), h('td', { class: 'slide' }, slider), h('td', {}, number), h('td', {}, share),
        h('td', {}, h('button', { title: 'Take ' + kind + ' out', onclick: () => { const m = { ...(get() || {}) }; delete m[kind]; write(m); render(); } }, '×')));
    });
    const rest = S.choices.filter(k => !(k in mix));
    const add = h('select', { onchange: (e) => { if (!e.target.value) return; write({ ...(get() || {}), [e.target.value]: 0.1 }); render(); } },
      h('option', { value: '' }, '+ add a kind (' + rest.length + ' more)'), rest.map(k => h('option', {}, k)));
    fill(box, h('table', {}, h('tbody', {}, rows)), add);
  };
  render();
  return box;
};

export const control = (S, get, set, ctx) => {
  // a setting that can be written two ways (a number, or a { } / a list): a switch between them
  if (S.alt) {
    const box = h('div', { class: 'alt' });
    const altType = S.alt.type || 'object';
    const render = () => {
      const v = get(), detailed = altType === 'list' ? Array.isArray(v) : isObject(v);
      const mode = h('select', { class: 'mode', onchange: (e) => {
        const to = e.target.value === 'alt';
        set(to ? (altType === 'list' ? [initialValue({ type: 'object', settings: S.alt.settings })] : initialValue({ type: 'object', settings: S.alt.settings })) : undefined);
        ctx.changed(); render();
      } }, h('option', { value: 'one', selected: !detailed }, 'one number'), h('option', { value: 'alt', selected: detailed }, S.alt.label || 'each way'));
      fill(box, h('div', { class: 'altHead' }, h('span', { class: 'cap', title: S.help || '' }, S.label), mode),
        detailed ? control({ ...S.alt, type: altType, label: '', required: true }, get, set, ctx) : numberBox(S, get, set, ctx));
    };
    render();
    return box;
  }
  switch (S.type) {
    case 'number': case 'metres': return labelled(S, numberBox(S, get, set, ctx));
    case 'text': return labelled(S, h('input', { value: get() ?? '', oninput: (e) => { set(e.target.value === '' && !S.required ? undefined : e.target.value); ctx.changed(); } }));
    case 'choice': {
      const v = get(), d = typeof S.default === 'function' ? S.default() : S.default;
      const known = S.choices.some(c => choiceValue(c) === v);
      return labelled(S, h('select', { onchange: (e) => { set(e.target.value === '' ? undefined : choiceValue(S.choices[Number(e.target.value)])); ctx.changed(); ctx.rebuild(); } },
        S.required ? null : h('option', { value: '', selected: v === undefined }, S.defaultLabel || (d !== undefined ? 'default: ' + show(d) : '(not set)')),
        v !== undefined && !known ? h('option', { value: '', selected: true }, show(v) + ' (unknown)') : null,
        S.choices.map((c, i) => h('option', { value: i, selected: choiceValue(c) === v }, choiceLabel(c)))));
    }
    case 'flag': {
      if (S.tri) {
        const v = get();
        return labelled(S, h('select', { onchange: (e) => { set(e.target.value === '' ? undefined : e.target.value === 'y'); ctx.changed(); } },
          h('option', { value: '', selected: v === undefined }, 'as the level'), h('option', { value: 'y', selected: v === true }, 'yes'), h('option', { value: 'n', selected: v === false }, 'no')));
      }
      const usual = S.default === true;
      return h('label', { class: 'check', title: S.help || '' }, h('input', { type: 'checkbox', checked: get() ?? usual,
        onchange: (e) => { set(e.target.checked === usual && !S.required ? undefined : e.target.checked); ctx.changed(); } }), h('span', {}, S.label));
    }
    case 'colour': {
      const v = get(), value = v === undefined ? '#888888' : S.numeric ? hexOf(v) : v;
      const input = h('input', { type: 'color', value, oninput: (e) => { set(S.numeric ? parseInt(e.target.value.slice(1), 16) : e.target.value); ctx.changed(); } });
      return labelled(S, h('span', { class: 'pair' }, input, v === undefined ? h('span', { class: 'cap' }, 'not set') : null,
        S.required || v === undefined ? null : h('button', { title: 'Leave it out', onclick: () => { set(undefined); ctx.changed(); ctx.rebuild(); } }, '×')));
    }
    case 'range': {
      const d = typeof S.default === 'function' ? S.default() : S.default;
      const box = (k) => h('input', { type: 'number', min: S.min, max: S.max, step: S.step ?? 'any', value: (get() || {})[k] ?? '', placeholder: d ? show(d[k]) : k, title: k,
        oninput: () => {
          const a = lo.value === '' ? undefined : Number(lo.value), b = hi.value === '' ? undefined : Number(hi.value);
          set(a === undefined && b === undefined && !S.required ? undefined : { min: a ?? b ?? 0, max: b ?? a ?? 0 });
          ctx.changed();
        } });
      const lo = box('min'), hi = box('max');
      return labelled(S, h('span', { class: 'pair' }, lo, h('span', { class: 'cap' }, 'to'), hi));
    }
    case 'lane': {
      const v = get(), options = ctx.lanes(S);
      return labelled(S, h('select', { onchange: (e) => { const o = options[Number(e.target.value)]; set(e.target.value === '' ? undefined : o.value); ctx.changed(); } },
        S.required ? null : h('option', { value: '', selected: v === undefined }, '(none)'),
        v !== undefined && !options.some(o => o.value === v) ? h('option', { value: '', selected: true }, v + ' (no such lane here)') : null,
        options.map((o, i) => h('option', { value: i, selected: o.value === v }, o.label))));
    }
    case 'lanes': {
      const options = ctx.lanes(S).filter(o => typeof o.value === 'number'), v = get() || [];
      if (S.span) { // [first, last] (or, with a width, the first of them)
        const select = (k) => h('select', { onchange: () => {
          const a = Number(first.value), b = S.width ? a + S.width - 1 : Math.max(a, Number(last.value));
          set([a, b]); ctx.changed(); if (!S.width) last.value = b;
        } }, options.map(o => h('option', { value: o.value, selected: o.value === v[k] }, o.label)));
        const first = select(0), last = S.width ? null : select(1);
        return labelled(S, h('span', { class: 'pair' }, first, last ? h('span', { class: 'cap' }, 'to') : h('span', { class: 'cap' }, 'and the next'), last));
      }
      return labelled(S, h('span', { class: 'ticks' }, options.map(o => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: v.includes(o.value), 'data-lane': o.value,
        onchange: (e) => { const all = [...e.target.closest('.ticks').querySelectorAll('input:checked')].map(i => Number(i.dataset.lane)); set(all.length || S.required ? all : undefined); ctx.changed(); } }), String(o.value)))));
    }
    case 'mix': return h('div', { class: 'group' }, h('span', { class: 'cap', title: S.help || '' }, S.label), mixTable(S, get, set, ctx));
    case 'object': {
      const box = h('fieldset', { class: 'group' });
      const render = () => {
        const v = get(), on = isObject(v);
        const head = S.required ? (S.label ? h('legend', { title: S.help || '' }, S.label) : null)
          : h('legend', { title: S.help || '' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on,
            onchange: (e) => { set(e.target.checked ? initialValue(S) : undefined); ctx.changed(); render(); } }), h('span', {}, S.label)));
        fill(box, head, on ? settingsForm(S.settings, v, ctx) : null);
      };
      render();
      return box;
    }
    case 'list': {
      const box = h('fieldset', { class: 'group' });
      const render = () => {
        const list = get();
        const write = (next) => { set(next.length || S.required ? next : undefined); ctx.changed(); render(); };
        if (S.item) { // (a few plain values: an entry's two colours)
          const values = Array.isArray(list) ? list : [];
          const n = S.length || values.length;
          fill(box, h('legend', {}, S.label), h('div', { class: 'grid' }, Array.from({ length: n }, (_, i) => control({ ...S.item, label: '#' + (i + 1), required: true },
            () => values[i], (x) => { const next = Array.from({ length: n }, (_, k) => (k === i ? x : values[k] ?? initialValue(S.item))); set(next); }, ctx))));
          return;
        }
        const rows = (Array.isArray(list) ? list : []).map((item, i) => h('div', { class: 'item' },
          h('div', { class: 'itemHead' }, h('span', { class: 'cap' }, '#' + (i + 1)),
            h('button', { title: 'Remove', onclick: () => write(list.filter((_, k) => k !== i)) }, '×')),
          settingsForm(S.settings, item, ctx)));
        const full = S.max && rows.length >= S.max;
        fill(box, S.label ? h('legend', { title: S.help || '' }, S.label) : null, rows,
          full ? null : h('button', { onclick: () => write([...(Array.isArray(list) ? list : []), initialValue({ type: 'object', settings: S.settings })]) }, '+ Add'));
      };
      render();
      return box;
    }
    default: { // json: anything, typed
      const note = h('span', { class: 'cap' });
      return h('div', { class: 'group' }, h('span', { class: 'cap' }, S.label), h('textarea', { class: 'json small', spellcheck: false, value: get() === undefined ? '' : JSON.stringify(get()),
        oninput: (e) => {
          if (e.target.value.trim() === '') { set(undefined); note.textContent = ''; ctx.changed(); return; }
          try { set(JSON.parse(e.target.value)); note.textContent = ''; ctx.changed(); } catch (error) { note.textContent = 'Not valid JSON yet'; }
        } }), note);
    }
  }
};
// a form for an object of settings: every one that applies to it, laid out two to a row (the wide ones a row each)
export const settingsForm = (settings, e, ctx) => {
  const wide = (S) => S.alt || ['mix', 'object', 'list', 'json', 'lanes', 'range'].includes(S.type);
  return h('div', { class: 'grid' }, Object.entries(settings || {}).filter(([, S]) => !S.when || S.when(e) || e[k(S, settings)] !== undefined).map(([name, S]) => {
    const el = control(S, () => e[name], (v) => { if (v === undefined) delete e[name]; else e[name] = v; }, ctx);
    if (wide(S)) el.classList.add('wide');
    return el;
  }));
};
const k = (S, settings) => Object.keys(settings).find(name => settings[name] === S);
