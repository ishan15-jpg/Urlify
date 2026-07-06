import { TokenPayload } from '../shared/utils/token.util';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
