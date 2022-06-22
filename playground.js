const vm = require('./src/svm')
const fs = require('fs')
const BDCashCore = require('@bdeco/core')
let bdcash = new BDCashCore
bdcash.staticnodes = true
const log = require('log-to-file');

const express = require('express')
const app = express()
var cors = require('cors')
const port = 4498
var bodyParser = require('body-parser')

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/', async (req, res) => {
    res.send({ message: 'Playground working', status: 'OK' })
})

app.post('/read', async (req, res) => {
    let result = await readContract(req.body)
    res.send(result)
})

app.post('/run', async (req, res) => {
    let result = await runContract(req.body)
    res.send(result)
})

app.listen(port, () => console.log(`BDCashProtocol playground listening on port ${port}!`))

process.on('message', (m) => {
    console.log('CHILD got message:', m);
});

function readContract(request) {
    return new Promise(async response => {
        let result = await vm.read(request.address, true, request.version)
        response(result)
    })
}

async function runContract(request) {
    log('RUNNING CONTRACT')
    log(JSON.stringify(request))
    return new Promise(async response => {
        if (request.address !== undefined && request.request !== undefined) {
            bdcash.staticnodes = true
            bdcash.debug = true
            try{
                let result = await vm.run(request.address, request.request, true, 'latest')
                log(result)
                response(result.toString())
            }catch(e){
                console.log(e)
                response('VM ERRORED')
            }
        }else{
            log(response)
            response('INVALID REQUEST')
        }
    })
}