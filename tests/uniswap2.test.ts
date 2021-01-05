jest.setTimeout(100000);

import { Wallet, Contract, ethers } from "ethers";
import { fromWei } from "./utils";

// import legos
import erc20 from "../src/erc20";
import uniswap2 from "../src/uniswap2";

const { parseEther, formatUnits } = ethers.utils;

describe("uniswap2", () => {
  let wallet: Wallet;
  let dai: Contract;
  let route: Contract;

  beforeAll(async () => {
    ethers.errors.setLogLevel("error");

    // @ts-ignore
    wallet = global.wallet;
    dai = new ethers.Contract(erc20.dai.address, erc20.abi, wallet);
    route = new ethers.Contract(
      uniswap2.router02.address,
      uniswap2.router02.abi,
      wallet,
    );
  });

  test("swap ETH->DAI", async () => {
    // given
    const ethBefore = await wallet.getBalance();
    const daiBefore = await dai.balanceOf(wallet.address);

    const ethToSell = 5;
    const ethToSellInWei = parseEther(`${ethToSell}`);

    const [, expectedDai] = await route.getAmountsOut(ethToSellInWei, [
      erc20.weth.address,
      erc20.dai.address,
    ]);

    // when
    const amountOutMin = 1;
    const path = [erc20.weth.address, erc20.dai.address];
    const to = wallet.address;
    const deadline = 2525644800; // random timestamp in the future (year 2050)
    await route.swapExactETHForTokens(amountOutMin, path, to, deadline, {
      value: ethToSellInWei,
      gasLimit: 4000000,
    });

    // then
    const ethAfter = await wallet.getBalance();
    const daiAfter = await dai.balanceOf(wallet.address);

    const ethLost = parseFloat(fromWei(ethBefore.sub(ethAfter)));

    expect(fromWei(daiBefore)).toBe("0.0");
    expect(fromWei(daiAfter)).toBe(fromWei(expectedDai));
    expect(ethLost).toBeCloseTo(ethToSell);
  });

  test("swap DAI->ETH", async () => {
    // given
    const ethBefore = await wallet.getBalance();
    const daiBefore = await dai.balanceOf(wallet.address);

    const daiToSellInWei = daiBefore;

    const [, expectedEther] = await route.getAmountsOut(daiToSellInWei, [
      erc20.dai.address,
      erc20.weth.address,
    ]);

    // when
    await dai.approve(route.address, daiToSellInWei);

    const amountIn = daiToSellInWei;
    const amountOutMin = 1;
    const path = [erc20.dai.address, erc20.weth.address];
    const to = wallet.address;
    const deadline = 2525644800; // random timestamp in the future (year 2050)
    await route.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      to,
      deadline,
      {
        gasLimit: 4000000,
      },
    );

    // then
    const ethAfter = await wallet.getBalance();
    const daiAfter = await dai.balanceOf(wallet.address);

    const ethGain = parseFloat(fromWei(ethAfter.sub(ethBefore)));

    expect(parseFloat(fromWei(daiBefore))).toBeGreaterThan(0);
    expect(fromWei(daiAfter)).toBe("0.0");
    expect(ethGain).toBeCloseTo(parseFloat(fromWei(expectedEther)));
  });
});
