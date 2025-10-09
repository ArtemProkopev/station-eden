// scripts/sync-media.ts
// Запуск:
//   pnpm -w tsx scripts/sync-media.ts
// или с .env:
//   pnpm -w dotenv -e .env -- tsx scripts/sync-media.ts

import {
	GetBucketLocationCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import 'dotenv/config'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const {
	S3_ENDPOINT = 'https://s3.ru-1.storage.selcloud.ru', // региональный endpoint
	S3_REGION = 'ru-1',
	S3_BUCKET,
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
} = process.env

function req(name: string, val?: string) {
	if (!val) throw new Error(`${name} is required`)
	return val
}

const ENDPOINT = req('S3_ENDPOINT', S3_ENDPOINT)
const REGION = req('S3_REGION', S3_REGION)
const BUCKET = req('S3_BUCKET', S3_BUCKET)
const ACCESS_KEY_ID = req('S3_ACCESS_KEY_ID', S3_ACCESS_KEY_ID)
const SECRET_ACCESS_KEY = req('S3_SECRET_ACCESS_KEY', S3_SECRET_ACCESS_KEY)

console.log('== S3 sync starting ==')
console.log('Endpoint:', ENDPOINT)
console.log('Region  :', REGION)
console.log('Bucket  :', BUCKET)
console.log('Key ID  :', ACCESS_KEY_ID)

const s3 = new S3Client({
	region: REGION,
	endpoint: ENDPOINT,
	// Selectel умеет и path-style, и vhost; path-style надёжно для SDK:
	forcePathStyle: true,
	credentials: {
		accessKeyId: ACCESS_KEY_ID,
		secretAccessKey: SECRET_ACCESS_KEY!,
	},
})

function* walk(
	dir: string,
	prefix = ''
): Generator<{ path: string; key: string }> {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name)
		const st = statSync(p)
		if (st.isDirectory()) yield* walk(p, `${prefix}${name}/`)
		else yield { path: p, key: `${prefix}${name}` }
	}
}

function contentTypeByKey(key: string): string {
	const k = key.toLowerCase()
	if (k.endsWith('.png')) return 'image/png'
	if (k.endsWith('.svg')) return 'image/svg+xml'
	if (k.endsWith('.ico')) return 'image/x-icon'
	if (k.endsWith('.jpg') || k.endsWith('.jpeg')) return 'image/jpeg'
	if (k.endsWith('.webp')) return 'image/webp'
	if (k.endsWith('.gif')) return 'image/gif'
	return 'application/octet-stream'
}

async function sanityChecks() {
	// Проверим, виден ли бакет и регион
	try {
		await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
	} catch (e: any) {
		const msg = e?.message || String(e)
		console.error('HeadBucket failed:', msg)
		throw new Error(
			'Не удалось прочитать бакет. Проверь: ' +
				'1) правильное имя бакета, 2) ключи относятся к этому проекту, ' +
				'3) в политике доступа разрешены GetBucketLocation/ListBucket для авторизованных.'
		)
	}

	try {
		await s3.send(new GetBucketLocationCommand({ Bucket: BUCKET }))
	} catch (e) {
		// не критично для загрузки — просто лог
		console.warn('GetBucketLocation failed (не критично):', (e as any)?.message)
	}
}

async function put(localPath: string, key: string) {
	const Body = readFileSync(localPath)
	const ContentType = contentTypeByKey(key)

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body,
				ContentType,
				CacheControl: 'public, max-age=31536000, immutable',
			})
		)
		console.log('uploaded:', key, `(${ContentType})`)
	} catch (e: any) {
		const code = e?.name || e?.Code || 'UnknownError'
		const status = e?.$metadata?.httpStatusCode
		console.error(
			`PutObject failed for ${key}:`,
			code,
			status ? `(HTTP ${status})` : ''
		)
		if (code === 'AccessDenied' || status === 403) {
			console.error(
				'Причина: у ключа нет прав. В бакете в "Политика доступа" добавь для Авторизованных: ' +
					'PutObject, PutObjectAcl (и желательно DeleteObject, ListBucket, GetBucketLocation).'
			)
		}
		throw e
	}
}

async function main() {
	await sanityChecks()

	const roots = [
		{ dir: 'apps/web/public/avatars', prefix: 'web/avatars/' },
		{ dir: 'apps/web/public/frames', prefix: 'web/frames/' },
	]

	const singles = [
		{
			path: 'apps/web/public/profile-background.png',
			key: 'web/profile-background.png',
		},
		{ path: 'apps/web/public/logo.svg', key: 'web/logo.svg' },
		{
			path: 'apps/web/public/login-background.png',
			key: 'web/login-background.png',
		},
		{ path: 'apps/web/public/favicon.ico', key: 'web/favicon.ico' },
	]

	let count = 0
	for (const r of roots) {
		for (const f of walk(r.dir)) {
			await put(f.path, r.prefix + f.key)
			count++
		}
	}
	for (const s of singles) {
		await put(s.path, s.key)
		count++
	}

	console.log(`== S3 sync finished: ${count} file(s) uploaded ==`)
}

main().catch(err => {
	console.error('S3 sync failed:', err?.message || err)
	process.exit(1)
})
