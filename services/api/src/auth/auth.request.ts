import { type RequestWithId } from '../common/middleware/request-id.middleware';
import { type AuthenticatedUser } from './auth.types';

/**
 * Guard tekshiruvidan o'tgan so'rov.
 *
 * `cookies` Express tipida allaqachon mavjud (cookie-parser uni to'ldiradi),
 * shuning uchun bu yerda qayta e'lon qilinmaydi.
 */
export interface RequestWithUser extends RequestWithId {
  user?: AuthenticatedUser;
}
