var List = require('term-list'),
    _ = require('underscore'),
    async = require('async'),
    consoler = require('consoler'),
    colors = require('colors'),
    moment = require('moment'),
    sdk = require('./sdk'),
    bitcoin = require('./bitcoin'),
    exec = require('child_process').exec;

var wash = function(k, v) {
    if (k == 'btcchina') {
        return {
            stat: v.ticker && v.ticker.last ? 'ok' : 'error',
            last: v.ticker ? '¥ ' + v.ticker.last : 'data error'
        };
    } else if (k == 'bitstamp') {
        return {
            stat: v.last ? 'ok' : 'error',
            last: '$ ' + v.last
        };
    } else if (k == 'mtgox') {
        return {
            stat: v.data && v.data.last ? 'ok' : 'error',
            last: '$ ' + v.data.last.value
        };
    } else if (k == 'fxbtc') {
        return {
            stat: v.result ? 'ok' : 'error',
            last: '¥ ' + v.ticker.ask
        };
    } else if (k == 'okcoin') {
        return {
            stat: v.ticker ? 'ok' : 'error',
            last: '¥ ' + v.ticker.last
        };
    } else if (k == 'btctrade') {
        return {
            stat: v.last ? 'ok' : 'error',
            last: '¥ ' + v.last
        }
    } else if (k == 'chbtc') {
        return {
            stat: v.ticker ? 'ok' : 'error',
            last: '¥ ' + v.ticker.last
        }
    } else if (k == 'futures796') {
        return {
            stat: v.ticker ? 'ok' : 'error',
            last: '$ ' + v.ticker.last
        }
    } else if (k == 'btc100') {
        return {
            stat: v.ticker ? 'ok' : 'error',
            last: '¥ ' + v.ticker.last
        }
    } else if (k == 'btce') {
        return {
            stat: v.ticker && v.ticker.last ? 'ok' : 'error',
            last: '$ ' + v.ticker.last
        }
    }
    return v;
};

var label = function(key, data) {
    var str = ' ';
    if (data.last) {
        if (data.stat == 'ok') {
            str += colors.green(data.last) + ' '
        } else {
            str += colors.red('request fail') + ' '
        }
    }
    str += colors.grey(moment().format('HH:mm'));
    return str;
}

var price = function(menu, item, index, autorefresh) {
    bitcoin.price(autorefresh ? false : item.name, function(err, result) {
        if (!err) {
            var data = wash(item.name, autorefresh ? result[item.name][0] : result), l;
            if (data) {
                l = label(item.name, data);
            } else {
                l = colors.red(' request fail');
            }
            menu._update(index, l);
        } else {
            menu._update(index, colors.red(' request fail'));
        }
    });
}

var update = function(menu, within) {
    _.each(menu.exchangers, function(item, index) {
        within(item, index);
        price(menu, item, index);
    });
}

var repeat = function(length, s) {
    var f = s;
    for (var i = length - 1; i >= 0; i--) {
        f += s;
    };
    return f;
}

var align = function(s, max) {
    if (s && s.length < max) s += repeat(max - s.length, ' ');
    return s;
}

var init = function(menu) {
    update(menu, function(item) {
        menu.add(item.url, align(item.name, 13) + colors.yellow(' loading...'));
    });
    menu.start();
}

module.exports = function() {
    var menu = new List({
        maker: '\033[36m› \033[0m',
        markerLength: 2
    });
    menu._update = function(index, label) {
        var exchanger = this.exchangers[index];
        var prefix = exchanger.autorefresh ? '[a]' : '';
        this.at(index).label = align(prefix + exchanger.name, 13) + label;
        this.draw();
    };
    menu.exchangers = bitcoin.exchangers(sdk);
    menu.on('keypress', function(key, item) {
        if (key.name == 'return') {
            // Clear all autorefreshes
            _.each(menu.exchangers, function(item, index) {
                item.autorefresh = false;
                if (item.refreshInterval) {
                    clearInterval(item.refreshInterval);
                    delete item.refreshInterval;
                }
            });

            update(menu, function(item, index) {
                menu._update(index, colors.yellow('updating...'))
            });
        } else if (key.name == 'g') {
            exec('open ' + item);
        } else if (key.name == 'a') {
            _.each(menu.items, function(item, index) {
                if (item.id === menu.selected) {
                    var exchanger = menu.exchangers[index];
                    var refresh = function() {
                        menu._update(index, colors.yellow('updating...'))
                        price(menu, exchanger, index, true);
                    }

                    refresh();
                    if (exchanger.autorefresh) {
                        clearInterval(exchanger.refreshInterval);
                        delete exchanger.refreshInterval;
                    } else {
                        exchanger.refreshInterval = setInterval(refresh, 10000);
                    }
                    exchanger.autorefresh = !exchanger.autorefresh;
                }
            });
            menu.draw();
        }
    });
    menu.on('empty', function() {
        menu.stop();
    });
    init(menu);
}
