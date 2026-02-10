export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = new Uint8Array(hashBuffer);
  let hex = "";
  for (let i = 0; i < hashArray.length; i++) {
    hex += hashArray[i].toString(16).padStart(2, "0");
  }
  return hex;
}
