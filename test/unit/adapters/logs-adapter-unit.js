/*
  Unit tests for log adapter.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// local libraries
import LogsAdapter from '../../../lib/adapters/logs-adapter.js'

describe('#Adapters - Logs', () => {
  let uut
  let sandbox

  beforeEach(() => {
    // Restore the sandbox before each test.
    sandbox = sinon.createSandbox()

    const config = {
      debugLevel: 2,
      statusLog: () => {}
    }

    // Instantiate the library under test. Must instantiate dependencies first.
    uut = new LogsAdapter(config)
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw an error if log handler is specified', async () => {
      try {
        uut = new LogsAdapter()

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.include(
          err.message,
          'statusLog must be specified when instantiating Logs adapter library.'
        )
      }
    })
  })

  describe('#statusLog', () => {
    it('should include object if defined', () => {
      uut.statusLog(1, 'test string', { message: 'obj message' })
    })

    it('should exclude object if undefined', () => {
      uut.statusLog(1, 'test string')
    })
  })
})
