const klv = require('./klv')

module.exports.parse = function (buffer, options = {}) {
	const packet = typeof buffer === 'string' ? Buffer.from(buffer, 'hex') : buffer
	const values = {}

	options.debug === true && console.debug('-------Start Parse Algorithm series-------')
	options.debug === true && process.stdout.write(`Buffer ${buffer.toString('hex')} ${buffer.length}\n`)


	let i=0

	let length = 0
	let read
	do {
		read = packet[i]
		length += read & 0x7F
		i++
	} while (read >>> 7 === 1)


	if(packet.length -1 < length) {
		throw new Error('Invalid Algorithm Series buffer, not enough content')
	}

	let algorithms = []
	let algorithm = null
	while (i < packet.length) {
		const key = packet[i]
		const length = packet[i + 1]

		if (packet.length < i + 2 + length) {
			throw new Error('Invalid Algorithm Series buffer, not enough content')
		}

		if(key === 1) {
			if(algorithm !== null) {
				algorithms.push(algorithm)
			}
			algorithm = {}
		}

		const valueBuffer = packet.subarray(i + 2, i + 2 + length)
		const parsed = convert(key, valueBuffer)

		if(typeof parsed.value === 'string') {
			parsed.value = parsed.value.replace(/[^\x20-\x7E]+/g, '')
		}

		if (options.debug === true) {
			console.debug(key, length, parsed.name, `${parsed.value}${parsed.unit || ''}`, valueBuffer)
			parsed.packet = valueBuffer
		}

		if(options.verbose) {
			algorithm[key] = parsed
		} else {
			algorithm[key] = parsed.value
		}

		i += 1 + 1 + length // advance past key, length and value bytes
	}
	algorithms.push(algorithm)
	options.debug === true && console.debug('-------End Parse Algorithm Series---------')
	return algorithms
}

function convert(key, buffer) {
	try {
		switch (key) {
			case 1:
				klv.checkMaxSize(key, buffer, 3)
				return {
					key,
					name: 'ID',
					value: klv.readVariableUInt(buffer, buffer.length)
				}
			case 2:
				return {
					key,
					name: 'Name',
					value: buffer.toString()
				}
			case 3:
				return {
					key,
					name: 'Version',
					value: buffer.toString()
				}
			case 4:
				return {
					key,
					name: 'Class',
					value: buffer.toString()
				}
			case 5:
				return {
					key,
					name: 'nFrames',
					value: klv.readVariableUInt(buffer, buffer.length)
				}
			default:
				throw Error(`Key ${key} not found`)
		}
	} catch (e) {
		throw e
	}
}
