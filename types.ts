export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionData {
  total: number;
  weeks: ContributionWeek[];
}

export interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  date: string;
  originalColor: string;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}