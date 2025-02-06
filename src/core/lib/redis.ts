import { Redis } from "@upstash/redis";

export const RedisClient = new Redis({
  url: process.env.REDIS_ENDPOINT,
  token: process.env.REDIS_TOKEN,
});
