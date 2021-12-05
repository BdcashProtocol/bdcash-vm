const { NodeVM } = require('vm2')
const compressor = require('lzutf8')
const fs = require('fs')
const BDCashCore = require('@bdcash-protocol/core')
const compiler = require('@bdcash-protocol/compiler')
const v001 = compiler.v001
const v002 = compiler.v002
const crypto = require('crypto')
var CoinKey = require('@bdcash-protocol/coinkey')

if (global['db_url'] === undefined) {
    global['db_url'] = 'mongodb://localhost:27017'
}
if (global['db_options'] === undefined) {
    global['db_options'] = { useNewUrlParser: true, useUnifiedTopology: true }
}
if (global['db_name'] === undefined) {
    global['db_name'] = 'nodesh'
}

async function test(code, request = '') {
    let compiled = await v001.compiler(code.toString().trim(), request, false)
    if (compiled !== false) {
        contract.functions = compiled.functions
        contract.code = compiled.code
        response(contract)
    } else {
        response(false)
    }
}

function prepare(toCompile, request = '', local = false, address) {
    return new Promise(async response => {
        try {
            if (local === true && (address.indexOf('local:') !== -1 || address.indexOf('code:') !== -1)) {
                const hash = crypto.createHash('sha256').update(address).digest('hex')
                var temp = new CoinKey(Buffer.from(hash, 'hex'), {
                    private: 0xae,
                    public: 0x30,
                    scripthash: 0x0d
                })
                address = temp.publicAddress
            }

            let compiled = false
            if (toCompile.toString().indexOf('/* BDCash v0.0.1 */') !== -1) {
                compiled = await v001.compiler(toCompile.toString().trim(), request, local)
            } else if (toCompile.toString().indexOf('/* BDCash v0.0.2 */' !== -1)) {
                compiled = await v002.compiler(toCompile.toString().trim(), request, local, address)
            }

            const dbMock = {
                read(query, limit) {
                    return new Promise(response => {
                        if (local === true) {
                            let MongoClient = require('mongodb').MongoClient
                            MongoClient.connect(global['db_url'], global['db_options'], async function (err, client) {
                                if (err) {
                                    response(err)
                                } else {
                                    var db = client.db(global['db_name'])
                                    try {
                                        let result = []
                                        if (limit !== undefined) {
                                            result = await db.collection(address).find(query).limit(limit).toArray()
                                        } else {
                                            result = await db.collection(address).find(query).toArray()
                                        }
                                        let array = []
                                        for (let k in result) {
                                            delete result[k]._id
                                            let state = result[k]
                                            array.push(state)
                                        }
                                        if (array.length === 1) {
                                            array = array[0]
                                        }
                                        client.close()
                                        response(array)
                                    } catch (e) {
                                        client.close()
                                        response(false)
                                    }
                                }
                            })
                        } else {
                            response(false)
                        }
                    })
                },
                insert(object) {
                    if (local === true) {
                        return new Promise(response => {
                            let MongoClient = require('mongodb').MongoClient
                            let inserted = false
                            MongoClient.connect(global['db_url'], global['db_options'], async function (err, client) {
                                while (!inserted) {
                                    if (err) {
                                        inserted = true
                                        this.inserted(object)
                                    } else {
                                        var db = client.db(global['db_name'])
                                        try {
                                            let result = await db.collection(address).insertOne(object, { w: 1, j: true });
                                            inserted = true
                                            client.close()
                                            response(result)
                                        } catch (e) {
                                            client.close()
                                            response(false)
                                        }
                                    }
                                }
                            })

                        })
                    } else {
                        response(false)
                    }
                },
                update(query, object) {
                    if (local === true) {
                        return new Promise(response => {
                            let MongoClient = require('mongodb').MongoClient
                            MongoClient.connect(global['db_url'], global['db_options'], async function (err, client) {
                                let updated = false
                                while (!updated) {
                                    if (err) {
                                        updated = true
                                        this.update(query, object)
                                        response(err)
                                    } else {
                                        var db = client.db(global['db_name'])
                                        try {
                                            let result = await db.collection(address).updateOne(query, object, { writeConcern: { w: 1, j: true } })
                                            client.close()
                                            updated = true
                                            response(result)
                                        } catch (e) {
                                            client.close()
                                            response(false)
                                        }
                                    }
                                }
                            })
                        })
                    }
                },
                delete(query) {
                    if (local === true) {
                        return new Promise(response => {
                            let MongoClient = require('mongodb').MongoClient
                            MongoClient.connect(global['db_url'], global['db_options'], async function (err, client) {
                                if (err) {
                                    response(err)
                                } else {
                                    var db = client.db(global['db_name'])
                                    try {
                                        let result = await db.collection(address).deleteOne(query)
                                        client.close()
                                        response(result)
                                    } catch (e) {
                                        response(false)
                                    }
                                }
                            })
                        })
                    }
                }
            }

            if (compiled !== false) {
                let vm = new NodeVM({
                    console: 'inherit',
                    require: {
                        external: {
                            modules: ['@bdcash-protocol/core', 'axios', 'mathjs']
                        },
                        mock: {
                            db: dbMock
                        }
                    }
                })
                try {
                    let contract = vm.run(compiled.code, 'svm.js')
                    response(contract)
                } catch (e) {
                    response(e)
                }
            } else {
                response(false)
            }
        } catch (e) {
            console.log(e)
            response(false)
        }
    })
}

