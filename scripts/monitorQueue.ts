import { tagQueue } from '../jobs/tagQueue';

async function main() {
  try {
    // Get all jobs in different states
    const [waiting, active, completed, failed] = await Promise.all([
      tagQueue.getJobs(['waiting']),
      tagQueue.getJobs(['active']),
      tagQueue.getJobs(['completed']),
      tagQueue.getJobs(['failed'])
    ]);

    console.log('\nQueue Status:');
    console.log('-------------');
    console.log('Waiting jobs:', waiting.length);
    console.log('Active jobs:', active.length);
    console.log('Completed jobs:', completed.length);
    console.log('Failed jobs:', failed.length);

    // Show details of failed jobs if any
    if (failed.length > 0) {
      console.log('\nFailed Jobs:');
      for (const job of failed) {
        console.log(`Job ${job.id}:`, job.failedReason);
      }
    }

    // Show latest completed jobs
    if (completed.length > 0) {
      console.log('\nLatest Completed Jobs:');
      for (const job of completed.slice(-3)) {
        console.log(`Job ${job.id}:`, job.returnvalue);
      }
    }

  } finally {
    await tagQueue.disconnect();
  }
}

main().catch(console.error); 