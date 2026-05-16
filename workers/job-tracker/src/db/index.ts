import * as authSchema from './auth-schema';
import * as appSchema from './application-schema';

export const schema = { ...authSchema, ...appSchema };
export { authSchema, appSchema };
