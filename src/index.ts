import { createIsomorphicDestructurable } from './utils'

export interface Result<T, E> {
  data: T
  error: E
}

export type IsomorphicResult<T, E> =
  | (Result<T, null> & readonly [T, null])
  | (Result<null, E> & readonly [null, E])

type CustomError = new (...args: any[]) => Error
type ReturnsPromise<T extends (...args: any[]) => any> = ReturnType<T> extends Promise<any> ? true : false

export function guardedInvoke<_T = never, E extends CustomError = CustomError>(
  fn: () => never,
  _errorType?: E,
): IsomorphicResult<never, InstanceType<E>>
export function guardedInvoke<T, E extends CustomError = CustomError>(
  fn: () => Promise<T>,
  _errorType?: E,
): Promise<IsomorphicResult<T, InstanceType<E>>>
export function guardedInvoke<T, E extends CustomError = CustomError>(
  fn: () => T,
  _errorType?: E,
): IsomorphicResult<T, InstanceType<E>>
export function guardedInvoke<T, E extends CustomError = CustomError>(
  promise: Promise<T>,
  _errorType?: E,
): Promise<IsomorphicResult<T, InstanceType<E>>>
export function guardedInvoke<T, E extends CustomError = CustomError>(
  promiseOrFn: Promise<T> | (() => T | Promise<T>),
  _errorType?: E,
): IsomorphicResult<T, InstanceType<E>> | Promise<IsomorphicResult<T, InstanceType<E>>> {
  try {
    const result = promiseOrFn instanceof Promise
      ? promiseOrFn
      : promiseOrFn()

    if (result instanceof Promise) {
      return result
        .then(data => createIsomorphicDestructurable(
          { data, error: null },
          [data, null],
        ))
        .catch(error => createIsomorphicDestructurable(
          { data: null, error: error as InstanceType<E> },
          [null, error as InstanceType<E>],
        ))
    }

    return createIsomorphicDestructurable(
      { data: result, error: null },
      [result, null],
    )
  }
  catch (error) {
    return createIsomorphicDestructurable(
      { data: null, error: error as InstanceType<E> },
      [null, error as InstanceType<E>],
    )
  }
}

export function guardedInvokeFn<
  T extends (...args: any[]) => any,
  E extends CustomError = CustomError,
>(
  fn: T,
  _errorType?: E,
) {
  const callback = (...args: Parameters<T>) =>
    guardedInvoke(() => fn(...args))

  return callback as (...args: Parameters<T>) => ReturnsPromise<T> extends true
    ? ReturnType<T> extends Promise<infer U>
      ? Promise<IsomorphicResult<U, InstanceType<E>>>
      : never
    : IsomorphicResult<ReturnType<T>, InstanceType<E>>
}
