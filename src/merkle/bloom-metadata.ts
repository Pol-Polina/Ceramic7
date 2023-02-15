import * as fs from 'fs'
import { MetadataFunction, Node, TreeMetadata } from './merkle-elements.js'
import { BloomFilter } from '@ceramicnetwork/wasm-bloom-filter'
import { Candidate } from './candidate.js'

const packageJson = JSON.parse(
  fs.readFileSync(
    new URL('../../node_modules/@ceramicnetwork/wasm-bloom-filter/package.json', import.meta.url),
    'utf8'
  )
)

const BLOOM_FILTER_TYPE = 'jsnpm_@ceramicnetwork/wasm-bloom-filter'
const BLOOM_FILTER_FALSE_POSITIVE_RATE = 0.0001
const bloomFilterVersion = packageJson['version']

/**
 * Implements IPFS merge CIDs
 */
export class BloomMetadata implements MetadataFunction<Candidate, TreeMetadata> {
  generateMetadata(leaves: Array<Node<Candidate>>): TreeMetadata {
    const bloomFilterEntries = new Set<string>()
    const streamIds = []

    for (const node of leaves) {
      const candidate = node.data
      streamIds.push(candidate.streamId.toString())
      bloomFilterEntries.add(`streamid-${candidate.streamId.toString()}`)
      if (candidate.model) {
        bloomFilterEntries.add(`model-${candidate.model.toString()}`)
      }
      for (const controller of candidate.metadata.controllers) {
        bloomFilterEntries.add(`controller-${controller}`)
      }
    }

    const bloomFilter = new BloomFilter(BLOOM_FILTER_FALSE_POSITIVE_RATE, bloomFilterEntries.size)
    for (const entry of bloomFilterEntries) {
      bloomFilter.add(entry)
    }

    const serializedBloomFilter = bloomFilter.toString()
    return {
      numEntries: leaves.length,
      bloomFilter: {
        type: `${BLOOM_FILTER_TYPE}-v${bloomFilterVersion}`,
        data: serializedBloomFilter,
      },
      streamIds,
    }
  }
}