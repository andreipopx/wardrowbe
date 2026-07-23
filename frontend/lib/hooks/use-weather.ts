'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api, setAccessToken } from '@/lib/api';

function useSetTokenIfAvailable() {
  const { data: session } = useSession();
  if (session?.accessToken) {
    setAccessToken(session.accessToken as string);
  }
}

export interface Weather {
  temperature: number;
  feels_like: number;
  humidity: number;
  precipitation_chance: number;
  precipitation_mm: number;
  wind_speed: number;
  condition: string;
  condition_code: number;
  /** Localized human label derived from condition_code. Prefer over `condition` for display. */
  condition_label?: string | null;
  is_day: boolean;
  uv_index: number;
  timestamp: string;
}

export function useWeather() {
  const { status } = useSession();
  useSetTokenIfAvailable();

  return useQuery({
    queryKey: ['weather'],
    queryFn: () => api.get<Weather>('/weather/current'),
    enabled: status !== 'loading',
    staleTime: 1000 * 60 * 15, // 15 minutes - weather doesn't change that fast
    retry: false, // Don't retry if location not set
    // Missing location or upstream weather outage is displayed in-place by WeatherCard.
    meta: { silent404: true, silentStatuses: [400, 422, 502, 503] },
  });
}
