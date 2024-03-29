/*
  Unit tests for the pubsub/messaging.js library.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'
import SlpWallet from 'minimal-slp-wallet'
import cloneDeep from 'lodash.clonedeep'

// local libraries
import Messaging from '../../../../lib/adapters/pubsub-adapter/messaging.js'
import ipfsLib from '../../../mocks/ipfs-mock.js'
import IPFSAdapter from '../../../../lib/adapters/ipfs-adapter.js'
import EncryptionAdapter from '../../../../lib/adapters/encryption-adapter.js'
import BchAdapter from '../../../../lib/adapters/bch-adapter.js'
import thisNode from '../../../mocks/thisnode-mocks.js'
import ResendMsg from '../../../../lib/adapters/pubsub-adapter/resend-msg.js'

describe('#messaging-adapter', () => {
  let sandbox
  let uut
  let ipfs, ipfsAdapter

  const log = {
    statusLog: () => {}
  }

  beforeEach(async () => {
    // Restore the sandbox before each test.
    sandbox = sinon.createSandbox()

    // Instantiate the IPFS adapter
    ipfs = cloneDeep(ipfsLib)
    ipfsAdapter = new IPFSAdapter({ ipfs, log })

    // Instantiate the Encryption adapater
    const wallet = new SlpWallet()
    await wallet.walletInfoPromise
    const bch = new BchAdapter({ wallet })
    const encryption = new EncryptionAdapter({ bch })

    // Instantiate the library under test. Must instantiate dependencies first.
    uut = new Messaging({ ipfsAdapter, log, encryption })
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if IPFS adapter not specified', () => {
      try {
        uut = new Messaging()

        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(
          err.message,
          'Instance of IPFS adapter required when instantiating Messaging Adapter.'
        )
      }
    })

    it('should throw an error if log adapter not specified', () => {
      try {
        uut = new Messaging({ ipfsAdapter })

        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(
          err.message,
          'A status log handler function required when instantitating Messaging Adapter'
        )
      }
    })

    it('should throw an error if log adapter not specified', () => {
      try {
        uut = new Messaging({ ipfsAdapter, log })

        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(
          err.message,
          'An instance of the encryption Adapter must be passed when instantiating the Messaging Adapter library.'
        )
      }
    })
  })

  describe('#generateMsgObj', () => {
    it('should throw error if sender is not specified', () => {
      try {
        uut.generateMsgObj()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.message, 'Sender required when calling generateMsgObj()')
      }
    })

    it('should throw error if Receiver is not specified', () => {
      try {
        const inObj = {
          sender: 'fake-sender'
        }

        uut.generateMsgObj(inObj)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.message, 'Receiver required when calling generateMsgObj()')
      }
    })

    it('should throw error if payload is not specified', () => {
      try {
        const inObj = {
          sender: 'fake-sender',
          receiver: 'fake-receiver'
        }

        uut.generateMsgObj(inObj)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.message, 'Payload required when calling generateMsgObj()')
      }
    })

    it('should generate a message object', () => {
      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }

      const result = uut.generateMsgObj(inObj)
      // console.log(result)

      assert.property(result, 'timestamp')
      assert.property(result, 'uuid')
      assert.property(result, 'sender')
      assert.property(result, 'receiver')
      assert.property(result, 'payload')
    })
  })

  describe('#generateAckMsg', () => {
    it('should generate an ACK message', async () => {
      const ipfsId = '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa'
      const data = {
        sender: ipfsId,
        uuid: 'fake-uuid'
      }

      thisNode.peerData.push({ from: ipfsId })

      const result = await uut.generateAckMsg(data, thisNode)
      // console.log(result)

      assert.property(result, 'timestamp')
      assert.property(result, 'uuid')
      assert.property(result, 'sender')
      assert.property(result, 'receiver')
      assert.property(result, 'payload')
    })
  })

  it('should catch and throw errors', async () => {
    try {
      await uut.generateAckMsg()

      assert.fail('Unexpected code path')
    } catch (err) {
      console.log(err)
      assert.include(err.message, 'Cannot read')
    }
  })

  describe('#publishToPubsubChannel', () => {
    it('should publish a message to a pubsub channel', async () => {
      const chanName = 'fake-chanName'

      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }
      const msgObj = uut.generateMsgObj(inObj)

      const result = await uut.publishToPubsubChannel(chanName, msgObj)

      // assert.equal(true, true, 'Not throwing an error is a pass')
      assert.equal(result, true)
    })

    it('should announce itself on the announcement pubsub channel', async () => {
      const chanName = 'fake-chanName'

      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }
      const msgObj = uut.generateMsgObj(inObj)
      delete msgObj.uuid

      const result = await uut.publishToPubsubChannel(chanName, msgObj)

      // assert.equal(true, true, 'Not throwing an error is a pass')
      assert.equal(result, true)
    })

    it('should catch and throw errors', async () => {
      try {
        // Force an error
        sandbox
          .stub(uut.ipfs.ipfs.pubsub, 'publish')
          .rejects(new Error('test error'))

        await uut.publishToPubsubChannel()

        assert.fail('Unexpected code path')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'The first argument')
      }
    })
  })

  describe('#_checkIfAlreadyProcessed', () => {
    it('should return true if UUID is already in cache', () => {
      const uuid = 'fake-uuid'

      // Force uuid to be in cache
      uut.msgCache.push(uuid)

      const result = uut._checkIfAlreadyProcessed(uuid)

      assert.equal(result, true)
    })

    it('should return false and add uuid to cache', () => {
      const uuid = 'fake-uuid'

      const result = uut._checkIfAlreadyProcessed(uuid)

      assert.equal(result, false)

      assert.equal(uut.msgCache.includes(uuid), true)
    })

    it('should shift out the oldest element if the cache is full', () => {
      const uuid = 'fake-uuid'

      // Force code path for this test.
      uut.MSG_CACHE_SIZE = 0

      const result = uut._checkIfAlreadyProcessed(uuid)

      assert.equal(result, false)
    })
  })

  describe('#resendMsg', () => {
    it('should resend message', async () => {
      // Mock dependencies
      sandbox.stub(uut, 'publishToPubsubChannel').resolves()

      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }
      const msgObj = uut.generateMsgObj(inObj)
      msgObj.retryCnt = 0

      const resendMsg = new ResendMsg({ msgObj, msgLib: uut })

      const result = await resendMsg.resend()

      assert.equal(result, 1)
    })

    it('should clear the Interval if retry count has been exceeded', async () => {
      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }
      const msgObj = uut.generateMsgObj(inObj)
      msgObj.retryCnt = 4

      const resendMsg = new ResendMsg({ msgObj, msgLib: uut })

      const result = await resendMsg.resend()

      assert.equal(result, 2)
    })

    it('should return 0 on error', async () => {
      // const result = await uut.resendMsg()
      const resendMsg = new ResendMsg({ msgObj: {}, msgLib: {} })

      const result = await resendMsg.resend()

      assert.equal(result, 0)
    })
  })

  describe('#addMsgToQueue', () => {
    it('should add a message to the queue', () => {
      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }
      const msgObj = uut.generateMsgObj(inObj)

      const result = uut.addMsgToQueue(msgObj)
      // console.log(result)

      clearInterval(result.intervalHandle)

      assert.property(result, 'timestamp')
      assert.property(result, 'uuid')
      assert.property(result, 'sender')
      assert.property(result, 'receiver')
      assert.property(result, 'payload')
      assert.property(result, 'intervalHandle')
      assert.property(result, 'retryCnt')
    })

    it('should catch and throw errors', async () => {
      try {
        // Force an error
        sandbox.stub(uut.msgQueue, 'push').throws(new Error('test error'))

        await uut.addMsgToQueue()

        assert.fail('Unexpected code path')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#delMsgFromQueue', () => {
    it('should delete a message from the queue', () => {
      const inObj = {
        sender: 'fake-sender',
        receiver: 'fake-receiver',
        payload: 'fake-payload'
      }
      const msgObj = uut.generateMsgObj(inObj)

      // Force the object to be in the queue
      uut.msgQueue.push(msgObj)

      const result = uut.delMsgFromQueue(msgObj)

      assert.equal(result, true)
    })
  })

  describe('#sendMsg', () => {
    it('should send a message to an IPFS peer', async () => {
      // Mock dependencies
      sandbox.stub(uut, 'generateMsgObj').returns({ key: 'value' })
      sandbox.stub(uut, 'publishToPubsubChannel').resolves()
      sandbox.stub(uut, 'addMsgToQueue').returns()

      const receiver = 'fake-receiver'
      const payload = 'fake-payload'

      const result = await uut.sendMsg(receiver, payload, thisNode)

      assert.equal(result, true)
    })

    it('should catch and throw errors', async () => {
      try {
        // Force an error
        sandbox.stub(uut, 'generateMsgObj').throws(new Error('test error'))

        const receiver = 'fake-receiver'
        const payload = 'fake-payload'

        await uut.sendMsg(receiver, payload, thisNode)

        assert.fail('Unexpected code path')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#sendAck', () => {
    it('should send an ACK message', async () => {
      // Mock dependencies
      sandbox.stub(uut, 'publishToPubsubChannel').resolves()

      const ipfsId = '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa'
      const data = {
        sender: ipfsId,
        uuid: 'fake-uuid'
      }

      const result = await uut.sendAck(data, thisNode)

      assert.equal(result, true)
    })

    it('should catch and throw errors', async () => {
      try {
        // Force an error
        sandbox.stub(uut, 'generateAckMsg').throws(new Error('test error'))

        const ipfsId = '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa'
        const data = {
          sender: ipfsId,
          uuid: 'fake-uuid'
        }

        await uut.sendAck(data, thisNode)

        assert.fail('Unexpected code path')
      } catch (err) {
        // console.log('err: ', err)
        assert.include(err.message, 'test error')
      }
    })
  })

  describe('#handleIncomingData', () => {
    it('should handle an incoming message', async () => {
      // Mock dependencies
      // sandbox.stub(uut.encryption,'decryptMsg').resolves()
      uut.encryption.decryptMsg = (x) => JSON.stringify(x)
      sandbox.stub(uut, 'sendAck').resolves()
      sandbox.stub(uut, '_checkIfAlreadyProcessed').returns(false)

      uut.nodeType = 'external'

      const msg = {
        from: '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa',
        topicIDs: ['12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f'],
        data: new TextEncoder().encode('{"payload": {"key": "value"}}')
      }

      const result = await uut.handleIncomingData(msg, thisNode)
      // console.log(result)

      assert.property(result, 'from')
      assert.property(result, 'channel')
      assert.property(result, 'data')
    })

    it('should return false for incoming ACK message', async () => {
      // Mock dependencies
      // sandbox.stub(uut.encryption,'decryptMsg').resolves()
      uut.encryption.decryptMsg = (x) => JSON.stringify(x)
      sandbox.stub(uut, 'sendAck').resolves()
      sandbox.stub(uut, '_checkIfAlreadyProcessed').returns(false)
      sandbox.stub(uut, 'delMsgFromQueue').returns()

      uut.nodeType = 'external'

      const msg = {
        from: '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa',
        topicIDs: ['12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f'],
        data: new TextEncoder().encode('{"payload": {"apiName": "ACK"}}')
      }

      const result = await uut.handleIncomingData(msg, thisNode)
      // console.log(result)

      assert.equal(result, false)
    })

    it('should return false for already processed message', async () => {
      // Mock dependencies
      // sandbox.stub(uut.encryption,'decryptMsg').resolves()
      uut.encryption.decryptMsg = (x) => JSON.stringify(x)
      sandbox.stub(uut, 'sendAck').resolves()
      sandbox.stub(uut, '_checkIfAlreadyProcessed').returns(true)
      sandbox.stub(uut, 'delMsgFromQueue').returns()

      uut.nodeType = 'external'

      const msg = {
        from: '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa',
        topicIDs: ['12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f'],
        data: new TextEncoder().encode('{"payload": {"key": "value"}}')
      }

      const result = await uut.handleIncomingData(msg, thisNode)
      // console.log(result)

      assert.equal(result, false)
    })

    it('should return false on error', async () => {
      const result = await uut.handleIncomingData()

      assert.equal(result, false)
    })

    it('should return false if message originates from this node', async () => {
      // Mock dependencies
      uut.encryption.decryptMsg = (x) => JSON.stringify(x)
      sandbox.stub(uut, 'sendAck').resolves()
      sandbox.stub(uut, '_checkIfAlreadyProcessed').returns(false)

      uut.nodeType = 'external'

      const msg = {
        from: '12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f',
        topicIDs: ['12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f'],
        data: new TextEncoder().encode('{"payload": {"key": "value"}}')
      }

      const result = await uut.handleIncomingData(msg, thisNode)
      // console.log(result)

      assert.equal(result, false)
    })

    it('should report debug REQUESTS from an about RPC call', async () => {
      // Force desired code path
      uut.encryption.decryptMsg = (x) => JSON.stringify({
        id: 123
      })
      sandbox.stub(uut, 'sendAck').resolves()
      sandbox.stub(uut, '_checkIfAlreadyProcessed').returns(false)

      uut.nodeType = 'external'

      const msg = {
        from: '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa',
        topicIDs: ['12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f'],
        data: new TextEncoder().encode('{"payload": {"key": "value"}}')
      }

      const result = await uut.handleIncomingData(msg, thisNode)
      // console.log(result)

      assert.include(result.data.payload, '123')
    })

    it('should report debug RESPONSE from an about RPC call', async () => {
      // Force desired code path
      uut.encryption.decryptMsg = (x) => JSON.stringify({
        id: 123,
        result: true
      })
      sandbox.stub(uut, 'sendAck').resolves()
      sandbox.stub(uut, '_checkIfAlreadyProcessed').returns(false)

      uut.nodeType = 'external'

      const msg = {
        from: '12D3KooWHS5A6Ey4V8fLWD64jpPn2EKi4r4btGN6FfkNgMTnfqVa',
        topicIDs: ['12D3KooWE6tkdArVpCHG9QN61G1cE7eCq2Q7i4bNx6CJFTDprk9f'],
        data: new TextEncoder().encode('{"payload": {"key": "value"}}')
      }

      const result = await uut.handleIncomingData(msg, thisNode)
      // console.log(result)

      assert.include(result.data.payload, '123')
    })
  })
})
