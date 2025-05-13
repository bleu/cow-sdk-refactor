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
    this._adapter = adapter
  }

  public getAdapter(): AbstractProviderAdapter {
    if (!this._adapter) {
      throw new Error(
        'Provider adapter is not congigurated. Configure with CowSdk or using AdapterContext.getInstance().setAdapter()',
      )
    }
    return this._adapter
  }
}

// Utility to get the global adapter
export function getGlobalAdapter(): AbstractProviderAdapter {
  return AdapterContext.getInstance().getAdapter()
}

// Utility to set the global adapter
export function setGlobalAdapter(adapter: AbstractProviderAdapter): void {
  AdapterContext.getInstance().setAdapter(adapter)
}

// Decorator for functions that use the global adapter
// export function withGlobalAdapter(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//   const originalMethod = descriptor.value
//   descriptor.value = function (...args: any[]) {
//     const adapter = getGlobalAdapter()
//     return originalMethod.apply(this, [...args, adapter])
//   }
//   return descriptor
// }