function returnLocalContract(address) {
    return new Promise(async response => {
        let MongoClient = require('mongodb').MongoClient
        MongoClient.connect(global['db_url'], global['db_options'], async function (err, client) {
            var db = client.db(global['db_name'])
            if (err) {
                client.close()
                response(err)
            } else {
                try {
                    let result = await db.collection('written').find({ address: address, protocol: 'ida://' }).toArray()
                    let array = []
                    for (let k in result) {
                        delete result[k]._id
                        let state = result[k]
                        array.push(state)
                    }
                    if (array.length === 1) {
                        array = array[0]
                    }
                    client.close()
                    response({ data: array })
                } catch (e) {
                    response(false)
                }
            }
        })
    })
}

function read(address, local = false, version = 'latest') {
    return new Promise(async response => {
        try {
            let bdcash = new BDCashCore
            bdcash.staticnodes = true
            if (local) {
                bdcash.mainnetNodesh = ['http://localhost:3001']
            }
            if (address.indexOf('/') === -1) {
                // console.log('Reading deployed contract.')
                let contractBlockchain
                if (local) {
                    contractBlockchain = await returnLocalContract(address)
                } else {
                    contractBlockchain = await bdcash.post('/read', { address: address, protocol: 'ida://' })
                }

                let genesis
                let genesisindex
                let versionindex
                if (contractBlockchain.data.data === undefined) {
                    genesisindex = 0
                    genesis = JSON.parse(contractBlockchain.data[genesisindex].data.message)
                    if (genesis.immutable === undefined || genesis.immutable === false || genesis.immutable === 'false') {
                        if (version === 'latest' || version === undefined) {
                            versionindex = contractBlockchain.data.length - 1
                        } else {
                            for (let k in contractBlockchain.data) {
                                let check = contractBlockchain.data[k]
                                if (check.refID === version) {
                                    versionindex = k
                                }
                            }
                        }
                    } else {
                        versionindex = genesisindex
                    }
                    version = contractBlockchain.data[versionindex]
                } else {
                    genesis = JSON.parse(contractBlockchain.data.data.message)
                    version = contractBlockchain.data
                }

                if (version !== undefined) {
                    let data = version.data
                    let verify = await bdcash.verifyMessage(data.pubkey, data.signature, data.message)
                    let contract = JSON.parse(data.message)
                    if (verify !== false) {
                        let toCompile = compressor.decompress(contract.code, { inputEncoding: 'Base64' })
                        let compiled = false
                        
                        if (toCompile.toString().indexOf('/* BDCash v0.0.1 */') !== -1) {
                            compiled = await v001.compiler(toCompile.toString().trim(), "", local)
                        } else if (toCompile.toString().indexOf('/* BDCash v0.0.2 */' !== -1)) {
                            compiled = await v002.compiler(toCompile.toString().trim(), "", local, address)
                        }

                        if (compiled !== false) {
                            contract.functions = compiled.functions
                            contract.code = compiled.code
                            response(contract)
                        } else {
                            response(false)
                        }
                    } else {
                        response(false)
                    }
                } else {
                    response(false)
                }
            } else {
                console.log('Reading local contract.')
                let toCompile = fs.readFileSync(address)
                let compiled = false
                if (toCompile.toString().indexOf('/* BDCash v0.0.1 */') !== -1) {
                    console.log('Compiling with v0.0.1')
                    compiled = await v001.compiler(toCompile.toString().trim(), '', local)
                } else if (toCompile.toString().indexOf('/* BDCash v0.0.2 */' !== -1)) {
                    console.log('Compiling with v0.0.2')
                    compiled = await v002.compiler(toCompile.toString().trim(), '', local, address)
                }
                if (compiled !== false) {
                    console.log('Compilation done, returning contract')
                    let contract = {}
                    contract.functions = compiled.functions
                    contract.code = compiled.code
                    response(contract)
                } else {
                    response(false)
                }
            }
        } catch (e) {
            response(e)
        }
    })
}

