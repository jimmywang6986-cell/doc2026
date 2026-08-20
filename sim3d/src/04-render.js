/* 渲染器：PBR 前向着色 + 平行光阴影 + HDR 泛光 + ACES 色调映射 + FXAA */
(function (root) {
  'use strict';

  const { M4, V3 } = root.MATH3D;

  const VS_MAIN = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec3 aColor;
layout(location=4) in vec3 aMat;
uniform mat4 uProj, uView, uModel;
uniform mat3 uNrm;
out vec3 vWPos; out vec3 vNormal; out vec3 vColor; out vec3 vMat; out vec2 vUV;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWPos = wp.xyz;
  vNormal = normalize(uNrm * aNormal);
  vUV = aUV; vColor = aColor; vMat = aMat;
  gl_Position = uProj * uView * wp;
}`;

  const FS_MAIN = `#version 300 es
precision highp float;
in vec3 vWPos; in vec3 vNormal; in vec3 vColor; in vec3 vMat; in vec2 vUV;
uniform sampler2D uAlbedo, uNormalTex, uShadowMap;
uniform int uHasNormal, uShadowOn, uLightCount;
uniform vec3 uCamPos, uSunDir, uSunColor, uSkyColor, uGroundColor, uFogColor, uTint;
uniform float uFogDensity, uAlpha, uEmisMul, uTintStrength, uShadowTexel;
uniform mat4 uShadowVP;
uniform vec4 uLightPos[8];
uniform vec4 uLightColor[8];
out vec4 fragColor;

const float PI = 3.14159265359;

float ggx(float nh, float a){
  float a2 = a*a; float d = nh*nh*(a2-1.0)+1.0;
  return a2/(PI*d*d+1e-7);
}
float smithG(float nv, float nl, float a){
  float k = a*0.5;
  float gv = nv/(nv*(1.0-k)+k);
  float gl = nl/(nl*(1.0-k)+k);
  return gv*gl;
}
vec3 fres(float vh, vec3 f0){ return f0 + (1.0-f0)*pow(1.0-vh, 5.0); }

vec3 getNormal(){
  vec3 N = normalize(vNormal);
  if(uHasNormal == 1){
    vec3 dp1 = dFdx(vWPos), dp2 = dFdy(vWPos);
    vec2 du1 = dFdx(vUV), du2 = dFdy(vUV);
    vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
    vec3 T = dp2p*du1.x + dp1p*du2.x;
    vec3 B = dp2p*du1.y + dp1p*du2.y;
    float im = inversesqrt(max(dot(T,T), dot(B,B)) + 1e-8);
    vec3 nt = texture(uNormalTex, vUV).xyz*2.0-1.0;
    nt.xy *= 0.85;
    N = normalize(mat3(T*im, B*im, N) * nt);
  }
  return N;
}

float shadowFactor(vec3 N){
  if(uShadowOn == 0) return 1.0;
  vec4 sp = uShadowVP * vec4(vWPos, 1.0);
  vec3 pc = sp.xyz / sp.w * 0.5 + 0.5;
  if(pc.x < 0.002 || pc.x > 0.998 || pc.y < 0.002 || pc.y > 0.998 || pc.z > 1.0) return 1.0;
  float ndl = max(dot(N, uSunDir), 0.0);
  float bias = max(0.0006, 0.0035 * (1.0 - ndl));
  float sum = 0.0;
  for(int y=-1; y<=1; y++){
    for(int x=-1; x<=1; x++){
      float d = texture(uShadowMap, pc.xy + vec2(float(x), float(y)) * uShadowTexel).r;
      sum += (pc.z - bias > d) ? 0.0 : 1.0;
    }
  }
  return sum / 9.0;
}

vec3 brdf(vec3 N, vec3 V, vec3 L, vec3 albedo, float rough, float metal, vec3 radiance){
  vec3 H = normalize(V + L);
  float nl = max(dot(N, L), 0.0);
  if(nl <= 0.0) return vec3(0.0);
  float nv = max(dot(N, V), 1e-4);
  float nh = max(dot(N, H), 0.0);
  float vh = max(dot(V, H), 0.0);
  float a = max(rough*rough, 0.002);
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = fres(vh, F0);
  float D = ggx(nh, a);
  float G = smithG(nv, nl, a);
  vec3 spec = (D*G*F) / (4.0*nv*nl + 1e-5);
  vec3 kd = (1.0 - F) * (1.0 - metal);
  return (kd * albedo / PI + spec) * radiance * nl;
}

void main(){
  vec4 texel = texture(uAlbedo, vUV);
  vec3 albedo = texel.rgb * vColor;
  float rough = clamp(vMat.x, 0.045, 1.0);
  float metal = clamp(vMat.y, 0.0, 1.0);
  float emis = vMat.z * uEmisMul;
  vec3 N = getNormal();
  vec3 V = normalize(uCamPos - vWPos);

  vec3 col = brdf(N, V, uSunDir, albedo, rough, metal, uSunColor * shadowFactor(N));

  for(int i=0;i<8;i++){
    if(i >= uLightCount) break;
    vec3 lp = uLightPos[i].xyz;
    vec3 dv = lp - vWPos;
    float dist = length(dv);
    float range = max(uLightPos[i].w, 0.01);
    // 物理平方衰减 + 距离窗口裁剪
    float f = clamp(1.0 - pow(dist/range, 4.0), 0.0, 1.0);
    float att = f * f / max(dist*dist, 0.22);
    if(att <= 0.0004) continue;
    col += brdf(N, V, dv/dist, albedo, rough, metal, uLightColor[i].rgb * uLightColor[i].w * att);
  }

  // 半球环境光 + 粗略环境镜面
  float up = clamp(N.y*0.5+0.5, 0.0, 1.0);
  vec3 amb = mix(uGroundColor, uSkyColor, up);
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  float nv = max(dot(N, V), 1e-4);
  vec3 envSpec = amb * (F0 + (1.0-F0)*pow(1.0-nv, 5.0)) * (1.0 - rough*0.85);
  col += albedo * amb * (1.0 - metal*0.75) + envSpec;
  col += albedo * emis * 2.4;

  if(uTintStrength > 0.0){
    float rim = pow(1.0 - nv, 2.2);
    col += uTint * (0.14 + rim * 1.9) * uTintStrength;
  }

  float dist = length(uCamPos - vWPos);
  col = mix(col, uFogColor, 1.0 - exp(-dist * uFogDensity));
  fragColor = vec4(col, uAlpha * texel.a);
}`;

  const VS_DEPTH = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uShadowVP, uModel;
void main(){ gl_Position = uShadowVP * uModel * vec4(aPos, 1.0); }`;

  const FS_DEPTH = `#version 300 es
precision highp float;
void main(){}`;

  const VS_POST = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS_BRIGHT = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; uniform float uThreshold; out vec4 o;
void main(){
  vec3 c = texture(uTex, vUV).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = clamp((l - uThreshold) / max(l, 1e-4), 0.0, 1.0);
  o = vec4(c * k, 1.0);
}`;

  const FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){
  float w[5]; w[0]=0.227027; w[1]=0.1945946; w[2]=0.1216216; w[3]=0.054054; w[4]=0.016216;
  vec3 sum = texture(uTex, vUV).rgb * w[0];
  for(int i=1;i<5;i++){
    sum += texture(uTex, vUV + uDir*float(i)).rgb * w[i];
    sum += texture(uTex, vUV - uDir*float(i)).rgb * w[i];
  }
  o = vec4(sum, 1.0);
}`;

  const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uScene, uBloom;
uniform float uBloomAmt, uExposure, uVignette, uTime, uFlash, uDesat;
out vec4 o;
vec3 aces(vec3 x){
  const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
void main(){
  vec3 c = texture(uScene, vUV).rgb;
  c += texture(uBloom, vUV).rgb * uBloomAmt;
  c *= uExposure;
  c = aces(c);
  float lum = dot(c, vec3(0.2126,0.7152,0.0722));
  c = mix(c, vec3(lum), uDesat);
  vec2 d = vUV - 0.5;
  c *= 1.0 - uVignette * dot(d, d) * 1.7;
  float grain = fract(sin(dot(vUV*vec2(1.0+uTime*0.0001), vec2(12.9898,78.233)))*43758.5453);
  c += (grain - 0.5) * 0.012;
  c += uFlash;
  o = vec4(pow(max(c, 0.0), vec3(1.0/2.2)), 1.0);
}`;

  const FS_FXAA = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; uniform vec2 uInvRes; out vec4 o;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 rgbM = texture(uTex, vUV).rgb;
  float lM = lum(rgbM);
  float lNW = lum(texture(uTex, vUV + vec2(-1.0,-1.0)*uInvRes).rgb);
  float lNE = lum(texture(uTex, vUV + vec2( 1.0,-1.0)*uInvRes).rgb);
  float lSW = lum(texture(uTex, vUV + vec2(-1.0, 1.0)*uInvRes).rgb);
  float lSE = lum(texture(uTex, vUV + vec2( 1.0, 1.0)*uInvRes).rgb);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float reduce = max((lNW+lNE+lSW+lSE)*0.25*0.25, 1.0/128.0);
  float rcp = 1.0/(min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir*rcp, -8.0, 8.0) * uInvRes;
  vec3 a = 0.5*(texture(uTex, vUV + dir*(1.0/3.0-0.5)).rgb + texture(uTex, vUV + dir*(2.0/3.0-0.5)).rgb);
  vec3 b = a*0.5 + 0.25*(texture(uTex, vUV - dir*0.5).rgb + texture(uTex, vUV + dir*0.5).rgb);
  float lB = lum(b);
  o = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
}`;

  const Renderer = {
    init(canvas) {
      const gl = canvas.getContext('webgl2', {
        antialias: false, alpha: false, depth: true, powerPreference: 'high-performance',
      });
      if (!gl) throw new Error('当前浏览器不支持 WebGL2');
      this.gl = gl;
      this.canvas = canvas;
      gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('EXT_color_buffer_half_float');
      this.floatOK = !!gl.getExtension('EXT_color_buffer_half_float') || !!gl.getExtension('EXT_color_buffer_float');

      this.pMain = root.GLU.program(gl, VS_MAIN, FS_MAIN, 'main');
      this.pDepth = root.GLU.program(gl, VS_DEPTH, FS_DEPTH, 'depth');
      this.pBright = root.GLU.program(gl, VS_POST, FS_BRIGHT, 'bright');
      this.pBlur = root.GLU.program(gl, VS_POST, FS_BLUR, 'blur');
      this.pComp = root.GLU.program(gl, VS_POST, FS_COMPOSITE, 'composite');
      this.pFxaa = root.GLU.program(gl, VS_POST, FS_FXAA, 'fxaa');
      this.quad = root.GLU.fullscreenQuad(gl);

      this.shadow = root.GLU.makeShadowFBO(gl, 2048);
      this.shadowSize = 2048;
      this.shadowVP = M4.create();
      this.view = M4.create();
      this.proj = M4.create();
      this.nrm = new Float32Array(9);
      this.size = [0, 0];
      this.quality = { renderScale: 1, shadows: true, bloom: true, fxaa: true, maxLights: 8 };
      this.exposure = 1.0;
      this.flash = 0;
      this.desat = 0;
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    },

    setShadowSize(n) {
      if (this.shadowSize === n) return;
      const gl = this.gl;
      gl.deleteTexture(this.shadow.tex);
      gl.deleteFramebuffer(this.shadow.fbo);
      this.shadow = root.GLU.makeShadowFBO(gl, n);
      this.shadowSize = n;
    },

    resize(w, h) {
      const gl = this.gl;
      const scale = this.quality.renderScale;
      const rw = Math.max(320, Math.floor(w * scale));
      const rh = Math.max(200, Math.floor(h * scale));
      if (this.size[0] === rw && this.size[1] === rh) return;
      this.size = [rw, rh];
      const del = (f) => {
        if (!f) return;
        gl.deleteTexture(f.color);
        if (f.depth) gl.deleteRenderbuffer(f.depth);
        gl.deleteFramebuffer(f.fbo);
      };
      del(this.hdr); del(this.ldr); del(this.bloomA); del(this.bloomB);
      this.hdr = root.GLU.makeFBO(gl, rw, rh, { float: this.floatOK, depth: true });
      this.ldr = root.GLU.makeFBO(gl, rw, rh, {});
      const bw = Math.max(8, rw >> 1), bh = Math.max(8, rh >> 1);
      this.bloomA = root.GLU.makeFBO(gl, bw, bh, { float: this.floatOK });
      this.bloomB = root.GLU.makeFBO(gl, bw, bh, { float: this.floatOK });
    },

    bindTex(unit, tex) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    },

    /** 阴影贴图矩阵：以房间中心为焦点的正交投影 */
    updateSun(scene) {
      const sun = scene.sun;
      const c = sun.focus;
      const eye = [c[0] + sun.dir[0] * 14, c[1] + sun.dir[1] * 14, c[2] + sun.dir[2] * 14];
      const v = M4.lookAt(M4.create(), eye, c, [0, 1, 0]);
      const p = M4.ortho(M4.create(), -sun.extent, sun.extent, -sun.extent, sun.extent, 0.5, 32);
      M4.mul(this.shadowVP, p, v);
    },

    drawNodes(nodes, prog, opts) {
      const gl = this.gl;
      const shadowPass = opts.shadowPass;
      const transparentPass = !!opts.transparent;
      const wantView = !!opts.viewmodel;
      for (const n of nodes) {
        if (!n.visible || !n.model) continue;
        if (!!n.viewmodel !== wantView) continue;
        if (shadowPass && (n.noShadow || n.viewmodel)) continue;
        prog.um4('uModel', n.world);
        if (!shadowPass) {
          M4.normalMat(this.nrm, n.world);
          prog.um3('uNrm', this.nrm);
          prog.u1f('uAlpha', n.alpha != null ? n.alpha : 1);
          prog.u1f('uEmisMul', n.emisMul != null ? n.emisMul : 1);
          const t = n.tint;
          prog.u3f('uTint', t ? t[0] : 0, t ? t[1] : 0, t ? t[2] : 0);
          prog.u1f('uTintStrength', n.tintStrength || 0);
        }
        for (const s of n.model.subs) {
          const isT = s.transparent || (n.alpha != null && n.alpha < 1);
          if (isT !== transparentPass && !shadowPass) continue;
          if (shadowPass && (s.transparent || s.noShadow || (n.alpha != null && n.alpha < 1))) continue;
          if (!shadowPass) {
            const t = root.TEX.get(s.tex);
            this.bindTex(0, t.albedo);
            prog.u1i('uHasNormal', t.normal ? 1 : 0);
            if (t.normal) this.bindTex(1, t.normal);
            prog.u1f('uAlpha', (n.alpha != null ? n.alpha : 1) * s.alpha);
          }
          gl.bindVertexArray(s.vao);
          gl.drawElements(gl.TRIANGLES, s.count, gl.UNSIGNED_INT, 0);
        }
      }
    },

    render(scene, cam, dt) {
      const gl = this.gl;
      const [rw, rh] = this.size;
      this.updateSun(scene);

      // ---- 阴影 Pass ----
      if (this.quality.shadows) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadow.fbo);
        gl.viewport(0, 0, this.shadow.size, this.shadow.size);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.colorMask(false, false, false, false);
        this.pDepth.use();
        this.pDepth.um4('uShadowVP', this.shadowVP);
        gl.cullFace(gl.FRONT);
        this.drawNodes(scene.nodes, this.pDepth, { shadowPass: true });
        gl.cullFace(gl.BACK);
        gl.colorMask(true, true, true, true);
      }

      // ---- 主 Pass ----
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdr.fbo);
      gl.viewport(0, 0, rw, rh);
      gl.clearColor(scene.fog.color[0] * 0.6, scene.fog.color[1] * 0.6, scene.fog.color[2] * 0.6, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      M4.perspective(this.proj, cam.fov * Math.PI / 180, rw / rh, 0.02, 60);
      M4.copy(this.view, cam.view);

      const p = this.pMain;
      p.use();
      p.um4('uProj', this.proj);
      p.um4('uView', this.view);
      p.u3v('uCamPos', cam.pos);
      const s = scene.sun;
      p.u3f('uSunDir', s.dir[0], s.dir[1], s.dir[2]);
      p.u3f('uSunColor', s.color[0], s.color[1], s.color[2]);
      p.u3f('uSkyColor', scene.ambient.sky[0], scene.ambient.sky[1], scene.ambient.sky[2]);
      p.u3f('uGroundColor', scene.ambient.ground[0], scene.ambient.ground[1], scene.ambient.ground[2]);
      p.u3f('uFogColor', scene.fog.color[0], scene.fog.color[1], scene.fog.color[2]);
      p.u1f('uFogDensity', scene.fog.density);
      p.um4('uShadowVP', this.shadowVP);
      p.u1i('uShadowOn', this.quality.shadows ? 1 : 0);
      p.u1f('uShadowTexel', 1 / this.shadow.size);
      p.u1i('uAlbedo', 0);
      p.u1i('uNormalTex', 1);
      p.u1i('uShadowMap', 2);
      this.bindTex(2, this.shadow.tex);

      // 低画质下只保留最近/最强的若干光源
      let lights = scene.lights.filter((l) => l.on !== false && l.intensity > 0);
      const maxL = Math.min(8, this.quality.maxLights || 8);
      if (lights.length > maxL) {
        const cp = cam.pos;
        lights = lights.slice().sort((a, b) => {
          const da = Math.hypot(a.pos[0] - cp[0], a.pos[1] - cp[1], a.pos[2] - cp[2]) / (a.intensity + 0.01);
          const db = Math.hypot(b.pos[0] - cp[0], b.pos[1] - cp[1], b.pos[2] - cp[2]) / (b.intensity + 0.01);
          return da - db;
        }).slice(0, maxL);
      }
      const lp = new Float32Array(32), lc = new Float32Array(32);
      lights.forEach((l, i) => {
        lp[i * 4] = l.pos[0]; lp[i * 4 + 1] = l.pos[1]; lp[i * 4 + 2] = l.pos[2]; lp[i * 4 + 3] = l.range;
        lc[i * 4] = l.color[0]; lc[i * 4 + 1] = l.color[1]; lc[i * 4 + 2] = l.color[2]; lc[i * 4 + 3] = l.intensity;
      });
      gl.uniform4fv(p.loc('uLightPos[0]'), lp);
      gl.uniform4fv(p.loc('uLightColor[0]'), lc);
      p.u1i('uLightCount', lights.length);

      gl.depthMask(true);
      gl.disable(gl.BLEND);
      this.drawNodes(scene.nodes, p, { transparent: false });

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      this.drawNodes(scene.nodes, p, { transparent: true });
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      // ---- 第一人称手部/手持物（清空深度后单独绘制，避免插进场景物体里） ----
      gl.clear(gl.DEPTH_BUFFER_BIT);
      this.drawNodes(scene.nodes, p, { transparent: false, viewmodel: true });
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      this.drawNodes(scene.nodes, p, { transparent: true, viewmodel: true });
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      // ---- 泛光 ----
      gl.disable(gl.DEPTH_TEST);
      gl.bindVertexArray(this.quad);
      if (this.quality.bloom) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
        gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
        this.pBright.use();
        this.pBright.u1i('uTex', 0);
        this.pBright.u1f('uThreshold', 1.05);
        this.bindTex(0, this.hdr.color);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        this.pBlur.use();
        this.pBlur.u1i('uTex', 0);
        for (let i = 0; i < 2; i++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo);
          this.pBlur.u2f('uDir', 1.6 / this.bloomA.w, 0);
          this.bindTex(0, this.bloomA.color);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
          this.pBlur.u2f('uDir', 0, 1.6 / this.bloomA.h);
          this.bindTex(0, this.bloomB.color);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }

      // ---- 合成 ----
      const target = this.quality.fxaa ? this.ldr.fbo : null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, this.quality.fxaa ? rw : this.canvas.width, this.quality.fxaa ? rh : this.canvas.height);
      this.pComp.use();
      this.pComp.u1i('uScene', 0);
      this.pComp.u1i('uBloom', 1);
      this.bindTex(0, this.hdr.color);
      this.bindTex(1, this.quality.bloom ? this.bloomA.color : this.hdr.color);
      this.pComp.u1f('uBloomAmt', this.quality.bloom ? 0.55 : 0);
      this.pComp.u1f('uExposure', this.exposure);
      this.pComp.u1f('uVignette', 0.55);
      this.pComp.u1f('uTime', performance.now() * 0.001);
      this.pComp.u1f('uFlash', this.flash);
      this.pComp.u1f('uDesat', this.desat);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (this.quality.fxaa) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.pFxaa.use();
        this.pFxaa.u1i('uTex', 0);
        this.pFxaa.u2f('uInvRes', 1 / rw, 1 / rh);
        this.bindTex(0, this.ldr.color);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.bindVertexArray(null);
      gl.enable(gl.DEPTH_TEST);
    },
  };

  root.RENDER = Renderer;
})(window);
