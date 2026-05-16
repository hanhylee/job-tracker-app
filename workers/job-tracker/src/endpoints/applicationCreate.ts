import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, Application } from "../types";

export class ApplicationCreate extends OpenAPIRoute {
	schema = {
		tags: ["Applications"],
		summary: "Create a new application",
		request: {
			body: {
				content: {
					"application/json": {
						schema: Application,
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Returns the created application",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							application: Application,
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		// Get validated data
		const data = await this.getValidatedData<typeof this.schema>();

		// Retrieve the validated request body
		const applicationToCreate = data.body;

		// Implement your own object insertion here

		// return the new application
		return c.json(
			{
				success: true,
				application: {
					name: applicationToCreate.name,
					slug: applicationToCreate.slug,
					description: applicationToCreate.description,
					completed: applicationToCreate.completed,
					due_date: applicationToCreate.due_date,
				},
			},
			201,
		);
	}
}
