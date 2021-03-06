'use strict';

var node = require('../../app/models/node');
var link = require('../../app/models/link');
var Netmask = require('netmask').Netmask;
var util = require('util');
var Q = require('q');

var isNetworkRegistered = function(address, links) {
    for (var i in links) {
        var link = links[i];
        var network = new Netmask(link.network);
        if (network.contains(address)) {
            return true;
            //console.log(address);
        }
    }
    return false;
};

var getInterfaceInNetwork = function(node, network) {
    for (var i in node.interfaces) {
        var iface = node.interfaces[i];
        if (iface && iface.name && iface.name.search('bonding') === -1 && iface.address && (iface.address.search('172.') === 0 || iface.address.search('10.') === 0)) {
            var address = iface.address.split('/')[0];
            if (network.contains(address)) {
                return iface;
            }
        }
    }
};

var getInterfacesSameNetwork = function(n1, n2) {
    var ifaces = {};

    for (var i in n1.interfaces) {
        var iface = n1.interfaces[i];
	if (!iface.address) {
		continue;
	}
        if (iface && iface.name && iface.name.search('bonding') === -1 && iface.address && (iface.address.search('172.') === 0 || iface.address.search('10.') === 0)) {
            var network = new Netmask(iface.address);
            var iface2 = getInterfaceInNetwork(n2, network);

            if (iface2) {
                ifaces.network = network;
                ifaces.n1 = iface;
                ifaces.n2 = iface2;
            }
        }
    }

    return ifaces;
};

var getUnregisteredNetworks = function(interfaces, links) {
    var unregistered = [];

    for (var i in interfaces) {
        var iface = interfaces[i],
            address = iface.address;

        if (address && address.indexOf('172.') === 0) {
            if (!isNetworkRegistered(address, links)) {
                unregistered.push(address);
            }
        }
    }
    return unregistered;
};

var searchPairingNode = function(network, mainNode, nodes) {
    for (var i in nodes) {
        var node = nodes[i];
        var net = new Netmask(network);
        if (node.name === mainNode.name) {
            continue;
        }

        for (var j in node.interfaces) {
            var iface = node.interfaces[j];
            if (iface.address && iface.address.indexOf('172.') === 0 && net.contains(iface.address)) {
                return node;
            }
        }
    }
};

var searchForPair = function(pair, pairs) {
    for (var i=0; i<pairs.length; i++) {
        var p = pairs[i];
        if (p[0] === pair[0] && p[1] === pair[1] || p[1] === pair[0] && p[0] === pair[1]) {
            return true;
        }
    }

    return false;
};

var discoverNewLinks = function() {
    var df = Q.defer();
    var pairs = [];

    node.getNodesByName().then(function(nodes) {
        link.getLinks().then(function(links) {
            var promises = [];
            for (var i in nodes) {
                var node = nodes[i];
                var networks = getUnregisteredNetworks(node.interfaces, links);
                for (var j in networks) {
                    var net = networks[j];
                    var paired = searchPairingNode(net, node, nodes);
                    if (paired && !searchForPair([node.name, paired.name], pairs)) {
                        promises.push(link.addDiscoveredLink([ node, paired ]));
                    }
                }
            }

            Q.allSettled(promises).then(function(results) {
                df.resolve(results);
            });
        });
    });

    return df.promise;
};

module.exports = {
    discoverNewLinks: discoverNewLinks,
    getUnregisteredNetworks: getUnregisteredNetworks,
    isNetworkRegistered: isNetworkRegistered,
    getInterfacesSameNetwork: getInterfacesSameNetwork
};
