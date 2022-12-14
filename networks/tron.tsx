import BaseNetwork, {
  Amount,
  Synth,
  TXState,
  WalletPrimaryData,
} from "@/networks/base_old";
import { ReactNode, useEffect, useState } from "react";
import { BigNumber, utils } from "ethers";
import React from "react";
import { Button } from "rsuite";
import {
  triggerSmartContract,
  sign,
  sendRawTransaction,
  // MAX_UINT256,
} from "./utils/tron-utils";
// import TronWeb from "tronweb";


const AbiCoder = utils.AbiCoder;
const ADDRESS_PREFIX_REGEX = /^(41)/;
const ADDRESS_PREFIX = "41";

declare global {
  interface Window {
    tronWeb?: TronWeb;
  }
}

const SynergyAddress: string = "0x2f6F4493bb82f00Ed346De9353EF22cA277b7680";
const SynergyTRONAddress: string = "TQkDaoJsFuYpj8ZZvhaWdSrPTWUNc2ByQ1";

const AvailableSynth: Synth[] = [
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    full_name: "Gold",
    symbol: "GOLD",
    trading_view_symbol: "GOLD",
  },
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    full_name: "Silver",
    symbol: "SILVER",
    trading_view_symbol: "SILVER",
  },
];

class TronNetwork extends BaseNetwork {
  wethApproveState: TXState = TXState.Done;
  mintState: TXState = TXState.Done;

  showedTxs: string[] = [];

  connectButton(): ReactNode {
    return (
      <Button
        style={{ backgroundColor: "linear-gradient(transparent, #089a81)" }}
        appearance="primary"
        onClick={this.getTronweb}
      >
        Connect Wallet
      </Button>
    );
  }

  getTronweb() {
    var obj = setInterval(async () => {
      if (window.tronWeb && !window.tronWeb.defaultAddress.base58) {
        clearInterval(obj);
        alert("TronLink extension is installed but user is not logged it");
      }

    //   if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
    //     clearInterval(obj);
    //     const tronAddress = window.tronWeb.defaultAddress.base58;

    //     window.localStorage.setItem("tronAddress", tronAddress);
    //     alert(`set localStorage item tron_address: ${tronAddress}`);
    //   }
    }, 10);
  }

  showWallet(): WalletPrimaryData | null {
    const [wallet, setWalet] = useState(null);

    useEffect(() => {
      var obj = setInterval(async () => {
        const tronWeb = window.tronWeb;

        if (tronWeb && tronWeb.defaultAddress.base58 && tronWeb.ready) {
          let defaultAccount = tronWeb.defaultAddress.base58;
          tronWeb.trx.getBalance(defaultAccount).then((data: any) => {
            const wallet: any = {
              address: defaultAccount,
              network_currency_symbol: "TRX",
              network_currency_amount: data,
            };

            setWalet(wallet);
          });

          clearInterval(obj);
        }
      }, 10);
    });
    return wallet;
  }

  async decodeParams(types: any, output: any, ignoreMethodHash: any) {
    if (!output || typeof output === "boolean") {
      ignoreMethodHash = output;
      output = types;
    }

    if (ignoreMethodHash && output.replace(/^0x/, "").length % 64 === 8)
      output = "0x" + output.replace(/^0x/, "").substring(8);

    const abiCoder = new AbiCoder();

    if (output.replace(/^0x/, "").length % 64)
      throw new Error(
        "The encoded string is not valid. Its length must be a multiple of 64."
      );
    return abiCoder.decode(types, output).reduce((obj, arg, index) => {
      if (types[index] == "address")
        arg = ADDRESS_PREFIX + arg.substr(2).toLowerCase();
      obj.push(arg);
      return obj;
    }, []);
  }

  getRusdBalance(): Amount | undefined {
    const [amount, setAmount] = useState(undefined);

    // if (typeof window === "undefined") return undefined;
    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );

          console.log(window.tronWeb.defaultAddress.base58);

