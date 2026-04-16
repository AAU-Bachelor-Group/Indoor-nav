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

/** Default polar angle when entering 3D mode */
export const DEFAULT_3D_POLAR = Math.PI / 4 // 45°

/** Near-zero polar angle for top-down 2D view (avoids spherical singularity) */
export const TOP_DOWN_POLAR = 0.001

/** Maximum allowed polar angle (prevents viewing from below the floor) */
export const MAX_POLAR_ANGLE = Math.PI / 2.2

/** Snap-to-vertex radius for room polygon drawing, in meters. */
export const SNAP_RADIUS_METERS = 0.5

/**
 * Vertical offset (in world units / meters) used when rendering drawing
 * primitives above a floor plane, to keep them from z-fighting with the
 * floor texture and to clearly sit above the plane in 3D oblique views.
 * Storage is unaffected - only rendering positions are lifted by this amount.
 */
export const DRAWING_LIFT = 0.05
