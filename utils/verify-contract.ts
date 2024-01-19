import { run } from 'hardhat';

export async function verifyContract(address: string, args?: any[]) {
  try {
    await run('verify:verify', {
      address,
      constructorArguments: args,
    });
  } catch (e) {
    console.error(e);
    if (
      e instanceof Error &&
      e.message.includes('Contract source code already verified')
    ) {
      console.log('Contract already verified');
    } else {
      throw e;
    }
  }
}
