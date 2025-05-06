import amqplib, { Channel, ChannelModel } from 'amqplib';
// import { logger } from '../lib/logger'; // Commented out for now
import 'dotenv/config';
import { EXCHANGE } from '../lib/rabbitmqConfig';

// Simple logger fallback
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

let connection: ChannelModel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;

if (!RABBITMQ_URL) {
  throw new Error('RABBITMQ_URL environment variable is not set.');
}

// Simpler connection function (no retry)
async function connectRabbitMQ(): Promise<ChannelModel> {
  logger.info(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}...`);
  try {
    // Assert RABBITMQ_URL as string since we checked it's defined
    const conn = await amqplib.connect(RABBITMQ_URL as string);
    logger.info('RabbitMQ connected successfully.');

    conn.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error:', err);
      connection = null; // Reset connection on error
    });
    conn.on('close', () => {
      logger.warn('RabbitMQ connection closed.');
      connection = null; // Reset connection on close
    });
    return conn;
  } catch (err) {
    logger.error('Failed to establish RabbitMQ connection:', err);
    throw err; // Rethrow error
  }
}

// Get existing connection or establish a new one
export async function getRabbitMQConnection(): Promise<ChannelModel> {
  if (!connection) {
    connection = await connectRabbitMQ();
  }
  return connection;
}

// Creates and returns a NEW Channel from the connection
export async function createRabbitMQChannel(): Promise<Channel> {
  const conn = await getRabbitMQConnection(); // Gets ChannelModel
  try {
    logger.info('Attempting to create RabbitMQ channel...');
    const ch = await conn.createChannel(); // ChannelModel has createChannel()
    logger.info('RabbitMQ channel created successfully.');

    // Assert the exchange using centralized configuration
    await ch.assertExchange(EXCHANGE.NAME, EXCHANGE.TYPE, EXCHANGE.OPTIONS);
    logger.info(`Exchange '${EXCHANGE.NAME}' asserted.`);

    ch.on('error', (err: Error) => {
      logger.error('RabbitMQ channel error:', err);
      // Basic error logging for now
    });
    ch.on('close', () => {
      logger.warn('RabbitMQ channel closed.');
      // Basic close logging for now
    });

    return ch;
  } catch (err) {
    logger.error('Failed to create RabbitMQ channel:', err);
    throw err;
  }
}

// Closes the main connection
export async function closeRabbitMQ(): Promise<void> {
  if (connection) {
    try {
      logger.info('Closing RabbitMQ connection...');
      await connection.close(); // ChannelModel has close()
      connection = null;
      logger.info('RabbitMQ connection closed successfully.');
    } catch (err) {
      logger.error('Error closing RabbitMQ connection:', err);
    }
  } else {
    logger.info('RabbitMQ connection already closed or not initialized.');
  }
}

// Graceful shutdown handling (kept simple)
async function shutdown(signal: string): Promise<void> {
  logger.warn(`${signal} received. Shutting down RabbitMQ client...`);
  await closeRabbitMQ();
  // process.exit(0); // Let the main application control exit
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