        const rUsdTransaction =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "rUsd()",
            {},
            [],
            HexUserAddress
          );
        const rUsdTransactionResult = rUsdTransaction["constant_result"][0];
        const rUsdTransactionResultDecoded = await this.decodeParams(
          ["address"],
          "0x" + rUsdTransactionResult,
          false
        );
        const balanceOfTransaction =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            rUsdTransactionResultDecoded[0],
            "balanceOf(address)",
            {},
            [
              {
                type: "address",
                value: HexUserAddress,
              },
            ],
            HexUserAddress
          );

        const balanceOfTransactionResult =
          balanceOfTransaction["constant_result"][0];
        const balanceOfTransactionResultDecoded = await this.decodeParams(
          ["uint256"],
          "0x" + balanceOfTransactionResult,
          false
        );
        const amount: any = new Amount(
          balanceOfTransactionResultDecoded[0],
          18
        );
        setAmount(amount);
      };
      getAmount();
    }, []);
    return amount;
  }

  getRawBalance(): Amount | undefined {
    const [amount, setAmount] = useState(undefined);
    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
            window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
            window.tronWeb.defaultAddress.base58
        );

        console.log(HexUserAddress);

        const rawTransaction =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "raw()",
            {},
            [],
            HexUserAddress
          );
        const rawTransactionResult = rawTransaction["constant_result"][0];
        const rawTransactionResultDecoded = await this.decodeParams(
          ["address"],
          "0x" + rawTransactionResult,
          false
        );
        const balanceOfTransaction =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            rawTransactionResultDecoded[0],
            "balanceOf(address)",
            {},
            [
              {
                type: "address",
                value: HexUserAddress,
              },
            ],
            HexUserAddress
          );
        const balanceOfTransactionResult =
          balanceOfTransaction["constant_result"][0];
        const balanceOfTransactionResultDecoded = await this.decodeParams(
          ["uint256"],
          "0x" + balanceOfTransactionResult,
          false
        );
        const amount: any = new Amount(
          balanceOfTransactionResultDecoded[0],
          18
        );
        setAmount(amount);
      };
      getAmount();
    }, []);
    return amount;
  }

  getRawPrice(): Amount | undefined {
    const [amount, setAmount] = useState(undefined);
    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );
        const oracleContractAddressCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "oracle()",
            {},
            [],
            HexUserAddress
          );
        const oracleContractAddress =
          oracleContractAddressCall["constant_result"][0];

        const oracleContractAddressDecoded = await this.decodeParams(
          ["address"],
          "0x" + oracleContractAddress,
          false
        );

        const rawContractAddressCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "raw()",
            {},
            [],
            HexUserAddress
          );

        const rawContractAddress = rawContractAddressCall["constant_result"][0];

        const rawContractAddressDecoded = await this.decodeParams(
          ["address"],
          "0x" + rawContractAddress,
          false
        );

        const rawPriceCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            oracleContractAddressDecoded[0],
            "getPrice(address)",
            {},
            [
              {
                type: "address",
                value: rawContractAddressDecoded[0],
              },
            ],
            HexUserAddress
          );

        const rawPrice = rawPriceCall["constant_result"][0];
        const rawPriceDecoded = await this.decodeParams(
          ["uint256"],
          "0x" + rawPrice,
          false
        );

        const amount: any = new Amount(rawPriceDecoded[0], 18);
        setAmount(amount);
      };
      getAmount();
    }, []);
    return amount;
  }

  getWethPrice(): number | undefined {
    return undefined;
  }

  getWethBalance(): Amount | undefined {
    const [amount, setAmount] = useState(undefined);
    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );

        const wethContractAddressCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "wEth()",
            {},
            [],
            HexUserAddress
          );

        const wethContractAddress =
          wethContractAddressCall["constant_result"][0];

        const wethContractAddressDecoded = await this.decodeParams(
          ["address"],
          "0x" + wethContractAddress,
          false
        );

        const wethBalanceOfCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            wethContractAddressDecoded[0],
            "balanceOf(address)",
            {},
            [
              {
                type: "address",
                value: HexUserAddress,
              },
            ],
            HexUserAddress
          );

        const wethBalanceOf = wethBalanceOfCall["constant_result"][0];
        const wethBalanceOfDecoded = await this.decodeParams(
          ["uint256"],
          "0x" + wethBalanceOf,
          false
        );

        const amount: any = new Amount(wethBalanceOfDecoded[0], 18);
        setAmount(amount);
      };
      getAmount();
    }, []);
    return amount;
  }

  getWethAllowance(): Amount | undefined {
    const [amount, setAmount] = useState(undefined);

    useEffect(() => {
      const getAllowance = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );
        const wethContractAddressCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "wEth()",
            {},
            [],
            HexUserAddress
          );

        const wethContractAddress =
          wethContractAddressCall["constant_result"][0];

        const wethContractAddressDecoded = await this.decodeParams(
          ["address"],
          "0x" + wethContractAddress,
          false
        );

        const wethAllowanceCall =
          await window.tronWeb.transactionBuilder.triggerSmartContract(
            wethContractAddressDecoded[0],
            "allowance(address,address)",
            {},
            [
              {
                type: "address",
                value: HexUserAddress,
              },
              {
                type: "address",
                value: HexSynergyTRONAddress,
              },
            ],
            HexUserAddress
          );
        const wethAllowance = wethAllowanceCall["constant_result"][0];
        const wethAllowanceDecoded = await this.decodeParams(
          ["uint256"],
          "0x" + wethAllowance,
          false
        );

        const amount: any = new Amount(wethAllowanceDecoded[0], 18);
        setAmount(amount);
      };

      getAllowance();
    }, []);
    return amount;
  }

  getAvailableSynths(): Synth[] {
    return AvailableSynth;
  }

  getCurrentCRatio(): number | undefined {
    const [amount, setAmount] = useState();

    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );
        const synergyCollateralRatioCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "collateralRatio(address)",
            {},
            [
              {
                type: "address",
                value: HexUserAddress,
              },
            ],
            HexUserAddress
          );

        const synergyCollateralRatio =
          synergyCollateralRatioCall["constant_result"][0];

        const wethAllowanceDecoded = await this.decodeParams(
          ["uint32"],
          "0x" + synergyCollateralRatio,
          false
        );

        const amount: any = wethAllowanceDecoded[0] / 10 ** 6;
        setAmount(amount);
      };

      getAmount();
    }, []);

    return amount;
  }

  getMinCRatio(): number | undefined {
    const [amount, setAmount] = useState();

    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);
        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );
        const synergyMinCollateralRatioCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "minCollateralRatio()",
            {},
            [],
            HexUserAddress
          );

        const synergyMinCollateralRatio =
          synergyMinCollateralRatioCall["constant_result"][0];

        const synergyMinCollateralRatioDecoded = await this.decodeParams(
          ["uint32"],
          "0x" + synergyMinCollateralRatio,
          false
        );

        const amount: any =
          (synergyMinCollateralRatioDecoded[0] / 10 ** 8) * 100;
        setAmount(amount);
      };

      getAmount();
    }, []);

    return amount;
  }

  getNewWethAllowanceCallback(
    amount: Amount,
    tx_state_changes_callback: (state: TXState) => void
  ): void {
    if (typeof window === "undefined") return null;

    const getAmount = async () => {
      const HexSynergyTRONAddress =
        window.tronWeb.address.toHex(SynergyTRONAddress);
      const HexUserAddress = window.tronWeb.address.toHex(
        window.tronWeb.defaultAddress.base58
      );

      const wethContractAddressCall =
        await window.tronWeb.transactionBuilder.triggerConstantContract(
          HexSynergyTRONAddress,
          "wEth()",
          {},
          [],
          HexUserAddress
        );

      const wethContractAddress = wethContractAddressCall["constant_result"][0];
      const wethContractAddressDecoded = await this.decodeParams(
        ["address"],
        "0x" + wethContractAddress,
        false
      );

      const setWethAllowanceSign = await triggerSmartContract(
        wethContractAddressDecoded[0],
        "approve(address,uint256)",
        {},
        [
          {
            type: "address",
            value: "TQkDaoJsFuYpj8ZZvhaWdSrPTWUNc2ByQ1",
          },
          {
            type: "uint256",
            value: amount.amount,
          },
        ]
      );
      const signedTransaction = await sign(setWethAllowanceSign);
      const result = await sendRawTransaction(signedTransaction);
    };
    getAmount();
  }

  predictCollateralRatio(
    amountToMint: Amount,
    amountToPledge: Amount,
    increase: boolean
  ): number | undefined {
    const [amount, setAmount] = useState();
    useEffect(() => {
      const getAmount = async () => {
        const HexSynergyTRONAddress =
          window.tronWeb.address.toHex(SynergyTRONAddress);

        const HexUserAddress = window.tronWeb.address.toHex(
          window.tronWeb.defaultAddress.base58
        );

        const predictCollateralRatioCall =
          await window.tronWeb.transactionBuilder.triggerConstantContract(
            HexSynergyTRONAddress,
            "predictCollateralRatio(address,uint256,uint256,bool)",
            {},
            [
              {
                type: "address",
                value: HexUserAddress,
              },
              {
                type: "uint256",
                value: amountToMint.amount,
              },
              {
                type: "uint256",
                value: amountToPledge.amount,
              },
              {
                type: "bool",
                value: increase,
              },
            ],
            HexUserAddress
          );

        const predictCollateralRatio =
          predictCollateralRatioCall["constant_result"][0];

        const predictCollateralRatioDecoded = await this.decodeParams(
          ["uint32"],
          "0x" + predictCollateralRatio,
          false
        );

        let amount: any = new Amount(predictCollateralRatioDecoded[0], 6);
        amount = parseFloat(amount.toHumanString(2));
        //  parseFloat(cratioAmount.toHumanString(2));
        setAmount(amount);
      };

      getAmount();
    }, [amountToMint, amountToPledge]);

    return amount;
  }

  getMintCallback(
    amountToMint: Amount,
    amountToPledge: Amount,
    tx_state_changes_callback: (state: TXState) => void
  ): void {
    if (typeof window === "undefined") return null;

    const getAmount = async () => {
      const HexSynergyTRONAddress =
        window.tronWeb.address.toHex(SynergyTRONAddress);
      const HexUserAddress = window.tronWeb.address.toHex(
        window.tronWeb.defaultAddress.base58
      );

      const mintSign = await triggerSmartContract(
        HexSynergyTRONAddress,
        "mint(uint256,uint256)",
        {},
        [
          {
            type: "uint256",
            value: amountToMint.amount,
          },
          {
            type: "uint256",
            value: amountToPledge.amount,
          },
        ]
      );
      const signedTransaction = await sign(mintSign);
      const result = await sendRawTransaction(signedTransaction);
    };
    getAmount();
  }

  getBurnRusdCallback(amount: Amount): void {
    if (typeof window === "undefined") return null;

    const burn = async () => {
      const HexSynergyTRONAddress =
        window.tronWeb.address.toHex(SynergyTRONAddress);
      const HexUserAddress = window.tronWeb.address.toHex(
        window.tronWeb.defaultAddress.base58
      );
    };
    burn();
  }

  _defineStateChangesCallback(
    isWaiting: boolean,
    isLoading: boolean,
    currentState: TXState
  ): TXState {
    switch ([isWaiting, isLoading, currentState].toString()) {
      case [false, true, TXState.Done].toString():
        return TXState.AwaitWalletConfirmation;
      case [false, true, TXState.AwaitWalletConfirmation].toString():
        return TXState.AwaitWalletConfirmation;
      case [false, false, TXState.AwaitWalletConfirmation].toString():
        return TXState.Broadcasting;
      case [true, false, TXState.Success].toString():
        return TXState.Done;
      case [false, false, TXState.Done].toString():
        return TXState.Done;
      default:
        return currentState;
    }
  }
}

export default TronNetwork;
