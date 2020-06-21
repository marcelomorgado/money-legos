const dotenv = require("dotenv");
dotenv.config();

const { ethers } = require("ethers");
const Ganache = require("ganache-core");
const NodeEnvironment = require("jest-environment-node");

const startChain = async () => {
  const { PRIV_KEY, MAINNET_NODE_URL } = process.env;

  if (!PRIV_KEY || !MAINNET_NODE_URL) {
    throw Error("PRIV_KEY and MAINNET_NODE_URL not found in .env");
  }

  let provider;

  // Note: Don't fork if using MoonNet node.
  // See more: https://github.com/studydefi/money-legos/issues/58
  if (MAINNET_NODE_URL.match(/node.moonnet/)) {
    provider = new ethers.providers.JsonRpcProvider(MAINNET_NODE_URL);
  } else {
    const ganache = Ganache.provider({
      fork: MAINNET_NODE_URL,
      network_id: 1,
      accounts: [
        {
          secretKey: PRIV_KEY,
          balance: ethers.utils.hexlify(ethers.utils.parseEther("1000")),
        },
      ],
    });
    provider = new ethers.providers.Web3Provider(ganache);
  }
  const wallet = new ethers.Wallet(PRIV_KEY, provider);

  return { wallet, provider };
};

class CustomEnvironment extends NodeEnvironment {
  testPath;
  docblockPragmas;

  // Our own vars
  wallet;
  provider;

  constructor(config, context) {
    super(config);
    this.testPath = context.testPath;
    this.docblockPragmas = context.docblockPragmas;
  }

  async setup() {
    await super.setup();
    const { wallet, provider } = await startChain();
    this.wallet = wallet;
    this.provider = provider;
    this.global.wallet = wallet;
    this.global.provider = provider;
    // await this.provider.send("evm_snapshot", []);
  }

  async teardown() {
    await super.teardown();
    // await this.provider.send("evm_revert", ["0x1"]);
  }

  //@ts-ignore
  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = CustomEnvironment;
