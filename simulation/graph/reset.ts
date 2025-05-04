import { getNeo4jDriver, closeNeo4jDriver } from '../../lib/neo4j';
import 'dotenv/config';

async function resetGraphDatabase() {
    console.log('Attempting to reset Neo4j graph database...');
    let driver;

    try {
        // Get the driver instance (ensure environment variables are loaded)
        driver = getNeo4jDriver();

        console.log('Executing query: MATCH (n) DETACH DELETE n');
        const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
        try {
            await session.executeWrite(tx =>
                tx.run('MATCH (n) DETACH DELETE n')
            );
            console.log('Neo4j database cleared successfully.');
        } finally {
            await session.close();
            console.log('Neo4j session closed.');
        }

    } catch (error) {
        console.error('Error resetting Neo4j database:', error);
        process.exit(1); // Exit with error
    } finally {
        // Close the driver connection if it was initialized
        if (driver) {
            await closeNeo4jDriver(); 
        }
    }
}

resetGraphDatabase()
    .then(() => {
        console.log('Neo4j reset script finished.');
        process.exit(0); // Explicitly exit with success code
    })
    .catch(() => {
        // Error should have been logged already
        process.exit(1);
    }); 