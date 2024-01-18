import { createRequire } from 'module';
import * as anchor from "@project-serum/anchor";
const require = createRequire(import.meta.url);
const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const fs = require('fs');
const axios = require("axios");
const web3 = require('@solana/web3.js');

import fetch from "cross-fetch";
import { setMaxIdleHTTPParsers } from 'http';

dotenv.config()
const token = "6780323540:AAGbOQ0nwrcoFbq0WSieCwCXSnsveKxj1BU"
const bot = new TelegramBot(token, { polling: true })
const gifPath = './fox.png';
let chatId = '-1001995381972';
let nPrevSequenceNumber = 0;
let bBotStart = false;
let lastSignature = null;

const connection = new web3.Connection(
  "https://mainnet.helius-rpc.com/?api-key=fff6a34b-479e-49e7-9903-b04bddcdc463",
  'confirmed',
);

const VAULT_SEED = "VAULT_SEED";

// The public key of the account you're interested in
const programId = new web3.PublicKey('FgyMJpHWhHsgdeNPnoyuRLcgqxcRihadnP2vtCJga9mn');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const asyncGetPda = async (
  seeds,
  programId
) => {
  const [pubKey, bump] = await web3.PublicKey.findProgramAddress(seeds, programId);
  return [pubKey, bump];
};

const getVaultKey = async () => {
  const [vaultKey] = await asyncGetPda(
    [Buffer.from(VAULT_SEED)],
    programId
  );
  return vaultKey;
};



bot.onText(/\/berry/, (msg) => {
  chatId = msg.chat.id;
  console.log("received!", chatId);
});

let msgCount = 0;

async function getSolPrice() {
  try {
    // Make a request to the CoinGecko API to get the SOL price
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'solana',
        vs_currencies: 'usd', // You can change this to other fiat currencies
      },
    });

    // Extract the SOL price from the response
    const solPrice = response.data.solana.usd;

    console.log('Current SOL Price:', solPrice);
  } catch (error) {
    console.error('Error fetching SOL price:', error.message);
  }
}

const ExecuteFunction = async () => {

  if (chatId == '') {
    return;
  }

  const signatures = await connection.getConfirmedSignaturesForAddress2(
    programId,
    {
      until: lastSignature,
      limit: 3,
    },
    'confirmed',
  );

  let contractBalance;

  const vaultKey = await getVaultKey();
  contractBalance = await connection.getBalance(vaultKey)
  contractBalance = contractBalance / web3.LAMPORTS_PER_SOL;

  if (signatures) {
    const oldestToLatest = signatures.reverse();

    if (signatures.length == 0)
      return;

    try {
      lastSignature = oldestToLatest[oldestToLatest.length - 1].signature;
    } catch (e) {
      console.log("oldestToLatest[oldestToLatest.length - 1]", oldestToLatest);
    }

    console.log("lastSignature", lastSignature);


    for (let i = 0; i < oldestToLatest.length; i++) {
      const signature = oldestToLatest[i];
      let tx;

      try {
        tx = await connection.getParsedTransaction(signature.signature, {
          commitment: "confirmed",
        });
      } catch (e) {
        console.log("error", e);
      }

      let events;
      let solAmount = (tx.meta.preBalances[0] - tx.meta.postBalances[0]) / web3.LAMPORTS_PER_SOL;
      let idx = 0;

      try {
        events = tx.meta.logMessages;
      } catch (e) {
        console.log(e);
        console.log(tx);
        continue;
      }

      while (idx < events.length) {

        try {
          if (events[idx].indexOf("BuyOranges") != -1) {
          } else {
            idx++;
            continue;
          }

          let msg = "New deposit in Degen Miner!" +
            "\n\n";

          msg += "New Buy!" + "\n\n";

          const solPrice = await getSolPrice();

          msg += "\n\n" +
            "<b>Buy Amount:</b>" + " " + solAmount + " SOL / $" + solAmount * solPrice + "\n" +
            "<b>TVL Amount:</b>" + " " + contractBalance + " SOL / $"+ contractBalance * solPrice +"\n" +
            "\n\n" +
            "<a href=\"https://solscan.io/tx/" + signature.signature + "?cluster=devnet\">Tx</a>" + " | " + "<a href=\"https://degenminer.xyz\">DAPP</a>" + " | ";

          // console.log("msg", msg);

          bot.sendVideo(chatId, gifPath, {
            caption: msg,
            parse_mode: 'HTML'
          });

        } catch (e) {
          console.log("error", e);
        }

        await sleep(3000);
        // console.log("signature", signature);
        idx++;
      }

    }
  }
}

if (bot.isPolling()) {
  await bot.stopPolling();
}

var interval = setInterval(function () {
  try {
    ExecuteFunction();
  } catch (e) {
    console.log("error", e);
  }

}, 3000);

// ExecuteFunction();

await bot.startPolling();

