// src/utils/helpers.js

/**
 * Áp dụng các phương thức từ các class nguồn vào class đích.
 * @param {any} derivedCtor - Class đích (ví dụ: Board)
 * @param {any[]} constructors - Mảng các class nguồn (ví dụ: [BoardCreator, BoardInput])
 */
export function applyMixins(derivedCtor, constructors) {
  constructors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (name !== 'constructor') {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
        )
      }
    })
  })
}


