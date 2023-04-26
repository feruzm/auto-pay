const dhive = require('@hiveio/dhive')
const es = require("event-stream");
const util = require("util");

const client = new dhive.Client(['https://rpc.ecency.com','https://api.hive.blog','https://api.deathwing.me'])

//const stream = client.blockchain.getOperationsStream({mode: dhive.BlockchainMode.Latest})
const stream = client.blockchain.getBlockStream();
// bot is configured with enviroment variables

// the username of the bot
const PAYER = process.env['PAYER'] || 'ecency'
// the active key of the bot
const ACTIVEKEY = process.env['ACTIVEKEY'] || die('ACTIVEKEY missing')
// amount
const DAMOUNT = process.env['DAMOUNT'] ? parseFloat(process.env['DAMOUNT']) : parseFloat('5.498 HBD')

const pkey = dhive.PrivateKey.fromString(ACTIVEKEY);

stream
  .pipe(
    es.map(function(block, callback) {
      const tx = block.transactions;
      const head_blocknum = tx[0].block_num;
      let ops = [];
      // need this to get virtual ops, otherwise stream block already has ops
      client.database.call('get_ops_in_block', [head_blocknum, true]).then(function(opp){
        //console.log('operations', opp);
        for (let i = 0; i < opp.length; i++) {
          const eop = opp[i].op;
          if (eop[0] === 'proposal_pay') {
            if (eop[1].receiver === PAYER) {
              const _op = [
                'transfer_to_savings',
                {
                  from: PAYER,
                  to: "feruz",
                  amount: `${DAMOUNT} HBD`,
                  memo: ""
                },
              ];
              ops.push(_op)
            }
          }  
        }
      });
      if (ops.length) {
        client.broadcast.sendOperations(ops, pkey).then(
          function(result) {
            if (result && result.tx) {
              console.log('transfer sent')
            }
          },
          function(error) {
            console.log(`error happened with transaction`, error)
          }
        );
      }
    })
  )
  .pipe(process.stdout);

function die(msg) { process.stderr.write(msg+'\n'); process.exit(1) }
