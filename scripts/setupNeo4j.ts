import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!)
);

async function main() {
  const session = driver.session();

  // Create uniqueness constraints
  await session.run(`
    CREATE CONSTRAINT post_id IF NOT EXISTS 
    FOR (p:Post) REQUIRE p.id IS UNIQUE
  `);

  await session.run(`
    CREATE CONSTRAINT tag_name IF NOT EXISTS 
    FOR (t:Tag) REQUIRE t.name IS UNIQUE
  `);

  console.log('Neo4j constraints created successfully');
  
  await session.close();
  await driver.close();
}

main().catch(console.error); 