import { NotFoundException, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Application } from "../types";

export class ApplicationFetch extends OpenAPIRoute {
	schema = {
		tags: ["Applications"],
		summary: "Get a single application by slug",
		request: {
			params: z.object({
				applicationSlug: z.string().describe("Application slug"),
			}),
		},
		responses: {
			"200": {
				description: "Returns a single application if found",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							Application: Application,
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		// Get validated data
		const data = await this.getValidatedData<typeof this.schema>();

		// Retrieve the validated slug
		const { applicationSlug } = data.params;

		// Implement your own object fetch here

		const exists = true;

		if (!exists) {
			throw new NotFoundException();
		}

		return {
			success: true,
			application: {
				name: "my application",
				slug: applicationSlug,
				description: "this needs to be done",
				completed: false,
				due_date: new Date().toISOString().slice(0, 10),
			},
		};
	}
}
