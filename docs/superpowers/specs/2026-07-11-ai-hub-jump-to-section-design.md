# AI Hub Jump-To-Section Design

Adding a dynamic "jump to" navigation bar to the `/ai` page hero, similar to the one on the `/about-me` page. This navigation list will adapt automatically to show only the sections currently enabled in the Admin screen, in the order they are arranged.

## Proposed Changes

### Components

#### [MODIFY] [AiHub.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/ai/v2/AiHub.js)
- Extract the list of enabled sections from `config.sections` (excluding the `hero` section).
- Map each enabled section to a jump link object `{ href: '#ai-<section.id>', label: '<formatted type>' }`.
- Pass this list as the `jumpLinks` prop to the `AiHero` component.

#### [MODIFY] [AiHero.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/ai/v2/AiHero.js)
- Import `FaArrowDown` from `react-icons/fa6`.
- Receive `jumpLinks` as a prop.
- Render the links under the subtitle, dynamically colored using the section's `accent` variable.

## Verification Plan

### Manual Verification
- Start the server using `npm run dev`.
- Visit `http://localhost:3000/ai`.
- Verify the "jump to" section appears and shows the correct links (e.g. `[skills]`, `[recommendations]`, `[credits]`, `[telemetry]`, `[prompts]`).
- Toggle a section's visibility in the admin dashboard (or mock the visibility state in code) to ensure it dynamically updates the jump links list.
- Click each jump link and verify that it scrolls to the corresponding section.
