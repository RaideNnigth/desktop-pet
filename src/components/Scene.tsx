import { useEffect, useRef } from "react";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRM, VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm'

type SceneProps = {
    modelUrl: string,
    onLoaded?: (vrm: VRM) => void
}

export default function Scene({ modelUrl, onLoaded }: SceneProps) {
    // Create a reference for a mutable HtmlDivElement, soo it can be used to check
    // change in state.
    const mountRef = useRef<HTMLDivElement | null>(null);

    // Every time the ElementScene is rendered do this
    useEffect(() => {
        // Guard for the first micro-moments before ref is ready on DOM
        if (!mountRef.current) return;
        // --- Renderer (transparent for desktop pet)
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            premultipliedAlpha: false
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(400, 400);
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.background = 'transparent';
        mountRef.current.appendChild(renderer.domElement);

        // DEBUG: is there a GL context?
        const gl = renderer.getContext() as WebGLRenderingContext | null;
        console.log('GL OK?', !!gl);
        if (gl) {
            // try to print vendor/renderer if extension exists
            const ext = gl.getExtension('WEBGL_debug_renderer_info') as any;
            if (ext) {
                console.log('GL_VENDOR   :', gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
                console.log('GL_RENDERER :', gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
            }
        }

        // --- Scene & Camera
        const scene = new THREE.Scene();
        const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
        camera.position.set(0, 1.35, 1.2)
        scene.add(camera)

        // --- And God said, Let there be light
        const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.9);
        hemi.position.set(0, 1, 0);
        scene.add(hemi);

        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(1.5, 2, 2);
        dir.castShadow = false;
        scene.add(dir);

        // --- Resize handling (currently you cannot resize, but it is easy to do in Three.js)
        // --- Soo lets do it anyway.
        // --- Resize handling
        const fit = () => {
            const r = mountRef.current!.getBoundingClientRect();
            const s = Math.min(r.width, r.height);
            renderer.setSize(s, s);
            camera.aspect = 1;
            camera.updateProjectionMatrix();
        }
        const ro = new ResizeObserver(fit);
        ro.observe(mountRef.current);
        fit();

        let vrm: VRM | null = null;
        // RequestAnimationFrame = RAF
        let raf = 0;
        // Delta time
        const clock = new THREE.Clock();

        // --- Load VRM with Three-VRM by Pixiv lib
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        loader.load(
            modelUrl,
            (gltf) => {
                const loaded = gltf.userData.vrm as VRM;

                // Optional light/mesh optimizations (As in doc)
                VRMUtils.removeUnnecessaryJoints(loaded.scene);
                VRMUtils.removeUnnecessaryVertices(loaded.scene);

                // Add the avatar to the scene using VRM
                vrm = loaded;
                scene.add(vrm.scene);

                // Face the camera
                if (vrm.lookAt) {
                    vrm.lookAt.autoUpdate = true;
                    vrm.lookAt.target = camera;
                }
                vrm.scene.rotation.y = Math.PI;

                // scale/position tweaks if needed
                vrm.scene.position.set(0, 0, 0);
                onLoaded?.(vrm);

            }, undefined, (e) => console.error('VRM load error:', e)
        );

        // --- keep printing the bad boy
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const dt = clock.getDelta();
            if (vrm) {
                vrm.update(dt);
                // Blink my cute :)
                const t = performance.now() / 1000;
                vrm.expressionManager?.setValue('blink', (Math.sin(t * 2.7) + 1) * 0.5 > 0.98 ? 1 : 0);
            }
            renderer.render(scene, camera)
        };
        loop();

        // --- Cleanup copied from VRM docs
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            if (vrm) {
                scene.remove(vrm.scene);
                VRMUtils.deepDispose(vrm.scene);
            }
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
        }
    }, [modelUrl, onLoaded]);
    return (
        <div className="w-[420px] h-[420px] bg-transparent" ref={mountRef} />
    );
}