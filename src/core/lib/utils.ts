import { init } from "@paralleldrive/cuid2";

export function generateRandomString(length = 32) {
  const createId = init({ length });
  return createId();
}
