/* 第一人称控制器：指针锁定视角、WASD 移动、碰撞、头部起伏 */
(function (root) {
  'use strict';

  const { M4, V3, clamp, damp } = root.MATH3D;

  const Input = {
    keys: Object.create(null),
    mouseDX: 0,
    mouseDY: 0,
    dragging: false,
    locked: false,
    wheel: 0,
    clicked: false,
    rightClicked: false,
    sensitivity: 1.0,
    invertY: false,
    blocked: false, // 弹窗打开时屏蔽移动

    init(canvas, onKey) {
      const isGameKey = (c) => /^(Key|Digit|Arrow|Numpad)/.test(c) || c === 'Space' || c === 'Tab' || c === 'ShiftLeft' || c === 'ShiftRight';
      window.addEventListener('keydown', (e) => {
        if (e.repeat) { if (onKey) onKey(e.code, e, true); return; }
        this.keys[e.code] = true;
        if (onKey) onKey(e.code, e, false);
        if (isGameKey(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = Object.create(null); });

      document.addEventListener('pointerlockchange', () => {
        this.locked = document.pointerLockElement === canvas;
      });
      canvas.addEventListener('mousemove', (e) => {
        if (this.locked) {
          this.mouseDX += e.movementX;
          this.mouseDY += e.movementY;
        } else if (this.dragging) {
          this.mouseDX += e.movementX || 0;
          this.mouseDY += e.movementY || 0;
        }
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { this.dragging = true; this.clicked = true; }
        if (e.button === 2) this.rightClicked = true;
      });
      window.addEventListener('mouseup', () => { this.dragging = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    },

    consumeMouse() {
      const d = [this.mouseDX, this.mouseDY];
      this.mouseDX = 0; this.mouseDY = 0;
      return d;
    },

    down(code) { return !!this.keys[code]; },
  };

  class Player {
    constructor(pos, yaw) {
      this.pos = (pos || [0, 0, 3]).slice(); // 脚底位置
      this.vel = [0, 0, 0];
      this.yaw = yaw || 0;
      this.pitch = -0.05;
      this.eye = 1.66;
      this.crouch = 0;
      this.radius = 0.28;
      this.onGround = true;
      this.bob = 0;
      this.bobAmp = 0;
      this.view = M4.create();
      this.camPos = [0, 0, 0];
      this.fov = 72;
      this.fovTarget = 72;
      this.colliders = [];
      this.roll = 0;
    }

    forward() {
      const cp = Math.cos(this.pitch);
      return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
    }

    right() {
      return [Math.cos(this.yaw), 0, -Math.sin(this.yaw)];
    }

    hits(pos) {
      const r = this.radius;
      const h = 1.72 - this.crouch * 0.6;
      const box = {
        min: [pos[0] - r, pos[1] + 0.05, pos[2] - r],
        max: [pos[0] + r, pos[1] + h, pos[2] + r],
      };
      for (const c of this.colliders) {
        if (box.min[0] < c.max[0] && box.max[0] > c.min[0]
          && box.min[1] < c.max[1] && box.max[1] > c.min[1]
          && box.min[2] < c.max[2] && box.max[2] > c.min[2]) return true;
      }
      return false;
    }

    update(dt, opts) {
      const speedLook = 0.0022 * Input.sensitivity;
      const [dx, dy] = Input.consumeMouse();
      if (!Input.blocked) {
        this.yaw -= dx * speedLook;
        this.pitch -= (Input.invertY ? -dy : dy) * speedLook;
        // 方向键视角（无需鼠标锁定也可环视）
        const kLook = 1.7 * dt;
        if (Input.down('ArrowLeft')) this.yaw += kLook;
        if (Input.down('ArrowRight')) this.yaw -= kLook;
        if (Input.down('ArrowUp')) this.pitch += kLook * 0.7;
        if (Input.down('ArrowDown')) this.pitch -= kLook * 0.7;
      }
      this.pitch = clamp(this.pitch, -1.45, 1.45);

      let mx = 0, mz = 0;
      if (!Input.blocked && !(opts && opts.frozen)) {
        if (Input.down('KeyW')) mz += 1;
        if (Input.down('KeyS')) mz -= 1;
        if (Input.down('KeyA')) mx -= 1;
        if (Input.down('KeyD')) mx += 1;
      }
      const sprint = Input.down('ShiftLeft') || Input.down('ShiftRight');
      const crouching = Input.down('ControlLeft') || Input.down('KeyC');
      this.crouch = damp(this.crouch, crouching ? 1 : 0, 12, dt);

      const len = Math.hypot(mx, mz) || 1;
      const base = crouching ? 1.45 : sprint ? 4.15 : 2.5;
      const f = this.forward(), r = this.right();
      const wishX = (r[0] * mx + f[0] * mz) / len;
      const wishZ = (r[2] * mx + f[2] * mz) / len;
      const moving = mx !== 0 || mz !== 0;

      const accel = this.onGround ? 22 : 6;
      this.vel[0] = damp(this.vel[0], moving ? wishX * base : 0, accel, dt);
      this.vel[2] = damp(this.vel[2], moving ? wishZ * base : 0, accel, dt);

      if (!Input.blocked && Input.down('Space') && this.onGround) {
        this.vel[1] = 4.1;
        this.onGround = false;
      }
      this.vel[1] -= 11.5 * dt;

      const step = (axis, amount) => {
        if (!amount) return;
        const next = this.pos.slice();
        next[axis] += amount;
        if (!this.hits(next)) {
          this.pos = next;
        } else if (axis !== 1) {
          // 尝试沿台阶上抬
          const stepUp = next.slice();
          stepUp[1] += 0.32;
          if (!this.hits(stepUp)) this.pos = stepUp;
          else this.vel[axis] = 0;
        } else {
          if (amount < 0) { this.onGround = true; }
          this.vel[1] = 0;
        }
      };
      step(0, this.vel[0] * dt);
      step(2, this.vel[2] * dt);
      step(1, this.vel[1] * dt);

      if (this.pos[1] <= 0) { this.pos[1] = 0; this.vel[1] = 0; this.onGround = true; }
      else if (this.vel[1] !== 0) this.onGround = false;

      const speed = Math.hypot(this.vel[0], this.vel[2]);
      this.bobAmp = damp(this.bobAmp, this.onGround ? Math.min(speed / 4.2, 1) : 0, 8, dt);
      this.bob += dt * (6.2 + speed * 1.5);
      this.fovTarget = 72 + (sprint && speed > 2 ? 5 : 0);
      this.fov = damp(this.fov, this.fovTarget, 6, dt);
      this.roll = damp(this.roll, -mx * 0.012, 8, dt);

      const eyeH = this.eye - this.crouch * 0.52
        + Math.sin(this.bob) * 0.028 * this.bobAmp;
      const sway = Math.cos(this.bob * 0.5) * 0.022 * this.bobAmp;
      this.camPos = [
        this.pos[0] + r[0] * sway,
        this.pos[1] + eyeH,
        this.pos[2] + r[2] * sway,
      ];
      const fwd = this.forward();
      const target = [this.camPos[0] + fwd[0], this.camPos[1] + fwd[1], this.camPos[2] + fwd[2]];
      const up = [Math.sin(this.roll), Math.cos(this.roll), 0];
      M4.lookAt(this.view, this.camPos, target, up);
    }
  }

  root.PLAYER = { Input, Player };
})(window);
