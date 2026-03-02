import { ContributionData, ContributionWeek, ContributionDay } from '../types';
import { eachDayOfInterval, startOfYear, endOfYear, formatISO, subWeeks, getDay } from 'date-fns';

const API_BASE = 'https://github-contributions-api.jogruber.de/v4';
const FETCH_TIMEOUT_MS = 10000; // Abort if API doesn't respond within 10 seconds

export async function fetchContributions(username: string): Promise<ContributionData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/${username}?y=last`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('User not found');
    }

    const json = await response.json();
    
    const flatContributions = json.contributions || [];
    
    const weeks: ContributionWeek[] = [];
    let currentWeek: ContributionDay[] = [];
    
    flatContributions.forEach((item: any) => {
       const day: ContributionDay = {
         date: item.date,
         count: item.count,
         level: item.level
       };
       
       currentWeek.push(day);
       
       if (currentWeek.length === 7) {
         weeks.push({ days: currentWeek });
         currentWeek = [];
       }
    });
    
    if (currentWeek.length > 0) {
      weeks.push({ days: currentWeek });
    }

    return {
      total: json.total?.lastYear || 0,
      weeks: weeks
    };

  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Failed to fetch, falling back to mock data", error);
    return generateMockData();
  }
}

export function generateMockData(): ContributionData {
  const now = new Date();
  const days = eachDayOfInterval({
    start: subWeeks(startOfYear(now), 1),
    end: endOfYear(now),
  });

  const weeks: ContributionWeek[] = [];
  let currentWeek: ContributionDay[] = [];

  const firstDay = days[0];
  const offset = getDay(firstDay);
  
  for(let i=0; i<offset; i++) {
     currentWeek.push({ date: '', count: 0, level: 0 });
  }

  days.forEach((date) => {
    const maxCount = 20;
    const maxLevel = 4;
    
    const c = Math.round(Math.random() * maxCount - Math.random() * (0.6 * maxCount));
    const count = Math.max(0, c);
    const level = Math.ceil((count / maxCount) * maxLevel) as 0|1|2|3|4;

    currentWeek.push({
      date: formatISO(date, { representation: 'date' }),
      count,
      level,
    });

    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }
  });

  return {
    total: 1234,
    weeks: weeks.slice(-53) 
  };
}