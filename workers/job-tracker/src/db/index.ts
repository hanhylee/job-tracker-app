import * as authSchema from './auth-schema';
import * as appSchema from './schema';

export const schema = { ...authSchema, ...appSchema };
export { authSchema, appSchema };
