/* WebGL2 底层封装：着色器、纹理、帧缓冲、顶点数组 */
(function (root) {
  'use strict';

  /** 顶点布局（交错）：位置3 + 法线3 + UV2 + 颜色3 + 材质3(粗糙度/金属度/自发光) */
  const STRIDE_F = 14;
  const STRIDE_B = STRIDE_F * 4;

  function compile(gl, type, src, tag) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error('[shader] ' + tag + '\n' + log + '\n' + withLines(src));
      throw new Error('着色器编译失败: ' + tag + ' -> ' + log);
    }
    return sh;
  }

  function withLines(src) {
    return src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
  }

  function program(gl, vsSrc, fsSrc, tag) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc, tag + '.vert'));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc, tag + '.frag'));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('着色器链接失败: ' + tag + ' -> ' + gl.getProgramInfoLog(p));
    }
    const cache = new Map();
    return {
      prog: p,
      use() { gl.useProgram(p); return this; },
      loc(name) {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
        return cache.get(name);
      },
      u1i(n, v) { gl.uniform1i(this.loc(n), v); },
      u1f(n, v) { gl.uniform1f(this.loc(n), v); },
      u2f(n, a, b) { gl.uniform2f(this.loc(n), a, b); },
      u3f(n, a, b, c) { gl.uniform3f(this.loc(n), a, b, c); },
      u3v(n, v) { gl.uniform3fv(this.loc(n), v); },
      u4f(n, a, b, c, d) { gl.uniform4f(this.loc(n), a, b, c, d); },
      um4(n, v) { gl.uniformMatrix4fv(this.loc(n), false, v); },
      um3(n, v) { gl.uniformMatrix3fv(this.loc(n), false, v); },
    };
  }

  /** 由交错顶点数据与索引创建 VAO */
  function makeVAO(gl, verts, idx) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const layout = [[0, 3, 0], [1, 3, 3], [2, 2, 6], [3, 3, 8], [4, 3, 11]];
    for (const [loc, size, off] of layout) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE_B, off * 4);
    }
    gl.bindVertexArray(null);
    return { vao, count: idx.length };
  }

  function texFromCanvas(gl, canvas, opts) {
    opts = opts || {};
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, opts.srgb === false ? gl.RGBA : gl.SRGB8_ALPHA8,
      gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    const wrap = opts.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) {
      const max = Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }
    return t;
  }

  /** 可更新的动态纹理（屏幕内容等） */
  function dynamicTex(gl, canvas) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return {
      tex: t,
      update() {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      },
    };
  }

  function makeFBO(gl, w, h, opts) {
    opts = opts || {};
    const fmt = opts.float ? gl.RGBA16F : gl.RGBA8;
    const type = opts.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const color = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, color);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
    let depth = null;
    if (opts.depth) {
      depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, color, depth, w, h };
  }

  function makeShadowFBO(gl, size) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0,
      gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, size };
  }

  /** 全屏三角形，用于后处理 */
  function fullscreenQuad(gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  root.GLU = {
    STRIDE_F, STRIDE_B, program, makeVAO, texFromCanvas, dynamicTex,
    makeFBO, makeShadowFBO, fullscreenQuad,
  };
})(window);
