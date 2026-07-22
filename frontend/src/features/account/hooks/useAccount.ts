import { useQuery } from '@tanstack/react-query';
import { accountService } from '../accountModule';
import { useAuthentication } from '../../../store/AuthenticationContext';

export const useAccount = () => {
  const { isAuthenticated } = useAuthentication();

  return useQuery({
    queryKey: ['account'],
    queryFn: () => accountService.getProfile(),
    enabled: isAuthenticated, // Only fetch if the user is authenticated
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
