# Cloudflare Workers OpenAPI 3.1

This is a Cloudflare Worker with OpenAPI 3.1 using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

This is an example project made to be used as a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

## Get started

1. Sign up for [Cloudflare Workers](https://workers.dev). The free tier is more than enough for most use cases.
2. Clone this project and install dependencies with `npm install`
3. Run `wrangler login` to login to your Cloudflare account in wrangler
4. Run `wrangler deploy` to publish the API to Cloudflare Workers

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. For more information read the [chanfana documentation](https://chanfana.pages.dev/) and [Hono documentation](https://hono.dev/docs).
4. D1 database schema is defined in `src/db/schema.ts`.

## Development

1. Run `wrangler dev` to start a local instance of the API.
2. Open `http://localhost:8787/` in your browser to see the Swagger interface where you can try the endpoints.
3. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.

## Authentication for Testing

1. Run:
```
Invoke-RestMethod -Uri "http://localhost:8787/api/auth/sign-in/magic-link" `                                
>>   -Method Post `                                                                           
>>   -Headers @{ "Content-Type" = "application/json" } `
>>   -Body '{"email": "test@gmail.com", "callbackURL": "http://localhost:8787/api/applications"}'
```

2. Fetch session cookies:
```
npx wrangler d1 execute db --remote --command "SELECT * FROM session ORDER BY created_at DESC;"
```

3. Copy paste token into "Authorize" field in OpenAPI at http://localhost:8787

## Data Migration

1. Generate the migration by running `npx drizzle-kit generate`.

    What happens: Drizzle will look at your schema, realize the users and applications tables don't exist yet, and generate a new .sql file inside a migrations/ folder. It will look something like 0000_clever_name.sql.

2. Apply the migration to D1 by running `npx wrangler d1 migrations apply db --remote`.
