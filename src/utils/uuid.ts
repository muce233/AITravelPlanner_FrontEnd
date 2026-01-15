/**
 * 生成UUID的兼容性工具函数
 * 使用crypto.randomUUID()作为首选，如果不支持则使用备用方案
 */

export function generateUUID(): string {
  // 优先使用crypto.randomUUID()（现代浏览器支持）
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // 备用方案：使用crypto.getRandomValues()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)

    // 设置版本号（4）和变体位
    if (array[6] !== undefined) {
      array[6] = (array[6] & 0x0f) | 0x40 // 版本4
    }
    if (array[8] !== undefined) {
      array[8] = (array[8] & 0x3f) | 0x80 // 变体
    }

    // 转换为UUID字符串格式
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-')
  }

  // 最后的备用方案：使用Math.random()（不推荐用于安全场景）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
