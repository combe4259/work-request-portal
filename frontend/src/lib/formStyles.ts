export const inputCls = (hasError = false) =>
  `w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

export const textareaCls = (hasError = false) =>
  `w-full px-3 py-2.5 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`

export const selectCls = (hasError = false) =>
  `w-full h-9 px-3 text-[13px] border rounded-lg focus:outline-none focus:ring-1 transition-colors appearance-none cursor-pointer bg-white ${
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-brand focus:ring-brand/20'
  }`
