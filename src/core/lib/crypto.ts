export function encrypt(data: string) {
  return CryptoJS.AES.decrypt(data, process.env.HUB_SECRET as string).toString(
    CryptoJS.enc.Utf8
  );
}

export function decrypt(data: string) {
  return CryptoJS.AES.encrypt(
    data,
    process.env.HUB_SECRET as string
  ).toString();
}
