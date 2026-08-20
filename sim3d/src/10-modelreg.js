/* 模型注册表：按名称惰性构建并缓存网格 */
(function (root) {
  'use strict';

  const cache = new Map();
  let GL = null;

  function builders() {
    return Object.assign({}, root.MODELS_ROOM.BUILDERS, root.MODELS_HW.HW);
  }

  let ALL = null;

  root.MODELS = {
    init(gl) { GL = gl; ALL = builders(); cache.clear(); },
    has(name) { return !!(ALL && ALL[name]); },
    get(name, opts) {
      const key = name + (opts ? '|' + JSON.stringify(opts) : '');
      if (cache.has(key)) return cache.get(key);
      const fn = ALL[name];
      if (!fn) throw new Error('未知模型: ' + name);
      const mb = new root.GEOM.MB();
      fn(mb, opts);
      const model = mb.build(GL);
      cache.set(key, model);
      return model;
    },
    stats() {
      let tris = 0;
      for (const mdl of cache.values()) for (const s of mdl.subs) tris += s.count / 3;
      return { models: cache.size, tris };
    },
  };
})(window);
