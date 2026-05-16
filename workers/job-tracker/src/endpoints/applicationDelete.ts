import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Application } from "../types";

export class ApplicationDelete extends OpenAPIRoute {
	schema = {
		tags: ["Applications"],
		summary: "Delete an application",
		request: {
			params: z.object({
				applicationSlug: z.string().describe("Application slug"),
			}),
		},
		responses: {
			"200": {
				description: "Returns if the application was deleted successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							result: z.object({
								application: Application,
							}),
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

		// Implement your own object deletion here

		// Return the deleted application for confirmation
		return {
			result: {
				application: {
					name: "Build something awesome with Cloudflare Workers",
					slug: applicationSlug,
					description: "Lorem Ipsum",
					completed: true,
					due_date: "2022-12-24",
				},
			},
			success: true,
		};
	}
}
