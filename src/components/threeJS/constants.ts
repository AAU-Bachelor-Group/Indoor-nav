/** Vertical distance between floors in world units */
export const FLOOR_HEIGHT = 8

/** Interpolation speed for camera and target animations (0–1, higher = faster) */
export const LERP_SPEED = 0.08

/** Camera tilt angle (radians) below which neighbour floors are fully transparent */
export const TILT_FADE_START = Math.PI / 12 // 15°

/** Camera tilt angle (radians) at which neighbour floors reach max opacity */
export const TILT_FADE_END = Math.PI / 4 // 45°

/** Maximum opacity for non-active floor plans when tilted */
export const NEIGHBOUR_MAX_OPACITY = 0.2

/** Near-zero polar angle for top-down 2D view (avoids spherical singularity) */
export const TOP_DOWN_POLAR = 0.001

/** Maximum allowed polar angle (prevents viewing from below the floor) */
export const MAX_POLAR_ANGLE = Math.PI / 2.2

/**
 * Smallest polar tilt allowed in 3D mode. Without this, the user can sit at
 * exactly top-down (polar = 0) where OrbitControls' spherical theta is
 * undefined — making the compass needle drift and the reset button produce
 * random orientations on each press. Users who want true top-down should
 * use 2D render mode.
 */
export const MIN_3D_POLAR_ANGLE = 0.05

/** Hard limits on how close/far the user can dolly in 3D (perspective). */
export const MIN_CAMERA_DISTANCE = 5
export const MAX_CAMERA_DISTANCE = 100

/** Hard limits on orthographic zoom (2D top-down). */
export const MIN_CAMERA_ZOOM = 1
export const MAX_CAMERA_ZOOM = 60

/**
 * Reference distance / zoom at which `panSpeed` and `rotateSpeed` are at their
 * base value. As the user zooms out beyond this, both speeds scale down so far
 * views feel less twitchy (OrbitControls' built-in distance scaling already
 * compensates for world-units-per-pixel; this softens damped overshoot and
 * rotational swing around a distant target).
 */
export const REF_3D_DISTANCE = 30
export const REF_2D_ZOOM = 8

/** Base speeds before per-frame modulation. */
export const BASE_PAN_SPEED = 1
export const BASE_ROTATE_SPEED = 0.7

/** Snap-to-vertex radius for room polygon drawing, in meters. */
export const SNAP_RADIUS_METERS = 0.5

/**
 * Vertical offset (in world units / meters) used when rendering drawing
 * primitives above a floor plane, to keep them from z-fighting with the
 * floor texture and to clearly sit above the plane in 3D oblique views.
 * Storage is unaffected - only rendering positions are lifted by this amount.
 */
export const DRAWING_LIFT = 0.05

/**
 * Vertical offset for navigation overlay markers (start / destination rings).
 * Larger than `DRAWING_LIFT` so the markers visibly hover above the room
 * polygons in 3D oblique views; depth-testing is also disabled on these so
 * the lift is mainly a 3D affordance.
 */
export const MARKER_LIFT = DRAWING_LIFT * 4
