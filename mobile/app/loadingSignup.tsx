import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/api';
import { FullScreenLoading } from '../components/FullScreenLoading';

export default function LoadingSignupScreen() {
  const router = useRouter();
  const { payload } = useLocalSearchParams<{ payload?: string | string[] }>();

  const normalizePayload = (
    value: string | string[] | undefined
  ): string | null => {
    if (!value) return null;
    if (Array.isArray(value)) return value[0];
    return value;
  };

  useEffect(() => {
    const run = async () => {
      try {
        const raw = normalizePayload(payload);
        if (!raw) {
          console.warn('No signup payload found');
          router.replace('/signup');
          return;
        }

        const parsed = JSON.parse(raw);

        const res = await api('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(parsed),
        });
  
        const data = await res.json().catch(() => null);

        if (data?.token) {
          await SecureStore.setItemAsync('authToken', data.token);
        }
  
        router.replace('/home');
      } catch (err) {
        console.error('Signup failed', err);
        router.replace('/signup');
      }
    };
  
    run();
  }, [payload, router]);

  return <FullScreenLoading label="Creating your account..." />;
}
