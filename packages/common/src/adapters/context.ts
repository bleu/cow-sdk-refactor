import { AbstractProviderAdapter } from './AbstractProviderAdapter'

// Shared global context between all packages
export class AdapterContext {
  private static _instance: AdapterContext
  private _adapter?: AbstractProviderAdapter

  private constructor() {}

  public static getInstance(): AdapterContext {
    if (!AdapterContext._instance) {
      AdapterContext._instance = new AdapterContext()
    }
    return AdapterContext._instance
  }

  public setAdapter(adapter: AbstractProviderAdapter): void {
    console.log('setAdapter', adapter)
    this._adapter = adapter
  }

  public getAdapter(): AbstractProviderAdapter {
    console.log('trying to get')
    if (!this._adapter) {
      throw new Error(
        'Provider adapter is not configurated. Configure with CowSdk or using AdapterContext.getInstance().setAdapter()',
      )
    }
    return this._adapter
  }
}

// Utility to get the global adapter
export function getGlobalAdapter(): AbstractProviderAdapter {
  console.log('trying to get global')
  return AdapterContext.getInstance().getAdapter()
}

// Utility to set the global adapter
export function setGlobalAdapter(adapter: AbstractProviderAdapter): void {
  console.log('setting global adapter', adapter)
  const instance = AdapterContext.getInstance()
  console.log('instance', instance)
  instance.setAdapter(adapter)
}
