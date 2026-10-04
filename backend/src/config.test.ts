import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('uses safe local defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({ port: 3000, corsOrigin: 'http://localhost:5173' })
  })

  it('reads PORT and CORS_ORIGIN from the environment', () => {
    const config = loadConfig({ PORT: '8080', CORS_ORIGIN: 'https://app.example.com' })

    expect(config).toEqual({ port: 8080, corsOrigin: 'https://app.example.com' })
  })

  it.each([
    ['http://localhost:5173/', 'http://localhost:5173'],
    ['https://app.example.com/some/path?x=1', 'https://app.example.com'],
  ])('normalizes CORS_ORIGIN %s to its origin', (value, expected) => {
    expect(loadConfig({ CORS_ORIGIN: value }).corsOrigin).toBe(expected)
  })

  it.each(['abc', '0', '70000', '', '3000.5'])('rejects PORT %j', (value) => {
    expect(() => loadConfig({ PORT: value })).toThrow('Invalid environment variables')
  })

  it.each(['not-a-url', 'ftp://example.com'])('rejects CORS_ORIGIN %j', (value) => {
    expect(() => loadConfig({ CORS_ORIGIN: value })).toThrow('Invalid environment variables')
  })
})
