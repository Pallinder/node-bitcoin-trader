var _ = require('lodash');
var Promise = require('bluebird');
var Client = require('bitstamp');    

module.exports = function(conf, trader){
    _.extend(this, conf);
    var self = this;

    var initDeferred = Promise.defer();
    this.initialized = initDeferred.promise;

    this.client = new Client(this.key, this.secret, this.customer_id);

    // var commands = ['transactions', 'ticker', 'order_book', 'bitinstant', 'eur_usd',
    //                 'balance', 'user_transactions', 'open_orders', 'cancel_order', 'buy',
    //                 'sell', 'withdrawal_requests', 'bitcoin_withdrawal', 'bitcoin_deposit_address',
    //                 'unconfirmed_btc', 'ripple_withdrawal', 'ripple_address'
    // ];

    var commands = ['transactions', 'ticker', 'order_book', 'bitinstant', 'eur_usd',
                    'balance', 'user_transactions', 'open_orders', 'cancel_order', 'buy',
                    'sell'];


    commands.forEach(function(command){
        self.client[command] = Promise.promisify(self.client[command]);
    })

    this.getSpread = function(currency){ // only USD ATM.
        return self.client.order_book('btcusd').then(function(data){
            _.extend(data, {exchange: 'bitstamp', currency: currency});
            trader.emit('spread_data', data);
            return data;
        });

    };

    function balanceMapper(data){
        return {
            'BTC' : parseFloat(data.btc_available),
            'USD' : parseFloat(data.usd_available)
        };
    }
    this.watch = function(currency, eventEmitter){
        var Pusher = require('pusher-client');
        var socket = new Pusher('de504dc5763aeef9ff52');
        var channel = socket.subscribe('order_book');
        channel.bind('data', function(data) {
            _.extend(data, {exchange: 'bitstamp', currency: 'USD'});
            eventEmitter.emit('spread_data', data);
            // storeAndProcessData(data, 'bitstamp');
            // console.log('bitstamp_data');
            // detectArbitrageForExchange('bitstamp');
        });
    }
    this.getBalance = function(){
        return self.client.balance().then(function(data) {
            self.fee = data.fee / 100 || self.fee;
            data = balanceMapper(data);
            self.balance = data;
            return data;
        });
    }
    this.getBalance().then(function(){
        initDeferred.resolve();
    });

}
