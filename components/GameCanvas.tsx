import React, { useEffect, useRef, useState } from 'react';
import { Block, Bullet, Particle, ContributionData } from '../types';

interface GameCanvasProps {
  data: ContributionData;
  onRestart: () => void;
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const ROCKET_WIDTH = 50;
const ROCKET_HEIGHT = 80;
const BULLET_SPEED = 20;
const ROCKET_SPEED = 0.30;
const FIRE_RATE = 80;

const COLORS = {
  0: '#0d1117',
  1: '#00441b',
  2: '#00882f',
  3: '#00cc55',
  4: '#00ff66',
};

const GameCanvas: React.FC<GameCanvasProps> = ({ data, onRestart }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [score, setScore] = useState(0);

  const rocketDivRef = useRef<HTMLDivElement | null>(null);

  const gameState = useRef({
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    rocketX: 0,
    targetX: 0,
    currentTargetId: null as string | null,
    lastFireTime: 0,
    blocks: [] as Block[],
    animationId: 0,
    width: 0,
    height: 0,
    isResetting: false,
  });

  useEffect(() => {
    if (!data.weeks.length) return;

    const initialBlocks: Block[] = [];
    let xOffset = 0;

    data.weeks.forEach((week, wIndex) => {
      week.days.forEach((day, dIndex) => {
        if (day.level > 0) {
          initialBlocks.push({
            id: `${wIndex}-${dIndex}`,
            x: xOffset,
            y: dIndex * (CELL_SIZE + CELL_GAP),
            width: CELL_SIZE,
            height: CELL_SIZE,
            level: day.level,
            date: day.date,
            originalColor: COLORS[day.level],
          });
        }
      });
      xOffset += CELL_SIZE + CELL_GAP;
    });

    setBlocks(initialBlocks);
    setScore(0);

    gameState.current.blocks = initialBlocks;
    gameState.current.rocketX = xOffset / 2;
    gameState.current.targetX = xOffset / 2;
    gameState.current.currentTargetId = null;
    gameState.current.bullets = [];
    gameState.current.particles = [];
    gameState.current.width = xOffset;
    gameState.current.height = 7 * (CELL_SIZE + CELL_GAP) + 60;
    gameState.current.isResetting = false;
  }, [data]);

  useEffect(() => {
    const canvas = document.getElementById('game-layer') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (timestamp: number) => {
      const state = gameState.current;
      const { width, height } = state;

      if (state.isResetting) return;

      ctx.clearRect(0, 0, width, height);

      if (state.blocks.length === 0 && data.weeks.length > 0) {
        state.isResetting = true;
        setTimeout(() => {
          onRestart();
        }, 1000);
        return;
      }

      const targetExists = state.currentTargetId && state.blocks.some(b => b.id === state.currentTargetId);

      if (!targetExists && state.blocks.length > 0) {
        const randomIndex = Math.floor(Math.random() * state.blocks.length);
        const targetBlock = state.blocks[randomIndex];
        state.currentTargetId = targetBlock.id;
        state.targetX = targetBlock.x + CELL_SIZE / 2;
      } else if (targetExists) {
        const targetBlock = state.blocks.find(b => b.id === state.currentTargetId);
        if (targetBlock) {
          state.targetX = targetBlock.x + CELL_SIZE / 2;
        }
      }

      const diff = state.targetX - state.rocketX;
      if (Math.abs(diff) > 1) {
        state.rocketX += diff * ROCKET_SPEED;
      } else {
        state.rocketX = state.targetX;
      }

      if (Math.abs(state.rocketX - state.targetX) < 10 && state.blocks.length > 0) {
        if (timestamp - state.lastFireTime > FIRE_RATE) {
          state.bullets.push({
            id: Math.random(),
            x: state.rocketX,
            y: height - ROCKET_HEIGHT - 5,
            active: true
          });
          state.lastFireTime = timestamp;
        }
      }

      state.bullets.forEach(b => {
        b.y -= BULLET_SPEED;
        if (b.y < 0) b.active = false;
        if (b.active) {
          const hitIndex = state.blocks.findIndex(blk =>
            b.x >= blk.x &&
            b.x <= blk.x + blk.width &&
            b.y >= blk.y &&
            b.y <= blk.y + blk.height
          );
          if (hitIndex !== -1) {
            const hitBlock = state.blocks[hitIndex];
            b.active = false;
            for (let i = 0; i < 8; i++) {
              state.particles.push({
                id: Math.random(),
                x: hitBlock.x + CELL_SIZE / 2,
                y: hitBlock.y + CELL_SIZE / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0,
                color: hitBlock.originalColor
              });
            }
            state.blocks.splice(hitIndex, 1);
            if (hitBlock.id === state.currentTargetId) {
              state.currentTargetId = null;
            }
            setBlocks([...state.blocks]);
            setScore(s => s + 10);
          }
        }
      });
      state.bullets = state.bullets.filter(b => b.active);

      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.06;
      });
      state.particles = state.particles.filter(p => p.life > 0);

      state.bullets.forEach(b => {
        ctx.beginPath();
        ctx.fillStyle = '#ff4d4d';
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1.0;
      });

      // Update rocket div position via DOM (avoids React re-render overhead)
      if (rocketDivRef.current) {
        const rx = state.rocketX;
        const ry = height - ROCKET_HEIGHT - 5;
        const tilt = Math.abs(diff) > 1 ? (diff > 0 ? 8 : -8) : 0;
        rocketDivRef.current.style.left = `${rx - ROCKET_WIDTH / 2}px`;
        rocketDivRef.current.style.top = `${ry}px`;
        rocketDivRef.current.style.transform = `rotate(${tilt}deg)`;
      }
      state.animationId = requestAnimationFrame(loop);
    };

    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [data, onRestart]);

