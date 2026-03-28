import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import * as THREE from "three"

import { getFloorPlansData } from "#/server/floorplan.functions"

export interface FloorPlan {
  floor: number
  path: string
  calibrationScale: number
}

const FLOOR_HEIGHT = 1 // Height between floors (z-axis)
const BASE_HEIGHT = 2

interface ThreeSceneProps {
  currentFloor?: number | null
}

export const ThreeScene = ({ currentFloor = null }: ThreeSceneProps) => {
  const sceneMountRef = useRef<HTMLDivElement | null>(null)

  const { data: floorPlansData } = useQuery({
    queryKey: ["floorPlans"],
    queryFn: getFloorPlansData,
  })

  useEffect(() => {
    /////////////////
    // Scene setup //
    /////////////////
    if (!sceneMountRef.current || !floorPlansData) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      sceneMountRef.current.clientWidth / sceneMountRef.current.clientHeight,
      0.1,
      1000,
    )

    camera.position.z = 2.5 //!!!!needs to be updated when more camera controls are added

    ////////////////////
    // Renderer setup //
    ////////////////////
    const existingCanvas = sceneMountRef.current.querySelector("canvas")
    let canvas: HTMLCanvasElement | null = null
    let renderer: THREE.WebGLRenderer

    if (existingCanvas && existingCanvas instanceof HTMLCanvasElement) {
      canvas = existingCanvas
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    } else {
      renderer = new THREE.WebGLRenderer({ antialias: true })
      canvas = renderer.domElement
      sceneMountRef.current.appendChild(canvas)
    }
    renderer.setSize(sceneMountRef.current.clientWidth, sceneMountRef.current.clientHeight)

    //////////////////////
    // Load floor plans //
    //////////////////////
    const textureLoader = new THREE.TextureLoader()
    const planes: THREE.Mesh[] = []

    const floorsToLoad =
      currentFloor !== null
        ? floorPlansData.filter((fp: FloorPlan) => fp.floor === currentFloor)
        : floorPlansData

    floorsToLoad.forEach((floorPlan: FloorPlan) => {
      textureLoader.load(floorPlan.path, (texture) => {
        // texture filtering
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        const height = BASE_HEIGHT * floorPlan.calibrationScale
        const width = height * (texture.image.width / texture.image.height)

        const geometry = new THREE.PlaneGeometry(width, height)
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
        const plane = new THREE.Mesh(geometry, material)

        plane.position.z = floorPlan.floor * FLOOR_HEIGHT

        scene.add(plane)
        planes.push(plane)
      })
    })

    /////////////
    // Animate //
    /////////////
    const animate = () => {
      renderer.render(scene, camera)
    }
    renderer.setAnimationLoop(animate)

    ///////////////////
    // Handle resize //
    ///////////////////
    const handleResize = () => {
      if (!sceneMountRef.current) return

      const width = sceneMountRef.current.clientWidth
      const height = sceneMountRef.current.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener("resize", handleResize)

    /////////////
    // Cleanup //
    /////////////
    return () => {
      window.removeEventListener("resize", handleResize)
      renderer.setAnimationLoop(null)

      planes.forEach((plane) => {
        scene.remove(plane)
        plane.geometry.dispose()
        const material = plane.material
        if (!Array.isArray(material)) {
          if (material instanceof THREE.MeshBasicMaterial && material.map) {
            material.map.dispose()
          }
          material.dispose()
        }
      })

      renderer.dispose()
    }
  }, [floorPlansData, currentFloor])

  return <div ref={sceneMountRef} style={{ width: "100%", height: "100%" }} />
}
