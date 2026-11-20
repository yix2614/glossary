export const effectPrompts = {
  'water-ripple': `Implement a photo-based water ripple in React and TypeScript using Canvas 2D and ImageData.

Simulation: Use two Float32Array height-field buffers at one cell per 4 CSS pixels with a zero-valued border. Step at 60 Hz using next = ((left + right + up + down) * 0.5 - previous) * 0.985, then swap buffers. Stop stepping when the peak amplitude falls below 0.004.

Rendering: Cache an aspect-ratio-preserving cover crop of the photo. Use central differences to calculate the horizontal and vertical surface gradients. Bilinearly interpolate those gradients per output pixel, displace the source lookup by about 5 px per unit of slope, and add directional shading from the combined slopes. Write the output with putImageData.

Interaction: Add a cosine-falloff impulse on press. Interpolate small impulses along the pointer path about every 9 px. Drop one ripple when the card enters view, then rain at randomized 1–2 second intervals. Pause offscreen and suppress autoplay for reduced motion. The photo stays visible before the first ripple.`,

  goo: `Build a monochrome SVG metaball menu in React. Place a 54 px circular plus trigger at the origin and three 44 px action circles behind it. On expansion, animate them to offsets (-63, -38), (0, -68), and (63, -38) px over roughly 550 ms. Reverse the offsets on collapse.

Render the four silhouettes on a separate filtered layer. Apply feGaussianBlur to SourceAlpha with sigma 7, threshold the alpha with feColorMatrix (28 × alpha − 11), and use feFlood with feComposite to give the result a uniform fill. Render sharp icons and real buttons above the filtered layer, using the same position transitions for the visual shapes and hit targets.

Cycle open and closed only while visible and idle. Collapse on mouse entry, allow the plus button to toggle manually, and pause autoplay while a keyboard control is focused. Hide and disable the satellite hit targets when collapsed. Respect reduced motion.`,

  tilt: `Implement a 3D pointer-driven card tilt on a stationary hit area. Normalize the pointer to [-0.5, 0.5] on each axis relative to that hit area. Apply rotateX(-y * 29deg) and rotateY(x * 34deg) to the inner card under 600px perspective. Keep the hit area itself steady so transformed bounds do not affect pointer calculations.

Use transform-style: preserve-3d and translateZ to lift the central graphic above the card surface. Drive a soft radial specular highlight with the normalized x position, using a CSS custom property. Ease the rotation over about 240 ms and return to the resting angle on pointer leave. Let touch or keyboard activation toggle a second resting angle, and suppress continuous tracking for reduced motion.`,

  glass: `Build a draggable Liquid Glass capsule over a cover-cropped photo. Use a roughly 1.55:1 aspect ratio and a fully rounded outline. Cache the exact backdrop pixels and sample that same image into the lens as it moves.

For lens-local coordinates, compute the signed distance and outward normal of a capsule using its central horizontal line segment. Use a 0.90 sampling scale for gentle center magnification. Over the outer 14 px, ease the incident angle up to 60°. Use Snell’s law with slightly different RGB refractive indices (1.47, 1.49, 1.52). Convert the angle difference into a displacement along the normal, then bilinearly sample each channel. Precompute the offset map at lens size. Use narrow directional rim reflections and a dimmer opposing highlight while leaving the photo texture sharp.

Use pointer capture while dragging and preserve the grab offset so the lens does not jump on press. Constrain the lens within the card and support arrow-key movement. Keep the lens free of icons and text.`,

  gravity: `Implement a Canvas 2D gravity loop with seven flat, colorful shapes and no shadows or text. Use a four-lobed flower, two leaf shapes, a soft burst, an arch, a scalloped seal, and a capsule. Vary the silhouette dimensions from roughly 41 × 44 px to 118 × 118 px.

Spawn one body every 300 ms from above the frame with a small horizontal velocity, initial rotation, and angular velocity. Integrate downward acceleration around 1,050 px/s², using substeps no longer than 1/120 s. Sample each contour once, compute its convex hull, and rotate that hull with the rendered shape. Use the separating axis theorem (SAT) on polygon edge normals for body-body contacts, resolve penetration along the minimum translation vector, and apply a damped normal impulse. Compute floor and wall contacts from the rotated hull's support points so the visible shape meets the boundary without a gap.

Let the pile settle before restarting the seven-second cycle. Pause when offscreen and render a static arrangement under reduced motion.`,

  magnetic: `Build a magnetic button inside a fixed interaction zone. Compute the pointer offset from the zone's center and translate only an inner wrapper by 32% of the horizontal offset and 35% of the vertical offset. Use CSS custom properties for the two axes and a 340 ms overshooting cubic-bezier transition for the return to center. Measure the stationary outer zone so the moving button does not feed back into its own bounds.

Reset both offsets on pointer leave. Ignore touch-pointer tracking, preserve the actual button's click and keyboard behavior, and disable pointer-driven translation for reduced motion.`,

  odometer: `Build a three-digit rolling odometer with fixed-width clipping windows and tabular numerals. Format the value with leading zeroes and start at 098. Key each digit by position and value so only changed digits animate. Move incoming digits from translateY(105%) to 0 and outgoing digits from 0 to translateY(-105%), with a damped spring around stiffness 310 and damping 27. Synchronize simultaneous changes on a carry such as 099 → 100.

Provide accessible increment and decrement buttons. Clamp decrements at 000 and wrap increments after 999. Announce the complete number once per update, keeping the decorative digit transitions out of the accessibility tree.`,

  'dot-field': `Fill a square Canvas 2D card with an adaptive dot lattice at roughly 18 CSS px spacing. Rebuild the lattice on resize and cap the backing-store device pixel ratio at 2. Use round dots with a 2 px resting radius and 24% resting opacity.

For a dot at distance d from the pointer, set influence = max(0, 1 - d / 84). Displace the dot away from the pointer by 32 px × influence² along the unit direction vector. Increase radius by 1.3 px × influence and opacity by 0.76 × influence. Handle zero distance without dividing by zero. Reset the field on pointer leave.

Store the latest pointer coordinates in a ref and coalesce pointer events into at most one requestAnimationFrame redraw. Support keyboard nudging and use size/opacity feedback without displacement for reduced motion.`,

  elastic: `Build an elastic range slider from 0 to 100, starting at 28. Use a 14 px pale rail, a dark filled segment, and a 2 × 7 px white grip inset just inside the leading edge. Keep the grip in the rail silhouette and show a floating percentage above it on hover, drag, and keyboard adjustment.

Capture the pointer and clamp the logical value at both ends. Keep overshoot as a separate motion value. For an overflow distance d, use sign(d) × (1 - 1 / (1 + abs(d) × 0.55 / 26)) × 26 px to model rubber-band resistance. Stretch the rail horizontally from the opposite edge and thin it slightly while stretched. On release, spring the overshoot to zero using the measured release velocity. Let the tooltip trail the thumb using a damped spring.

Provide arrow keys, Home, and End, plus an accessible label and percentage value. Keep the visual rail and grip at their resting heights on hover.`,

  'gooey-dock': `Create a 32 × 72 px vertical capsule with pointer capture. Compute its signed gap to each card edge using the capsule's half-width or half-height on the perpendicular axis. Blend into the nearest edge over the last 20 px, then snap on release within that range.

Draw a pair of cubic Bézier bridges with tangents matching the edge and the side of the capsule. Scale bridge width and depth with proximity, and leave room near corners so the curve stays on the same edge. Keep the capsule and bridges in a single flat gray. Preserve the grab offset, support sliding along the attached edge, and detach when dragged inward.`,

  shared: `Build a shared-layout transition from a compact card to an expanded detail view. Match the container, title, and artwork across states using stable layout identities. Use FLIP (First, Last, Invert, Play) or a layout animation library to interpolate bounds, and use position-only interpolation for text so the glyphs stay sharp. Fade in the new body text after expansion.

Let the same button reverse the transition and expose its state through aria-expanded. Return focus to the trigger on close if focus moved into the details. Under reduced motion, switch layouts instantly and use a short opacity transition for the new content.`,
};
