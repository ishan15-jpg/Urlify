import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { linksService } from '../linksModule';
import type { ShortenUrlResponseData } from '../../../types';

export const useShortenUrl = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortenedUrl, setShortenedUrl] = useState<ShortenUrlResponseData | null>(null);

  const shorten = async (originalUrl: string, expirationMode: string, customDays: string) => {
    setIsLoading(true);
    setError(null);
    setShortenedUrl(null);
    try {
      const result = await linksService.shortenUrl(originalUrl, expirationMode, customDays);
      setShortenedUrl(result);
      // Invalidate the links query to update the cache
      queryClient.invalidateQueries({ queryKey: ['links'] });
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred while shortening the URL.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { shorten, isLoading, error, shortenedUrl, setShortenedUrl, setError };
};
