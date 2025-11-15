import PocketBase from 'pocketbase';

// Create PocketBase client instance
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090');

// Disable auto cancellation
pb.autoCancellation(false);

export default pb;
