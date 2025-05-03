import * as amqp from 'amqplib';
import { Channel, ChannelModel } from 'amqplib';
import 'dotenv/config';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;

if (!RABBITMQ_URL) {
  throw new Error('RABBITMQ_URL environment variable is not set.');
}

async function establishConnection(): Promise<ChannelModel> {
  if (connection) return connection;

  console.log(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}...`);
  try {
    const newConnection = await amqp.connect(RABBITMQ_URL as string);
    console.log('RabbitMQ connected successfully.');

    newConnection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
    });

    newConnection.on('close', () => {
      console.log('RabbitMQ connection closed.');
      connection = null;
      channel = null;
    });

    connection = newConnection;
    return connection;
  } catch (error) {
    console.error('Failed to establish RabbitMQ connection:', error);
    throw error;
  }
}

async function establishChannel(): Promise<Channel> {
  if (channel) return channel;

  const currentConnection = await establishConnection();
  console.log('Attempting to create RabbitMQ channel...');
  
  try {
    const newChannel = await currentConnection.createChannel();
    console.log('RabbitMQ channel created successfully.');

    newChannel.on('error', (err: Error) => {
      console.error('RabbitMQ channel error:', err.message);
      channel = null;
    });

    newChannel.on('close', () => {
      console.log('RabbitMQ channel closed.');
      channel = null;
    });

    channel = newChannel;

    const exchangeName = 'app_events';
    await newChannel.assertExchange(exchangeName, 'topic', { durable: true });
    console.log(`Exchange '${exchangeName}' asserted.`);

    return newChannel;
  } catch (error) {
    console.error('Failed to create RabbitMQ channel:', error);
    throw error;
  }
}

export async function getRabbitMQChannel(): Promise<Channel> {
  return await establishChannel();
}

export async function closeRabbitMQ(): Promise<void> {
  console.log('Closing RabbitMQ resources...');
  if (channel) {
    try {
      await channel.close();
      console.log('RabbitMQ channel closed successfully.');
    } catch (err) {
      console.error('Error closing RabbitMQ channel:', err);
    } finally {
      channel = null;
    }
  }

  if (connection) {
    try {
      await connection.close();
      console.log('RabbitMQ connection closed successfully.');
    } catch (err) {
      console.error('Error closing RabbitMQ connection:', err);
    } finally {
      connection = null;
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Shutting down gracefully...`);
  await closeRabbitMQ();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
