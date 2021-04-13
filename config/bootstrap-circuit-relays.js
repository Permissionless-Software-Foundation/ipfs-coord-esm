/*
  This library contains known circuit relays that new IPFS nodes can use to
  bootstrap themselves into the network and join the pubsub network.
*/
/* eslint camelcase: 0 */

const BOOTSTRAP_BROWSER_CRs = [
  {
    name: 'ipfs-service-provider.fullstackcash.nl',
    multiaddr:
      '/dns4/ipfs-service-provider.fullstackcash.nl/tcp/443/wss/ipfs/QmbyYXKbnAmMbMGo8LRBZ58jYs58anqUzY1m4jxDmhDsjd',
    connected: false
  },
  {
    name: 'go-ipfs-wss.fullstackcash.nl',
    multiaddr:
      '/dns4/go-ipfs-wss.fullstackcash.nl/tcp/443/wss/ipfs/12D3KooWMo5T3HytfpjfZqBd1PyZjG22VASf6STygEUbtSeMQVZ4',
    connected: false
  }
]

const BOOTSTRAP_NODE_CRs = [
  {
    name: 'ipfs.fullstack.cash',
    multiaddr:
      '/ip4/116.203.193.74/tcp/4001/ipfs/QmNZktxkfScScnHCFSGKELH3YRqdxHQ3Le9rAoRLhZ6vgL',
    connected: false
  },
  {
    name: 'ipfs-service-provider.fullstackcash.nl',
    multiaddr:
      '/ip4/157.90.28.11/tcp/4002/p2p/QmbyYXKbnAmMbMGo8LRBZ58jYs58anqUzY1m4jxDmhDsjd',
    connected: false
  },
  {
    name: 'go-ipfs.fullstackcash.nl',
    multiaddr:
      '/ip4/162.55.59.102/tcp/4001/p2p/12D3KooWMo5T3HytfpjfZqBd1PyZjG22VASf6STygEUbtSeMQVZ4',
    connected: false
  }
]

const bootstrapCircuitRelays = {
  browser: BOOTSTRAP_BROWSER_CRs,
  node: BOOTSTRAP_NODE_CRs
}

module.exports = bootstrapCircuitRelays
