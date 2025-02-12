(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (Buffer){(function (){
var sha3 = require('js-sha3').keccak_256
var uts46 = require('idna-uts46-hx')

function namehash (inputName) {
  // Reject empty names:
  var node = ''
  for (var i = 0; i < 32; i++) {
    node += '00'
  }

  name = normalize(inputName)

  if (name) {
    var labels = name.split('.')

    for(var i = labels.length - 1; i >= 0; i--) {
      var labelSha = sha3(labels[i])
      node = sha3(new Buffer(node + labelSha, 'hex'))
    }
  }

  return '0x' + node
}

function normalize(name) {
  return name ? uts46.toAscii(name, {useStd3ASCII: true, transitional: false}) : name
}

function labelhash(name) {
  return '0x' + sha3(name);
}

exports.hash = namehash
exports.normalize = normalize
exports.labelhash = labelhash

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3,"idna-uts46-hx":5,"js-sha3":7}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":2,"buffer":3,"ieee754":6}],4:[function(require,module,exports){
/* This file is generated from the Unicode IDNA table, using
   the build-unicode-tables.py script. Please edit that
   script instead of this file. */

/* istanbul ignore next */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () { return factory(); });
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.uts46_map = factory();
  }
}(this, function () {
var blocks = [
  new Uint32Array([2101761,2100961,2123873,2223617,2098113,2123393,2104929,2223649,2105761,2123713,2123809,2124257,2101377,2101697,2124865,2101857]),
  new Uint32Array([2098374,2098566,2098758,2098950,2099142,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,14680064,14680064,14680064,14680064,14680064]),
  new Uint32Array([2250401,2250433,2250465,2239073,2183298,2250497,2250529,2250561,2241121,2250561,2250593,2239137,2250625,2250657,2250689,2250721]),
  new Uint32Array([2191233,6291456,2191265,6291456,2191297,6291456,2191329,6291456,2191361,2191393,6291456,2191425,6291456,2143457,6291456,2098305]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,0,0,0,0]),
  new Uint32Array([2236225,2118849,2236257,2236289,2236321,2236353,2236385,2236417,2236449,2236481,2236513,2232929,2236545,2236577,2236609,2236641]),
  new Uint32Array([14680064,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2216481,2216513,2216545,2216577,2216609,2216641,2216673,2216705,2216737,2216769,2216801,2216833,2216865,2216897,2216929,2216961]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,6291456,0,0,0,0,0]),
  new Uint32Array([2246849,2246881,2246913,2182082,2246945,2238689,2246977,2247009,2247041,2247073,2238721,2247105,2247137,2182146,2238753,2247169]),
  new Uint32Array([2220641,2115969,2116065,2220673,2220705,2116161,2220737,2116257,2116353,2220769,2116449,2116545,2116641,2116737,2116833,2220801]),
  new Uint32Array([2184194,2184258,2252993,2253025,2241505,2253057,2253089,2253121,2253153,2253185,2253217,2184322,2253249,2184386,2253281,0]),
  new Uint32Array([6291456,2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393,2195425]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,0,6291456,6291456,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2229537,2229569,2229601,2229633,2229665,2229697,2229729,2229761,2229793,2229825,2229857,2229889,2229921,2229953,2229985,2230017]),
  new Uint32Array([2247809,2247841,2247841,2247841,2182402,2247873,2247905,2247937,2182466,2247969,2248001,2248033,2248065,2248097,2248129,2248161]),
  new Uint32Array([0,0,0,0,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0]),
  new Uint32Array([2218465,2218497,2218529,2218561,2218593,2218625,2119713,2218657,2218689,2218721,2218753,2218785,2218817,2218849,2218881,2218913]),
  new Uint32Array([2115009,2110337,2115201,2115297,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297]),
  new Uint32Array([2148034,2148098,2148162,2148226,2148290,2148354,2148418,2148482,2148034,2148098,2148162,2148226,2148290,2148354,2148418,2148482]),
  new Uint32Array([2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993,0,2098241,2110209,2110273,2107553,0]),
  new Uint32Array([2230049,2230081,2218401,2230113,2230145,2230177,2230209,2220097,2220097,2230241,2119713,2230273,2230305,2230337,2230369,2230401]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,0,6291456]),
  new Uint32Array([2228001,2228033,2228065,2228097,2228129,2228161,2228193,2228225,2228257,2228289,2228321,2228353,2228385,2228417,2228449,2228481]),
  new Uint32Array([2141282,2161474,2161538,2161602,2136098,2161666,2161730,2161794,2161858,2161922,2161986,2162050,2140514,2162114,2162178,2136578]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2146242,6291456,6291456,6291456,0,0,0]),
  new Uint32Array([2212993,6291456,2213025,6291456,2213057,6291456,2213089,6291456,2213121,6291456,2213153,6291456,2213185,6291456,2213217,6291456]),
  new Uint32Array([6291456,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,23068672,6291456,6291456]),
  new Uint32Array([2179650,2179714,2179778,2179842,2179906,2179970,2180034,2180098,2180162,2180226,2180290,2180354,2180418,2180482,2180546,2180610]),
  new Uint32Array([2191777,2191809,6291456,2191841,2191873,6291456,2191905,2191937,2191969,6291456,6291456,6291456,2192001,2192033,6291456,2192065]),
  new Uint32Array([2240897,2240929,2240961,2240993,2241025,2241057,2241089,2241121,2241153,2239137,2241185,2239169,2241217,2241249,2241281,2241313]),
  new Uint32Array([2204097,6291456,2211841,6291456,6291456,2211873,6291456,6291456,6291456,6291456,6291456,6291456,2113761,2102593,2211905,2211937]),
  new Uint32Array([2113569,2194625,2113761,2098177,2194657,2194689,2194721,2115009,2115201,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2255265,2255297,2255329,2255361,2255393,2255425,2255457,2186626,2233505,2255489,2255521,2255553,2255585,2255617,2255649,2240033]),
  new Uint32Array([23068672,23068672,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,23068672,23068672,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([0,0,2149122,2149186,2149250,0,6291456,2149314,2209889,2195041,2149121,2149249,2149186,10531586,10497922,0]),
  new Uint32Array([2239169,2239201,2239233,2239265,2239297,2239329,2239361,2239393,2239425,2239457,2239489,2239521,2107169,2239553,2239585,2239617]),
  new Uint32Array([2097729,2107745,2107745,2107745,2107745,2133153,2133153,2133153,2133153,2107809,2107809,2162689,2162689,2107681,2107681,2162977]),
  new Uint32Array([2203393,2203425,2203457,2203489,2203521,2203553,2203585,2203617,2203649,2203681,2203713,0,0,2203745,2203777,2203809]),
  new Uint32Array([2247201,2247233,2182210,2247265,2247297,2246145,2182274,2247329,2247361,2247393,2247425,2240481,2182338,2214177,2247457,2247489]),
  new Uint32Array([2226913,2226945,2204321,2226977,2227009,6291456,2227041,6291456,2227073,6291456,2227105,6291456,2227137,6291456,2227169,6291456]),
  new Uint32Array([23068672,6291456,6291456,6291456,23068672,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([0,0,0,0,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([14680064,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049]),
  new Uint32Array([6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,0,0]),
  new Uint32Array([2172290,2172354,2172418,2172482,2172546,2172610,2172674,2172738,2172802,2172866,2172930,2172994,2173058,2173122,2173186,2173250]),
  new Uint32Array([10501859,10501955,10502051,10502147,10502243,10502339,10502435,10502531,10502627,10502723,10502819,10502915,10503011,10503107,10503203,10503299]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,0,23068672,23068672,0,0,23068672,23068672,23068672,6291456,0]),
  new Uint32Array([2216993,2217025,2217057,2217089,2217121,2217153,2217185,2217217,2217249,2217281,2217313,2217345,2217377,2217409,2217441,2217473]),
  new Uint32Array([2256385,2256417,2256449,2256481,2217953,2187138,2256513,2256545,2256577,2256609,2256641,2187202,2187266,2256673,2256705,2256737]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2150530]),
  new Uint32Array([2241921,2254113,2185346,2239649,2185410,2185474,2238273,2254145,2254177,2239745,2254209,2254241,2185538,2185602,2185602,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2148033,2148097,2148161,2148225,2148289,2148353,2148417,2148481]),
  new Uint32Array([10569441,2243905,0,10503969,10583521,10538049,10538177,2243937,2243969,0,0,0,0,0,0,0]),
  new Uint32Array([0,0,0,2243777,2243777,2243777,2243777,2144321,2144321,2159841,2159841,2159905,2159905,2144322,2243809,2243809]),
  new Uint32Array([2251521,2251553,2251585,2251617,2251649,2251681,2251713,2251745,2231233,2241377,2251777,2251809,2251841,2183554,2251873,2251905]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2117121,2117217,2117313,2117409,2117505,2117601,2117697,2117793,2117889,2117985,2118081,2118177,2150786,2150850,2223169,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,0,6291456,6291456,6291456,6291456,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2188290,2258113,2188354,2188418,2188482,2219681,2258145,2219809,2258177,2258209,2258241,2258273,2219969,2188546,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,6291456,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456]),
  new Uint32Array([2107233,2098241,2110209,2110273,2107553,0,2102625,2113761,2107201,2107297,2107329,2114145,2110049,2114337,2114433,2098177]),
  new Uint32Array([6291456,6291456,6291456,2145922,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,2145986,6291456,6291456]),
  new Uint32Array([2195105,2195265,2195585,2195073,2195745,2195617,2195457,6291456,2195809,6291456,2195841,6291456,2195873,6291456,2195905,6291456]),
  new Uint32Array([2107201,2107297,2107329,2114145,2110049,2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297]),
  new Uint32Array([2171010,2171074,2171138,2171202,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2142051,2142147,2142243,2142339,2142435,2142531,2142627,2142723,2142819,0,0,0,0,0,0,0]),
  new Uint32Array([10510019,10510115,10510211,10510307,2223073,2223105,2215681,2223137,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2163202,2163266,2133218,2163330,2160578,2160642,2163394,2163458,2160770,2163522,2160834,2160898,2161474,2161538,2161666,2161730]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2211137,2211169,2211201,2211233,2211265,2211297,2211329,2211361,2211393,2211425,2211457,2211489,2211521,2211553,2211585,0]),
  new Uint32Array([2243457,2243457,2243489,2243489,2243489,2243489,2243521,2243521,2243521,2243521,2243553,2243553,2243553,2243553,2243585,2243585]),
  new Uint32Array([2137026,2097506,2132547,2132643,2132739,2164610,2164674,2164738,2164802,2164866,2164930,2164994,2165058,2165122,2165186,2134978]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,23068672]),
  new Uint32Array([2195329,2153665,2195361,2195393,2195425,2195457,2195489,2195521,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2245729]),
  new Uint32Array([2154754,2154818,2154882,2154946,2141986,2155010,2155074,2129154,2155138,2129154,2155202,2155266,2155330,2155394,2155458,2155394]),
  new Uint32Array([2158722,2158786,0,2158850,2158914,0,2158978,2159042,2159106,2131778,2159170,2159234,2159298,2159362,2159426,2159490]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2197281,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2181890,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2230433,2230465,2230497,2230529,2230561,2230593,2230625,2230657,2230689,2230721,2230753,2230785,2230817,2230849,2230881,2230913]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,6291456,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,6291456,6291456,6291456]),
  new Uint32Array([0,0,0,0,0,23068672,23068672,23068672,0,0,0,0,2145538,2145602,0,6291456]),
  new Uint32Array([2110049,2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993,2107233,2098241]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672]),
  new Uint32Array([2160066,2160130,2160194,2160002,2160258,2160322,2141378,2138306,2160386,2160450,2160514,2132834,2132930,2133122,2133218,2160578]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,23068672,23068672,6291456,0,0]),
  new Uint32Array([2210017,6291456,6291456,6291456,6291456,2098241,2098241,2110209,2102625,2113761,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2195489,2195457,2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456]),
  new Uint32Array([2107201,2107297,2107329,2114145,0,2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297]),
  new Uint32Array([2147522,2147586,2147650,2147714,2147778,2147842,2147906,2147970,2147522,2147586,2147650,2147714,2147778,2147842,2147906,2147970]),
  new Uint32Array([6291456,6291456,6291456,2209569,0,0,6291456,6291456,2209601,2209633,2209665,2195009,0,10497923,10498019,10498115]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,23068672,6291456,0,0,0,0,0,0,0,0]),
  new Uint32Array([2238017,6291456,2238049,6291456,6291456,2238081,2238113,2238145,2238177,2238209,2238241,2238273,2238305,2238337,2217345,6291456]),
  new Uint32Array([2122018,2122114,2151746,2151810,2151874,2151938,2152002,2152066,2152130,2121891,2121987,2122083,2152194,2122179,2152258,2122275]),
  new Uint32Array([0,23068672,0,0,0,0,0,0,0,2145282,2145346,2145410,6291456,0,2145474,0]),
  new Uint32Array([2152386,2123139,2105412,2105540,2097986,2100261,2097990,2100421,2100323,2100581,2100741,2105668,2123235,2123331,2123427,2105796]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2225057,2227393,2211649,2227425]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,23068672,23068672,10538946,10539010,6291456,6291456,2150466]),
  new Uint32Array([6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,0,0]),
  new Uint32Array([2099910,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2201857,2201889,2144161,2201921,2201953,2201985,2202017,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,2209345,0,2209377,0,2209409,0,2209441]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,10538178,10538242,10538306,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2195425,2195457,2195489,2195521,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2245729,2195201,2195265,2195297,2195617]),
  new Uint32Array([6291456,6291456,23068672,23068672,0,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0]),
  new Uint32Array([2192097,6291456,2192129,6291456,2192161,6291456,2192193,2192225,6291456,2192257,6291456,6291456,2192289,6291456,2192321,2192353]),
  new Uint32Array([6291456,0,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,0,0,23068672,6291456,23068672,23068672]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,23068672,6291456,6291456]),
  new Uint32Array([2249345,2182786,2249377,2249409,0,2214913,2249441,2249473,2214977,2249505,2249537,2182850,2249569,2182914,2249601,2249633]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,2144130,6291456,6291456,6291456,0,0,6291456,6291456,6291456]),
  new Uint32Array([2199041,6291456,2199073,6291456,2199105,6291456,2199137,6291456,2199169,6291456,2199201,6291456,2199233,6291456,2199265,6291456]),
  new Uint32Array([2186306,2254945,2254977,2255009,2255041,2255073,2255105,2186370,2186434,2186498,2186562,2250081,2255137,2255169,2255201,2255233]),
  new Uint32Array([23068672,23068672,23068672,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,0,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456,0,6291456,0,6291456,6291456]),
  new Uint32Array([2101249,2100833,2122561,2100097,2122657,2105089,2097985,2100161,2123233,2123329,2100897,2101601,2100129,2101121,2152801,2101761]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456]),
  new Uint32Array([2136418,2134018,2134690,2138722,2138338,2165250,2165314,2165378,2165442,2134658,2134562,2165506,2134754,2165570,2165634,2165698]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2104130,2104131,6291456,2111906]),
  new Uint32Array([6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,2213633,6291456,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2232417,2232449,2232481,2232513,2232545,2232577,2232609,2232641,2232673,2232705,2232737,2232769,2230561,2232801,2232833,2232865]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,23068672]),
  new Uint32Array([6291456,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2238689,2238721,2238753,2238785,2238817,2238849,2238881,2238913,2238945,2238977,2239009,2239041,2214977,2239073,2239105,2239137]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2134083,2134179,2134275,2134275,2134371,2134371,2134467,2134563,2134563,2134659,2134755,2134755,2134851,2134851,2134947,2135043]),
  new Uint32Array([0,0,0,0,0,0,0,0,0,0,0,0,10501475,10501571,10501667,10501763]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2217953,2217985,2218017,2218049,2218081,2218113,2218145,2218177,2218209,2218241,2218273,2218305,2218337,2218369,2218401,2218433]),
  new Uint32Array([2136001,2097153,2136097,2107681,2134561,2132833,2160705,2133153,2162689,2134945,2161217,2135713,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,10503971,10504034,10504067,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2121795,2126786,2126882,2108514,2127074,2130818,2130914,2131010,2131106,2131202,2131298,2110722,2110626,2150594,2150658,2150722]),
  new Uint32Array([2234529,2242049,2239937,2242081,2242113,2242145,2242177,2242209,2240097,2242241,2238401,2242273,2240129,2232801,2242305,2240161]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,0,0,0,6291456,0,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0]),
  new Uint32Array([2245089,2220161,2244289,2244321,2243905,2245121,2223809,2101409,2106209,2245153,2101633,2122593,2245185,2105441,2101953,2100513]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0]),
  new Uint32Array([2102465,2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937,2102530,2102882,2103010,2103138,2103266,2103394,2103522]),
  new Uint32Array([2233409,2218465,2233441,2233473,2233505,2233537,2233569,2233601,2233633,2233665,2233697,2233729,2233761,2233793,2233825,2233857]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,14680064,14680064,14680064,14680064,14680064,14680064]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456]),
  new Uint32Array([2107329,2190625,2110049,2191553,2203969,2204001,2114337,2110177,2110145,2204033,2192001,2102593,2204065,2195105,2195137,2195169]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,0,0]),
  new Uint32Array([2198401,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,2198433,6291456,2198465,6291456,2198497,6291456]),
  new Uint32Array([2194145,6291456,2194177,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2194209,2194241,6291456,2194273,2194305,6291456]),
  new Uint32Array([2235745,2235777,2235809,2235841,2220065,2235873,2235905,2235937,2235969,2236001,2236033,2236065,2236097,2236129,2236161,2236193]),
  new Uint32Array([23068672,6291456,6291456,6291456,6291456,2144194,2144258,2144322,2144386,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2195329,2153665,2195361,2195393,2195425,2195457,2195489,2195265,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2245697]),
  new Uint32Array([10491716,10491844,10491972,10492100,10492228,10492356,10492484,10492612,0,0,0,0,0,0,0,0]),
  new Uint32Array([2225953,6291456,2225985,6291456,2226017,6291456,2226049,6291456,2226081,6291456,2226113,6291456,2226145,6291456,2226177,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,0,0,6291456,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2227457,6291456,6291456,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2198785,6291456,2198817,6291456,2198849,6291456,2198881,6291456,2198913,6291456,2198945,6291456,2198977,6291456,2199009,6291456]),
  new Uint32Array([2243105,2243105,2243137,2243137,2243137,2243137,2243169,2243169,2243169,2243169,2243201,2243201,2243201,2243201,2243233,2243233]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,6291456,23068672]),
  new Uint32Array([2190977,6291456,2191009,6291456,2191041,6291456,2191073,6291456,2191105,6291456,2191137,6291456,2191169,6291456,2191201,6291456]),
  new Uint32Array([2207073,6291456,2207105,6291456,2207137,6291456,6291456,6291456,6291456,6291456,2146946,2206305,6291456,6291456,2143106,6291456]),
  new Uint32Array([23068672,23068672,23068672,0,0,0,0,23068672,23068672,0,0,23068672,23068672,23068672,0,0]),
  new Uint32Array([2149185,2245697,2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393]),
  new Uint32Array([2195489,2195265,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2245697,2148609,2195105,2195137,2195169,2195201,2195233]),
  new Uint32Array([6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,6291456,23068672,23068672]),
  new Uint32Array([6291456,6291456,23068672,23068672,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,2146050,6291456,6291456,6291456,6291456,2146114,6291456,6291456,6291456,6291456,2146178,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,2102340,6291456,6291456,6291456,6291456,6291456,6291456,6291456,10485857]),
  new Uint32Array([2118369,2213761,2213793,2213825,2213857,2213889,2118465,2213921,2213953,2213985,2214017,2119041,2214049,2214081,2214113,2214145]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,23068672,23068672,23068672,6291456,23068672,23068672,23068672,23068672,23068672,0,0]),
  new Uint32Array([2115009,2110337,2115201,2115297,2245633,2245665,0,0,2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265]),
  new Uint32Array([6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,0,0,0,0]),
  new Uint32Array([2102561,2102625,0,0,2103297,2103425,2103553,2103681,2103809,2103937,10598561,2209985,10504033,10491329,10491425,2114145]),
  new Uint32Array([2195937,6291456,2195969,6291456,2196001,6291456,2196033,6291456,2196065,6291456,2196097,6291456,2196129,6291456,2196161,6291456]),
  new Uint32Array([2243841,2243841,2243873,2243873,2159969,2159969,2159969,2159969,2097217,2097217,2159554,2159554,2159618,2159618,2159682,2159682]),
  new Uint32Array([2254273,2185666,2254305,2254337,2254369,2185730,2254401,2254433,2254465,2254497,2254529,2185794,2254561,2254593,2254625,2254657]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,2213697]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,0,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2102561,2102465,2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937,10503969,10583521,10633217,10504033,10633249,10538177]),
  new Uint32Array([2118369,2118465,2118561,2118657,2118753,2118849,2118945,2119041,2119137,2119233,2119329,2119425,2119521,2119617,2119713,2119809]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,2220193,6291456,2119233,2220225,2220257,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,23068672,23068672,23068672,0,23068672,23068672,0,0,0,0,0,23068672,23068672,23068672,23068672]),
  new Uint32Array([0,0,23068672,23068672,6291456,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2097281,2107649,2097729,2107809,0,2097601,2162977,2107745,2135137,2097505,2107617,2097185,2097697,2137633,2097633,2097441]),
  new Uint32Array([0,23068672,23068672,18923522,23068672,18923586,18923650,18885955,18923714,18886051,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2232897,2232929,2232961,2232993,2233025,2233057,2233089,2233121,2233153,2233185,2233217,2233249,2233281,2233313,2233345,2233377]),
  new Uint32Array([2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,14680064,14680064,14680064,14680064,14680064]),
  new Uint32Array([2226337,6291456,2226369,6291456,2226401,6291456,2226433,6291456,6291456,6291456,6291456,2226465,6291456,2204225,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,0,0]),
  new Uint32Array([2242305,2242337,2218177,2187330,2256769,2256801,2256833,2256865,2187394,2187458,2256897,2256929,2256961,2187522,2256993,2242369]),
  new Uint32Array([2110371,2110467,2102468,2110563,2110659,2110755,2110851,2110947,2111043,2111139,2111235,2111331,2111427,2111523,2111619,2102466]),
  new Uint32Array([2103297,2103425,2103553,2103681,2103809,2103937,2102561,2102465,2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2149762,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2192897,6291456,2192929,6291456,2192961,6291456,2192993,6291456,2193025,6291456,2193057,6291456,2193089,6291456,2193121,6291456]),
  new Uint32Array([6291456,6291456,23068672,23068672,23068672,6291456,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2207681,6291456,2207713,6291456,2207745,6291456,2207777,6291456,2207809,6291456,2207841,6291456,2207873,6291456,2207905,6291456]),
  new Uint32Array([2161794,2162050,2140514,2162114,2162178,2097666,2097186,2097474,2163586,2134306,2163650,2163714,2138018,2163778,2162306,2162370]),
  new Uint32Array([2237153,2237185,2237217,2237249,2237281,2237313,2237345,2217121,2237377,2237409,2237441,2237473,2237505,2237537,2237569,2237601]),
  new Uint32Array([2249665,2249697,2249729,2249761,2249793,2249825,2249857,2249889,2249921,2182978,2249953,2249985,2250017,2250049,2231201,2183042]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,2148546,2148610,2148674,0,6291456,2148738,2209473,2209505,2148545,2148673,2148610,10497634,2144097,10497634]),
  new Uint32Array([2208193,6291456,2208225,6291456,2208257,6291456,2208289,6291456,2208321,6291456,2208353,6291456,2208385,6291456,2208417,6291456]),
  new Uint32Array([2155522,2155586,0,2155650,2155714,2155778,2107460,0,2155842,2155906,2155970,2127170,2156034,2156098,2128130,2156162]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,0,6291456,6291456,6291456,6291456]),
  new Uint32Array([0,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,6291456,6291456,6291456]),
  new Uint32Array([2103809,2103937,2102561,2102465,2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937,2102561,2102465,2098337,2103169]),
  new Uint32Array([23068672,23068672,0,23068672,23068672,23068672,23068672,23068672,6291456,0,0,0,0,0,0,0]),
  new Uint32Array([2102625,2102626,2102627,2150146,2102593,2102594,2102595,2102596,2150210,2110337,2111714,2111715,2107297,2107233,2098241,2107329]),
  new Uint32Array([2241825,2185026,2185090,2185154,2185218,2253921,2253953,2253953,2241857,2242689,2253985,2254017,2254049,2185282,2254081,2231777]),
  new Uint32Array([0,0,0,0,10531586,10497251,2148673,2143329,2194977,2148993,2195009,0,2195041,0,2195073,2149249]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2196929,2196993,2197313,2197409,2197441,2197441,2197697,2197921,2202369,0,0,0,0,0,0,0]),
  new Uint32Array([2183746,2252321,2252353,2252385,2252417,2233409,2252449,2183810,2183874,2183938,2252481,2184002,2252513,2252545,2252577,2252609]),
  new Uint32Array([6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,23068672,23068672,23068672,23068672,6291456]),
  new Uint32Array([2102625,2102625,2107297,2107297,6291456,2114145,2149954,6291456,6291456,2114337,2114433,2098177,2098177,2098177,6291456,6291456]),
  new Uint32Array([2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049,2114337,2114433,2098177]),
  new Uint32Array([2164098,2132834,2132930,2133122,2133218,2164162,2160770,2133922,2132866,2132962,2107746,2133474,2133154,2133890,2133794,2139266]),
  new Uint32Array([6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,0,0,0,0,0,0,0,6291456,6291456,6291456,6291456,0,0,0]),
  new Uint32Array([2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049,2114337,2114433,2098177,2098305,2110177,2110145,2102593]),
  new Uint32Array([2196353,2196385,2196417,2196449,2196481,2196513,2196545,2196577,2196609,2196641,2196673,2196705,2196737,2196769,2196801,2196833]),
  new Uint32Array([2160642,2160706,2160770,2160834,2160898,2133922,2132866,2132962,2107746,2133474,2160962,2133154,2133890,2133794,2139266,2134082]),
  new Uint32Array([2102561,2102465,2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937,10598561,2209985,10504033,10491329,10491425,0]),
  new Uint32Array([0,0,0,0,0,2227361,6291456,6291456,2190177,2190753,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,4292673,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2195777]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([10598465,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,0,0,23068672,6291456,23068672,23068672]),
  new Uint32Array([2204545,2192065,2204577,2204609,2192257,2204641,2194401,2192385,2204673,2192417,2194433,2115297,2204705,2204737,2192513,2195265]),
  new Uint32Array([2244801,2166241,2166241,2166305,2166305,2244833,2244833,2166369,2166369,2159553,2159553,2159553,2159553,2097281,2097281,2107649]),
  new Uint32Array([0,0,0,0,6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2227489,2227521,2227553,2227585,2227617,2227649,2227681,2227713,2227745,2227777,2227809,2227841,2227873,2227905,2227937,2227969]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,23068672,0,0,0,0,23068672]),
  new Uint32Array([2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393,2195425,2195457,2195489,2195521,2195521,2195553,2195585,2195617]),
  new Uint32Array([2220641,2115969,2116065,2220673,2220705,2116161,2220737,2116257,2116353,2220769,2116449,2116545,2116641,2116737,2116833,0]),
  new Uint32Array([2214177,2214209,2214241,2214273,2214305,2214337,2214369,2119233,2214401,2214433,2214465,2214497,2214529,2214561,2214593,2119809]),
  new Uint32Array([2238113,2241633,2241665,2241697,2241729,2241761,2238145,2241793,2241825,2241857,2241889,2241921,2241953,2239809,2241985,2242017]),
  new Uint32Array([2110049,2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2098209,0,2107233,2098241]),
  new Uint32Array([2162370,2162434,2137442,2162498,2162562,2139042,2133666,2160930,2137026,2162626,2139810,2162690,2162754,2162818,10520579,10520675]),
  new Uint32Array([6291456,6291456,6291456,23068672,23068672,23068672,23068672,6291456,6291456,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2147009,2147073,2147137,2147201,2147265,2147329,2147393,2147457]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,2144450,2144514,2144578,2144642,2144706,2144770,2144834,2144898]),
  new Uint32Array([23068672,23068672,0,23068672,23068672,0,23068672,23068672,23068672,23068672,23068672,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,16777216,16777216,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,2102338,2102339,6291456,2109698,2109699,6291456,6291456,6291456,6291456,10538050,6291456,10538114,6291456]),
  new Uint32Array([6291456,2192673,6291456,2192705,6291456,2192737,6291456,2192769,6291456,2192801,6291456,2192833,6291456,6291456,2192865,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2195585,2195617,2195649,2195681,2149185,2245697,2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265,2144097,2195297]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,18924098,23068672,23068672,23068672,0,6291456,6291456]),
  new Uint32Array([2210113,2210145,2210177,2210209,2210241,2210273,2210305,2210337,2210369,2210401,2210433,2210465,2210497,2210529,2210561,2210593]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,23068672]),
  new Uint32Array([0,0,0,0,0,0,0,2202081,0,0,0,0,0,2202113,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2165762,2164610,2164674,2164738,2164802,2164866,2164930,2164994,2165058,2165122,2165186,2134978,2136418,2134018,2134690,2138722]),
  new Uint32Array([2208449,6291456,2208481,6291456,2208513,6291456,2208545,6291456,2208577,6291456,2208609,6291456,2208641,6291456,2208673,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,6291456,6291456,6291456,6291456]),
  new Uint32Array([0,0,0,0,0,0,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2174338,2174402,2174466,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2218305,2142561,2246529,2246561,2246593,2246625,2120097,2119329,2246657,2246689,2246721,2246753,0,0,0,0]),
  new Uint32Array([2200289,6291456,2200321,6291456,2200353,6291456,2200385,6291456,2200417,6291456,2200449,6291456,2200481,6291456,2200513,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,2143426,2143426,2143426,2143490,2143490,2143490,2143554,2143554,2143554,2192609,6291456,2192641]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([10633377,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,2213729,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2208897,2208929,2208961,2208993,2209025,2209057,2209089,2209121]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,0,0,0,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,23068672,6291456]),
  new Uint32Array([2200033,6291456,2200065,6291456,2200097,6291456,2200129,6291456,2200161,6291456,2200193,6291456,2200225,6291456,2200257,6291456]),
  new Uint32Array([23068672,23068672,23068672,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([6291456,6291456,23068672,6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2219457,2219489,2219521,2219553,2219585,2219617,2219649,2219681,2219713,2219745,2219777,2219809,2219841,2219873,2219905,2219937]),
  new Uint32Array([6291456,6291456,6291456,0,0,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2097185,2097697,2097697,2097697,2097697,2137633,2137633,2137633,2137633,2097377,2097377,2097377,2097377,2097601,2097601,2097217]),
  new Uint32Array([2246209,2246241,2216577,2246273,2246305,2246337,2246369,2246401,2246433,2118369,2118561,2246465,2223457,2222849,2223489,2246497]),
  new Uint32Array([2097217,2097505,2097505,2097505,2097505,2166210,2166210,2166274,2166274,2166338,2166338,2097858,2097858,0,0,2097152]),
  new Uint32Array([23068672,6291456,23068672,23068672,23068672,6291456,6291456,23068672,23068672,6291456,6291456,6291456,6291456,6291456,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,0]),
  new Uint32Array([2229025,2229057,2229089,2229121,2229153,2229185,2229217,2229249,2229281,2229313,2229345,2229377,2229409,2229441,2229473,2229505]),
  new Uint32Array([2100901,2105924,2123523,2101123,2123619,2152450,2152514,2100674,2152578,2123715,2123811,2101061,2123907,2106052,2101221,2124003]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2098241,2110209,2191713,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,6291456,2110049,2193921,2114337,2098177]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2166402,2166466,2166530,2166594,2166658,2166722,2166786,2166850,2166914,2166978,2167042,2167106,2167170,2167234,2167298,2167362]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,23068672,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456,6291456,0,0,0,0,0]),
  new Uint32Array([2230945,2230977,2231009,2231041,2231073,2231105,2231137,2231169,2231201,2231233,2231265,2231297,2231329,2231361,2231393,2231425]),
  new Uint32Array([2189569,6291456,2189601,6291456,2189633,6291456,2189665,6291456,2189697,6291456,2189729,6291456,2189761,6291456,2189793,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,23068672,23068672,6291456]),
  new Uint32Array([2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,0,23068672,23068672,23068672,0,0]),
  new Uint32Array([2098209,2110209,2110049,2110337,2191745,2113569,2107201,2107297,2107329,2114145,2114337,2098305,2110177,0,0,0]),
  new Uint32Array([2202401,2202433,2202465,2202497,2202529,2202561,2202593,2202625,2202657,2202689,2202721,2202753,2202145,2202785,2202817,2202849]),
  new Uint32Array([2110209,2110273,0,2107329,2110049,2157761,2157953,2158017,2158081,2102625,6291456,2110275,2195457,2195137,2195137,2195457]),
  new Uint32Array([2205793,6291456,2205825,6291456,2205857,6291456,2205889,6291456,2205921,6291456,2205953,6291456,2205985,6291456,2206017,6291456]),
  new Uint32Array([23068672,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,18874368,18874368,18874368,0,0]),
  new Uint32Array([2167426,2167490,2167554,2167618,2167682,2167746,2167810,2167874,2167938,2168002,2168066,2168130,2168194,2168258,2168322,2168386]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2136001,2097153,2136097,0,2134561,2132833,2160705,2133153,0,2134945,0,2135713,0,0,0,0]),
  new Uint32Array([0,2199297,6291456,2199329,6291456,2199361,6291456,2199393,6291456,2199425,6291456,2199457,6291456,2199489,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2128035,2127394,2128131,2128227,2128323,2127490,2128419,2107331,2107332,2127202,2128515,2128611,2128707,2098179,2098181,2098182]),
  new Uint32Array([23068672,23068672,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,23068672,6291456,2145730,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,0,0]),
  new Uint32Array([10498403,10498499,2107233,2149826,6291456,10498595,10498691,2191777,6291456,2149890,2107553,2113569,2113569,2113569,2113569,2190177]),
  new Uint32Array([2222337,2222369,2222401,2222433,2222465,2222497,2222529,2222561,2222593,2222625,2222657,2222689,2222721,2222753,2222785,0]),
  new Uint32Array([2242977,2242977,2243009,2243009,2243009,2243009,2243041,2243041,2243041,2243041,2243073,2243073,2243073,2243073,2243105,2243105]),
  new Uint32Array([6291456,6291456,2098337,2103169,10531586,2153665,6291456,6291456,10531650,2102465,2110049,6291456,2108355,2108451,2108547,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0]),
  new Uint32Array([2215617,2215649,2215681,2215713,2215745,2215777,2215809,2119905,2215841,2119329,2119617,2215873,2215905,2215937,2215969,2216001]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,0,0,23068672,23068672,23068672,23068672,6291456]),
  new Uint32Array([2223393,2121537,2223425,2153505,2222817,2222849,2222881,2223457,2223489,2223521,2223553,2120961,2121057,2121153,2121249,2121345]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([0,10538049,10633505,10633089,10633313,10633345,10633121,10633537,10491329,10491425,10633153,10598561,10569441,2244577,2220161,10498433]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2195649,2195681,2149185,2245729,2195201,2195265,2195297,2195617,2195489,2195457,2195873,2195873,0,0,2102561,2102465]),
  new Uint32Array([2212737,6291456,2212769,6291456,2212801,6291456,2212833,6291456,2212865,6291456,2212897,6291456,2212929,6291456,2212961,6291456]),
  new Uint32Array([0,6291456,6291456,0,6291456,0,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456]),
  new Uint32Array([2223585,2150914,2150978,2151042,2151106,2151170,2108418,2151234,2150690,2151298,2151362,2151426,2151490,2151554,2151618,2151682]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,0,0,0,0,0]),
  new Uint32Array([2237633,2237665,2237697,2237729,2237761,2237793,2237825,2237857,2217921,2237889,2218017,2237921,2237953,2237985,6291456,6291456]),
  new Uint32Array([2115201,0,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145]),
  new Uint32Array([2221825,2221857,2221889,2221921,2221953,2221985,2222017,2222049,2222081,2222113,2222145,2222177,2222209,2222241,2222273,2222305]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,6291456]),
  new Uint32Array([0,2107649,2097729,0,2097377,0,0,2107745,0,2097505,2107617,2097185,2097697,2137633,2097633,2097441]),
  new Uint32Array([10554498,2165954,10520578,6291456,10520674,0,10520770,2132546,10520866,2132642,10520962,2132738,10521058,2166018,10554690,2166146]),
  new Uint32Array([2129506,2129602,2129698,2129794,2129890,2129986,2130082,2130178,2130274,2129379,2129475,2129571,2129667,2129763,2129859,2129955]),
  new Uint32Array([10503011,10503107,10503203,10503299,10503395,10503491,10503587,10503683,10503779,10503875,2141859,2107233,2098177,2155778,2181442,6291456]),
  new Uint32Array([2144097,2195297,2195329,2153665,2195361,2195393,2195425,2195457,2195489,2195265,2195521,2195553,2195585,2195617,2195649,2195681]),
  new Uint32Array([2221345,2221377,2221409,2221441,0,2221473,2221505,2221537,2221569,2221601,2221633,2221665,2221697,2221729,2221761,2221793]),
  new Uint32Array([10485857,6291456,2220161,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2217505,2217537,2217569,2121633,2121729,2217601,2217633,2217665,2217697,2217729,2217761,2217793,2217825,2217857,2217889,2217921]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,10532290,10532354,10532418,10532482,10532546,10532610,6291456,6291456]),
  new Uint32Array([6291456,2148673,6291456,2194977,6291456,2148993,6291456,2195009,6291456,2195041,6291456,2195073,6291456,2149249,0,0]),
  new Uint32Array([23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,6291456,23068672,23068672]),
  new Uint32Array([14680064,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,14680064,14680064]),
  new Uint32Array([2177602,2177666,2177730,2177794,2177858,2177922,2177986,2178050,2178114,2178178,2178242,2178306,2178370,2178434,2178498,2178562]),
  new Uint32Array([2233889,2214753,2233921,2233953,2233985,2234017,2234049,2234081,2234113,2234145,2214241,2234177,2234209,2234241,2234273,2234305]),
  new Uint32Array([2187586,2187650,2257025,2257057,2257089,2187714,2257121,2257153,2257185,2257217,2257249,2257281,2257313,2187778,2257345,2257377]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,0,0]),
  new Uint32Array([6291456,6291456,23068672,23068672,23068672,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2132835,2132931,2132931,2133027,2133123,2133219,2133315,2133411,2133507,2133507,2133603,2133699,2133795,2133891,2133987,2134083]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672]),
  new Uint32Array([0,10569410,10569474,10569538,10569602,10569666,10569730,10569794,10569858,10569922,10569986,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,2224993,6291456,2225025,6291456,2225057,6291456,2225089,6291456,2225121,6291456,2225153,6291456,2225185,6291456]),
  new Uint32Array([2215297,2183106,2183106,2250081,2250113,2250113,2250145,2183170,2183234,2250177,2250209,2250241,2250273,2250305,2250337,2250369]),
  new Uint32Array([6291456,2143618,2143618,2143618,2193153,6291456,2193185,2193217,2193249,6291456,2193281,6291456,2193313,6291456,2193345,6291456]),
  new Uint32Array([2201441,2201473,2201505,2201537,2157185,2201569,2157217,2201601,2201633,2201665,2201697,2201729,2201761,2201793,2157377,2201825]),
  new Uint32Array([0,0,2137347,2137443,2137539,2137635,2137731,2137827,2137827,2137923,2138019,2138115,2138211,2138211,2138307,2138403]),
  new Uint32Array([2195201,2195265,2195297,2195617,2195489,2195457,2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265,2144097,2195297]),
  new Uint32Array([23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2190081,6291456,2190113,6291456,2190145,6291456,2190177,6291456,2190209,6291456,2190241,6291456,2190273,6291456,2190305,6291456]),
  new Uint32Array([0,0,0,2157186,2157250,2157314,2157378,2157442,0,0,0,0,0,2157506,23068672,2157570]),
  new Uint32Array([10485857,10485857,10485857,10485857,10485857,10485857,10485857,10485857,10485857,10485857,10485857,2097152,4194304,4194304,0,0]),
  new Uint32Array([0,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456]),
  new Uint32Array([6291456,6291456,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2104516,2104644,2104772,2122371,2104900,2122467,2122563,2100101,2105028,2122659,2122755,2122851,2105156,2105284,2122947,2123043]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2210049,2210081,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2242849,2242849,2242881,2242881,2242881,2242881,2242913,2242913,2242913,2242913,2242945,2242945,2242945,2242945,2242977,2242977]),
  new Uint32Array([6291456,0,6291456,2145154,0,6291456,2145218,0,6291456,6291456,0,0,23068672,0,23068672,23068672]),
  new Uint32Array([2188609,2188641,2188673,2188705,2188737,2188769,2188801,2188833,2188865,2188897,2188929,2188961,2188993,2189025,2189057,2189089]),
  new Uint32Array([2241633,2253665,2253697,2253729,2253761,2184642,2253793,2184706,2232961,2184770,2253825,2184834,2184898,2184962,2253857,2253889]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([2241345,2238049,2231233,2241377,2241409,2215937,2233409,2236033,2241441,2241473,2239393,2241505,2239425,2241537,2241569,2241601]),
  new Uint32Array([2197377,2197409,2197441,2197473,2197505,2197537,2197569,2197601,2197633,2197665,2197697,2197729,2197761,2197793,2197825,2197857]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,0,6291456,0,23068672,23068672,23068672,23068672,23068672,23068672,0,0]),
  new Uint32Array([2175554,2175618,2175682,2175746,2175810,2175874,2175938,2176002,2176066,2176130,2176194,2176258,2176322,2176386,2176450,2176514]),
  new Uint32Array([2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937,2102561,2102465,2098337,2103169,2103297,2103425,2103553,2103681]),
  new Uint32Array([2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2102561,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([10537410,10497539,2148866,2148930,2148994,0,6291456,2149058,2209537,2194977,2148865,2148993,2148930,10497635,10497731,10497827]),
  new Uint32Array([2162977,2097633,2097633,2097633,2097633,2134561,2134561,2134561,2134561,2097153,2097153,2097153,2097153,2134945,2134945,2134945]),
  new Uint32Array([0,2244001,2244033,10632673,10632673,10491329,10491425,10632705,10632737,2141857,2141921,2244161,2244193,2244225,2244257,2210049]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([0,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2102017,2100385,2098049,2223681,2125345,2125537,2223713,2100353,2102049,2098145,2102177,2098017,2100481,2100705,2150369,2150433]),
  new Uint32Array([6291456,0,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0]),
  new Uint32Array([2162818,2163842,2163906,2137026,2138082,2162626,2139810,2160066,2160130,2163970,2160194,2164034,2160322,2141378,2138306,2160386]),
  new Uint32Array([2124771,2124867,2124963,2106436,2125059,2125155,2125251,2101861,2106564,2102018,2102021,2106690,2106692,2098052,2125347,2125443]),
  new Uint32Array([2212225,6291456,2212257,6291456,2212289,6291456,2212321,6291456,2212353,6291456,2212385,6291456,2212417,6291456,2212449,6291456]),
  new Uint32Array([2164034,2160386,2164098,2133218,2164162,2160770,2164418,2134082,2164482,2134754,2164546,2162050,2140514,2097666,2138018,2164290]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2150274,6291456,6291456,6291456]),
  new Uint32Array([6291456,23068672,23068672,6291456,23068672,23068672,6291456,23068672,0,0,0,0,0,0,0,0]),
  new Uint32Array([2223841,6291456,2223873,6291456,2223905,6291456,2223937,6291456,2223969,6291456,2202369,6291456,2224001,6291456,2224033,6291456]),
  new Uint32Array([10506947,10507043,10507139,10507235,10507331,10507427,10507523,10507619,10507715,10507811,10507907,10508003,10508099,10508195,10508291,10508387]),
  new Uint32Array([6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2147010,2147074,2147138,2147202,2147266,2147330,2147394,2147458,2147010,2147074,2147138,2147202,2147266,2147330,2147394,2147458]),
  new Uint32Array([2204769,6291456,2204801,6291456,2204833,6291456,2204865,6291456,2204897,6291456,2204929,6291456,2204961,6291456,2204993,6291456]),
  new Uint32Array([2136291,2136387,2136483,2136579,2136579,2136675,2136675,2136771,2136771,2136867,2107715,2136963,2137059,2137155,2133443,2137251]),
  new Uint32Array([2200801,6291456,2200833,6291456,2200865,6291456,2200897,6291456,2200929,6291456,2200961,6291456,2200993,6291456,2201025,6291456]),
  new Uint32Array([23068672,18885986,23068672,23068672,23068672,6291456,23068672,23068672,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672]),
  new Uint32Array([2127202,2153602,2153666,2129250,2153730,2153794,2153858,2153922,2107235,2107204,2153986,2154050,2154114,2154178,2154242,2107522]),
  new Uint32Array([2254689,2254721,2185858,2185922,2254753,2185986,2254785,2186050,2254817,2254849,2239937,2186114,2186178,2254881,2186242,2254913]),
  new Uint32Array([2243745,2243745,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,0,6291456,6291456,6291456,6291456,0,0]),
  new Uint32Array([2195201,2195233,2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393,2195425,2195457,2195489,2195265,2195521,2195553]),
  new Uint32Array([0,2107649,2097729,2107809,0,2097601,2162977,2107745,2135137,2097505,0,2097185,2097697,2137633,2097633,2097441]),
  new Uint32Array([6291456,0,23068672,23068672,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,0,0,0,0,0,0,23068672,0,0,0,0,0,0,0,0]),
  new Uint32Array([2141667,2141763,2097284,2107588,2107716,2107844,2107972,2097444,2097604,2097155,10485778,10486344,2108100,6291456,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,6291456,23068672,6291456,23068672,6291456,6291456,6291456,6291456,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,23068672,6291456,6291456,23068672,23068672,23068672,6291456,0,0,0,0,0]),
  new Uint32Array([2098081,2101249,2100833,2122561,2100097,2122657,2105089,2097985,2100161,2123233,2123329,2100897,2101601,2100129,2101121,2152801]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,6291456]),
  new Uint32Array([2107298,2156226,2128803,2156290,2153858,2128899,2128995,2156354,0,2129091,2156418,2156482,2156546,2156610,2129187,2129283]),
  new Uint32Array([6291456,2192385,2192417,2192449,6291456,2192481,6291456,2192513,2192545,6291456,6291456,6291456,2192577,6291456,6291456,6291456]),
  new Uint32Array([2195585,2195617,2195649,2195681,2149185,2245729,2195201,2195265,2195297,2195617,2195489,2195457,2148609,2195105,2195137,2195169]),
  new Uint32Array([2248193,2248225,2248257,2248289,2248321,2248353,2248353,2240737,2248385,2248417,2248449,2248481,2238913,2248513,2248545,2248577]),
  new Uint32Array([23068672,6291456,23068672,23068672,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2180674,2180738,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456]),
  new Uint32Array([6291456,6291456,6291456,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,23068672,6291456,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2107329,2114145,2110049,2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993]),
  new Uint32Array([0,0,0,0,0,23068672,23068672,0,0,0,0,0,0,0,6291456,0]),
  new Uint32Array([2141187,2141283,2141379,2140899,2135427,2134467,2141475,2141571,0,0,0,0,0,0,0,0]),
  new Uint32Array([2235265,2235297,2235329,2235361,2235393,2235425,2235457,2235489,2235521,2235553,2235585,2235617,2235649,2235681,2235713,2230561]),
  new Uint32Array([0,0,23068672,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2108228,2098372]),
  new Uint32Array([10504163,10504259,10504355,10504451,10504547,10504643,10504739,10504835,10504931,10505027,10505123,10505219,10505315,10505411,10505507,10505603]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2099332,2099524,2099334,2099526,2099718]),
  new Uint32Array([10505699,10505795,10505891,10505987,10506083,10506179,10506275,10506371,10506467,10506563,10506659,10506755,10506851,10492868,10492996,0]),
  new Uint32Array([2231457,2231489,2231521,2231553,2217377,2231585,2231617,2231649,2231681,2231713,2231745,2231777,2231809,2231841,2231873,2231905]),
  new Uint32Array([0,0,0,0,0,23068672,23068672,0,6291456,6291456,6291456,0,0,0,0,0]),
  new Uint32Array([2243233,2243233,2243265,2243265,2243297,2243297,2243329,2243329,2243361,2243361,2243393,2243393,2243425,2243425,2243457,2243457]),
  new Uint32Array([2195297,2195489,2195521,6291456,2195265,2195201,6291456,2196193,6291456,2195521,2196225,6291456,6291456,2196257,2196289,2196321]),
  new Uint32Array([2216033,2216065,2216097,2216129,2119521,2119425,2216161,2216193,2216225,2216257,2216289,2216321,2216353,2216385,2216417,2216449]),
  new Uint32Array([2247521,2247553,2246689,2247585,2247617,2240641,2238785,2238817,2240673,2247649,2247681,2232993,2247713,2238849,2247745,2247777]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,0,23068672,23068672,0,0,23068672,23068672,23068672,0,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456]),
  new Uint32Array([0,0,2097729,0,0,0,0,2107745,0,2097505,0,2097185,0,2137633,2097633,2097441]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,2208705,2208737,2208769,2208801,2208833,2208865,0,0]),
  new Uint32Array([6291456,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,2111811,6291456,6291456,0,0,0,0]),
  new Uint32Array([2191873,2107297,2098305,2110337,2194753,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2219969,2220001,2220033,2220065,2220097,2220129,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2239169,2230337,2153377,2250753,2250785,2250817,2250849,2250881,2183362,2250913,2250945,2250977,2251009,2251041,2183426,2251073]),
  new Uint32Array([2148609,2195105,2195137,2195169,2195201,2195233,2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393,2195425,2195457]),
  new Uint32Array([2193889,6291456,2193921,6291456,2193953,6291456,2193985,6291456,2194017,6291456,2194049,6291456,2194081,6291456,2194113,6291456]),
  new Uint32Array([2182594,2182658,2249025,2249057,2249089,2249121,2249153,2249185,0,2249217,2249249,2249249,2182722,2249281,2249313,2232865]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2098209,2188801,2112993,6291456]),
  new Uint32Array([2140035,2140131,2140227,2140323,2136099,2136291,2140419,2140515,2140611,2140707,2140803,2140899,2140803,2140611,2140995,2141091]),
  new Uint32Array([6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,23068672,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,23068672,0,23068672,23068672,0,23068672]),
  new Uint32Array([2115201,2115297,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145]),
  new Uint32Array([2195457,2195489,0,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2195713,2195745,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,2194337,6291456,2194369,2194401,2194433,2194465,6291456,2194497,6291456,2194529,6291456,2194561,6291456,2194593,6291456]),
  new Uint32Array([2126530,2126626,2125731,2125827,2125923,2126019,2126115,2126211,2126307,2126403,2126499,2126595,2126691,2126787,2126883,2126979]),
  new Uint32Array([2100385,2098049,2223681,2125345,2125537,2223713,2100353,2102049,2098145,2102177,2098017,2100481,2223745,2223777,2223809,2152322]),
  new Uint32Array([2097281,2107649,2097729,2107809,2097377,2097601,2162977,2107745,2135137,2097505,0,2097185,2097697,2137633,2097633,2097441]),
  new Uint32Array([23068672,6291456,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2206049,6291456,2206081,6291456,2206113,6291456,2206145,6291456,2206177,6291456,2206209,6291456,2206241,6291456,2206273,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456]),
  new Uint32Array([2196865,2196897,2196929,2196961,2196993,2197025,2197057,2197089,2197121,2197153,2197185,2197217,2197249,2197281,2197313,2197345]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,23068672,0,0,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,6291456,23068672,0,0,0,0,0,0,0,0]),
  new Uint32Array([2226497,6291456,2226529,6291456,6291456,6291456,2226561,6291456,2226593,6291456,2226625,6291456,2226657,6291456,2226689,6291456]),
  new Uint32Array([2198529,6291456,2198561,6291456,2198593,6291456,2198625,6291456,2198657,6291456,2198689,6291456,2198721,6291456,2198753,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([23068672,6291456,23068672,23068672,23068672,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0]),
  new Uint32Array([2178626,2178690,2178754,2178818,2178882,2178946,2179010,2179074,2179138,2179202,2179266,2179330,2179394,2179458,2179522,2179586]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,6291456,6291456]),
  new Uint32Array([2195489,2195521,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2245729,2195201,2195265,2195297,2195617,2195489,2195457]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2226177,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2226209,6291456,2226241,6291456,2226273,2226305,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,2213665]),
  new Uint32Array([2224801,6291456,2224833,6291456,2224865,6291456,2224897,6291456,2224929,6291456,2224961,6291456,2197697,2197761,23068672,23068672]),
  new Uint32Array([6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,0,6291456,0,0,0,6291456,6291456,6291456,6291456,0,0,23068672,6291456,23068672,23068672]),
  new Uint32Array([10508483,10508579,10508675,10508771,10508867,10508963,10509059,10509155,10509251,10509347,10509443,10509539,10509635,10509731,10509827,10509923]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2104132,6291456,6291456,6291456]),
  new Uint32Array([2110273,2204161,2204193,2204225,2191937,2191905,2204257,2204289,2204321,2204353,2204385,2204417,2204449,2204481,2192033,2204513]),
  new Uint32Array([2234849,2233377,2234881,2234913,2234945,2234977,2235009,2235041,2152321,2235073,2232865,2235105,2235137,2235169,2235201,2235233]),
  new Uint32Array([0,0,2107553,0,0,2113761,2107201,0,0,2114145,2110049,2114337,2114433,0,2098305,2110177]),
  new Uint32Array([2119905,2107073,2120097,2107169,2120289,2120385,2120481,2120577,2120673,2223201,2223233,2214753,2223265,2223297,2223329,2223361]),
  new Uint32Array([2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,10633025,10633281,10633057,10633569,10632673]),
  new Uint32Array([0,2201057,2201089,2201121,2201153,2144129,2201185,2201217,2201249,2201281,2201313,2157345,2201345,2157473,2201377,2201409]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,0,0,0,0,0,6291456,0,0]),
  new Uint32Array([2138338,2165250,2165314,2165378,2165442,2134658,2134562,2165506,2134754,2165570,2165634,2165698,2165762,2134658,2134562,2165506]),
  new Uint32Array([2168962,2169026,2169090,2169154,2169218,2169282,2169346,2169410,2169474,2169538,2169602,2169666,2169730,2169794,2169858,2169922]),
  new Uint32Array([2240449,2240481,2240513,2240545,2240577,2240609,2240641,2240673,2238881,2240705,2240737,2240769,2238017,2240801,2240833,2240865]),
  new Uint32Array([0,0,2221185,2221217,2221249,2221281,2221313,2221345,0,0,2221377,2221409,2221441,0,0,0]),
  new Uint32Array([6291456,6291456,0,0,0,0,0,0,0,6291456,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2134082,2134370,2164226,2134466,2161026,2134946,2135042,2161090,2161154,2161218,2135426,2107906,2161282,2135714,2161346,2161410]),
  new Uint32Array([2214625,2214657,2214689,2214721,2153473,2214753,2214785,2214817,2214849,2214881,2214913,2214945,2214977,2215009,2215041,2215073]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2202145,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,0,0,0,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,2209153,2209185,2209217,2209249,2209281,2209313,0,0]),
  new Uint32Array([2125539,2106820,2152898,2125635,2106948,2152962,2102181,2100483,2125762,2125858,2125954,2126050,2126146,2126242,2126338,2126434]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,0,6291456,0,0,0,0,0,0,0,10485857]),
  new Uint32Array([6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,0,0,6291456]),
  new Uint32Array([2257409,2187842,2257441,2257473,2257505,2257537,2187906,2187970,2257569,2257601,2257633,2188034,2257665,2188098,2242561,2242561]),
  new Uint32Array([2237633,2248609,2248641,2248673,2248705,2248737,2248769,2248801,2248833,2182530,2248865,2248897,2248929,2245921,2248961,2248993]),
  new Uint32Array([6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,23068672]),
  new Uint32Array([2245217,2245249,2245281,10531522,2245313,2245345,2245377,0,2245409,2245441,2245473,2245505,2245537,2245569,2245601,0]),
  new Uint32Array([2207169,6291456,2207201,6291456,2207233,6291456,2207265,6291456,2207297,6291456,2207329,6291456,2207361,6291456,2207393,6291456]),
  new Uint32Array([23068672,23068672,23068672,18923778,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,18923842,23068672,23068672]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([10520771,10520867,10520963,10521059,2162882,2162946,2160194,2163010,2160002,2160258,2107650,2163074,2160386,2163138,2160450,2160514]),
  new Uint32Array([2224321,6291456,2224353,6291456,2224385,6291456,2224417,6291456,2224449,6291456,2224481,6291456,2224513,6291456,6291456,23068672]),
  new Uint32Array([2206305,6291456,2206337,6291456,2206369,6291456,2206401,6291456,2206433,6291456,2206465,6291456,2206497,6291456,2206529,6291456]),
  new Uint32Array([2218945,2218977,2219009,2219041,2219073,2219105,2219137,2219169,2219201,2219233,2219265,2219297,2219329,2219361,2219393,2219425]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,23068672,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2133442,2134306,2137826,2137634,2162242,2138018,2164290,2162434,2137442,2164354,2139042,2133666,2160930,2137026,2097506,2160194]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,0,0,0,0,0,0,0]),
  new Uint32Array([2102561,2102465,2098337,2103169,2103297,2103425,2103553,2103681,2103809,2103937,0,0,0,0,0,0]),
  new Uint32Array([2135713,2136001,2136001,2136001,2136001,2136097,2136097,2136097,2136097,2107617,2107617,2107617,2107617,2097185,2097185,2097185]),
  new Uint32Array([2168450,2168514,2168578,2168642,2168706,2168770,2168834,2168898,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2187010,2187074,2256033,2256065,2231617,2256097,2256129,2256161,2256193,2256225,2256257,2242145,2256289,2256321,2256353,0]),
  new Uint32Array([6291456,0,0,0,0,0,0,23068672,0,0,0,0,0,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0]),
  new Uint32Array([0,0,2220801,2220833,2220865,2220897,2220929,2220961,0,0,2220993,2221025,2221057,2221089,2221121,2221153]),
  new Uint32Array([0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2189825,6291456,2189857,6291456,2189889,6291456,2189921,6291456,2189953,6291456,2189985,6291456,2190017,6291456,2190049,6291456]),
  new Uint32Array([2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049,2114337]),
  new Uint32Array([0,0,0,0,0,0,0,23068672,0,0,0,0,2144962,2145026,0,2145090]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,0,0]),
  new Uint32Array([23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2134370,2134466,2161026,2134946,2135042,2161090,2161154,2135138,2161218,2135426,2107906,2161282,2135714,2161346,2161410,2136002]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2202049,6291456,6291456,6291456]),
  new Uint32Array([2102625,2113761,2107201,2107297,2107329,2114145,2110049,2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337]),
  new Uint32Array([2199521,6291456,2199553,6291456,2199585,6291456,2199617,6291456,2199649,6291456,2199681,6291456,2199713,6291456,2199745,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,0,0,6291456,6291456]),
  new Uint32Array([2251937,2251969,2239297,2183618,2252001,2252033,2252065,2242625,2252097,2252129,2252161,2252193,2183682,2252225,2252257,2252289]),
  new Uint32Array([2205281,6291456,2205313,6291456,2205345,6291456,2205377,6291456,2205409,6291456,2205441,6291456,2205473,6291456,2205505,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2207425,6291456,2207457,6291456,2207489,6291456,2207521,6291456,2207553,6291456,2207585,6291456,2207617,6291456,2207649,6291456]),
  new Uint32Array([2210081,2244289,2244321,2244353,2244385,6291456,6291456,10633025,10633057,10538114,10538114,10538114,10538114,10632673,10632673,10632673]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,2202177,2202209,2202241,2202273,2202305,2202337,0,0]),
  new Uint32Array([2195617,2195649,2102625,2098177,2110145,2102593,2195105,2195137,2195489,2195617,2195649,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,0,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,0,23068672,23068672,6291456,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,2145794,2145858,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,23068672,23068672]),
  new Uint32Array([2157890,2157954,2158018,2158082,2158146,2158210,2158274,0,2158338,2158402,2158466,2158530,2158594,0,2158658,0]),
  new Uint32Array([2243617,2243617,2243617,2243617,2243649,2243649,2243681,2243681,2243681,2243681,2243713,2243713,2243713,2243713,2141729,2141729]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0]),
  new Uint32Array([2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993,2107233,2098241,2110209,2110273]),
  new Uint32Array([2236673,2236705,2236737,2236769,2236801,2236833,2236865,2236897,2236929,2218625,2236961,2236993,2237025,2237057,2237089,2237121]),
  new Uint32Array([2234337,2234369,2234401,2234433,2234465,2234497,2234529,2234561,2234593,2234625,2234657,2234689,2234721,2234753,2234785,2234817]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2213249,6291456,2213281,6291456,2213313,6291456,2213345,6291456,2213377,6291456,2213409,6291456,2213441,6291456,2213473,6291456]),
  new Uint32Array([2225697,6291456,2225729,6291456,2225761,6291456,2225793,6291456,2225825,6291456,2225857,6291456,2225889,6291456,2225921,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456,6291456]),
  new Uint32Array([2207937,6291456,2207969,6291456,2208001,6291456,2208033,6291456,2208065,6291456,2208097,6291456,2208129,6291456,2208161,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993,2107233,2098241,0,2110273,0,2113569,2102625,2113761]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,0,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0]),
  new Uint32Array([2195201,2195233,2148929,2195265,2144097,2195297,2195329,2153665,2195361,2195393,2195425,2195457,2195489,2195521,2195521,2195553]),
  new Uint32Array([6291456,6291456,2118369,2118465,2118561,2118657,2222817,2222849,2222881,2222913,2213857,2222945,2222977,2223009,2223041,2213953]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([0,2115585,2220289,2220321,2115681,2220353,2220385,2115777,2220417,2115873,2220449,2220481,2220513,2220545,2220577,2220609]),
  new Uint32Array([2115009,2110337,2115201,2115297,2098209,2112993,0,2098241,2110209,2110273,2107553,0,0,2113761,2107201,2107297]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,0]),
  new Uint32Array([0,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2152642,2152706,2101381,2106180,2101541,2124099,2101701,2152770,2124195,2124291,2124387,2124483,2124579,2106308,2124675,2152834]),
  new Uint32Array([0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,6291456,6291456,14680064]),
  new Uint32Array([6291456,2209921,6291456,6291456,6291456,6291456,6291456,10537986,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0]),
  new Uint32Array([2200545,6291456,2200577,6291456,2200609,6291456,2200641,6291456,2200673,6291456,2200705,6291456,2200737,6291456,2200769,6291456]),
  new Uint32Array([2127586,2127555,2127651,2127747,2127843,2154306,2154370,2154434,2154498,2154562,2154626,2154690,2127938,2128034,2128130,2127939]),
  new Uint32Array([2097152,0,0,0,2097152,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2198145,6291456,2198177,6291456,2198209,6291456,2198241,6291456,2198273,6291456,2198305,6291456,2198337,6291456,2198369,6291456]),
  new Uint32Array([6291456,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23068672]),
  new Uint32Array([2110177,2110145,2115009,2098209,2203841,2203873,2203905,2112993,2098241,2110209,2191745,2191777,2203937,2107553,6291456,2107201]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2224545,6291456,2224577,6291456,2224609,6291456,2224641,6291456,2224673,6291456,2224705,6291456,2224737,6291456,2224769,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,23068672,23068672,23068672,0,23068672,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([0,0,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2174530,2174594,2174658,2174722,2174786,2174850,2174914,2174978,2175042,2175106,2175170,2175234,2175298,2175362,2175426,2175490]),
  new Uint32Array([6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,23068672,23068672,0,0]),
  new Uint32Array([23068672,23068672,23068672,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456]),
  new Uint32Array([2238369,6291456,2238401,6291456,6291456,2238433,2238465,6291456,6291456,6291456,2238497,2238529,2238561,2238593,2238625,2238657]),
  new Uint32Array([10501475,10501571,10501667,10501763,10501859,10501955,10502051,10502147,10502243,10502339,10502435,10502531,10502627,10502723,10502819,10502915]),
  new Uint32Array([10633121,10633153,10598561,2244577,10633217,10633249,10504033,0,10633281,10633313,10633345,10633377,0,0,0,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,0]),
  new Uint32Array([2242785,2157761,2158081,2158145,2158529,2158593,2242817,2159105,2159169,10598561,2157634,2157698,2131779,2131875,2157762,2157826]),
  new Uint32Array([6291456,6291456,6291456,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([18886305,18885921,23068672,18886273,18885890,18921313,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,18874368]),
  new Uint32Array([23068672,23068672,6291456,6291456,6291456,23068672,6291456,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2211617,6291456,2211649,2211681,2211713,6291456,6291456,2211745,6291456,2211777,6291456,2211809,6291456,2203873,2204449,2203841]),
  new Uint32Array([0,2097153,2136097,0,2134561,0,0,2133153,0,2134945,0,2135713,0,2243585,0,2245825]),
  new Uint32Array([2176578,2176642,2176706,2176770,2176834,2176898,2176962,2177026,2177090,2177154,2177218,2177282,2177346,2177410,2177474,2177538]),
  new Uint32Array([2127075,2127171,2153026,2153090,2127267,2153154,2153218,2127362,2127363,2127459,2153282,2153346,2153410,2153474,2153538,2107076]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2147521,2147585,2147649,2147713,2147777,2147841,2147905,2147969]),
  new Uint32Array([2131586,2131618,2131714,2131587,2131683,2157122,2157122,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([0,0,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2143298,2190497,6291456,2190529,6291456,2190561,6291456,2190593,6291456,2143362,2190625,6291456,2190657,6291456,2190689,6291456]),
  new Uint32Array([0,0,2227201,6291456,2227233,2204609,2227265,2227297,6291456,2227329,6291456,0,0,0,0,0]),
  new Uint32Array([2169986,2170050,2170114,2170178,2170242,2170306,2170370,2170434,2170498,2170562,2170626,2170690,2170754,2170818,2170882,2170946]),
  new Uint32Array([2210625,2210657,2210689,2210721,2210753,2210785,2210817,2210849,2210881,2210913,2210945,2210977,2211009,2211041,2211073,2211105]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,0,0,6291456,6291456]),
  new Uint32Array([2213505,6291456,2213537,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2213569,6291456,2213601,6291456,23068672]),
  new Uint32Array([2215585,2245857,2245889,2152449,2118465,2245921,2245953,2223009,2245985,2246017,2246049,2235713,2246081,2246113,2246145,2246177]),
  new Uint32Array([2136290,2136674,2097666,2097186,2097474,2097698,2107714,2133442,2134306,2133730,2133634,2137826,2137634,2162242,2138018,2162306]),
  new Uint32Array([2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2181506,2129154,2181570,2143106,2141955,2181634]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,0,0,23068672,23068672,23068672,0,0,0,0,23068672]),
  new Uint32Array([2228513,2228545,2228577,2228609,2228641,2228673,2228705,2228737,2228769,2228801,2228833,2228865,2228897,2228929,2228961,2228993]),
  new Uint32Array([2219617,2231937,2231969,2232001,2232033,2232065,2232097,2232129,2232161,2232193,2232225,2232257,2232289,2232321,2232353,2232385]),
  new Uint32Array([2107649,2107649,2107649,2244865,2244865,2132833,2132833,2132833,2132833,2160705,2160705,2160705,2160705,2097729,2097729,2097729]),
  new Uint32Array([2246785,2246817,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064,14680064]),
  new Uint32Array([2138499,2138595,2138691,2138787,2138883,2138979,2139075,2139171,2139267,2139363,2139459,2139555,2139651,2139747,2139843,2139939]),
  new Uint32Array([2202881,2202913,2202945,2202977,2203009,2203041,2203073,2203105,2203137,2203169,2203201,2203233,2203265,2203297,2203329,2203361]),
  new Uint32Array([2252641,2239329,2236033,2252673,2252705,2252737,2184066,2252769,2252801,2252833,2252865,2241473,2252897,2184130,2252929,2252961]),
  new Uint32Array([10569441,2243905,0,0,10583521,10503969,10538177,10538049,2244001,10491329,10491425,10632705,10632737,2141857,2141921,10633089]),
  new Uint32Array([2150018,2110179,2150082,6291456,2115297,6291456,2149185,6291456,2115297,6291456,2107201,2188769,2112993,2107233,6291456,2110209]),
  new Uint32Array([6291456,6291456,6291456,6291456,23068672,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2097152,2097152,2097152,2097152,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2171266,2171330,2171394,2171458,2171522,2171586,2171650,2171714,2171778,2171842,2171906,2171970,2172034,2172098,2172162,2172226]),
  new Uint32Array([2212481,6291456,2212513,6291456,2212545,6291456,2212577,6291456,2212609,6291456,2212641,6291456,2212673,6291456,2212705,6291456]),
  new Uint32Array([10485857,6291456,6291456,6291456,6291456,6291456,6291456,6291456,10497250,6291456,2098209,6291456,6291456,2097152,6291456,10531522]),
  new Uint32Array([2193633,6291456,2193665,6291456,2193697,6291456,2193729,6291456,2193761,6291456,2193793,6291456,2193825,6291456,2193857,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([0,0,0,6291456,6291456,0,0,0,6291456,6291456,6291456,0,0,0,6291456,6291456]),
  new Uint32Array([2100961,2123873,2223617,2098113,2123393,2104929,2223649,2105761,2123713,2123809,2124257,2101377,2101697,2124865,2101857,2102017]),
  new Uint32Array([2239649,2120577,2239681,2239713,2239745,2239777,2239809,2234529,2239841,2239873,2239905,2239937,2239969,2240001,2240001,2240033]),
  new Uint32Array([2143170,6291456,2143234,2143234,2190337,6291456,2190369,6291456,6291456,2190401,6291456,2190433,6291456,2190465,6291456,2143298]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,23068672]),
  new Uint32Array([23068672,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456]),
  new Uint32Array([2206561,6291456,2206593,6291456,2206625,6291456,2206657,6291456,2206689,6291456,2206721,6291456,2206753,6291456,2206785,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,0,0,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,6291456,6291456,6291456]),
  new Uint32Array([6291456,2191457,2191489,6291456,2191521,6291456,2191553,2191585,6291456,2191617,2191649,2191681,6291456,6291456,2191713,2191745]),
  new Uint32Array([0,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2204097,2107233,2204129,2189121,2203937]),
  new Uint32Array([2136001,2097153,2136097,2107681,2134561,2132833,2160705,2133153,2162689,2134945,2161217,2135713,2245761,2243585,2245793,2245825]),
  new Uint32Array([0,0,0,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2102625,2113761,2107201,2107297,2107329,0,2110049,0,0,0,2098305,2110177,2110145,2102593,2115009,2110337]),
  new Uint32Array([2255681,2255713,2255745,2255777,2186690,2186754,2186818,2255809,2255841,2255873,2255905,2186882,2255937,2186946,2255969,2256001]),
  new Uint32Array([2226721,6291456,2226753,6291456,2226785,6291456,2226817,6291456,2226849,6291456,2194625,2203937,2204193,2226881,2204257,6291456]),
  new Uint32Array([2242337,2240225,2242369,2242401,2242433,2242465,2242497,2240289,2238305,2242529,2240321,2242561,2240353,2242593,2220097,2156738]),
  new Uint32Array([0,0,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([2253313,2241569,2253345,2184450,2253377,2253409,2184514,2184578,2253441,2253473,2253505,2253537,2253569,2253569,2253601,2253633]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,6291456]),
  new Uint32Array([2240065,2240097,2240129,2240161,2240193,2240225,2240257,2238433,2240289,2240321,2240353,2240385,2156674,2240417,0,0]),
  new Uint32Array([2173314,2173378,2173442,2173506,2173570,2173634,2173698,2173762,2173826,2173890,2173954,2174018,2174082,2174146,2174210,2174274]),
  new Uint32Array([2115585,2115681,2115777,2115873,2115969,2116065,2116161,2116257,2116353,2116449,2116545,2116641,2116737,2116833,2116929,2117025]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([0,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,6291456]),
  new Uint32Array([2189121,2189153,2189185,2189217,2189249,2189281,2189313,6291456,2189345,2189377,2189409,2189441,2189473,2189505,2189537,4240258]),
  new Uint32Array([2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569]),
  new Uint32Array([2135043,2135139,2135139,2135235,2135331,2135427,2135523,2135523,2135619,2135715,2135811,2135907,2136003,2136003,2136099,2136195]),
  new Uint32Array([10503395,10503491,10503587,10503683,10503779,10503875,2098209,2112993,2107233,2098241,2110209,2110273,2107553,2113569,2102625,2113761]),
  new Uint32Array([6291456,6291456,2225217,6291456,2225249,6291456,2225281,6291456,2225313,6291456,2225345,6291456,2225377,6291456,2225409,6291456]),
  new Uint32Array([18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368,18874368]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,2181698,2181762,2181826,6291456,6291456,6291456]),
  new Uint32Array([2103650,2103778,2103906,2104034,10500611,10500707,10500803,10500899,10500995,10501091,10501187,10501283,10501379,10491332,10491460,10491588]),
  new Uint32Array([23068672,23068672,18923906,23068672,23068672,23068672,23068672,18923970,23068672,23068672,23068672,23068672,18924034,23068672,23068672,23068672]),
  new Uint32Array([0,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,23068672,23068672,0,0,0,0,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2251105,2251137,2251169,2251201,2251233,2251265,2251297,2251329,2239201,2251361,2183490,2251393,2251425,2251457,2251489,2239265]),
  new Uint32Array([2194785,6291456,2194817,6291456,2194849,6291456,2194881,6291456,0,0,10532674,6291456,6291456,6291456,10583521,2194945]),
  new Uint32Array([6291456,6291456,6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2136002,2141282,2161602,2136098,2161858,2161922,2161986,2162050,2140514,2136578,2136290,2136674,2097666,2097346,2097698,2107714]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0]),
  new Uint32Array([2193377,6291456,2193409,6291456,2193441,6291456,2193473,6291456,2193505,6291456,2193537,6291456,2193569,6291456,2193601,6291456]),
  new Uint32Array([2130051,2130147,2130243,2130339,2130435,2130531,2130627,2130723,2130819,2130915,2131011,2131107,2131203,2131299,2131395,2131491]),
  new Uint32Array([0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2205025,6291456,2205057,6291456,2205089,6291456,2205121,6291456,2205153,6291456,2205185,6291456,2205217,6291456,2205249,6291456]),
  new Uint32Array([2197889,6291456,2197921,6291456,2197953,6291456,2197985,6291456,2198017,6291456,2198049,6291456,2198081,6291456,2198113,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0]),
  new Uint32Array([2111907,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2159746,2159746,2159810,2159810,2159874,2159874,2159938,2159938,2159938,2160002,2160002,2160002,2108129,2108129,2108129,2108129]),
  new Uint32Array([2134945,2135137,2135137,2135137,2135137,2161217,2161217,2161217,2161217,2097441,2097441,2097441,2097441,2135713,2135713,2135713]),
  new Uint32Array([6291456,0,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([6291456,0,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2225441,6291456,2225473,6291456,2225505,6291456,2225537,6291456,2225569,6291456,2225601,6291456,2225633,6291456,2225665,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2224065,6291456,2224097,6291456,2224129,6291456,2224161,6291456,2224193,6291456,2224225,6291456,2224257,6291456,2224289,6291456]),
  new Uint32Array([2199777,6291456,2199809,6291456,2199841,6291456,2199873,6291456,2199905,6291456,2199937,6291456,2199969,6291456,2200001,6291456]),
  new Uint32Array([2107329,2114145,2110049,2114337,2114433,0,2098305,2110177,2110145,2102593,2115009,2110337,2115201,0,2098209,2112993]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,0,0,0,0,0,0,0,0]),
  new Uint32Array([2205537,6291456,2205569,6291456,2205601,6291456,2205633,6291456,2205665,6291456,2205697,6291456,2205729,6291456,2205761,6291456]),
  new Uint32Array([2156802,2156866,2242625,2242657,2242689,2156930,2156994,2157058,2242721,2242753,0,0,0,0,0,0]),
  new Uint32Array([2211969,6291456,2212001,6291456,2212033,6291456,2212065,6291456,2212097,6291456,2212129,6291456,2212161,6291456,2212193,6291456]),
  new Uint32Array([2110209,2110273,2107553,2113569,2102625,2113761,2107201,2107297,2107329,2114145,2110049,2114337,2114433,2098177,2098305,2110177]),
  new Uint32Array([2136001,2097153,2136097,0,2134561,2132833,2160705,2133153,0,2134945,2161217,2135713,2245761,0,2245793,0]),
  new Uint32Array([2181954,2182018,2100897,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,23068672,23068672,23068672,6291456,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,2209697,6291456,6291456,6291456,6291456,2209729,2209761,2209793,2195073,2209825,10498211,10497251,10598465]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0]),
  new Uint32Array([0,0,0,0,0,0,0,0,0,0,0,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([6291456,6291456,6291456,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([2220833,2220865,2220897,2220929,2220961,2220993,2221025,2221057,2221089,2221121,2221153,2221185,2221217,2221249,2221281,2221313]),
  new Uint32Array([6291456,23068672,6291456,2145666,23068672,23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,0,6291456]),
  new Uint32Array([2190721,6291456,2190753,6291456,2190785,6291456,2190817,6291456,2190849,6291456,2190881,6291456,2190913,6291456,2190945,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456,6291456,6291456,6291456,6291456,23068672,0]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,23068672,0,0,0,0,0,0,0,0,6291456,6291456]),
  new Uint32Array([2215105,2215137,2215169,2215201,2215233,2215265,2215297,2215329,2215361,2215393,2215425,2215457,2215489,2215521,2215553,2215585]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,0,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456]),
  new Uint32Array([23068672,23068672,23068672,23068672,23068672,6291456,6291456,23068672,23068672,6291456,23068672,23068672,23068672,23068672,6291456,6291456]),
  new Uint32Array([6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,6291456,0,0,0,0,0,0]),
  new Uint32Array([0,2107649,2097729,0,2097377,0,0,2107745,2135137,2097505,2107617,0,2097697,2137633,2097633,2097441]),
  new Uint32Array([2206817,6291456,2206849,6291456,2206881,6291456,2206913,6291456,2206945,6291456,2206977,6291456,2207009,6291456,2207041,6291456]),
  new Uint32Array([23068672,23068672,23068672,0,0,0,0,0,0,0,0,23068672,23068672,23068672,23068672,23068672]),
  new Uint32Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23068672]),
  new Uint32Array([2134754,2164482,2164546,2135138,2133890,2133794,2139266,2134658,2134562,2165506,2135138,2161218,2165826,2165826,6291456,6291456]),
  new Uint32Array([2257697,2188162,2257729,2257761,2257793,2257825,2257857,2257889,2257921,2188226,2242593,2257953,2257985,2258017,2258049,2258081]),
  new Uint32Array([6291456,6291456,6291456,6291456,0,0,0,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2114337,2114433,2098177,2098305,2110177,2110145,2102593,2115009,2110337,2115201,2115297,10632705,10633601,10632737,10633633,2245057]),
  new Uint32Array([6291456,6291456,23068672,23068672,23068672,6291456,6291456,0,0,0,0,0,0,0,0,0]),
  new Uint32Array([2195425,2195457,2195489,2195265,2195521,2195553,2195585,2195617,2195649,2195681,2149185,2245697,2148609,2195105,2195137,2195169]),
  new Uint32Array([6291456,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,23068672,6291456,6291456]),
];
var blockIdxes = new Uint16Array([656,656,605,162,48,207,7,2,147,147,666,339,396,696,98,98,317,557,386,672,641,744,179,4,679,32,124,441,285,270,215,380,713,667,475,167,484,98,98,98,98,98,98,35,98,366,471,98,249,249,249,249,630,249,249,708,233,13,483,98,248,73,194,462,244,491,400,98,98,98,717,612,166,496,176,129,331,565,727,295,284,608,425,516,381,117,98,98,128,611,249,86,418,98,439,571,683,645,98,98,340,249,98,169,98,98,98,98,98,178,749,98,499,29,98,249,678,98,98,98,98,98,79,488,98,98,340,30,98,69,190,712,98,173,134,147,147,147,98,292,738,619,37,249,286,98,98,736,249,265,390,98,469,479,85,508,53,559,186,305,695,479,85,395,181,111,683,631,389,421,85,125,320,710,186,523,227,479,85,125,465,96,186,738,453,132,669,62,293,434,683,134,466,139,85,578,165,460,186,638,143,139,85,251,165,450,186,602,676,139,98,185,618,254,186,98,410,146,98,115,256,545,683,203,604,98,98,743,163,581,147,147,350,98,63,335,402,577,147,147,563,277,98,436,72,187,27,205,426,538,704,273,104,134,147,147,98,98,340,446,98,312,498,221,535,398,147,147,276,98,98,526,98,98,98,98,98,712,604,98,98,98,98,98,98,98,98,98,98,98,98,98,373,430,98,98,373,98,98,412,722,81,98,98,98,722,98,98,98,313,98,341,98,750,98,98,98,98,98,574,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,604,341,98,98,98,98,98,123,490,374,98,759,98,38,490,433,98,98,98,267,249,600,750,750,327,750,98,98,98,98,98,123,234,98,9,98,98,98,98,592,98,712,627,627,723,98,499,571,98,98,581,98,750,588,98,98,98,568,98,98,98,157,249,142,750,750,499,249,298,147,147,147,544,98,98,531,290,98,340,554,561,98,761,98,98,98,79,226,98,98,531,620,517,98,98,98,235,322,658,43,738,131,126,437,98,98,477,309,614,164,575,90,98,681,511,252,249,249,249,150,423,716,570,730,324,489,542,675,752,180,537,572,217,589,223,279,264,468,636,291,528,118,58,367,422,106,21,222,406,107,737,40,388,606,530,269,120,188,610,193,246,321,213,98,147,249,249,298,336,238,661,323,102,211,231,231,470,98,98,98,98,98,98,98,98,98,138,719,98,98,369,98,98,98,98,98,98,98,98,98,98,98,392,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,597,147,134,147,160,703,171,149,51,699,74,558,405,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,510,98,98,98,98,98,98,153,98,98,98,98,98,417,98,98,98,98,98,98,98,98,98,640,98,546,98,98,98,98,98,98,274,644,82,98,98,712,632,34,732,415,665,349,28,586,646,140,98,98,518,98,98,98,505,613,98,597,225,225,225,225,249,249,98,98,98,98,98,184,147,147,98,197,98,98,98,98,98,289,189,259,525,747,342,463,8,54,365,151,19,543,299,472,147,147,363,98,347,201,604,98,98,98,98,114,98,98,98,98,98,56,556,98,98,598,11,742,362,355,337,596,98,98,98,98,757,98,456,458,420,509,77,154,693,64,200,514,344,351,110,133,670,486,391,112,307,603,414,529,485,635,427,609,333,88,224,440,359,714,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,341,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,341,98,98,98,597,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,581,147,419,726,541,296,616,506,98,98,98,98,98,607,98,98,378,700,724,587,172,504,208,495,686,45,642,147,147,247,297,98,493,750,98,98,98,738,741,98,98,531,746,750,249,384,98,98,137,98,175,527,98,341,286,98,98,709,639,501,668,712,98,98,310,497,49,135,98,288,98,98,98,304,448,281,340,314,705,680,225,98,98,113,174,255,25,652,306,16,98,98,622,750,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,757,98,566,98,98,581,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,23,92,316,459,653,141,206,161,371,584,512,452,168,6,583,219,353,109,624,145,41,671,691,521,33,399,260,155,687,731,147,147,637,387,628,579,89,394,338,177,461,83,580,429,507,60,195,720,100,245,562,26,648,262,540,80,218,413,240,524,711,547,416,84,136,278,519,755,147,375,148,698,424,382,657,478,451,147,147,435,701,59,249,408,573,660,626,358,253,654,42,407,721,550,301,303,346,199,287,515,250,758,158,438,0,411,598,258,555,522,536,147,492,98,81,24,499,499,147,147,98,98,98,98,98,98,98,134,447,98,98,590,98,98,98,98,712,341,710,147,147,98,98,68,147,147,147,147,147,147,147,147,98,341,98,98,98,710,268,581,98,98,228,98,134,98,98,352,98,70,98,98,615,592,147,147,311,328,551,98,98,98,98,98,98,499,750,520,643,75,98,581,98,98,738,98,98,98,356,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,597,98,592,738,147,147,147,147,147,147,147,147,147,93,98,98,156,98,546,98,98,98,712,638,147,147,147,98,15,98,690,98,650,147,147,147,147,98,98,98,280,98,715,98,98,202,144,98,651,123,123,98,98,98,98,147,147,98,98,706,597,98,98,98,385,98,364,98,629,98,242,47,147,147,147,147,147,98,98,98,98,123,147,147,147,664,50,692,282,98,98,98,300,98,98,241,750,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,712,98,98,101,507,147,147,147,147,98,98,738,98,79,78,147,147,147,147,147,98,581,147,98,597,561,98,98,39,718,715,98,754,561,98,98,593,507,98,123,750,561,98,175,748,108,98,98,480,561,98,98,709,368,98,604,571,98,421,99,745,147,147,147,147,65,70,750,98,98,376,209,750,674,479,85,576,465,553,122,214,147,147,147,147,147,147,147,147,98,98,98,694,119,294,507,147,98,98,98,249,159,750,147,147,147,147,147,147,147,147,147,147,98,98,376,198,268,560,147,147,98,98,98,249,325,750,341,147,98,98,340,548,750,147,147,147,98,313,627,98,147,147,147,147,147,147,147,147,147,147,147,147,98,98,99,5,147,147,147,147,147,147,621,403,98,98,98,326,677,329,98,343,444,750,147,147,147,147,585,98,98,409,46,147,539,98,98,237,729,567,98,98,347,454,184,147,98,98,98,123,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,85,98,376,401,592,98,341,98,98,688,308,497,147,147,147,147,503,98,98,481,494,750,66,98,601,230,750,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,263,147,147,147,147,147,147,147,147,147,147,147,710,98,98,98,532,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,750,147,147,147,147,147,147,98,98,98,98,98,98,712,571,98,98,98,98,98,98,98,98,98,98,98,98,757,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,712,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,597,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,123,98,712,501,147,147,147,147,147,147,98,499,94,98,98,98,119,592,14,421,95,98,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,634,370,98,98,98,134,147,147,147,147,147,147,98,98,98,98,275,52,249,249,673,561,147,147,147,147,662,334,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,738,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,592,147,147,123,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,712,147,147,147,184,18,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,581,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,134,341,123,318,663,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,592,98,98,725,98,98,455,1,753,623,98,398,457,116,98,123,147,98,98,98,98,216,147,147,147,147,147,147,147,147,147,98,757,98,98,98,98,98,597,98,123,147,147,147,147,147,147,147,147,558,582,243,20,449,71,697,564,482,261,513,591,105,558,582,243,599,728,239,22,684,354,97,733,319,74,558,582,243,20,449,239,697,564,482,97,733,319,74,558,582,243,191,361,182,121,103,760,595,442,431,272,87,383,170,474,502,474,183,257,348,404,229,212,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,249,249,249,345,249,249,617,668,594,739,611,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,401,393,266,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,341,718,501,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,99,650,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,332,497,147,147,500,31,445,98,192,501,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,604,98,98,98,571,147,147,147,147,604,98,98,499,147,147,147,147,147,147,147,147,147,147,147,147,204,682,357,330,467,633,751,734,487,152,432,152,147,147,147,507,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,581,98,98,98,98,98,98,757,712,604,604,604,98,592,377,625,360,558,649,98,702,98,98,91,499,147,147,147,683,98,735,647,302,283,76,655,592,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,738,341,341,98,98,98,98,98,98,98,757,98,98,98,98,98,123,581,147,581,98,98,98,738,750,98,98,738,98,499,507,147,147,147,147,98,98,98,98,98,98,98,85,98,98,98,98,492,98,98,98,98,98,98,98,98,757,499,315,597,98,123,597,184,597,147,147,98,98,98,98,98,98,98,98,98,740,98,98,134,147,147,549,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,499,147,147,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,571,98,98,98,98,98,98,98,98,98,98,98,98,98,499,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,507,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,710,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,10,44,464,17,443,534,476,127,220,379,3,473,707,61,569,236,659,12,689,397,232,57,196,428,130,36,685,552,55,210,372,533,756,67,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147,147]);
var mappingStr = "صلى الله عليه وسلمجل جلالهキロメートルrad∕s2𝅘𝅥𝅮𝅘𝅥𝅯𝅘𝅥𝅰𝅘𝅥𝅱𝅘𝅥𝅲𝆹𝅥𝅮𝆺𝅥𝅮𝆹𝅥𝅯𝆺𝅥𝅯エスクードキログラムキロワットグラムトンクルゼイロサンチームパーセントピアストルファラッドブッシェルヘクタールマンションミリバールレントゲン′′′′1⁄10viii(10)(11)(12)(13)(14)(15)(16)(17)(18)(19)(20)∫∫∫∫(오전)(오후)アパートアルファアンペアイニングエーカーカラットカロリーキュリーギルダークローネサイクルシリングバーレルフィートポイントマイクロミクロンメガトンリットルルーブル株式会社kcalm∕s2c∕kgاكبرمحمدصلعمرسولریال𝅗𝅥1⁄41⁄23⁄4 ̈́ྲཱྀླཱྀ ̈͂ ̓̀ ̓́ ̓͂ ̔̀ ̔́ ̔͂ ̈̀‵‵‵a/ca/sc/oc/utelfax1⁄71⁄91⁄32⁄31⁄52⁄53⁄54⁄51⁄65⁄61⁄83⁄85⁄87⁄8xii0⁄3∮∮∮(1)(2)(3)(4)(5)(6)(7)(8)(9)(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)(l)(m)(n)(o)(p)(q)(r)(s)(t)(u)(v)(w)(x)(y)(z)::====(ᄀ)(ᄂ)(ᄃ)(ᄅ)(ᄆ)(ᄇ)(ᄉ)(ᄋ)(ᄌ)(ᄎ)(ᄏ)(ᄐ)(ᄑ)(ᄒ)(가)(나)(다)(라)(마)(바)(사)(아)(자)(차)(카)(타)(파)(하)(주)(一)(二)(三)(四)(五)(六)(七)(八)(九)(十)(月)(火)(水)(木)(金)(土)(日)(株)(有)(社)(名)(特)(財)(祝)(労)(代)(呼)(学)(監)(企)(資)(協)(祭)(休)(自)(至)pte10月11月12月ergltdアールインチウォンオンスオームカイリガロンガンマギニーケースコルナコーポセンチダースノットハイツパーツピクルフランペニヒヘルツペンスページベータボルトポンドホールホーンマイルマッハマルクヤードヤールユアンルピー10点11点12点13点14点15点16点17点18点19点20点21点22点23点24点hpabardm2dm3khzmhzghzthzmm2cm2km2mm3cm3km3kpampagpalogmilmolppmv∕ma∕m10日11日12日13日14日15日16日17日18日19日20日21日22日23日24日25日26日27日28日29日30日31日galffifflשּׁשּׂ ٌّ ٍّ َّ ُّ ِّ ّٰـَّـُّـِّتجمتحجتحمتخمتمجتمحتمخجمححميحمىسحجسجحسجىسمحسمجسممصححصممشحمشجيشمخشممضحىضخمطمحطممطميعجمعممعمىغممغميغمىفخمقمحقمملحملحيلحىلججلخملمحمحجمحيمجحمجممخممجخهمجهممنحمنحىنجمنجىنمينمىيممبخيتجيتجىتخيتخىتميتمىجميجحىجمىسخىصحيشحيضحيلجيلمييحييجييميمميقمينحيعميكمينجحمخيلجمكممجحيحجيمجيفميبحيسخينجيصلےقلے〔s〕ppv〔本〕〔三〕〔二〕〔安〕〔点〕〔打〕〔盗〕〔勝〕〔敗〕 ̄ ́ ̧ssi̇ijl·ʼndžljnjdz ̆ ̇ ̊ ̨ ̃ ̋ ιեւاٴوٴۇٴيٴक़ख़ग़ज़ड़ढ़फ़य़ড়ঢ়য়ਲ਼ਸ਼ਖ਼ਗ਼ਜ਼ਫ਼ଡ଼ଢ଼ําໍາຫນຫມགྷཌྷདྷབྷཛྷཀྵཱཱིུྲྀླྀྒྷྜྷྡྷྦྷྫྷྐྵaʾἀιἁιἂιἃιἄιἅιἆιἇιἠιἡιἢιἣιἤιἥιἦιἧιὠιὡιὢιὣιὤιὥιὦιὧιὰιαιάιᾶι ͂ὴιηιήιῆιὼιωιώιῶι ̳!! ̅???!!?rs°c°fnosmtmivix⫝̸ ゙ ゚よりコト333435참고주의363738394042444546474849503月4月5月6月7月8月9月hgev令和ギガデシドルナノピコビルペソホンリラレムdaauovpciu平成昭和大正明治naμakakbmbgbpfnfμfμgmgμlmldlklfmnmμmpsnsμsmsnvμvkvpwnwμwmwkwkωmωbqcccddbgyhainkkktlnlxphprsrsvwb𤋮𢡊𢡄𣏕𥉉𥳐𧻓stմնմեմիվնմխיִײַשׁשׂאַאָאּבּגּדּהּוּזּטּיּךּכּלּמּנּסּףּפּצּקּרּתּוֹבֿכֿפֿאלئائەئوئۇئۆئۈئېئىئجئحئمئيبجبمبىبيتىتيثجثمثىثيخحضجضمطحظمغجفجفحفىفيقحقىقيكاكجكحكخكلكىكينخنىنيهجهىهييىذٰرٰىٰئرئزئنبزبنترتزتنثرثزثنمانرنزننيريزئخئهبهتهصخنههٰثهسهشهطىطيعىعيغىغيسىسيشىشيصىصيضىضيشخشرسرصرضراً ًـًـّ ْـْلآلألإ𐐨𐐩𐐪𐐫𐐬𐐭𐐮𐐯𐐰𐐱𐐲𐐳𐐴𐐵𐐶𐐷𐐸𐐹𐐺𐐻𐐼𐐽𐐾𐐿𐑀𐑁𐑂𐑃𐑄𐑅𐑆𐑇𐑈𐑉𐑊𐑋𐑌𐑍𐑎𐑏𐓘𐓙𐓚𐓛𐓜𐓝𐓞𐓟𐓠𐓡𐓢𐓣𐓤𐓥𐓦𐓧𐓨𐓩𐓪𐓫𐓬𐓭𐓮𐓯𐓰𐓱𐓲𐓳𐓴𐓵𐓶𐓷𐓸𐓹𐓺𐓻𐳀𐳁𐳂𐳃𐳄𐳅𐳆𐳇𐳈𐳉𐳊𐳋𐳌𐳍𐳎𐳏𐳐𐳑𐳒𐳓𐳔𐳕𐳖𐳗𐳘𐳙𐳚𐳛𐳜𐳝𐳞𐳟𐳠𐳡𐳢𐳣𐳤𐳥𐳦𐳧𐳨𐳩𐳪𐳫𐳬𐳭𐳮𐳯𐳰𐳱𐳲𑣀𑣁𑣂𑣃𑣄𑣅𑣆𑣇𑣈𑣉𑣊𑣋𑣌𑣍𑣎𑣏𑣐𑣑𑣒𑣓𑣔𑣕𑣖𑣗𑣘𑣙𑣚𑣛𑣜𑣝𑣞𑣟𖹠𖹡𖹢𖹣𖹤𖹥𖹦𖹧𖹨𖹩𖹪𖹫𖹬𖹭𖹮𖹯𖹰𖹱𖹲𖹳𖹴𖹵𖹶𖹷𖹸𖹹𖹺𖹻𖹼𖹽𖹾𖹿𞤢𞤣𞤤𞤥𞤦𞤧𞤨𞤩𞤪𞤫𞤬𞤭𞤮𞤯𞤰𞤱𞤲𞤳𞤴𞤵𞤶𞤷𞤸𞤹𞤺𞤻𞤼𞤽𞤾𞤿𞥀𞥁𞥂𞥃0,1,2,3,4,5,6,7,8,9,wzhvsdwcmcmdmrdjほかココ𠄢𠘺𠔜𠕋𩇟𠨬𠭣𡓤𡚨𡛪𡧈𡬘𡷤𡷦𢆃𪎒𢌱𣊸𦇚𢛔𢬌𢯱𣀊𣏃𣑭𣚣𣢧𣪍𡴋𣫺𣲼𣴞𣻑𣽞𣾎𠔥𤉣𤘈𤜵𤠔𤰶𤲒𢆟𤾡𤾸𥁄𥃳𥃲𥄙𥄳𥐝𥘦𥚚𥛅𥥼𥪧𥮫𥲀𥾆𦈨𦉇𦋙𦌾𦓚𦔣𦖨𣍟𦞧𦞵𣎓𣎜𦬼𦰶𦵫𦳕𧏊𦼬𦾱𧃒𧙧𧢮𧥦𧲨𧼯𠠄𠣞𨗒𨗭𨜮𨯺𨵷𩅅𩈚𩐊𩒖𩖶𩬰𪃎𪄅𪈎𪊑𪘀àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįĵķĺļľłńņňŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷÿźżɓƃƅɔƈɖɗƌǝəɛƒɠɣɩɨƙɯɲɵơƣƥʀƨʃƭʈưʊʋƴƶʒƹƽǎǐǒǔǖǘǚǜǟǡǣǥǧǩǫǭǯǵƕƿǹǻǽǿȁȃȅȇȉȋȍȏȑȓȕȗșțȝȟƞȣȥȧȩȫȭȯȱȳⱥȼƚⱦɂƀʉʌɇɉɋɍɏɦɹɻʁʕͱͳʹͷ;ϳέίόύβγδεζθκλνξοπρστυφχψϊϋϗϙϛϝϟϡϣϥϧϩϫϭϯϸϻͻͼͽѐёђѓєѕіїјљњћќѝўџабвгдежзийклмнопрстуфхцчшщъыьэюяѡѣѥѧѩѫѭѯѱѳѵѷѹѻѽѿҁҋҍҏґғҕҗҙқҝҟҡңҥҧҩҫҭүұҳҵҷҹһҽҿӂӄӆӈӊӌӎӑӓӕӗәӛӝӟӡӣӥӧөӫӭӯӱӳӵӷӹӻӽӿԁԃԅԇԉԋԍԏԑԓԕԗԙԛԝԟԡԣԥԧԩԫԭԯաբգդզէըթժլծկհձղճյշոչպջռստրցփքօֆ་ⴧⴭნᏰᏱᏲᏳᏴᏵꙋაბგდევზთიკლმოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჺჽჾჿɐɑᴂɜᴖᴗᴝᴥɒɕɟɡɥɪᵻʝɭᶅʟɱɰɳɴɸʂƫᴜʐʑḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇẉẋẍẏẑẓẕạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹỻỽỿἐἑἒἓἔἕἰἱἲἳἴἵἶἷὀὁὂὃὄὅὑὓὕὗᾰᾱὲΐῐῑὶΰῠῡὺῥ`ὸ‐+−∑〈〉ⰰⰱⰲⰳⰴⰵⰶⰷⰸⰹⰺⰻⰼⰽⰾⰿⱀⱁⱂⱃⱄⱅⱆⱇⱈⱉⱊⱋⱌⱍⱎⱏⱐⱑⱒⱓⱔⱕⱖⱗⱘⱙⱚⱛⱜⱝⱞⱡɫᵽɽⱨⱪⱬⱳⱶȿɀⲁⲃⲅⲇⲉⲋⲍⲏⲑⲓⲕⲗⲙⲛⲝⲟⲡⲣⲥⲧⲩⲫⲭⲯⲱⲳⲵⲷⲹⲻⲽⲿⳁⳃⳅⳇⳉⳋⳍⳏⳑⳓⳕⳗⳙⳛⳝⳟⳡⳣⳬⳮⳳⵡ母龟丨丶丿乙亅亠人儿入冂冖冫几凵刀力勹匕匚匸卜卩厂厶又口囗士夂夊夕女子宀寸小尢尸屮山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴文斗斤方无曰欠止歹殳毋比毛氏气爪父爻爿片牙牛犬玄玉瓜瓦甘生用田疋疒癶白皮皿目矛矢石示禸禾穴立竹米糸缶网羊羽老而耒耳聿肉臣臼舌舛舟艮色艸虍虫血行衣襾見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里長門阜隶隹雨靑非面革韋韭音頁風飛食首香馬骨高髟鬥鬯鬲鬼魚鳥鹵鹿麥麻黃黍黑黹黽鼎鼓鼠鼻齊齒龍龜龠.〒卄卅ᄁᆪᆬᆭᄄᆰᆱᆲᆳᆴᆵᄚᄈᄡᄊ짜ᅢᅣᅤᅥᅦᅧᅨᅩᅪᅫᅬᅭᅮᅯᅰᅱᅲᅳᅴᅵᄔᄕᇇᇈᇌᇎᇓᇗᇙᄜᇝᇟᄝᄞᄠᄢᄣᄧᄩᄫᄬᄭᄮᄯᄲᄶᅀᅇᅌᇱᇲᅗᅘᅙᆄᆅᆈᆑᆒᆔᆞᆡ上中下甲丙丁天地問幼箏우秘男適優印注項写左右医宗夜テヌモヨヰヱヲꙁꙃꙅꙇꙉꙍꙏꙑꙓꙕꙗꙙꙛꙝꙟꙡꙣꙥꙧꙩꙫꙭꚁꚃꚅꚇꚉꚋꚍꚏꚑꚓꚕꚗꚙꚛꜣꜥꜧꜩꜫꜭꜯꜳꜵꜷꜹꜻꜽꜿꝁꝃꝅꝇꝉꝋꝍꝏꝑꝓꝕꝗꝙꝛꝝꝟꝡꝣꝥꝧꝩꝫꝭꝯꝺꝼᵹꝿꞁꞃꞅꞇꞌꞑꞓꞗꞙꞛꞝꞟꞡꞣꞥꞧꞩɬʞʇꭓꞵꞷꞹꞻꞽꞿꟃꞔᶎꟈꟊꟶꬷꭒʍᎠᎡᎢᎣᎤᎥᎦᎧᎨᎩᎪᎫᎬᎭᎮᎯᎰᎱᎲᎳᎴᎵᎶᎷᎸᎹᎺᎻᎼᎽᎾᎿᏀᏁᏂᏃᏄᏅᏆᏇᏈᏉᏊᏋᏌᏍᏎᏏᏐᏑᏒᏓᏔᏕᏖᏗᏘᏙᏚᏛᏜᏝᏞᏟᏠᏡᏢᏣᏤᏥᏦᏧᏨᏩᏪᏫᏬᏭᏮᏯ豈更賈滑串句契喇奈懶癩羅蘿螺裸邏樂洛烙珞落酪駱亂卵欄爛蘭鸞嵐濫藍襤拉臘蠟廊朗浪狼郎來冷勞擄櫓爐盧蘆虜路露魯鷺碌祿綠菉錄論壟弄籠聾牢磊賂雷壘屢樓淚漏累縷陋勒肋凜凌稜綾菱陵讀拏諾丹寧怒率異北磻便復不泌數索參塞省葉說殺沈拾若掠略亮兩凉梁糧良諒量勵呂廬旅濾礪閭驪麗黎曆歷轢年憐戀撚漣煉璉秊練聯輦蓮連鍊列劣咽烈裂廉念捻殮簾獵囹嶺怜玲瑩羚聆鈴零靈領例禮醴隸惡了僚寮尿料燎療蓼遼暈阮劉杻柳流溜琉留硫紐類戮陸倫崙淪輪律慄栗隆利吏履易李梨泥理痢罹裏裡離匿溺吝燐璘藺隣鱗麟林淋臨笠粒狀炙識什茶刺切度拓糖宅洞暴輻降廓兀嗀塚晴凞猪益礼神祥福靖精蘒諸逸都飯飼館鶴郞隷侮僧免勉勤卑喝嘆器塀墨層悔慨憎懲敏既暑梅海渚漢煮爫琢碑祉祈祐祖禍禎穀突節縉繁署者臭艹著褐視謁謹賓贈辶難響頻恵舘並况全侀充冀勇勺啕喙嗢墳奄奔婢嬨廒廙彩徭惘慎愈慠戴揄搜摒敖望杖滛滋瀞瞧爵犯瑱甆画瘝瘟盛直睊着磌窱类絛缾荒華蝹襁覆調請諭變輸遲醙鉶陼韛頋鬒㮝䀘䀹齃龎עםٱٻپڀٺٿٹڤڦڄڃچڇڍڌڎڈژڑکگڳڱںڻۀہھۓڭۋۅۉ、〖〗—–_{}【】《》「」『』[]#&*-<>\\$%@ءؤة\"'^|~⦅⦆・ゥャ¢£¬¦¥₩│←↑→↓■○ıȷ∇∂ٮڡٯ字双多解交映無前後再新初終販声吹演投捕遊指禁空合満申割営配得可丽丸乁你侻倂偺備像㒞兔兤具㒹內冗冤仌冬刃㓟刻剆剷㔕包匆卉博即卽卿灰及叟叫叱吆咞吸呈周咢哶唐啓啣善喫喳嗂圖圗噑噴壮城埴堍型堲報墬売壷夆夢奢姬娛娧姘婦㛮嬈嬾寃寘寳寿将㞁屠峀岍嵃嵮嵫嵼巡巢㠯巽帨帽幩㡢㡼庰庳庶舁弢㣇形彫㣣徚忍志忹悁㤺㤜惇慈慌慺憲憤憯懞戛扝抱拔捐挽拼捨掃揤搢揅掩㨮摩摾撝摷㩬敬旣書晉㬙㬈㫤冒冕最暜肭䏙朡杞杓㭉柺枅桒梎栟椔楂榣槪檨櫛㰘次歔㱎歲殟殻汎沿泍汧洖派浩浸涅洴港湮㴳滇淹潮濆瀹瀛㶖灊災灷炭煅熜爨牐犀犕獺王㺬玥㺸瑇瑜璅瓊㼛甤甾瘐㿼䀈眞真瞋䁆䂖硎䃣秫䄯穊穏䈂篆築䈧糒䊠糨糣紀絣䌁緇縂繅䌴䍙罺羕翺聠聰䏕育脃䐋脾媵舄辞䑫芑芋芝劳花芳芽苦茝荣莭茣莽菧荓菊菌菜䔫蓱蓳蔖蕤䕝䕡䕫虐虧虩蚩蚈蜎蛢蜨蝫螆蟡蠁䗹衠裗裞䘵裺㒻䚾䛇誠貫賁贛起跋趼跰軔邔郱鄑鄛鈸鋗鋘鉼鏹鐕開䦕閷䧦雃嶲霣䩮䩶韠䪲頩飢䬳餩馧駂駾䯎鱀鳽䳎䳭鵧䳸䵖黾鼅鼏鼖";

function mapChar(codePoint) {
  if (codePoint >= 0x30000) {
    // High planes are special cased.
    if (codePoint >= 0xE0100 && codePoint <= 0xE01EF)
      return 18874368;
    return 0;
  }
  return blocks[blockIdxes[codePoint >> 4]][codePoint & 15];
}

return {
  mapStr: mappingStr,
  mapChar: mapChar
};
}));

},{}],5:[function(require,module,exports){
(function (root, factory) {
  /* istanbul ignore next */
  // eslint-disable-next-line no-undef
  if (typeof define === 'function' && define.amd) {
    // eslint-disable-next-line no-undef
    define(['punycode', './idna-map'], function (punycode, idnaMap) {
      return factory(punycode, idnaMap)
    })
  } else if (typeof exports === 'object') {
    // eslint-disable-next-line node/no-deprecated-api
    module.exports = factory(require('punycode'), require('./idna-map'))
  } else {
    root.uts46 = factory(root.punycode, root.idna_map)
  }
}(this, function (punycode, idnaMap) {
  function mapLabel (label, useStd3ASCII, transitional) {
    const mapped = []
    const chars = punycode.ucs2.decode(label)
    for (let i = 0; i < chars.length; i++) {
      const cp = chars[i]
      const ch = punycode.ucs2.encode([chars[i]])
      const composite = idnaMap.mapChar(cp)
      const flags = (composite >> 23)
      const kind = (composite >> 21) & 3
      const index = (composite >> 5) & 0xffff
      const length = composite & 0x1f
      const value = idnaMap.mapStr.substr(index, length)
      if (kind === 0 || (useStd3ASCII && (flags & 1))) {
        throw new Error('Illegal char ' + ch)
      } else if (kind === 1) {
        mapped.push(value)
      } else if (kind === 2) {
        mapped.push(transitional ? value : ch)
        /* istanbul ignore next */
      } else if (kind === 3) {
        mapped.push(ch)
      }
    }

    const newLabel = mapped.join('').normalize('NFC')
    return newLabel
  }

  function process (domain, transitional, useStd3ASCII) {
    /* istanbul ignore if */
    if (useStd3ASCII === undefined) { useStd3ASCII = false }
    const mappedIDNA = mapLabel(domain, useStd3ASCII, transitional)

    // Step 3. Break
    let labels = mappedIDNA.split('.')

    // Step 4. Convert/Validate
    labels = labels.map(function (label) {
      if (label.startsWith('xn--')) {
        label = punycode.decode(label.substring(4))
        validateLabel(label, useStd3ASCII, false)
      } else {
        validateLabel(label, useStd3ASCII, transitional)
      }
      return label
    })

    return labels.join('.')
  }

  function validateLabel (label, useStd3ASCII, transitional) {
    // 2. The label must not contain a U+002D HYPHEN-MINUS character in both the
    // third position and fourth positions.
    if (label[2] === '-' && label[3] === '-') { throw new Error('Failed to validate ' + label) }

    // 3. The label must neither begin nor end with a U+002D HYPHEN-MINUS
    // character.
    if (label.startsWith('-') || label.endsWith('-')) { throw new Error('Failed to validate ' + label) }

    // 4. The label must not contain a U+002E ( . ) FULL STOP.
    // this should nerver happen as label is chunked internally by this character
    /* istanbul ignore if */
    if (label.includes('.')) { throw new Error('Failed to validate ' + label) }

    if (mapLabel(label, useStd3ASCII, transitional) !== label) { throw new Error('Failed to validate ' + label) }

    // 5. The label must not begin with a combining mark, that is:
    // General_Category=Mark.
    const ch = label.codePointAt(0)
    if (idnaMap.mapChar(ch) & (0x2 << 23)) { throw new Error('Label contains illegal character: ' + ch) }
  }

  function toAscii (domain, options) {
    if (options === undefined) { options = {} }
    const transitional = 'transitional' in options ? options.transitional : true
    const useStd3ASCII = 'useStd3ASCII' in options ? options.useStd3ASCII : false
    const verifyDnsLength = 'verifyDnsLength' in options ? options.verifyDnsLength : false
    const labels = process(domain, transitional, useStd3ASCII).split('.')
    const asciiLabels = labels.map(punycode.toASCII)
    const asciiString = asciiLabels.join('.')
    let i
    if (verifyDnsLength) {
      if (asciiString.length < 1 || asciiString.length > 253) {
        throw new Error('DNS name has wrong length: ' + asciiString)
      }
      for (i = 0; i < asciiLabels.length; i++) { // for .. of replacement
        const label = asciiLabels[i]
        if (label.length < 1 || label.length > 63) { throw new Error('DNS label has wrong length: ' + label) }
      }
    }
    return asciiString
  }

  function convert (domains) {
    const isArrayInput = Array.isArray(domains)
    if (!isArrayInput) {
      domains = [domains]
    }
    const results = { IDN: [], PC: [] }
    domains.forEach((domain) => {
      let pc, tmp
      try {
        pc = toAscii(domain, {
          transitional: !domain.match(/\.(?:be|ca|de|fr|pm|re|swiss|tf|wf|yt)\.?$/)
        })
        tmp = {
          PC: pc,
          IDN: toUnicode(pc)
        }
      } catch (e) {
        tmp = {
          PC: domain,
          IDN: domain
        }
      }
      results.PC.push(tmp.PC)
      results.IDN.push(tmp.IDN)
    })
    if (isArrayInput) {
      return results
    }
    return { IDN: results.IDN[0], PC: results.PC[0] }
  }

  function toUnicode (domain, options) {
    if (options === undefined) { options = {} }
    const useStd3ASCII = 'useStd3ASCII' in options ? options.useStd3ASCII : false
    return process(domain, false, useStd3ASCII)
  }

  return {
    toUnicode: toUnicode,
    toAscii: toAscii,
    convert: convert
  }
}))

},{"./idna-map":4,"punycode":9}],6:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){
(function (process,global){(function (){
/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.8.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2018
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var INPUT_ERROR = 'input is invalid type';
  var FINALIZE_ERROR = 'finalize already called';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA3_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
  var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
  var KECCAK_PADDING = [1, 256, 65536, 16777216];
  var PADDING = [6, 1536, 393216, 100663296];
  var SHIFT = [0, 8, 16, 24];
  var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
    0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
    2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
    2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
    2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
  var BITS = [224, 256, 384, 512];
  var SHAKE_BITS = [128, 256];
  var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
  var CSHAKE_BYTEPAD = {
    '128': 168,
    '256': 136
  };

  if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (bits, padding, outputType) {
    return function (message) {
      return new Keccak(bits, padding, bits).update(message)[outputType]();
    };
  };

  var createShakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits) {
      return new Keccak(bits, padding, outputBits).update(message)[outputType]();
    };
  };

  var createCshakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits, n, s) {
      return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
    };
  };

  var createKmacOutputMethod = function (bits, padding, outputType) {
    return function (key, message, outputBits, s) {
      return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
    };
  };

  var createOutputMethods = function (method, createMethod, bits, padding) {
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createMethod(bits, padding, type);
    }
    return method;
  };

  var createMethod = function (bits, padding) {
    var method = createOutputMethod(bits, padding, 'hex');
    method.create = function () {
      return new Keccak(bits, padding, bits);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    return createOutputMethods(method, createOutputMethod, bits, padding);
  };

  var createShakeMethod = function (bits, padding) {
    var method = createShakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits) {
      return new Keccak(bits, padding, outputBits);
    };
    method.update = function (message, outputBits) {
      return method.create(outputBits).update(message);
    };
    return createOutputMethods(method, createShakeOutputMethod, bits, padding);
  };

  var createCshakeMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createCshakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits, n, s) {
      if (!n && !s) {
        return methods['shake' + bits].create(outputBits);
      } else {
        return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
      }
    };
    method.update = function (message, outputBits, n, s) {
      return method.create(outputBits, n, s).update(message);
    };
    return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
  };

  var createKmacMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createKmacOutputMethod(bits, padding, 'hex');
    method.create = function (key, outputBits, s) {
      return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
    };
    method.update = function (key, message, outputBits, s) {
      return method.create(key, outputBits, s).update(message);
    };
    return createOutputMethods(method, createKmacOutputMethod, bits, padding);
  };

  var algorithms = [
    { name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod },
    { name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod },
    { name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
    { name: 'cshake', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
    { name: 'kmac', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
  ];

  var methods = {}, methodNames = [];

  for (var i = 0; i < algorithms.length; ++i) {
    var algorithm = algorithms[i];
    var bits = algorithm.bits;
    for (var j = 0; j < bits.length; ++j) {
      var methodName = algorithm.name + '_' + bits[j];
      methodNames.push(methodName);
      methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
      if (algorithm.name !== 'sha3') {
        var newMethodName = algorithm.name + bits[j];
        methodNames.push(newMethodName);
        methods[newMethodName] = methods[methodName];
      }
    }
  }

  function Keccak(bits, padding, outputBits) {
    this.blocks = [];
    this.s = [];
    this.padding = padding;
    this.outputBits = outputBits;
    this.reset = true;
    this.finalized = false;
    this.block = 0;
    this.start = 0;
    this.blockCount = (1600 - (bits << 1)) >> 5;
    this.byteCount = this.blockCount << 2;
    this.outputBlocks = outputBits >> 5;
    this.extraBytes = (outputBits & 31) >> 3;

    for (var i = 0; i < 50; ++i) {
      this.s[i] = 0;
    }
  }

  Keccak.prototype.update = function (message) {
    if (this.finalized) {
      throw new Error(FINALIZE_ERROR);
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var blocks = this.blocks, byteCount = this.byteCount, length = message.length,
      blockCount = this.blockCount, index = 0, s = this.s, i, code;

    while (index < length) {
      if (this.reset) {
        this.reset = false;
        blocks[0] = this.block;
        for (i = 1; i < blockCount + 1; ++i) {
          blocks[i] = 0;
        }
      }
      if (notString) {
        for (i = this.start; index < length && i < byteCount; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < byteCount; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }
      this.lastByteIndex = i;
      if (i >= byteCount) {
        this.start = i - byteCount;
        this.block = blocks[blockCount];
        for (i = 0; i < blockCount; ++i) {
          s[i] ^= blocks[i];
        }
        f(s);
        this.reset = true;
      } else {
        this.start = i;
      }
    }
    return this;
  };

  Keccak.prototype.encode = function (x, right) {
    var o = x & 255, n = 1;
    var bytes = [o];
    x = x >> 8;
    o = x & 255;
    while (o > 0) {
      bytes.unshift(o);
      x = x >> 8;
      o = x & 255;
      ++n;
    }
    if (right) {
      bytes.push(n);
    } else {
      bytes.unshift(n);
    }
    this.update(bytes);
    return bytes.length;
  };

  Keccak.prototype.encodeString = function (str) {
    var notString, type = typeof str;
    if (type !== 'string') {
      if (type === 'object') {
        if (str === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
          str = new Uint8Array(str);
        } else if (!Array.isArray(str)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var bytes = 0, length = str.length;
    if (notString) {
      bytes = length;
    } else {
      for (var i = 0; i < str.length; ++i) {
        var code = str.charCodeAt(i);
        if (code < 0x80) {
          bytes += 1;
        } else if (code < 0x800) {
          bytes += 2;
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes += 3;
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
          bytes += 4;
        }
      }
    }
    bytes += this.encode(bytes * 8);
    this.update(str);
    return bytes;
  };

  Keccak.prototype.bytepad = function (strs, w) {
    var bytes = this.encode(w);
    for (var i = 0; i < strs.length; ++i) {
      bytes += this.encodeString(strs[i]);
    }
    var paddingBytes = w - bytes % w;
    var zeros = [];
    zeros.length = paddingBytes;
    this.update(zeros);
    return this;
  };

  Keccak.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
    blocks[i >> 2] |= this.padding[i & 3];
    if (this.lastByteIndex === this.byteCount) {
      blocks[0] = blocks[blockCount];
      for (i = 1; i < blockCount + 1; ++i) {
        blocks[i] = 0;
      }
    }
    blocks[blockCount - 1] |= 0x80000000;
    for (i = 0; i < blockCount; ++i) {
      s[i] ^= blocks[i];
    }
    f(s);
  };

  Keccak.prototype.toString = Keccak.prototype.hex = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var hex = '', block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        block = s[i];
        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
          HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
          HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
          HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
      }
      if (j % blockCount === 0) {
        f(s);
        i = 0;
      }
    }
    if (extraBytes) {
      block = s[i];
      hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
      if (extraBytes > 1) {
        hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
      }
      if (extraBytes > 2) {
        hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
      }
    }
    return hex;
  };

  Keccak.prototype.arrayBuffer = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var bytes = this.outputBits >> 3;
    var buffer;
    if (extraBytes) {
      buffer = new ArrayBuffer((outputBlocks + 1) << 2);
    } else {
      buffer = new ArrayBuffer(bytes);
    }
    var array = new Uint32Array(buffer);
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        array[j] = s[i];
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      array[i] = s[i];
      buffer = buffer.slice(0, bytes);
    }
    return buffer;
  };

  Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

  Keccak.prototype.digest = Keccak.prototype.array = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var array = [], offset, block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        offset = j << 2;
        block = s[i];
        array[offset] = block & 0xFF;
        array[offset + 1] = (block >> 8) & 0xFF;
        array[offset + 2] = (block >> 16) & 0xFF;
        array[offset + 3] = (block >> 24) & 0xFF;
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      offset = j << 2;
      block = s[i];
      array[offset] = block & 0xFF;
      if (extraBytes > 1) {
        array[offset + 1] = (block >> 8) & 0xFF;
      }
      if (extraBytes > 2) {
        array[offset + 2] = (block >> 16) & 0xFF;
      }
    }
    return array;
  };

  function Kmac(bits, padding, outputBits) {
    Keccak.call(this, bits, padding, outputBits);
  }

  Kmac.prototype = new Keccak();

  Kmac.prototype.finalize = function () {
    this.encode(this.outputBits, true);
    return Keccak.prototype.finalize.call(this);
  };

  var f = function (s) {
    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
      b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
      b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
      b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
    for (n = 0; n < 48; n += 2) {
      c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
      c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
      c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
      c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
      c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
      c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
      c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
      c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
      c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
      c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

      h = c8 ^ ((c2 << 1) | (c3 >>> 31));
      l = c9 ^ ((c3 << 1) | (c2 >>> 31));
      s[0] ^= h;
      s[1] ^= l;
      s[10] ^= h;
      s[11] ^= l;
      s[20] ^= h;
      s[21] ^= l;
      s[30] ^= h;
      s[31] ^= l;
      s[40] ^= h;
      s[41] ^= l;
      h = c0 ^ ((c4 << 1) | (c5 >>> 31));
      l = c1 ^ ((c5 << 1) | (c4 >>> 31));
      s[2] ^= h;
      s[3] ^= l;
      s[12] ^= h;
      s[13] ^= l;
      s[22] ^= h;
      s[23] ^= l;
      s[32] ^= h;
      s[33] ^= l;
      s[42] ^= h;
      s[43] ^= l;
      h = c2 ^ ((c6 << 1) | (c7 >>> 31));
      l = c3 ^ ((c7 << 1) | (c6 >>> 31));
      s[4] ^= h;
      s[5] ^= l;
      s[14] ^= h;
      s[15] ^= l;
      s[24] ^= h;
      s[25] ^= l;
      s[34] ^= h;
      s[35] ^= l;
      s[44] ^= h;
      s[45] ^= l;
      h = c4 ^ ((c8 << 1) | (c9 >>> 31));
      l = c5 ^ ((c9 << 1) | (c8 >>> 31));
      s[6] ^= h;
      s[7] ^= l;
      s[16] ^= h;
      s[17] ^= l;
      s[26] ^= h;
      s[27] ^= l;
      s[36] ^= h;
      s[37] ^= l;
      s[46] ^= h;
      s[47] ^= l;
      h = c6 ^ ((c0 << 1) | (c1 >>> 31));
      l = c7 ^ ((c1 << 1) | (c0 >>> 31));
      s[8] ^= h;
      s[9] ^= l;
      s[18] ^= h;
      s[19] ^= l;
      s[28] ^= h;
      s[29] ^= l;
      s[38] ^= h;
      s[39] ^= l;
      s[48] ^= h;
      s[49] ^= l;

      b0 = s[0];
      b1 = s[1];
      b32 = (s[11] << 4) | (s[10] >>> 28);
      b33 = (s[10] << 4) | (s[11] >>> 28);
      b14 = (s[20] << 3) | (s[21] >>> 29);
      b15 = (s[21] << 3) | (s[20] >>> 29);
      b46 = (s[31] << 9) | (s[30] >>> 23);
      b47 = (s[30] << 9) | (s[31] >>> 23);
      b28 = (s[40] << 18) | (s[41] >>> 14);
      b29 = (s[41] << 18) | (s[40] >>> 14);
      b20 = (s[2] << 1) | (s[3] >>> 31);
      b21 = (s[3] << 1) | (s[2] >>> 31);
      b2 = (s[13] << 12) | (s[12] >>> 20);
      b3 = (s[12] << 12) | (s[13] >>> 20);
      b34 = (s[22] << 10) | (s[23] >>> 22);
      b35 = (s[23] << 10) | (s[22] >>> 22);
      b16 = (s[33] << 13) | (s[32] >>> 19);
      b17 = (s[32] << 13) | (s[33] >>> 19);
      b48 = (s[42] << 2) | (s[43] >>> 30);
      b49 = (s[43] << 2) | (s[42] >>> 30);
      b40 = (s[5] << 30) | (s[4] >>> 2);
      b41 = (s[4] << 30) | (s[5] >>> 2);
      b22 = (s[14] << 6) | (s[15] >>> 26);
      b23 = (s[15] << 6) | (s[14] >>> 26);
      b4 = (s[25] << 11) | (s[24] >>> 21);
      b5 = (s[24] << 11) | (s[25] >>> 21);
      b36 = (s[34] << 15) | (s[35] >>> 17);
      b37 = (s[35] << 15) | (s[34] >>> 17);
      b18 = (s[45] << 29) | (s[44] >>> 3);
      b19 = (s[44] << 29) | (s[45] >>> 3);
      b10 = (s[6] << 28) | (s[7] >>> 4);
      b11 = (s[7] << 28) | (s[6] >>> 4);
      b42 = (s[17] << 23) | (s[16] >>> 9);
      b43 = (s[16] << 23) | (s[17] >>> 9);
      b24 = (s[26] << 25) | (s[27] >>> 7);
      b25 = (s[27] << 25) | (s[26] >>> 7);
      b6 = (s[36] << 21) | (s[37] >>> 11);
      b7 = (s[37] << 21) | (s[36] >>> 11);
      b38 = (s[47] << 24) | (s[46] >>> 8);
      b39 = (s[46] << 24) | (s[47] >>> 8);
      b30 = (s[8] << 27) | (s[9] >>> 5);
      b31 = (s[9] << 27) | (s[8] >>> 5);
      b12 = (s[18] << 20) | (s[19] >>> 12);
      b13 = (s[19] << 20) | (s[18] >>> 12);
      b44 = (s[29] << 7) | (s[28] >>> 25);
      b45 = (s[28] << 7) | (s[29] >>> 25);
      b26 = (s[38] << 8) | (s[39] >>> 24);
      b27 = (s[39] << 8) | (s[38] >>> 24);
      b8 = (s[48] << 14) | (s[49] >>> 18);
      b9 = (s[49] << 14) | (s[48] >>> 18);

      s[0] = b0 ^ (~b2 & b4);
      s[1] = b1 ^ (~b3 & b5);
      s[10] = b10 ^ (~b12 & b14);
      s[11] = b11 ^ (~b13 & b15);
      s[20] = b20 ^ (~b22 & b24);
      s[21] = b21 ^ (~b23 & b25);
      s[30] = b30 ^ (~b32 & b34);
      s[31] = b31 ^ (~b33 & b35);
      s[40] = b40 ^ (~b42 & b44);
      s[41] = b41 ^ (~b43 & b45);
      s[2] = b2 ^ (~b4 & b6);
      s[3] = b3 ^ (~b5 & b7);
      s[12] = b12 ^ (~b14 & b16);
      s[13] = b13 ^ (~b15 & b17);
      s[22] = b22 ^ (~b24 & b26);
      s[23] = b23 ^ (~b25 & b27);
      s[32] = b32 ^ (~b34 & b36);
      s[33] = b33 ^ (~b35 & b37);
      s[42] = b42 ^ (~b44 & b46);
      s[43] = b43 ^ (~b45 & b47);
      s[4] = b4 ^ (~b6 & b8);
      s[5] = b5 ^ (~b7 & b9);
      s[14] = b14 ^ (~b16 & b18);
      s[15] = b15 ^ (~b17 & b19);
      s[24] = b24 ^ (~b26 & b28);
      s[25] = b25 ^ (~b27 & b29);
      s[34] = b34 ^ (~b36 & b38);
      s[35] = b35 ^ (~b37 & b39);
      s[44] = b44 ^ (~b46 & b48);
      s[45] = b45 ^ (~b47 & b49);
      s[6] = b6 ^ (~b8 & b0);
      s[7] = b7 ^ (~b9 & b1);
      s[16] = b16 ^ (~b18 & b10);
      s[17] = b17 ^ (~b19 & b11);
      s[26] = b26 ^ (~b28 & b20);
      s[27] = b27 ^ (~b29 & b21);
      s[36] = b36 ^ (~b38 & b30);
      s[37] = b37 ^ (~b39 & b31);
      s[46] = b46 ^ (~b48 & b40);
      s[47] = b47 ^ (~b49 & b41);
      s[8] = b8 ^ (~b0 & b2);
      s[9] = b9 ^ (~b1 & b3);
      s[18] = b18 ^ (~b10 & b12);
      s[19] = b19 ^ (~b11 & b13);
      s[28] = b28 ^ (~b20 & b22);
      s[29] = b29 ^ (~b21 & b23);
      s[38] = b38 ^ (~b30 & b32);
      s[39] = b39 ^ (~b31 & b33);
      s[48] = b48 ^ (~b40 & b42);
      s[49] = b49 ^ (~b41 & b43);

      s[0] ^= RC[n];
      s[1] ^= RC[n + 1];
    }
  };

  if (COMMON_JS) {
    module.exports = methods;
  } else {
    for (i = 0; i < methodNames.length; ++i) {
      root[methodNames[i]] = methods[methodNames[i]];
    }
    if (AMD) {
      define(function () {
        return methods;
      });
    }
  }
})();

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":8}],8:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
(function (global){(function (){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
