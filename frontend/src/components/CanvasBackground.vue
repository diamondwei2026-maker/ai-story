<template>
  <canvas
    ref="canvasRef"
    class="canvas-background"
    :style="{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  char: string;
}

const CHARS = ['墨', '文', '字', '书', '笔', '·', '。', '、'];

const props = withDefaults(defineProps<{
  particleCount?: number;
}>(), {
  particleCount: 50,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId = 0;
let particles: Particle[] = [];

function createParticle(canvas: HTMLCanvasElement): Particle {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.4 - 0.2,
    size: Math.random() * 12 + 8,
    opacity: Math.random() * 0.15 + 0.05,
    char: CHARS[Math.floor(Math.random() * CHARS.length)],
  };
}

function animate() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    ctx.font = `${p.size}px serif`;
    ctx.fillStyle = `rgba(139, 119, 90, ${p.opacity})`;
    ctx.fillText(p.char, p.x, p.y);

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  }

  animationId = requestAnimationFrame(animate);
}

function resize() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < props.particleCount; i++) {
    particles.push(createParticle(canvas));
  }

  animationId = requestAnimationFrame(animate);
});

onUnmounted(() => {
  window.removeEventListener('resize', resize);
  cancelAnimationFrame(animationId);
});
</script>
