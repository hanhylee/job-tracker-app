import { app } from './app';
import { processAnalysisJob } from './queue/handler';
import type { CloudflareBindings, AnalysisQueueMessage } from './types';

export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<AnalysisQueueMessage>,
    env: CloudflareBindings,
  ): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processAnalysisJob(env, message.body);
        message.ack();
      } catch {
        message.retry();
      }
    }
  },
};
