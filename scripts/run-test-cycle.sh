#!/bin/bash

echo "--- Stopping existing consumers (if any)... ---"
# Use || true to ignore errors if no process is found
pkill -f 'tsx jobs/startConsumers.ts' || true
sleep 1 # Give time for process to terminate

echo "--- Resetting Neo4j graph database... ---"
pnpm sim:graph:reset
if [ $? -ne 0 ]; then echo "Graph reset failed!"; exit 1; fi

echo "--- Starting consumers in background... ---"
# Start consumers, redirect output to consumers.log, get PID
pnpm start:consumers > consumers.log 2>&1 &
CONSUMER_PID=$!
echo "Consumers started with PID: $CONSUMER_PID. Output redirected to consumers.log"
# Give consumers a moment to initialize (adjust sleep if needed)
sleep 4

echo "--- Running publisher... ---"
pnpm sim:publish
if [ $? -ne 0 ]; then 
  echo "Publisher failed!"
  kill $CONSUMER_PID # Attempt to kill consumers if publisher fails
  exit 1
fi

echo "--- Publisher finished. Waiting a bit for consumers to process... ---"
# Adjust sleep time as needed based on expected processing time
sleep 5 

echo "--- Stopping consumers (PID: $CONSUMER_PID)... ---"
# Send SIGTERM first, then SIGKILL if it doesn't stop
kill $CONSUMER_PID || true 
sleep 1
kill -0 $CONSUMER_PID 2>/dev/null && kill -9 $CONSUMER_PID || true

echo "--- Test cycle finished. Check consumers.log for output. ---"
exit 0 