import * as authSchema from './auth-schema';
import * as appSchema from './application-schema';
import * as r2UsageSchema from './r2-usage-schema';

export const schema = { ...authSchema, ...appSchema, ...r2UsageSchema };
export { authSchema, appSchema, r2UsageSchema };
