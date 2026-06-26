**Comparison**

- Source visual truth: `design-reference.png`
- Implementation screenshot: `qa-gameplay.png`
- Latest gameplay iteration: `qa-gameplay-v2.png`
- Combined evidence: `qa-comparison.png`
- Viewport: 1600 × 900
- State: Industrial Blackout arena, Wave 6, active mixed horde
- Mobile evidence: `qa-mobile-landscape.png`, `qa-mobile-portrait.png`

**Findings**

- No actionable P0/P1/P2 issues remain for the Phase 1 Kenney-based prototype.
- [P3] Environmental richness is intentionally below the aspirational concept.
  The reference uses bespoke painted scenery and character variants, while the
  implementation must use lightweight Kenney CC0 assets. The implementation
  preserves the arena silhouette, teal gates, amber hazards, central combat
  space, six spawn lanes and bottom weapon ribbon.
- [P3] Combat screenshots become closer to the target while firing because
  muzzle flashes, hit sparks, shake and explosive barrel blooms are temporal.
  A still idle frame naturally appears flatter than the reference key art.

**Required fidelity surfaces**

- Fonts and typography: Kenney Future is loaded locally and creates a coherent
  squared arcade hierarchy. HUD labels remain legible at desktop and landscape
  phone scales.
- Spacing and layout rhythm: HUD zones preserve the target's top corners,
  centered wave readout and bottom weapon selector without covering the central
  aiming space.
- Colors and visual tokens: cyan spawn gates, red health/hazards, amber weapon
  emphasis and charcoal surfaces map to the selected Industrial Blackout
  direction with sufficient contrast.
- Image quality and asset fidelity: all visible gameplay sprites, props, font
  and UI images are real Kenney assets. No placeholder imagery or handcrafted
  SVG substitutes are present.
- Copy and content: all labels are original Duo Outbreak terminology and do not
  reuse protected Boxhead branding.
- Responsiveness: 844 × 390 landscape scales cleanly; 390 × 844 portrait shows
  a dedicated rotation overlay.

**Patches made**

- Rebuilt the HUD with health, armor, wave progress, threat count, score,
  eliminations, accuracy, combo strength, mission timer, status feedback,
  five weapon slots and per-weapon ammunition.
- Added pistol, SMG, shotgun, piercing rifle and high-damage magnum roles.
- Replaced the empty-hand shotgun character frame with a visible long-gun
  Kenney sprite and distinct weapon tint.
- Added bullet collisions against boundary walls, cover and crates.
- Added zombie obstacle avoidance, predictive runner targeting, attack-ring
  positioning, separation and stuck detection/recovery.
- Added timed reload states and visible HUD feedback.
- Added kill-charged six-second mutation form with a custom ImageGen sprite,
  heavy melee, projectile-clearing shockwave, speed boost and damage resistance.
- Made pistol reserve ammunition infinite and slowed every weapon's fire cadence.
- Limited early-wave Spitters to two active enemies and locked their facing
  direction to the player.
- Mutation HUD communicates charge, ready state, remaining duration and the
  Space shockwave control.
- Rebuilt the arena as a clean white-gray empty combat floor with only two
  animated hostile entry portals at top-center and bottom-center.
- Added lightweight movement squash, enemy gait pulses, portal spawn bursts,
  muzzle flash and ejected casings, projectile trails, pickup auras and expanded
  death particles.
- Added Kenney debris, oil stains, tires, floor lights and hazard markings.
- Replaced the noisy marked floor tile with a subtle Kenney industrial tile.
- Increased player and enemy silhouette scale for combat readability.
- Reduced the darkness overlay while retaining the blackout mood.
- Made portrait rotation guidance apply consistently.
- Added a deterministic visual-QA Wave 6 mode at `?qa=1`.

**Implementation checklist**

- TypeScript workspace typecheck: passed.
- Production build: passed.
- Runtime console errors/warnings: none.
- Menu, deploy, wave spawning, firing, weapon input and game-over flow: verified.
- Wall impact, shotgun model, reload status and dense Wave 6 navigation: verified.
- Landscape and portrait responsive states: verified.

**Follow-up polish**

- Phase 5 can add richer sound layering, decals, animation frames and more
  environmental prop variants without changing the Phase 1 simulation shape.

final result: passed
