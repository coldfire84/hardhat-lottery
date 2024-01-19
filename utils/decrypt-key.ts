import { Wallet } from 'ethers';
import * as fs from 'fs';
import 'dotenv/config';

export function decryptKey(): string | undefined {
  if (!fs.existsSync('./.encryptedKey.json')) {
    console.warn(
      "Warning, can't find ./.encryptedKey.json, unable to decrypt private key using supplied PRIVATE_KEY_PASSWORD",
    );
    return undefined;
  }
  if (!process.env.PRIVATE_KEY_PASSWORD) {
    throw new Error(
      'Required PRIVATE_KEY_PASSWORD environment variable not set',
    );
  }
  try {
    const encryptedJson = fs.readFileSync('./.encryptedKey.json', 'utf8');
    const wallet = Wallet.fromEncryptedJsonSync(
      encryptedJson,
      process.env.PRIVATE_KEY_PASSWORD,
    );
    console.log('Decrypted PRIVATE_KEY key from ./.encryptedKey.json');
    return wallet ? wallet.privateKey : undefined;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
