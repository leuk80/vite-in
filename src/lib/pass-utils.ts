import { PKPass } from 'passkit-generator'
import { deflateSync } from 'node:zlib'

/** Generate a minimal valid PNG buffer with a solid RGB color */
export function createPNG(width: number, height: number, r: number, g: number, b: number): Buffer {
	const table = new Uint32Array(256)
	for (let n = 0; n < 256; n++) {
		let c = n
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
		}
		table[n] = c
	}

	function crc32(data: Buffer): number {
		let crc = 0xffffffff
		for (let i = 0; i < data.length; i++) {
			crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff]
		}
		return ((crc ^ 0xffffffff) >>> 0)
	}

	function chunk(type: string, data: Buffer): Buffer {
		const len = Buffer.alloc(4)
		len.writeUInt32BE(data.length)
		const typeBytes = Buffer.from(type, 'ascii')
		const crcBuf = Buffer.alloc(4)
		crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
		return Buffer.concat([len, typeBytes, data, crcBuf])
	}

	const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
	const ihdrData = Buffer.alloc(13)
	ihdrData.writeUInt32BE(width, 0)
	ihdrData.writeUInt32BE(height, 4)
	ihdrData[8] = 8 // bit depth
	ihdrData[9] = 2 // color type: RGB

	const rowSize = 1 + width * 3
	const raw = Buffer.alloc(height * rowSize)
	for (let y = 0; y < height; y++) {
		raw[y * rowSize] = 0 // filter: None
		for (let x = 0; x < width; x++) {
			const o = y * rowSize + 1 + x * 3
			raw[o] = r
			raw[o + 1] = g
			raw[o + 2] = b
		}
	}

	return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

export interface WalletCerts {
	wwdr: string
	signerCert: string
	signerKey: string
	passTypeIdentifier: string
	teamIdentifier: string
}

/** Build a .pkpass Buffer for an attendee or organizer */
export function buildWalletPass(
	event: { id: string; slug: string; title: string; date: string; location?: string; description?: string },
	name: string | null,
	status: string | null,
	certs: WalletCerts
): Buffer {
	const isOrganizer = !name

	const eventDate = new Date(event.date)
	const dateStr = eventDate.toLocaleDateString('de-DE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	})
	const timeStr = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
	const statusLabel =
		status === 'yes' ? 'Zugesagt ✓' : status === 'maybe' ? 'Vielleicht' : status === 'no' ? 'Abgesagt' : ''

	const passJSON = {
		formatVersion: 1,
		passTypeIdentifier: certs.passTypeIdentifier,
		teamIdentifier: certs.teamIdentifier,
		organizationName: 'vite.in',
		description: event.title,
		backgroundColor: 'rgb(17,17,17)',
		foregroundColor: 'rgb(255,255,255)',
		labelColor: 'rgb(153,153,153)',
		eventTicket: {}
	}

	const icon = createPNG(29, 29, 17, 17, 17)
	const icon2x = createPNG(58, 58, 17, 17, 17)

	const pass = new PKPass(
		{
			'pass.json': Buffer.from(JSON.stringify(passJSON)),
			'icon.png': icon,
			'icon@2x.png': icon2x
		},
		{
			wwdr: certs.wwdr,
			signerCert: certs.signerCert,
			signerKey: certs.signerKey
		},
		{
			serialNumber: `${event.id}-${isOrganizer ? 'org' : Buffer.from(name || '').toString('hex').slice(0, 12)}`
		}
	)

	pass.setBarcodes(`https://vite.in/event/${event.slug}`)

	if (isOrganizer) {
		pass.primaryFields.push({ key: 'event', label: 'EVENT', value: event.title })
		pass.secondaryFields.push({ key: 'date', label: 'DATUM', value: dateStr })
		pass.secondaryFields.push({ key: 'time', label: 'UHRZEIT', value: timeStr })
		if (event.location) pass.auxiliaryFields.push({ key: 'location', label: 'ORT', value: event.location })
		pass.auxiliaryFields.push({ key: 'role', label: 'ROLLE', value: 'Organisator' })
	} else {
		pass.primaryFields.push({ key: 'guest', label: 'GAST', value: name! })
		pass.secondaryFields.push({ key: 'event', label: 'EVENT', value: event.title })
		pass.secondaryFields.push({ key: 'date', label: 'DATUM', value: `${dateStr}, ${timeStr}` })
		if (event.location) pass.auxiliaryFields.push({ key: 'location', label: 'ORT', value: event.location })
		if (statusLabel) pass.auxiliaryFields.push({ key: 'status', label: 'STATUS', value: statusLabel })
	}

	if (event.description) pass.backFields.push({ key: 'description', label: 'BESCHREIBUNG', value: event.description })
	pass.backFields.push({ key: 'link', label: 'EVENT-LINK', value: `https://vite.in/event/${event.slug}` })

	return pass.getAsBuffer()
}

/** Build an ICS calendar file Buffer for an event */
export function buildICS(event: {
	title: string
	date: string
	location?: string
	description?: string
}): Buffer {
	const start = new Date(event.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
	const end = new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000)
		.toISOString()
		.replace(/[-:]/g, '')
		.split('.')[0] + 'Z'

	const ics = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//vite.in//Event//DE',
		'BEGIN:VEVENT',
		`SUMMARY:${event.title}`,
		`DTSTART:${start}`,
		`DTEND:${end}`,
		`LOCATION:${event.location || ''}`,
		`DESCRIPTION:${event.description || ''}`,
		'END:VEVENT',
		'END:VCALENDAR'
	].join('\r\n')

	return Buffer.from(ics, 'utf-8')
}
