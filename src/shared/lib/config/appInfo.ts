import packageJson from '../../../../package.json'

/**
 * Application information from package.json
 */
export const appInfo = {
  name: packageJson.name,
  version: packageJson.version,
  description: 'Decentralized trading platform on the Chia blockchain',
} as const
