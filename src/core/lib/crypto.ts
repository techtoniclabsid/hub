import * as crypto from "crypto-js";

export function decrypt(data: string) {
  return crypto.AES.decrypt(data, process.env.HUB_SECRET as string).toString(
    crypto.enc.Utf8
  );
}

export function encrypt(data: string) {
  return crypto.AES.encrypt(data, process.env.HUB_SECRET as string).toString();
}