  const width = (data.weeks.length * (CELL_SIZE + CELL_GAP));
  const height = (7 * (CELL_SIZE + CELL_GAP)) + 60;

  return (
    <div
      id="game-container"
      className="relative flex flex-col items-center bg-[#0d1117] border border-gray-800 rounded-xl p-4 shadow-2xl overflow-hidden"
      style={{ minHeight: height + 20 }}
    >
      <div className="absolute top-4 left-4 flex gap-4 text-sm font-mono z-10 pointer-events-none">
        <div className="text-gray-400">Score: <span className="text-white font-bold">{score}</span></div>
        <div className="text-gray-400">Remaining: <span className="text-red-400 font-bold">{blocks.length}</span></div>
      </div>

      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
        >
          <g>
            {data.weeks.map((week, wIndex) =>
              week.days.map((day, dIndex) => (
                <rect
                  key={`bg-${wIndex}-${dIndex}`}
                  x={wIndex * (CELL_SIZE + CELL_GAP)}
                  y={dIndex * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill="#0d1117"
                />
              ))
            )}

            {blocks.map((block) => (
              <rect
                key={block.id}
                x={block.x}
                y={block.y}
                width={block.width}
                height={block.height}
                rx={2}
                fill={block.originalColor}
                className="transition-all duration-75"
              />
            ))}
          </g>
        </svg>

        <canvas
          id="game-layer"
          width={width}
          height={height}
          className="absolute top-0 left-0"
        />

        {/* Animated inline SVG rocket — rendered as a DOM element so CSS keyframe animations work */}
        <div
          ref={rocketDivRef}
          className="absolute pointer-events-none"
          style={{
            width: ROCKET_WIDTH,
            height: ROCKET_HEIGHT,
            transformOrigin: 'center bottom',
            transition: 'transform 0.05s linear',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" width={ROCKET_WIDTH} height={ROCKET_HEIGHT}>
            <defs>
              <style>{`
                @keyframes pulse {
                  0% { transform: scaleY(1); opacity: 0.8; }
                  100% { transform: scaleY(1.4); opacity: 1; }
                }
                @keyframes hover {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-2px); }
                }
                .flame-main {
                  animation: pulse 0.08s ease-in-out infinite alternate;
                  transform-origin: 25px 60px;
                }
                .flame-wing {
                  animation: pulse 0.08s ease-in-out infinite alternate-reverse;
                }
                .ship {
                  animation: hover 2s ease-in-out infinite;
                }
              `}</style>
            </defs>
            <g className="ship">
              <g className="flame-main">
                <path d="M 20 60 Q 25 78 30 60 Q 25 64 20 60 Z" fill="#00E5FF" opacity="0.7" />
                <path d="M 22 60 Q 25 72 28 60 Q 25 62 22 60 Z" fill="#FFFFFF" />
              </g>
              <g className="flame-wing" style={{ transformOrigin: '5px 58px' }}>
                <path d="M 4 58 Q 5 68 6 58 Z" fill="#00E5FF" />
                <path d="M 4.5 58 Q 5 64 5.5 58 Z" fill="#FFFFFF" />
              </g>
              <g className="flame-wing" style={{ transformOrigin: '45px 58px' }}>
                <path d="M 44 58 Q 45 68 46 58 Z" fill="#00E5FF" />
                <path d="M 44.5 58 Q 45 64 45.5 58 Z" fill="#FFFFFF" />
              </g>
              <rect x="13" y="35" width="2" height="9" fill="#64748B" stroke="#1E293B" strokeWidth="0.75" rx="0.5" />
              <rect x="11" y="36" width="2" height="8" fill="#64748B" stroke="#1E293B" strokeWidth="0.75" rx="0.5" />
              <rect x="35" y="35" width="2" height="9" fill="#64748B" stroke="#1E293B" strokeWidth="0.75" rx="0.5" />
              <rect x="37" y="36" width="2" height="8" fill="#64748B" stroke="#1E293B" strokeWidth="0.75" rx="0.5" />
              <path d="M 20 35 L 9 46 L 9 52 L 19 49 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <path d="M 9 46 L 5 51 L 5 54 L 9 52 Z" fill="#0088FF" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <path d="M 19 32 L 16 39 L 19 40 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="0.5" />
              <path d="M 30 35 L 41 46 L 41 52 L 31 49 Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <path d="M 41 46 L 45 51 L 45 54 L 41 52 Z" fill="#0088FF" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <path d="M 31 32 L 34 39 L 31 40 Z" fill="#EF4444" stroke="#1E293B" strokeWidth="0.5" />
              <path d="M 5 44 C 4 48, 4 55, 5 58 C 6 55, 6 48, 5 44 Z" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1" />
              <path d="M 45 44 C 44 48, 44 55, 45 58 C 46 55, 46 48, 45 44 Z" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1" />
              <path d="M 19 55 L 31 55 L 30 60 L 20 60 Z" fill="#94A3B8" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <line x1="20" y1="57.5" x2="30" y2="57.5" stroke="#1E293B" strokeWidth="0.5" />
              <path d="M 25 6 C 29 15, 31 32, 31 54 L 19 54 C 19 32, 21 15, 25 6 Z" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <path d="M 25 6 C 27 15, 29 32, 29 54 L 21 54 C 21 32, 23 15, 25 6 Z" fill="#0088FF" stroke="#1E293B" strokeWidth="0.5" strokeLinejoin="round" />
              <path d="M 25 18 C 29 24, 29 35, 25 38 C 21 35, 21 24, 25 18 Z" fill="#00E5FF" stroke="#1E293B" strokeWidth="1" strokeLinejoin="round" />
              <path d="M 25 19 C 27 24, 27 33, 25 36 C 24 33, 24 24, 25 19 Z" fill="#FFFFFF" opacity="0.4" />
              <path d="M 25 34 L 26 56 L 25 59 L 24 56 Z" fill="#00E5FF" stroke="#1E293B" strokeWidth="0.75" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      </div>

    </div>
  );
};

export default GameCanvas;