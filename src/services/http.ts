import axios from 'axios'
import { mockAdapter } from './mockServer'

/**
 * All server communication goes through this instance. The demo uses a local
 * mock adapter; point `baseURL` at a real backend and drop the adapter to go live.
 */
export const http = axios.create({
  baseURL: '/api',
  adapter: mockAdapter,
})
