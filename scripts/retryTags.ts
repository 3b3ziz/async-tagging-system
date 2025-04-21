import { db } from '../db/client';
import { tagQueue } from '../jobs/tagQueue';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!)
);

async function main() {
  try {
    // 1. Get failed jobs
    const failedJobs = await tagQueue.getJobs(['failed']);
    console.log(`Found ${failedJobs.length} failed jobs`);

    if (failedJobs.length === 0) {
      console.log('No failed jobs to retry!');
      return;
    }

    // 2. Retry each failed job
    console.log('\nRetrying failed jobs...');
    for (const job of failedJobs) {
      await job.retry();
      console.log(`Retried job ${job.id} for post ${job.data.postId}`);
    }

    // 3. Show queue status
    const jobCounts = await tagQueue.getJobCounts();
    console.log('\nJob Queue Status:', jobCounts);

  } finally {
    await driver.close();
    await db.$client.end();
    await tagQueue.disconnect();
  }
}

main().catch(console.error); 