'use strict';

var mongoose = require('mongoose');
var Q = require('q');
var util = require('util');

var NodeModel = function() {
    var schema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        sshPort: {
            type: Number
        },
        email: {
            type: String
        },
        omnitikip: {
            type: String
        },
        mainip: {
            type: String
        },
        connectedUsers: {
            type: Number
        },
        latlng: {
            lat: Number,
            lng: Number
        },
        interfaces: [ {
            name: String,
            address: String
        }],
        username: {
            type: String
        },
        password: {
            type: String
        },
        apissl: {
            type: Boolean
        },
        omnitik: {
            type: Boolean
        },
        alive: {
            type: Boolean
        },
        validated: {
            type: Boolean
        },
        system: {
            type: String
        },
        routing: {
            total: Number,
            active: Number,
            inactive: Number
        },
        sysinfo: {
            model: String,
            version: String,
            poe: String,
            firmware: String,
            uptime: String
        },
        ospf: {
            routerId: String,
            dijkstras: Number,
            state: String
        }
    });

    return mongoose.model('Node', schema);
};

var Node = new NodeModel();

var getNodesByName = function(nodeNames) {
    var df = Q.defer();

    var query = {};
    if (nodeNames && nodeNames.length > 0) {
        query =  { name: { '$in': nodeNames } };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            df.reject();
            return;
        }
        df.resolve(nodes);
    });

    return df.promise;
};

var getNodesByPartialName = function(q) {
    var deferred = Q.defer();

    var query = {};
    if (q) {
        query = { name: new RegExp('^' + q, 'i') };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            deferred.reject(error);
            return;
        }
        deferred.resolve(nodes);
    });

    return deferred.promise;
};

var updateNode = function(node) {
    var deferred = Q.defer(),
        getips,
        getips_mikrotik = require('./mikrotik').getips,
        getips_openwrt = require('./openwrt').getips;

    if (node.system === 'mikrotik') {
        getips = getips_mikrotik;
    } else if (node.system === 'openwrt') {
        getips = getips_openwrt;
    } else {
        deferred.reject();
        return;
    }

    getips(node).then(function(node) {
        node.save(function() {
            deferred.resolve();
        });
    }).fail(function() {
        deferred.reject('Error fetching interfaces from ' + node.name);
    });

    return deferred.promise;
};

var addNode = function(node) {
    var df = Q.defer();

    var required = [ 'name', 'mainip', 'system', 'username', 'password', 'latlng' ];
    var nodeName = node.name;
    getNodesByName([nodeName]).then(function(nodes) {
        if (nodes.length > 0) {
            df.reject(util.format('The node %s already exists', nodeName));
        } else {
            for (var r in required) {
                var req = required[r];

                if (node[req] === undefined) {
                    df.reject(util.format('The parameter "%s" is required', req));
                    return;
                }
            }

            var newNode = new Node ({ name : node.name, mainip: node.mainip, system: node.system, username: node.username, password: node.password, latlng: { lat: node.latlng.lat, lng: node.latlng.lng } });
            newNode.save(function() {
                df.resolve(newNode);
            });
        }
    }).fail(function(error) {
        df.reject(error);
    });

    return df.promise;
};

var getNodesById = function(nodeIds) {
    var deferred = Q.defer();

    var query = {};
    if (nodeIds && nodeIds.length > 0) {
        query =  { _id: { '$in': nodeIds } };
    }

    Node.find(query, function(error, nodes) {
        if (error) {
            deferred.reject(error);
            return;
        }
        deferred.resolve(nodes);
    });

    return deferred.promise;
};

var getNodesPublicInfo = function(nodes) {
    var nodesPublicInfo = {};
    for (var i in nodes) {
        var node = nodes[i];
        nodesPublicInfo[node.name] = {
            ip: node.mainip,
            routing: node.routing,
            sysinfo: node.sysinfo,
            connectedUsers: node.connectedUsers,
            omnitik: node.omnitik,
            name: node.name,
            ospf: node.ospf,
            alive: node.alive,
            lat: node.latlng.lat,
            lng: node.latlng.lng
        };
    }

    return nodesPublicInfo;
};

var getNodeByIP = function(ip) {
    var deferred = Q.defer();

    Node.find({ 'interfaces.address': new RegExp('^' + ip + '/') }, function(error, node) {
        if (error) {
            deferred.reject(error);
            return;
        }
        deferred.resolve(node[0]);
    });

    return deferred.promise;
};


module.exports = {
    getNodesByName : getNodesByName,
    getNodesByPartialName : getNodesByPartialName,
    updateNode: updateNode,
    addNode: addNode,
    getNodesById: getNodesById,
    getNodesPublicInfo: getNodesPublicInfo,
    getNodeByIP : getNodeByIP
};
