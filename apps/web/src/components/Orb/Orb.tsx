'use client'

import { Mesh, Program, Renderer, Triangle } from 'ogl'
import { useEffect, useRef } from 'react'
import './Orb.css'

type OrbProps = {
	hue?: number
	hoverIntensity?: number
	rotateOnHover?: boolean
	forceHoverState?: boolean
}

export default function Orb({
	hue = 190,
	hoverIntensity = 0.2,
	rotateOnHover = false,
	forceHoverState = false,
}: OrbProps) {
	const containerRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const container = containerRef.current

		if (!container) return

		const renderer = new Renderer({
			alpha: true,
			antialias: true,
			premultipliedAlpha: false,
			dpr: Math.min(window.devicePixelRatio || 1, 2),
		})

		const gl = renderer.gl

		gl.clearColor(0, 0, 0, 0)
		container.appendChild(gl.canvas)

		const vertexShader = `
			attribute vec2 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`

		const fragmentShader = `
			precision highp float;

			uniform float uTime;
			uniform vec2 uResolution;
			uniform float uHue;
			uniform float uHover;
			uniform float uRotation;

			varying vec2 vUv;

			float hash(vec2 p) {
				p = fract(p * vec2(123.34, 456.21));
				p += dot(p, p + 45.32);
				return fract(p.x * p.y);
			}

			float noise(vec2 p) {
				vec2 i = floor(p);
				vec2 f = fract(p);

				float a = hash(i);
				float b = hash(i + vec2(1.0, 0.0));
				float c = hash(i + vec2(0.0, 1.0));
				float d = hash(i + vec2(1.0, 1.0));

				vec2 u = f * f * (3.0 - 2.0 * f);

				return mix(a, b, u.x) +
					(c - a) * u.y * (1.0 - u.x) +
					(d - b) * u.x * u.y;
			}

			float fbm(vec2 p) {
				float value = 0.0;
				float amplitude = 0.5;

				for (int i = 0; i < 6; i++) {
					value += amplitude * noise(p);
					p *= 2.02;
					amplitude *= 0.5;
				}

				return value;
			}

			vec3 hsl2rgb(vec3 c) {
				vec3 rgb = clamp(
					abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
					0.0,
					1.0
				);

				return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
			}

			void main() {
				vec2 uv = vUv * 2.0 - 1.0;

				uv.x *= uResolution.x / uResolution.y;

				float rotationSin = sin(uRotation);
				float rotationCos = cos(uRotation);

				uv = mat2(
					rotationCos,
					-rotationSin,
					rotationSin,
					rotationCos
				) * uv;

				float radius = length(uv);
				float angle = atan(uv.y, uv.x);
				float time = uTime * 0.38;

				float plasmaA = fbm(uv * 2.28 + vec2(time * 0.42, -time * 0.3));
				float plasmaB = fbm(vec2(angle * 1.7, radius * 4.4) + vec2(time * 0.64, time * 0.24));
				float plasmaC = fbm(uv * 4.0 - vec2(time * 0.2, time * 0.36));

				float swirl = sin(angle * 4.4 + radius * 8.2 - time * 3.4 + plasmaA * 3.2);
				float sphere = smoothstep(1.08, 0.18, radius);
				float innerSphere = smoothstep(0.82, 0.06, radius);
				float rim = smoothstep(0.94, 0.52, radius) - smoothstep(1.08, 0.78, radius);
				float ring = smoothstep(0.035, 0.0, abs(radius - 0.64 - swirl * 0.027));

				float energy = plasmaA * 0.55 + plasmaB * 0.32 + plasmaC * 0.13 + swirl * 0.08;
				energy = smoothstep(0.22, 0.98, energy);

				float baseHue = mod(uHue / 360.0 + plasmaB * 0.07 + swirl * 0.028, 1.0);

				vec3 colorA = hsl2rgb(vec3(baseHue, 0.92, 0.58));
				vec3 colorB = hsl2rgb(vec3(mod(baseHue + 0.08, 1.0), 0.88, 0.5));
				vec3 colorC = hsl2rgb(vec3(mod(baseHue + 0.7, 1.0), 0.82, 0.62));

				vec3 color = mix(colorA, colorB, plasmaA);
				color = mix(color, colorC, rim * 0.62);

				float hoverBoost = 1.0 + uHover * 0.36;
				float core = smoothstep(0.46, 0.0, radius) * 0.22;
				float glow = sphere * (0.3 + energy * 0.9);

				color *= glow * hoverBoost;
				color += colorA * ring * 1.16;
				color += vec3(0.78, 0.98, 1.0) * core;

				float alpha = sphere * (0.18 + innerSphere * 0.62 + rim * 0.34 + ring * 0.3);
				alpha *= smoothstep(1.08, 0.76, radius);
				alpha = clamp(alpha, 0.0, 0.9);

				gl_FragColor = vec4(color, alpha);
			}
		`

		const geometry = new Triangle(gl)

		const program = new Program(gl, {
			vertex: vertexShader,
			fragment: fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uResolution: {
					value: [
						Math.max(container.clientWidth, 1),
						Math.max(container.clientHeight, 1),
					],
				},
				uHue: { value: hue },
				uHover: { value: forceHoverState ? 1 : 0 },
				uRotation: { value: 0 },
			},
			transparent: true,
			depthTest: false,
			depthWrite: false,
		})

		const mesh = new Mesh(gl, {
			geometry,
			program,
		})

		let animationFrameId = 0
		let lastTime = performance.now()
		let currentHover = forceHoverState ? 1 : 0
		let targetHover = forceHoverState ? 1 : 0
		let rotation = 0

		const resize = () => {
			const width = Math.max(container.clientWidth, 1)
			const height = Math.max(container.clientHeight, 1)

			renderer.setSize(width, height)
			program.uniforms.uResolution.value = [width, height]
		}

		const handlePointerEnter = () => {
			if (!forceHoverState) {
				targetHover = 1
			}
		}

		const handlePointerLeave = () => {
			if (!forceHoverState) {
				targetHover = 0
			}
		}

		const animate = (time: number) => {
			const delta = Math.min(0.05, (time - lastTime) / 1000)

			lastTime = time

			currentHover += (targetHover - currentHover) * Math.min(1, delta * 7)

			if (rotateOnHover) {
				rotation += currentHover * hoverIntensity * delta * 2.6
			} else {
				rotation += delta * 0.045
			}

			program.uniforms.uTime.value = time * 0.001
			program.uniforms.uHue.value = hue
			program.uniforms.uHover.value = currentHover
			program.uniforms.uRotation.value = rotation

			renderer.render({
				scene: mesh,
			})

			animationFrameId = requestAnimationFrame(animate)
		}

		const resizeObserver = new ResizeObserver(resize)

		resizeObserver.observe(container)
		resize()

		container.addEventListener('pointerenter', handlePointerEnter)
		container.addEventListener('pointerleave', handlePointerLeave)

		animationFrameId = requestAnimationFrame(animate)

		return () => {
			cancelAnimationFrame(animationFrameId)

			resizeObserver.disconnect()

			container.removeEventListener('pointerenter', handlePointerEnter)
			container.removeEventListener('pointerleave', handlePointerLeave)

			if (gl.canvas.parentNode === container) {
				container.removeChild(gl.canvas)
			}

			gl.getExtension('WEBGL_lose_context')?.loseContext()
		}
	}, [forceHoverState, hoverIntensity, hue, rotateOnHover])

	return <div ref={containerRef} className='orb-container' />
}
