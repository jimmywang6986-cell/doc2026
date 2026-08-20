/* 场景图：节点层级、世界矩阵、包围盒射线拾取 */
(function (root) {
  'use strict';

  const { M4, V3 } = root.MATH3D;

  let uid = 0;

  class Node {
    constructor(o) {
      o = o || {};
      this.id = ++uid;
      this.name = o.name || 'node';
      this.pos = (o.pos || [0, 0, 0]).slice();
      this.rot = (o.rot || [0, 0, 0]).slice();
      this.scale = (o.scale || [1, 1, 1]).slice();
      this.model = o.model || null;
      this.visible = o.visible !== false;
      this.alpha = o.alpha != null ? o.alpha : 1;
      this.emisMul = o.emisMul != null ? o.emisMul : 1;
      this.tint = null;
      this.tintStrength = 0;
      this.noShadow = !!o.noShadow;
      this.parent = null;
      this.children = [];
      this.matrixOverride = null;
      this.local = M4.create();
      this.world = M4.create();
      this.data = o.data || {};
      this.spin = null; // {axis, speed, angle} 风扇旋转
    }

    add(child) {
      if (child.parent) child.parent.remove(child);
      child.parent = this;
      this.children.push(child);
      if (this.scene) this.scene.markDirty();
      return child;
    }

    remove(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      child.parent = null;
      if (this.scene) this.scene.markDirty();
    }

    /** 更换父节点并保持世界位置（用于把主板连零件一起装进机箱） */
    reparentKeepWorld(newParent) {
      const w = M4.copy(M4.create(), this.world);
      const inv = M4.invert(M4.create(), newParent.world);
      const local = M4.mul(M4.create(), inv, w);
      newParent.add(this);
      // 从矩阵反解平移；旋转沿用原值（本项目的父子变换均为轴对齐或已知角度）
      this.pos = [local[12], local[13], local[14]];
      return local;
    }

    updateWorld(parentWorld) {
      if (this.matrixOverride) {
        // 手持零件：世界矩阵直接由相机决定
        M4.copy(this.world, this.matrixOverride);
      } else {
        M4.fromTRS(this.local, this.pos, this.rot, this.scale);
        if (parentWorld) M4.mul(this.world, parentWorld, this.local);
        else M4.copy(this.world, this.local);
      }
      for (const c of this.children) c.updateWorld(this.world);
    }

    /** 世界空间轴对齐包围盒 */
    worldAABB() {
      if (!this.model) return null;
      const b = this.model.bbox;
      const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
      for (let i = 0; i < 8; i++) {
        const p = [
          i & 1 ? b.max[0] : b.min[0],
          i & 2 ? b.max[1] : b.min[1],
          i & 4 ? b.max[2] : b.min[2],
        ];
        const w = M4.xformPoint([0, 0, 0], this.world, p);
        for (let k = 0; k < 3; k++) {
          if (w[k] < min[k]) min[k] = w[k];
          if (w[k] > max[k]) max[k] = w[k];
        }
      }
      return { min, max };
    }

    worldPos() {
      return [this.world[12], this.world[13], this.world[14]];
    }
  }

  class Scene {
    constructor() {
      this.root = new Node({ name: 'root' });
      this.root.scene = this;
      this.nodes = [];
      this.dirty = true;
      this.lights = [];
      this.sun = {
        dir: V3.norm([0, 0, 0], [0.45, 0.72, 0.52]),
        color: [3.4, 3.1, 2.7],
        focus: [0, 1.0, 0],
        extent: 7.5,
      };
      this.ambient = { sky: [0.30, 0.34, 0.42], ground: [0.10, 0.09, 0.08] };
      this.fog = { color: [0.16, 0.17, 0.20], density: 0.012 };
    }

    markDirty() { this.dirty = true; }

    add(node, parent) {
      (parent || this.root).add(node);
      node.scene = this;
      this.markDirty();
      return node;
    }

    flatten() {
      this.nodes.length = 0;
      const walk = (n) => {
        n.scene = this;
        if (n !== this.root) this.nodes.push(n);
        for (const c of n.children) walk(c);
      };
      walk(this.root);
      this.dirty = false;
    }

    update(dt) {
      if (this.dirty) this.flatten();
      for (const n of this.nodes) {
        if (n.spin) {
          n.spin.angle = (n.spin.angle + n.spin.speed * dt) % (Math.PI * 2);
          n.rot[n.spin.axis] = n.spin.angle;
        }
      }
      this.root.updateWorld(null);
    }
  }

  /** 射线与 AABB 求交，返回命中距离或 null */
  function rayAABB(orig, dir, box) {
    let tmin = 0.0001, tmax = 1e9;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(dir[i]) < 1e-8) {
        if (orig[i] < box.min[i] || orig[i] > box.max[i]) return null;
      } else {
        const inv = 1 / dir[i];
        let t1 = (box.min[i] - orig[i]) * inv;
        let t2 = (box.max[i] - orig[i]) * inv;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }
    return tmin;
  }

  function aabbExpand(box, m) {
    return {
      min: [box.min[0] - m, box.min[1] - m, box.min[2] - m],
      max: [box.max[0] + m, box.max[1] + m, box.max[2] + m],
    };
  }

  root.SCENE = { Node, Scene, rayAABB, aabbExpand };
})(window);
