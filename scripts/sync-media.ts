// pnpm -w dotenv -e .env -- tsx scripts/sync-media.ts
import {
	GetBucketLocationCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import 'dotenv/config'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const {
	S3_ENDPOINT = 'https://s3.ru-1.storage.selcloud.ru',
	S3_REGION = 'ru-1',
	S3_BUCKET,
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
	// Включи, если не делаешь bucket policy на публичное чтение
	S3_USE_ACL = 'false',
	// Опционально: «сухой прогон» (покажет, что бы загрузил, но без аплоада)
	DRY_RUN = 'false',
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
const USE_ACL = /^true$/i.test(S3_USE_ACL)
const IS_DRY_RUN = /^true$/i.test(DRY_RUN)

console.log('== S3 sync starting ==')
console.log('Endpoint:', ENDPOINT)
console.log('Region  :', REGION)
console.log('Bucket  :', BUCKET)
console.log('Key ID  :', ACCESS_KEY_ID)
console.log(
	'ACL     :',
	USE_ACL ? 'public-read (per object)' : 'disabled (use bucket policy)'
)
console.log('Dry-run :', IS_DRY_RUN ? 'YES' : 'NO')

const s3 = new S3Client({
	region: REGION,
	endpoint: ENDPOINT,
	forcePathStyle: true, // надёжно для Selectel SDK
	credentials: {
		accessKeyId: ACCESS_KEY_ID,
		secretAccessKey: SECRET_ACCESS_KEY!,
	},
})

/** Какие пути/файлы игнорируем */
function shouldIgnorePath(name: string, relPath: string): boolean {
	// Системные/мусор
	if (name === '.DS_Store' || name === 'Thumbs.db') return true
	// Игнорим «скрытые» файлы/папки, КРОМЕ .well-known (часто нужен)
	if (name.startsWith('.') && !relPath.startsWith('.well-known/')) return true
	return false
}

function* walk(
	dir: string,
	baseDir: string
): Generator<{ abs: string; rel: string }> {
	if (!existsSync(dir)) return
	for (const name of readdirSync(dir)) {
		const abs = join(dir, name)
		const rel = relative(baseDir, abs).replace(/\\/g, '/')
		if (shouldIgnorePath(name, rel)) continue
		const st = statSync(abs)
		if (st.isDirectory()) yield* walk(abs, baseDir)
		else yield { abs, rel }
	}
}

function detectContentType(key: string): string {
	const k = key.toLowerCase()
	if (k.endsWith('.png')) return 'image/png'
	if (k.endsWith('.svg')) return 'image/svg+xml'
	if (k.endsWith('.ico')) return 'image/x-icon'
	if (k.endsWith('.jpg') || k.endsWith('.jpeg')) return 'image/jpeg'
	if (k.endsWith('.webp')) return 'image/webp'
	if (k.endsWith('.gif')) return 'image/gif'
	if (k.endsWith('.bmp')) return 'image/bmp'
	if (k.endsWith('.avif')) return 'image/avif'

	if (k.endsWith('.woff2')) return 'font/woff2'
	if (k.endsWith('.woff')) return 'font/woff'
	if (k.endsWith('.ttf')) return 'font/ttf'
	if (k.endsWith('.otf')) return 'font/otf'
	if (k.endsWith('.eot')) return 'application/vnd.ms-fontobject'

	if (k.endsWith('.mp4')) return 'video/mp4'
	if (k.endsWith('.webm')) return 'video/webm'
	if (k.endsWith('.mov')) return 'video/quicktime'
	if (k.endsWith('.mp3')) return 'audio/mpeg'
	if (k.endsWith('.ogg')) return 'audio/ogg'
	if (k.endsWith('.wav')) return 'audio/wav'

	if (k.endsWith('.json')) return 'application/json'
	if (k.endsWith('.txt')) return 'text/plain; charset=utf-8'
	if (k.endsWith('.css')) return 'text/css; charset=utf-8'
	if (k.endsWith('.js')) return 'application/javascript; charset=utf-8'
	return 'application/octet-stream'
}

async function sanityChecks() {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
	} catch (e: any) {
		const msg = e?.message || String(e)
		console.error('HeadBucket failed:', msg)
		throw new Error(
			'Не вижу бакет. Проверь имя, ключи и права (ListBucket/GetBucketLocation как минимум).'
		)
	}
	try {
		await s3.send(new GetBucketLocationCommand({ Bucket: BUCKET }))
	} catch (e) {
		console.warn('GetBucketLocation failed (не критично):', (e as any)?.message)
	}
}

async function putWithRetry(
	localPath: string,
	key: string,
	attempt = 1
): Promise<void> {
	const ContentType = detectContentType(key)
	if (IS_DRY_RUN) {
		console.log('[dry-run] would upload:', key, `(${ContentType})`)
		return
	}
	const Body = readFileSync(localPath)

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body,
				ContentType,
				CacheControl: 'public, max-age=31536000, immutable',
				...(USE_ACL ? { ACL: 'public-read' as const } : {}),
			})
		)
		console.log('uploaded:', key, `(${ContentType})`)
	} catch (e: any) {
		const status = e?.$metadata?.httpStatusCode
		const code = e?.name || e?.Code || 'UnknownError'
		const retriable = status >= 500 || status === 429
		console.warn(
			`PutObject failed for ${key}: ${code}${status ? ` (HTTP ${status})` : ''}`
		)

		if (retriable && attempt < 3) {
			const delay = 300 * Math.pow(2, attempt - 1)
			await new Promise(r => setTimeout(r, delay))
			return putWithRetry(localPath, key, attempt + 1)
		}
		if (code === 'AccessDenied' || status === 403) {
			console.error(
				'Возможная причина: объект приватный. ' +
					'Либо включи S3_USE_ACL=true, либо задай bucket policy с публичным GetObject.'
			)
		}
		throw e
	}
}

/** Находит все папки вида apps/*\/public и возвращает пары { app, dir } */
function findPublicRoots(): Array<{ app: string; dir: string }> {
	const roots: Array<{ app: string; dir: string }> = []
	const appsDir = 'apps'
	if (!existsSync(appsDir)) return roots
	for (const entry of readdirSync(appsDir)) {
		const full = join(appsDir, entry)
		const st = statSync(full)
		if (!st.isDirectory()) continue
		const publicDir = join(full, 'public')
		if (existsSync(publicDir) && statSync(publicDir).isDirectory()) {
			roots.push({ app: entry, dir: publicDir })
		}
	}
	return roots
}

async function main() {
	await sanityChecks()

	const roots = findPublicRoots()
	if (!roots.length) {
		console.warn('Не найдено ни одной папки apps/*/public — загружать нечего.')
		return
	}

	let uploaded = 0
	for (const r of roots) {
		const prefix = `${r.app}/` // web/*, foo/*, etc.
		for (const f of walk(r.dir, r.dir)) {
			const key = prefix + f.rel // напр. web/icons/star.svg
			await putWithRetry(f.abs, key)
			uploaded++
		}
	}

	console.log(`== S3 sync finished: ${uploaded} file(s) processed ==`)
}

main().catch(err => {
	console.error('S3 sync failed:', err?.message || err)
	process.exit(1)
})
