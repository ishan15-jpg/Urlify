import { useQuery } from '@tanstack/react-query';
import { linksService } from '../linksModule';
import { useAuthentication } from '../../../store/AuthenticationContext';

export const useLinks = (page: number = 1, limit: number = 20) => {
  const { isAuthenticated } = useAuthentication();

  return useQuery({
    queryKey: ['links', page, limit],
    queryFn: () => linksService.getLinks(page, limit),
    enabled: isAuthenticated, // Only fetch if the user is authenticated
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
