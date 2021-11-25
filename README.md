# BDCash VM

This repository describes the functioning of the BDCash Virtual Machine, the reasons for its creation and the implementation in the context of the NodeSH that will allow you to create and execute "Smart Contracts" (software that are executed and that maintain a state within a decentralized network ) thus creating an indefinite number of new use cases.

## Abstract

BDCash was born from a fork of PIVX and rests its blockchain foundations directly on the concepts of Bitcoin (being PIVX a fork of Dash, which in turn is a fork of Bitcoin). This means that within the BDCash blockchain there is no reference to the concept of Smart Contracts.

Although we strongly believe that decentralized applications do not largely need Smart Contracts on the other hand, we realize that there are many other applications that need to work with a strongly decentralized and highly scalable logic. That said, we started thinking about the possibility of allowing third party developers to use our "backend" technology, that is the IdaNodes, without actually corrupting them or having to act directly inside the source code.

Up to now, all the applications that required to interact with an "additional" logic have had to create new projects that interact with the IdaNodes, thus delegating the maintenance of particular logics to additional software.

After a careful analysis of the various existing Smart Contracts platforms, we tried to define the "qualities" that our system should have:

- **Scalability:** the system must be highly scalable, guaranteeing stability in the use of the platform as its use increases.

- **Automatism:** the system must be able to "self-execute" or perform certain actions in a totally automatic way.

- **Simplicity:** the system must give the developer ease of development without having to learn new programming languages.

- **Updatability:** the system must guarantee the updating of the software while maintaining its immutability.

We believe that the system designed can actually satisfy all the above requirements, in the next paragraphs we will explain how.

## NodeSH, VM e compiler

At the basis of the functioning of the platform we have three entities:

- **NodeSH:** used to interact with the blockchain in reading and writing, these will allow the execution of the Smart Contract and will keep the states of the Smart Contract itself within their database, based on the interactions and rules written within the code .

- **Virtual Machine:** the virtual machine (VM2) allows you to execute "untrusted" code or host of the IdaNode and is the safe environment in which the code is executed. The Virtual Machine will have few, predefined, internal modules available and will be able to interact with the IdaNode database limited to its own sphere of competence.

- **Compiler:** although Smart Contracts are written in Javascript, the compiler will allow you to translate certain predefined rules (such as reading and writing the database) into a native language capable of communicating with the IdaNode.

## NodeSH Modules

And here we are at the most important part: the modules. Although we can continue to call them "Smart Contracts" in fact the platform allows you to create modules / extensions / whatever you prefer to call them for the IdaNode. These modules will then be enabled within the IdaNode and then maintained by one or more specific IdaNodes. Here we come to the first point on our list of required features: scalability .

The modules are not natively included in all the IdaNodes, but only in those that have the interest of maintaining them and therefore the interest in providing more or less computing power for their execution.

This means that a specific application can be maintained only by its creator or by all those interested in using it, this therefore means that the number of interested parties will grow with the increase in users and therefore the system will always have computing power available. to serve different users.

This type of approach has already been used in decentralized applications such as IPFS or Torrent.

## Clock and automatism


The specific interaction with the IdaNodes allows to solve another big problem encountered in other Smart Contracts platforms, namely the automatisms. While it is generally accepted that the smart contract "executes itself on the basis of specific rules", this idea is drastically wrong.

Taking the example of Ethereum, a Smart Contract may possibly have "automatically" conditions such that `if` executed (and we repeat the *if* ), it will lead to a change of state within it.

This is because the Ethereum Virtual Machine does not have a real `clock` or a fundamental characteristic of all electronic *machines* and which allows to synchronize by means of a certain cycle . In computers, for example, it is calculated in Hertz (GHz) and defines the amount to perform operations that the computer can perform every second.

Clearly to extend the concept of clock to the blockchain we must abstract from the concept related to computers and think that the VM clock (i.e. the moment when the machine synchronizes) is the emission of a block, which in the BDCash network is about 1 minute .

This means that we can think of having our Smart Contract execute at least one operation every block, that is when a "cycle" has been concluded.

We have therefore created the basis for the automatisms, all Smart Contracts will be able to call the function `onBlock` and **self-execute** the code regardless of whether someone calls or does not call the Smart Contract itself!

## Immutability and updatability

Speaking of blockchain and Smart Contract, we can only mention one of the fundamental characteristics that the code must have: immutability.

Immutability is guaranteed by the blockchain as the code is not directly executed from a file, but this file must first be loaded into an address, thanks to the techniques we know. The code executed by the VM and by the user is therefore well defined and static and we have the guarantee that the code has been published by its author thanks to a double signature process.

However, any software during its life needs updates and this is a fact. Thanks to the *Progressive Data Management* technique applied also in the tool, it `BDCash-BVC` is possible to update the source code of the Smart Contract, thus publishing corrective and / or functional modification versions.

This feature will however be optional and will be defined at the first deployment of the Smart Contract.

## Interaction with the Smart Contract

The IdaNode at this point will allow you to interact with the contract by means of a specific API that exposes the methods written within the contract. The user, by means of a graphic interface (that of the dApp) will be able to interact with it by carrying out the actions that will therefore lead to the change of status within the contract itself.

## Conclusions

We concluded with the theoretical explanation of how Smart Contracts work on BDCash. This new feature will be implemented by the version `2.0.0` of the IdaNodes and will follow further technical documentation of operation, writing of Smart Contracts and use by the user.