function run(address, request, local = false, version = 'latest') {
    return new Promise(async response => {
        try {
            let bdcash = new BDCashCore
            bdcash.staticnodes = true
            if (local) {
                bdcash.mainnetNodesh = ['http://localhost:3001']
            }
            if (request.signature !== undefined && request.message !== undefined && request.pubkey !== undefined) {
                let validateRequest = await bdcash.verifyMessage(request.pubkey, request.signature, request.message)
                if (validateRequest !== false) {
                    // console.log('REQUEST IS VALID.')
                    try {
                        request.message = JSON.parse(JSON.parse(Buffer.from(request.message, 'hex').toString('utf8')))
                    } catch (e) {
                        request.message = JSON.parse(Buffer.from(request.message, 'hex').toString('utf8'))
                    }
                    if (request.message.function !== undefined && request.message.params !== undefined) {
                        if (address.indexOf('local:') === -1 && address.indexOf('code:') === -1) {
                            let contractBlockchain
                            if (local) {
                                contractBlockchain = await returnLocalContract(address)
                            } else {
                                contractBlockchain = await bdcash.post('/read', { address: address, protocol: 'ida://' })
                            }
                            let genesis
                            let genesisindex
                            let versionindex
                            if (contractBlockchain.data.data === undefined) {
                                genesisindex = 0
                                genesis = JSON.parse(contractBlockchain.data[genesisindex].data.message)
                                if (genesis.immutable === undefined || genesis.immutable === false || genesis.immutable === 'false') {
                                    if (version === 'latest' || version === undefined) {
                                        versionindex = contractBlockchain.data.length - 1
                                    } else {
                                        for (let k in contractBlockchain.data) {
                                            let check = contractBlockchain.data[k]
                                            if (check.refID === version) {
                                                versionindex = k
                                            }
                                        }
                                    }
                                } else {
                                    versionindex = genesisindex
                                }
                                version = contractBlockchain.data[versionindex]
                            } else {
                                genesis = JSON.parse(contractBlockchain.data.data.message)
                                version = contractBlockchain.data
                            }
                            if (version !== undefined) {
                                let data = version.data
                                let verify = await bdcash.verifyMessage(data.pubkey, data.signature, data.message)
                                let contract = JSON.parse(data.message)
                                if (verify !== false) {
                                    let toCompile = compressor.decompress(contract.code, { inputEncoding: 'Base64' })
                                    let code = await prepare(toCompile, request, local, address)
                                    if (code !== false) {
                                        if (code[request.message.function] !== undefined) {
                                            try {
                                                let result = await code[request.message.function](request.message.params)
                                                response(result)
                                            } catch (e) {
                                                response(e)
                                            }
                                        } else {
                                            response(false)
                                        }
                                    } else {
                                        response(false)
                                    }
                                } else {
                                    response(false)
                                }
                            } else {
                                response(false)
                            }
                        } else if (address.indexOf('local:') !== -1) {
                            console.log('RUNNING LOCAL CONTRACT.')
                            let toCompile = fs.readFileSync(address.replace('local:', ''))
                            let code = await prepare(toCompile, request, local, address)
                            if (code !== false) {
                                if (code[request.message.function] !== undefined) {
                                    try {
                                        let result = await code[request.message.function](request.message.params)
                                        try {
                                            response(JSON.stringify(result))
                                        } catch (e) {
                                            response(result)
                                        }
                                    } catch (e) {
                                        response(e)
                                    }
                                } else {
                                    console.log('FUNCTION NOT FOUND!')
                                    response(false)
                                }
                            } else {
                                response(false)
                            }
                        } else if (address.indexOf('code:') !== -1) {
                            let toCompile = Buffer.from(address.replace('code:', ''), 'hex').toString('utf-8')
                            let code = await prepare(toCompile, request, local, address)
                            if (code !== false) {
                                if (code[request.message.function] !== undefined) {
                                    try {
                                        let result = await code[request.message.function](request.message.params)
                                        response(result)
                                    } catch (e) {
                                        response(e)
                                    }
                                } else {
                                    response(false)
                                }
                            } else {
                                response(false)
                            }
                        } else {
                            response(false)
                        }
                    } else {
                        console.log('REQUEST IS MALFORMED, MISSING FUNCTION OR PARAMS.')
                        response(false)
                    }
                } else {
                    console.log('SIGNED REQUEST IS NOT VALID')
                    response(false)
                }
            } else {
                response('REQUEST MALFORMED')
            }
        } catch (e) {
            response(e)
        }
    })
}

exports.run = run
exports.read = read
exports.test = test
